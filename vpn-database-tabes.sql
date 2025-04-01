-- VPN user profiles
CREATE TABLE vpn_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  mfa_secret TEXT,
  client_config TEXT NOT NULL,
  status ENUM('active', 'inactive', 'revoked') DEFAULT 'active',
  created_at DATETIME NOT NULL,
  updated_at DATETIME DEFAULT NULL,
  last_connected_at DATETIME DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY (user_id)
);

-- VPN connection logs
CREATE TABLE vpn_connections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  connection_type ENUM('connect', 'disconnect', 'mfa_validation', 'failed_attempt') NOT NULL,
  connected_at DATETIME NOT NULL,
  disconnected_at DATETIME DEFAULT NULL,
  bytes_sent BIGINT DEFAULT 0,
  bytes_received BIGINT DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- VPN access rules
CREATE TABLE vpn_access_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  target_group ENUM('all', 'role', 'user') NOT NULL,
  target_id INT DEFAULT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_path VARCHAR(255) NOT NULL,
  permission ENUM('allow', 'deny') NOT NULL DEFAULT 'deny',
  created_at DATETIME NOT NULL,
  created_by INT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Add VPN-related fields to existing users table if needed
ALTER TABLE users 
ADD COLUMN vpn_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN vpn_role VARCHAR(50) DEFAULT NULL;
