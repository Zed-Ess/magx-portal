// config/vpn.js
require('dotenv').config();

module.exports = {
  // OpenVPN server configuration
  server: {
    port: process.env.VPN_PORT || 1194,
    protocol: process.env.VPN_PROTOCOL || 'udp',
    device: process.env.VPN_DEVICE || 'tun',
    subnet: process.env.VPN_SUBNET || '10.8.0.0 255.255.255.0',
    configPath: process.env.VPN_CONFIG_PATH || './vpn/configs/server.conf'
  },
  
  // VPN client management
  client: {
    configTemplate: process.env.VPN_CLIENT_TEMPLATE || './vpn/configs/client.conf',
    certificatePath: process.env.VPN_CERT_PATH || './vpn/keys',
    expiryDays: process.env.VPN_CERT_EXPIRY || 365
  },
  
  // Multi-factor authentication
  mfa: {
    enabled: process.env.VPN_MFA_ENABLED === 'true' || false,
    provider: process.env.VPN_MFA_PROVIDER || 'google-authenticator'
  },
  
  // Access control
  access: {
    defaultRole: process.env.VPN_DEFAULT_ROLE || 'teacher',
    allowedRoles: (process.env.VPN_ALLOWED_ROLES || 'admin,teacher').split(','),
    studentAccess: process.env.VPN_STUDENT_ACCESS === 'true' || false
  },
  
  // Connection logging
  logging: {
    enabled: process.env.VPN_LOGGING_ENABLED === 'true' || true,
    logPath: process.env.VPN_LOG_PATH || './vpn/logs',
    retentionDays: process.env.VPN_LOG_RETENTION || 90
  }
};
