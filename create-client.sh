#!/bin/bash
# Script to generate OpenVPN client certificates and configuration

# Exit on any error
set -e

# Check if username is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <username>"
    exit 1
fi

USERNAME="$1"
EASY_RSA_DIR="/etc/openvpn/easy-rsa"
KEY_DIR="/etc/openvpn/keys"
OUTPUT_DIR="./vpn/keys"
CLIENT_TEMPLATE="/etc/openvpn/client-template.conf"
SERVER_HOST=$(hostname -I | cut -d' ' -f1)

# Create client certificate
cd $EASY_RSA_DIR
./easyrsa build-client-full "$USERNAME" nopass

# Create client configuration
mkdir -p $OUTPUT_DIR
CLIENT_CONFIG="$OUTPUT_DIR/$USERNAME.ovpn"

# Start with base config from template
cat $CLIENT_TEMPLATE > $CLIENT_CONFIG

# Replace server host placeholder
sed -i "s/{{SERVER_HOST}}/$SERVER_HOST/g" $CLIENT_CONFIG

# Add certificates inline
echo "<ca>" >> $CLIENT_CONFIG
cat $KEY_DIR/ca.crt >> $CLIENT_CONFIG
echo "</ca>" >> $CLIENT_CONFIG

echo "<cert>" >> $CLIENT_CONFIG
cat $KEY_DIR/issued/$USERNAME.crt >> $CLIENT_CONFIG
echo "</cert>" >> $CLIENT_CONFIG

echo "<key>" >> $CLIENT_CONFIG
cat $KEY_DIR/private/$USERNAME.key >> $CLIENT_CONFIG
echo "</key>" >> $CLIENT_CONFIG

echo "<tls-auth>" >> $CLIENT_CONFIG
cat $KEY_DIR/ta.key >> $CLIENT_CONFIG
echo "</tls-auth>" >> $CLIENT_CONFIG

# Set permissions
chmod 400 $CLIENT_CONFIG

echo "Client configuration created: $CLIENT_CONFIG"
echo "Import this file into your OpenVPN client application"
