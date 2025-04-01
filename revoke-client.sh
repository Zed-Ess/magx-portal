#!/bin/bash
# Script to revoke OpenVPN client certificates

# Exit on any error
set -e

# Check if username is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <username>"
    exit 1
fi

USERNAME="$1"
EASY_RSA_DIR="/etc/openvpn/easy-rsa"
OUTPUT_DIR="./vpn/keys"
CONFIG_FILE="$OUTPUT_DIR/$USERNAME.ovpn"

# Revoke client certificate
cd $EASY_RSA_DIR
./easyrsa revoke "$USERNAME"
./easyrsa gen-crl

# Copy the CRL to the OpenVPN directory
cp $EASY_RSA_DIR/pki/crl.pem /etc/openvpn/

# Make sure OpenVPN is using the CRL
if ! grep -q "crl-verify" /etc/openvpn/server.conf; then
    echo "crl-verify /etc/openvpn/crl.pem" >> /etc/openvpn/server.conf
    systemctl restart openvpn@server
fi

# Remove the client config file if it exists
if [ -f "$CONFIG_FILE" ]; then
    rm "$CONFIG_FILE"
fi

echo "Certificate for $USERNAME has been revoked"
echo "The CRL has been updated and OpenVPN server has been restarted"
