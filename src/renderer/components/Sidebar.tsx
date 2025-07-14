import React, { useState } from 'react';
import { DatabaseConnection, SchemaInfo } from '../types';

interface SidebarProps {
  connections: DatabaseConnection[];
  activeConnectionId: string | null;
  schemas: SchemaInfo[];
  connectionErrors?: Record<string, string>;
  connectingConnectionIds?: Set<string>;
  onConnectionSelect: (id: string) => void;
  onConnectionRemove: (id: string) => void;
  onNewConnection: () => void;
  onTableSelect: (schema: string, table: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  connections,
  activeConnectionId,
  schemas,
  connectionErrors = {},
  connectingConnectionIds = new Set(),
  onConnectionSelect,
  onConnectionRemove,
  onNewConnection,
  onTableSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());

  const toggleSchema = (schemaName: string) => {
    setExpandedSchemas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(schemaName)) {
        newSet.delete(schemaName);
      } else {
        newSet.add(schemaName);
      }
      return newSet;
    });
  };

  const filteredSchemas = schemas.filter(schema =>
    schema.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    schema.tables.some(table => 
      table.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const filteredTables = (schema: SchemaInfo) => {
    // If schema name matches search, show all tables
    if (schema.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return schema.tables;
    }
    // Otherwise, filter tables by search term
    return schema.tables.filter(table =>
      table.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <div className="sidebar">
      <button
        onClick={onNewConnection}
        className="sidebar-button"
      >
        + New Connection
      </button>

      {connections.length > 0 && (
        <div className="sidebar-section">
          <h4>Connections</h4>
          {connections.map(connection => (
            <div
              key={connection.id}
              className={`connection-item ${activeConnectionId === connection.id ? 'active' : ''}`}
              onClick={() => onConnectionSelect(connection.id)}
            >
              <div className="connection-info">
                <div className="connection-name">
                  {connection.name}
                  {connectingConnectionIds.has(connection.id) && (
                    <span style={{ 
                      marginLeft: '8px', 
                      fontSize: '10px', 
                      color: '#3b82f6' 
                    }}>
                      Connecting...
                    </span>
                  )}
                </div>
                <div className="connection-details">
                  {connection.host}:{connection.port}/{connection.database}
                </div>
                {connectionErrors[connection.id] && (
                  <div 
                    title={connectionErrors[connection.id]}
                    style={{ 
                      fontSize: '10px', 
                      color: '#dc2626', 
                      marginTop: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      cursor: 'help'
                    }}
                  >
                    {connectionErrors[connection.id]}
                  </div>
                )}
              </div>
              <button
                className="connection-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  onConnectionRemove(connection.id);
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {activeConnectionId && (
        <div className="sidebar-section">
          <input
            type="text"
            placeholder="Search schemas and tables..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />

          <div className="schema-tree">
            <h4>Database Schema</h4>
            {filteredSchemas.map(schema => (
              <div key={schema.name} className="schema-item">
                <div
                  className="schema-name"
                  onClick={() => toggleSchema(schema.name)}
                >
                  {expandedSchemas.has(schema.name) ? '▼' : '▶'} {schema.name}
                </div>
                {expandedSchemas.has(schema.name) && (
                  <div className="table-list">
                    {filteredTables(schema).map(table => (
                      <div
                        key={table.name}
                        className="table-item"
                        onClick={() => onTableSelect(schema.name, table.name)}
                      >
                        📄 {table.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!activeConnectionId && connections.length === 0 && (
        <div className="empty-state">
          <h3>No Connections</h3>
          <p>Create a new connection to get started</p>
        </div>
      )}
    </div>
  );
};