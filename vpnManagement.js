import React, { useState, useEffect } from 'react';
import axios from 'axios';

const VpnManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrCodeData, setQrCodeData] = useState('');
  const [clientConfig, setClientConfig] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Fetch users who are eligible for VPN access
        const response = await axios.get('/api/users?role=teacher,admin');
        setUsers(response.data.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load users');
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleGenerateConfig = async (userId) => {
    try {
      setLoading(true);
      const response = await axios.post(`/api/vpn/users/${userId}/generate`);
      
      setClientConfig(response.data.data.clientConfig);
      
      if (response.data.data.mfaEnabled && response.data.data.mfaSecret) {
        // Generate QR code for MFA setup
        const qrResponse = await axios.post('/api/vpn/generate-qr', {
          secret: response.data.data.mfaSecret
        });
        setQrCodeData(qrResponse.data.qrCodeUrl);
        setShowQrCode(true);
      }
      
      setLoading(false);
      setSelectedUser(userId);
    } catch (err) {
      setError('Failed to generate VPN configuration');
      setLoading(false);
    }
  };

  const handleRevokeAccess = async (userId) => {
    try {
      setLoading(true);
      await axios.put(`/api/vpn/users/${userId}/revoke`);
      
      // Refresh user list
      const response = await axios.get('/api/vpn/users');
      setUsers(response.data.data);
      
      setLoading(false);
      setSelectedUser(null);
    } catch (err) {
      setError('Failed to revoke VPN access');
      setLoading(false);
    }
  };

  const downloadConfig = () => {
    const blob = new Blob([clientConfig], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'school-vpn-config.ovpn');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">VPN Access Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Users</h2>
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left">Name</th>
                <th className="text-left">Role</th>
                <th className="text-left">Status</th>
                <th className="text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.role}</td>
                  <td>{user.vpn_enabled ? 'Enabled' : 'Disabled'}</td>
                  <td>
                    {user.vpn_enabled ? (
                      <button 
                        onClick={() => handleRevokeAccess(user.id)}
                        className="bg-red-500 text-white px-2 py-1 rounded"
                      >
                        Revoke
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleGenerateConfig(user.id)}
                        className="bg-blue-500 text-white px-2 py-1 rounded"
                      >
                        Generate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {selectedUser && (
          <div className="border p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">VPN Configuration</h2>
            
            {showQrCode && (
              <div className="mb-4">
                <h3 className="font-medium mb-2">Scan this QR code with Google Authenticator</h3>
                <img src={qrCodeData} alt="MFA QR Code" className="mx-auto" />
              </div>
            )}
            
            <div className="mb-4">
              <h3 className="font-medium mb-2">Configuration File</h3>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
                {clientConfig.substring(0, 100)}...
              </pre>
<button 
            onClick={downloadConfig}
            className="bg-green-500 text-white px-3 py-2 rounded mt-2"
          >
            Download Configuration
          </button>
        </div>
        
        <div>
          <h3 className="font-medium mb-2">Instructions</h3>
          <ol className="list-decimal pl-4">
            <li>Download the OpenVPN configuration file</li>
            <li>Install OpenVPN Client on your device</li>
            <li>Import the configuration file</li>
            <li>If MFA is enabled, set up Google Authenticator using the QR code</li>
            <li>Connect to the VPN using your credentials</li>
          </ol>
        </div>
      </div>
    )}
  </div>
</div>
);
};
export default VpnManagement;
</antArtifact>
