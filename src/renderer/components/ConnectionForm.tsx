import React, { useState } from 'react';
import { DatabaseConnection } from '../types';
import { useDatabase } from '../hooks/useDatabase';

interface ConnectionFormProps {
  onConnect: (connection: DatabaseConnection) => void;
  onCancel: () => void;
  isConnecting: boolean;
}

export const ConnectionForm: React.FC<ConnectionFormProps> = ({
  onConnect,
  onCancel,
  isConnecting,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    host: 'localhost',
    port: 5432,
    database: '',
    username: '',
    password: '',
    ssl: false,
  });

  const { savePassword } = useDatabase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const connectionId = `${formData.host}:${formData.port}:${formData.database}:${formData.username}`;
    
    try {
      // Save password to keychain
      await savePassword(connectionId, formData.password);
      
      // Create connection object
      const connection: DatabaseConnection = {
        id: connectionId,
        name: formData.name || `${formData.host}:${formData.port}/${formData.database}`,
        host: formData.host,
        port: formData.port,
        database: formData.database,
        username: formData.username,
        ssl: formData.ssl,
      };
      
      onConnect(connection);
    } catch (error) {
      console.error('Failed to save connection:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '8px',
        width: '500px',
        maxWidth: '90vw',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px' }}>New Connection</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Connection Name</label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Optional display name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="host">Host</label>
            <input
              id="host"
              name="host"
              type="text"
              value={formData.host}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="port">Port</label>
            <input
              id="port"
              name="port"
              type="number"
              value={formData.port}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="database">Database</label>
            <input
              id="database"
              name="database"
              type="text"
              value={formData.database}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                name="ssl"
                type="checkbox"
                checked={formData.ssl}
                onChange={handleChange}
              />
              Use SSL
            </label>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onCancel}
              disabled={isConnecting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isConnecting}
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};