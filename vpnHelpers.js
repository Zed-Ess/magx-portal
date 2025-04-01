// utils/vpnHelpers.js
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

/**
 * Generate a secure random MFA secret for TOTP authentication
 */
const generateMfaSecret = () => {
  return speakeasy.generateSecret({
    name: 'School Management VPN',
    length: 20
  });
};

/**
 * Validate a TOTP token against a secret
 * @param {string} token - The token to validate
 * @param {string} secret - The MFA secret
 * @returns {boolean} - Whether the token is valid
 */
const validateMfaToken = (token, secret) => {
  return speakeasy.totp.verify({
    secret: secret.base32,
    encoding: 'base32',
    token: token,
    window: 1 // Allow 1 time step before/after for clock drift
  });
};

/**
 * Generate a QR code for MFA setup
 * @param {Object} secret - The MFA secret object
 * @returns {Promise<string>} - Data URL for QR code
 */
const generateQrCode = async (secret) => {
  try {
    const otpauthUrl = secret.otpauth_url;
    return await qrcode.toDataURL(otpauthUrl);
  } catch (error) {
    console.error('QR code generation error:', error);
    throw error;
  }
};

/**
 * Parse OpenVPN status log file
 * @param {string} statusFilePath - Path to OpenVPN status log
 * @returns {Object} - Parsed status information
 */
const parseVpnStatus = (statusFilePath) => {
  try {
    const fs = require('fs');
    const content = fs.readFileSync(statusFilePath, 'utf8');
    
    // Parse the OpenVPN status file format
    const lines = content.split('\n');
    const clients = [];
    let routingTable = [];
    let globalStats = {};
    
    let section = '';
    
    for (const line of lines) {
      if (line.startsWith('CLIENT_LIST')) {
        section = 'clients';
        continue;
      } else if (line.startsWith('ROUTING_TABLE')) {
        section = 'routing';
        continue;
      } else if (line.startsWith('GLOBAL_STATS')) {
        section = 'stats';
        continue;
      }
      
      if (section === 'clients' && line.length > 0 && !line.startsWith('Updated') && !line.startsWith('Common Name')) {
        const parts = line.split(',');
        if (parts.length >= 5) {
          clients.push({
            commonName: parts[0],
            realAddress: parts[1],
            virtualAddress: parts[2],
            bytesReceived: parseInt(parts[3]),
            bytesSent: parseInt(parts[4]),
            connectedSince: parts[5]
          });
        }
      } else if (section === 'routing' && line.length > 0 && !line.startsWith('Virtual Address')) {
        const parts = line.split(',');
        if (parts.length >= 3) {
          routingTable.push({
            virtualAddress: parts[0],
            commonName: parts[1],
            realAddress: parts[2],
            lastRef: parts[3]
          });
        }
      } else if (section === 'stats' && line.length > 0) {
        const parts = line.split(',');
        if (parts.length >= 2) {
          globalStats[parts[0]] = parts[1];
        }
      }
    }
    
    return {
      clients,
      routingTable,
      globalStats
    };
  } catch (error) {
    console.error('VPN status parsing error:', error);
    return {
      clients: [],
      routingTable: [],
      globalStats: {}
    };
  }
};

module.exports = {
  generateMfaSecret,
  validateMfaToken,
  generateQrCode,
  parseVpnStatus
};
