import React, { useState, useRef, useCallback } from 'react';
import { DatabaseConnection, SchemaInfo } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

interface SidebarProps {
  connections: DatabaseConnection[];
  activeConnectionId: string | null;
  schemas: SchemaInfo[];
  connectionErrors?: Record<string, string>;
  connectingConnectionIds?: Set<string>;
  loadingTableSchemas?: Set<string>;
  onConnectionSelect: (id: string) => void;
  onConnectionRemove: (id: string) => void;
  onConnectionEdit: (connection: DatabaseConnection) => void;
  onNewConnection: () => void;
  onTableSelect: (schema: string, table: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  connections,
  activeConnectionId,
  schemas,
  connectionErrors = {},
  connectingConnectionIds = new Set(),
  loadingTableSchemas = new Set(),
  onConnectionSelect,
  onConnectionRemove,
  onConnectionEdit,
  onNewConnection,
  onTableSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      
      const newWidth = Math.max(220, Math.min(400, startWidth + (e.clientX - startX)));
      setSidebarWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, [sidebarWidth]);

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
    <div 
      ref={sidebarRef}
      className="sidebar"
      style={{ width: sidebarWidth }}
    >
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
              onClick={() => connectingConnectionIds.size > 0 ? undefined : onConnectionSelect(connection.id)}
              style={{ 
                cursor: connectingConnectionIds.size > 0 ? 'not-allowed' : 'pointer',
                opacity: connectingConnectionIds.size > 0 ? 0.6 : 1
              }}
            >
              <div className="connection-info">
                <div className="connection-name">
                  {connection.name}
                  {connectingConnectionIds.has(connection.id) && (
                    <div className="connecting-indicator">
                      <LoadingSpinner size="small" text="Connecting..." />
                    </div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  className="connection-edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (connectingConnectionIds.size === 0) {
                      onConnectionEdit(connection);
                    }
                  }}
                  title="Edit connection"
                  disabled={connectingConnectionIds.size > 0}
                  style={{ 
                    opacity: connectingConnectionIds.size > 0 ? 0.4 : 1,
                    cursor: connectingConnectionIds.size > 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  ✎
                </button>
                <button
                  className="connection-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (connectingConnectionIds.size === 0) {
                      onConnectionRemove(connection.id);
                    }
                  }}
                  disabled={connectingConnectionIds.size > 0}
                  style={{ 
                    opacity: connectingConnectionIds.size > 0 ? 0.4 : 1,
                    cursor: connectingConnectionIds.size > 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeConnectionId && (
        <div className="sidebar-section" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <input
            type="text"
            placeholder="Search schemas and tables..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />

          <h4>Database Schema</h4>
          <div className="schema-tree">
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
                    {filteredTables(schema).map(table => {
                      const tableKey = `${schema.name}.${table.name}`;
                      const isLoading = loadingTableSchemas.has(tableKey);
                      
                      return (
                        <div
                          key={table.name}
                          className="table-item"
                          onClick={() => !isLoading && onTableSelect(schema.name, table.name)}
                          style={{ 
                            cursor: isLoading ? 'wait' : 'pointer',
                            opacity: isLoading ? 0.6 : 1,
                            color: isLoading ? 'var(--text-quaternary)' : 'var(--text-tertiary)'
                          }}
                        >
                          {table.name}
                          {isLoading && (
                            <span style={{ 
                              marginLeft: '8px', 
                              fontSize: '10px', 
                              color: 'var(--accent-primary)' 
                            }}>
                              Loading...
                            </span>
                          )}
                        </div>
                      );
                    })}
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
      
      <div 
        className="sidebar-resize-handle"
        onMouseDown={handleMouseDown}
        style={{
          position: 'absolute',
          right: -4,
          top: 0,
          bottom: 0,
          width: 8,
          cursor: 'ew-resize',
          backgroundColor: 'transparent',
          zIndex: 10,
        }}
      />
    </div>
  );
};