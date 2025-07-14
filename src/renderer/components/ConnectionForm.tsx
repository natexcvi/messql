import React, { useState } from 'react';
import { DatabaseConnection } from '../types';
import { useDatabase } from '../hooks/useDatabase';

interface ConnectionFormProps {
  onConnect: (connection: DatabaseConnection) => Promise<void>;
  onSave: (connection: DatabaseConnection) => void;
  onCancel: () => void;
  isConnecting: boolean;
  error: string | null;
}

export const ConnectionForm: React.FC<ConnectionFormProps> = ({
  onConnect,
  onSave,
  onCancel,
  isConnecting,
  error,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    host: 'localhost',
    port: 5432,
    database: '',
    username: '',
    password: '',
    ssl: false,
    maxConnections: 10,
  });

  const { savePassword } = useDatabase();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as any).submitter;
    const action = submitter.name;
    
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
        maxConnections: formData.maxConnections,
      };

      if (action === 'save') {
        onSave(connection);
      } else {
        await onConnect(connection);
      }
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
    <div className="connection-modal-overlay">
      <div className="connection-modal">
        <div className="connection-modal-header">
          <h2>New Connection</h2>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="connection-modal-body">
            {error && <div className="error-message">{error}</div>}
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
              <div className="checkbox-group">
                <input
                  id="ssl"
                  name="ssl"
                  type="checkbox"
                  checked={formData.ssl}
                  onChange={handleChange}
                />
                <label htmlFor="ssl">Use SSL</label>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="maxConnections">Max Connections</label>
              <input
                id="maxConnections"
                name="maxConnections"
                type="number"
                value={formData.maxConnections}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="connection-modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={isConnecting}
            >
              Cancel
            </button>
            <button
              type="submit"
              name="save"
              className="btn btn-secondary"
              disabled={isConnecting}
            >
              Save
            </button>
            <button
              type="submit"
              name="connect"
              className="btn btn-primary"
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