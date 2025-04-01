#!/bin/bash
# OpenVPN server setup script for school management system
# Must be run with root privileges

# Exit on any error
set -e

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
    echo "This script must be run as root" >&2
    exit 1
fi

# Configuration
OPENVPN_DIR="/etc/openvpn"
EASY_RSA_DIR="/etc/openvpn/easy-rsa"
KEY_DIR="/etc/openvpn/keys"
SERVER_CONF="/etc/openvpn/server.conf"
CLIENT_TEMPLATE="/etc/openvpn/client-template.conf"
SCHOOL_NAME="School-Management"

# Install OpenVPN and Easy-RSA if not already installed
echo "Installing OpenVPN and Easy-RSA..."
if [ -f /etc/debian_version ]; then
    # Debian/Ubuntu
    apt-get update
    apt-get install -y openvpn easy-rsa
elif [ -f /etc/redhat-release ]; then
    # CentOS/RHEL
    yum install -y epel-release
    yum install -y openvpn easy-rsa
else
    echo "Unsupported operating system" >&2
    exit 1
fi

# Set up Easy-RSA
echo "Setting up Easy-RSA..."
mkdir -p $KEY_DIR
cp -r /usr/share/easy-rsa/* $EASY_RSA_DIR/
cd $EASY_RSA_DIR

# Create vars file
cat > vars <<EOF
set_var EASYRSA_REQ_COUNTRY "US"
set_var EASYRSA_REQ_PROVINCE "State"
set_var EASYRSA_REQ_CITY "City"
set_var EASYRSA_REQ_ORG "$SCHOOL_NAME"
set_var EASYRSA_REQ_EMAIL "admin@school.example"
set_var EASYRSA_REQ_OU "IT"
set_var EASYRSA_KEY_SIZE 2048
set_var EASYRSA_CA_EXPIRE 3650
set_var EASYRSA_CERT_EXPIRE 365
EOF

# Initialize the PKI
./easyrsa init-pki
./easyrsa build-ca nopass
./easyrsa gen-dh
./easyrsa build-server-full server nopass
openvpn --genkey --secret $KEY_DIR/ta.key

# Create server configuration
cat > $SERVER_CONF <<EOF
port 1194
proto udp
dev tun
ca $KEY_DIR/ca.crt
cert $KEY_DIR/server.crt
key $KEY_DIR/server.key
dh $KEY_DIR/dh.pem
server 10.8.0.0 255.255.255.0
ifconfig-pool-persist /var/log/openvpn/ipp.txt
push "redirect-gateway def1 bypass-dhcp"
push "dhcp-option DNS 8.8.8.8"
push "dhcp-option DNS 8.8.4.4"
keepalive 10 120
tls-auth $KEY_DIR/ta.key 0
cipher AES-256-CBC
user nobody
group nogroup
persist-key
persist-tun
status /var/log/openvpn/openvpn-status.log
log-append /var/log/openvpn/openvpn.log
verb 3
EOF

# Create client template
cat > $CLIENT_TEMPLATE <<EOF
client
dev tun
proto udp
remote {{SERVER_HOST}} 1194
resolv-retry infinite
nobind
persist-key
persist-tun
ca [inline]
cert [inline]
key [inline]
tls-auth [inline] 1
cipher AES-256-CBC
verb 3
EOF

# Create necessary directories for logging
mkdir -p /var/log/openvpn

# Enable IP forwarding
echo "Enabling IP forwarding..."
echo 1 > /proc/sys/net/ipv4/ip_forward
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf

# Set up firewall rules
echo "Setting up firewall rules..."
if command -v ufw > /dev/null; then
    # Ubuntu/Debian with UFW
    ufw allow 1194/udp
    
    # Get the primary network interface
    NIC=$(ip -4 route ls | grep default | grep -Po '(?<=dev )(\S+)' | head -1)
    
    # Allow forwarding
    sed -i 's/DEFAULT_FORWARD_POLICY="DROP"/DEFAULT_FORWARD_POLICY="ACCEPT"/g' /etc/default/ufw
    
    # Add NAT rules
    cat > /etc/ufw/before.rules <<EOF
# NAT table rules
*nat
:POSTROUTING ACCEPT [0:0]
# Forward traffic from VPN through internet connection
-A POSTROUTING -s 10.8.0.0/24 -o $NIC -j MASQUERADE
COMMIT
EOF

    # Reload UFW
    ufw disable
    ufw enable
elif command -v firewall-cmd > /dev/null; then
    # CentOS/RHEL with firewalld
    firewall-cmd --permanent --add-port=1194/udp
    firewall-cmd --permanent --add-masquerade
    firewall-cmd --reload
elif command -v iptables > /dev/null; then
    # Generic iptables
    NIC=$(ip -4 route ls | grep default | grep -Po '(?<=dev )(\S+)' | head -1)
    iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o $NIC -j MASQUERADE
    iptables -A INPUT -i tun+ -j ACCEPT
    iptables -A FORWARD -i tun+ -j ACCEPT
    iptables -A OUTPUT -o tun+ -j ACCEPT
    
    # Make rules persistent
    if command -v iptables-save > /dev/null; then
        iptables-save > /etc/iptables.rules
        echo "iptables-restore < /etc/iptables.rules" > /etc/network/if-up.d/iptables
        chmod +x /etc/network/if-up.d/iptables
    fi
fi

# Enable and start OpenVPN service
echo "Starting OpenVPN service..."
systemctl enable openvpn@server
systemctl start openvpn@server

echo "OpenVPN server setup completed!"
echo "Server is now running on UDP port 1194"
echo "You can generate client certificates using the create-client.sh script"
