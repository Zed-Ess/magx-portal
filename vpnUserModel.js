// models/vpnUserModel.js
const pool = require('../config/db');

const vpnUserModel = {
  // Create a new VPN user profile
  createVpnUser: async (userId, mfaSecret, clientConfig) => {
    const query = `
      INSERT INTO vpn_users (user_id, mfa_secret, client_config, status, created_at)
      VALUES (?, ?, ?, 'active', NOW())
    `;
    
    const [result] = await pool.query(query, [userId, mfaSecret, clientConfig]);
    return result.insertId;
  },
  
  // Update VPN user status (active/inactive/revoked)
  updateVpnUserStatus: async (userId, status) => {
    const query = `
      UPDATE vpn_users
      SET status = ?, updated_at = NOW()
      WHERE user_id = ?
    `;
    
    const [result] = await pool.query(query, [status, userId]);
    return result.affectedRows > 0;
  },
  
  // Get VPN user details
  getVpnUser: async (userId) => {
    const query = `
      SELECT vp.*, u.email, u.role
      FROM vpn_users vp
      JOIN users u ON vp.user_id = u.id
      WHERE vp.user_id = ?
    `;
    
    const [rows] = await pool.query(query, [userId]);
    return rows[0];
  },
  
  // Get all active VPN users
  getActiveVpnUsers: async () => {
    const query = `
      SELECT vp.*, u.email, u.role, u.name
      FROM vpn_users vp
      JOIN users u ON vp.user_id = u.id
      WHERE vp.status = 'active'
    `;
    
    const [rows] = await pool.query(query);
    return rows;
  },
  
  // Log VPN connection
  logVpnConnection: async (userId, ipAddress, connectionType) => {
    const query = `
      INSERT INTO vpn_connections (user_id, ip_address, connection_type, connected_at)
      VALUES (?, ?, ?, NOW())
    `;
    
    const [result] = await pool.query(query, [userId, ipAddress, connectionType]);
    return result.insertId;
  },
  
  // Get connection history for a user
  getConnectionHistory: async (userId, limit = 10) => {
    const query = `
      SELECT * FROM vpn_connections
      WHERE user_id = ?
      ORDER BY connected_at DESC
      LIMIT ?
    `;
    
    const [rows] = await pool.query(query, [userId, limit]);
    return rows;
  }
};

module.exports = vpnUserModel;
