import React, { useState } from 'react';
import { DatabaseConnection, SchemaInfo } from '../types';

interface SidebarProps {
  connections: DatabaseConnection[];
  activeConnectionId: string | null;
  schemas: SchemaInfo[];
  onConnectionSelect: (id: string) => void;
  onConnectionRemove: (id: string) => void;
  onNewConnection: () => void;
  onTableSelect: (schema: string, table: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  connections,
  activeConnectionId,
  schemas,
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

  const filteredTables = (schema: SchemaInfo) => 
    schema.tables.filter(table =>
      table.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="sidebar">
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={onNewConnection}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#007aff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          + New Connection
        </button>
      </div>

      {connections.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ marginBottom: '10px', color: '#fff' }}>Connections</h4>
          {connections.map(connection => (
            <div
              key={connection.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                backgroundColor: activeConnectionId === connection.id ? '#444' : 'transparent',
                borderRadius: '4px',
                marginBottom: '4px',
                cursor: 'pointer',
              }}
              onClick={() => onConnectionSelect(connection.id)}
            >
              <div>
                <div style={{ fontWeight: '600', color: '#4a9eff' }}>
                  {connection.name}
                </div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  {connection.host}:{connection.port}/{connection.database}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onConnectionRemove(connection.id);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#999',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '4px',
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {activeConnectionId && (
        <div>
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