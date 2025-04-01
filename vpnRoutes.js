// routes/vpnRoutes.js
const express = require('express');
const router = express.Router();
const vpnController = require('../controllers/vpnController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Only administrators can generate and manage VPN configurations
router.post(
  '/users/:userId/generate',
  auth,
  roleCheck(['admin']),
  vpnController.generateClientConfig
);

// Revoke VPN access
router.put(
  '/users/:userId/revoke',
  auth,
  roleCheck(['admin']),
  vpnController.revokeAccess
);

// Get all active VPN users
router.get(
  '/users',
  auth,
  roleCheck(['admin']),
  vpnController.getActiveUsers
);

// MFA token validation (used during VPN connection)
router.post(
  '/validate-mfa',
  vpnController.validateMfa
);

// Get connection history for a user
router.get(
  '/users/:userId/history',
  auth,
  roleCheck(['admin']),
  vpnController.getConnectionHistory
);

module.exports = router;
