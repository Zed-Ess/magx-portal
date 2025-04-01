// controllers/vpnController.js
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const vpnUserModel = require('../models/vpnUserModel');
const vpnConfig = require('../config/vpn');
const { generateMfaSecret, validateMfaToken } = require('../utils/vpnHelpers');

const vpnController = {
  // Generate client configuration for a user
  async generateClientConfig(req, res) {
    try {
      const { userId } = req.params;
      
      // Check if user already has VPN access
      const existingVpnUser = await vpnUserModel.getVpnUser(userId);
      if (existingVpnUser && existingVpnUser.status === 'active') {
        return res.status(400).json({ 
          success: false, 
          message: 'User already has active VPN access' 
        });
      }
      
      // Generate certificates and keys using OpenVPN easy-rsa
      const username = `user${userId}`;
      await execAsync(`./vpn/scripts/create-client.sh ${username}`);
      
      // Generate MFA secret if enabled
      let mfaSecret = null;
      if (vpnConfig.mfa.enabled) {
        mfaSecret = generateMfaSecret();
      }
      
      // Read the client template and customize it
      const clientTemplate = fs.readFileSync(vpnConfig.client.configTemplate, 'utf8');
      
      // Insert user-specific data into the client config
      const clientConfig = clientTemplate
        .replace('{{CLIENT_NAME}}', username)
        .replace('{{SERVER_HOST}}', process.env.VPN_SERVER_HOST)
        .replace('{{SERVER_PORT}}', vpnConfig.server.port)
        .replace('{{PROTOCOL}}', vpnConfig.server.protocol);
      
      // Save user's VPN profile to database
      await vpnUserModel.createVpnUser(userId, mfaSecret, clientConfig);
      
      // Return the configuration and MFA details
      return res.status(200).json({
        success: true,
        data: {
          clientConfig,
          mfaEnabled: vpnConfig.mfa.enabled,
          mfaSecret,
          instructions: 'Download this configuration file and import it into your OpenVPN client'
        }
      });
    } catch (error) {
      console.error('VPN config generation error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to generate VPN configuration',
        error: error.message
      });
    }
  },
  
  // Revoke a user's VPN access
  async revokeAccess(req, res) {
    try {
      const { userId } = req.params;
      
      // Check if user has VPN access
      const vpnUser = await vpnUserModel.getVpnUser(userId);
      if (!vpnUser || vpnUser.status !== 'active') {
        return res.status(404).json({ 
          success: false, 
          message: 'No active VPN access found for user' 
        });
      }
      
      // Revoke certificates
      const username = `user${userId}`;
      await execAsync(`./vpn/scripts/revoke-client.sh ${username}`);
      
      // Update user status in database
      await vpnUserModel.updateVpnUserStatus(userId, 'revoked');
      
      return res.status(200).json({
        success: true,
        message: 'VPN access successfully revoked'
      });
    } catch (error) {
      console.error('VPN revocation error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to revoke VPN access',
        error: error.message
      });
    }
  },
  
  // Get all active VPN users
  async getActiveUsers(req, res) {
    try {
      const activeUsers = await vpnUserModel.getActiveVpnUsers();
      
      return res.status(200).json({
        success: true,
        count: activeUsers.length,
        data: activeUsers
      });
    } catch (error) {
      console.error('Get VPN users error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to retrieve VPN users',
        error: error.message
      });
    }
  },
  
  // Validate MFA token during connection
  async validateMfa(req, res) {
    try {
      const { userId, token } = req.body;
      
      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'MFA token is required'
        });
      }
      
      // Get the user's MFA secret
      const vpnUser = await vpnUserModel.getVpnUser(userId);
      if (!vpnUser || !vpnUser.mfa_secret) {
        return res.status(404).json({
          success: false,
          message: 'User not found or MFA not configured'
        });
      }
      
      // Validate the token
      const isValid = validateMfaToken(token, vpnUser.mfa_secret);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid MFA token'
        });
      }
      
      // Log successful validation
      await vpnUserModel.logVpnConnection(
        userId, 
        req.ip, 
        'mfa_validation'
      );
      
      return res.status(200).json({
        success: true,
        message: 'MFA validation successful'
      });
    } catch (error) {
      console.error('MFA validation error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to validate MFA token',
        error: error.message
      });
    }
  },
  
  // Get connection history for a user
  async getConnectionHistory(req, res) {
    try {
      const { userId } = req.params;
      const { limit } = req.query;
      
      const history = await vpnUserModel.getConnectionHistory(
        userId, 
        limit ? parseInt(limit) : 10
      );
      
      return res.status(200).json({
        success: true,
        count: history.length,
        data: history
      });
    } catch (error) {
      console.error('Get connection history error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to retrieve connection history',
        error: error.message
      });
    }
  }
};

module.exports = vpnController;
