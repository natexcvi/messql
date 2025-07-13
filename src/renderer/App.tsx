import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';
import { ConnectionForm } from './components/ConnectionForm';
import { useDatabase } from './hooks/useDatabase';
import { useTheme } from './hooks/useTheme';
import { storageService } from './services/storage';
import { DatabaseConnection, QueryTab, AppState } from './types';

export const App: React.FC = () => {
  const { isDark } = useTheme();
  
  const [state, setState] = useState<AppState>({
    connections: [],
    activeConnectionId: null,
    schemas: [],
    queryTabs: [],
    activeTabId: null,
    isConnecting: false,
    showConnectionForm: false,
  });

  const [connectionErrors, setConnectionErrors] = useState<Record<string, string>>({});
  const [connectingConnectionIds, setConnectingConnectionIds] = useState<Set<string>>(new Set());

  // Load connections on startup
  useEffect(() => {
    const savedConnections = storageService.loadConnections();
    setState(prev => ({
      ...prev,
      connections: savedConnections,
    }));

    // Set up callback for checking open tabs
    window.electronAPI.setHasOpenTabsCallback(() => {
      return state.queryTabs.length > 0;
    });
  }, []);

  // Update the callback when queryTabs changes
  useEffect(() => {
    window.electronAPI.setHasOpenTabsCallback(() => {
      return state.queryTabs.length > 0;
    });
  }, [state.queryTabs.length]);

  const { connect, disconnect, query, getSchemas } = useDatabase();

  const addConnection = useCallback(async (connection: DatabaseConnection) => {
    setState(prev => ({ ...prev, isConnecting: true }));
    
    try {
      await connect(connection);
      const schemas = await getSchemas(connection.id);
      
      const updatedConnections = [...state.connections, connection];
      
      setState(prev => ({
        ...prev,
        connections: updatedConnections,
        activeConnectionId: connection.id,
        schemas,
        isConnecting: false,
        showConnectionForm: false,
      }));

      // Save to localStorage
      storageService.saveConnections(updatedConnections);
    } catch (error) {
      console.error('Failed to connect:', error);
      setState(prev => ({ ...prev, isConnecting: false }));
    }
  }, [connect, getSchemas, state.connections]);

  const removeConnection = useCallback(async (connectionId: string) => {
    await disconnect(connectionId);
    const updatedConnections = state.connections.filter(c => c.id !== connectionId);
    
    setState(prev => ({
      ...prev,
      connections: updatedConnections,
      activeConnectionId: prev.activeConnectionId === connectionId ? null : prev.activeConnectionId,
      schemas: prev.activeConnectionId === connectionId ? [] : prev.schemas,
    }));

    // Save to localStorage and remove from keychain
    storageService.saveConnections(updatedConnections);
    storageService.removeConnection(connectionId);
  }, [disconnect, state.connections]);

  const addQueryTab = useCallback(() => {
    const newTab: QueryTab = {
      id: Date.now().toString(),
      title: 'New Query',
      query: '',
      isExecuting: false,
    };
    
    setState(prev => ({
      ...prev,
      queryTabs: [...prev.queryTabs, newTab],
      activeTabId: newTab.id,
    }));
  }, []);

  const removeQueryTab = useCallback((tabId: string) => {
    setState(prev => {
      const updatedTabs = prev.queryTabs.filter(t => t.id !== tabId);
      const newActiveTabId = prev.activeTabId === tabId 
        ? (updatedTabs.length > 0 ? updatedTabs[0].id : null)
        : prev.activeTabId;
      
      return {
        ...prev,
        queryTabs: updatedTabs,
        activeTabId: newActiveTabId,
      };
    });
  }, []);

  const updateQueryTab = useCallback((tabId: string, updates: Partial<QueryTab>) => {
    setState(prev => ({
      ...prev,
      queryTabs: prev.queryTabs.map(tab => 
        tab.id === tabId ? { ...tab, ...updates } : tab
      ),
    }));
  }, []);

  const executeQuery = useCallback(async (tabId: string, sql: string) => {
    if (!state.activeConnectionId) return;

    updateQueryTab(tabId, { isExecuting: true, error: undefined });
    
    try {
      const result = await query(state.activeConnectionId, sql);
      updateQueryTab(tabId, { 
        result, 
        isExecuting: false,
        error: undefined,
        title: sql.split('\n')[0].substring(0, 30) + '...' || 'Query',
      });
    } catch (error) {
      updateQueryTab(tabId, { 
        isExecuting: false, 
        result: undefined,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [state.activeConnectionId, query, updateQueryTab]);

  useEffect(() => {
    const handleNewConnection = () => {
      setState(prev => ({ ...prev, showConnectionForm: true }));
    };

    const handleNewQuery = () => {
      addQueryTab();
    };

    const handleCloseTab = () => {
      if (state.activeTabId) {
        removeQueryTab(state.activeTabId);
      }
    };

    const handleExportCSV = () => {
      // Export functionality will be handled by the ResizableTable component
      // when it has access to the current query results
    };

    const handleExportJSON = () => {
      // Export functionality will be handled by the ResizableTable component
      // when it has access to the current query results
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault();
        if (state.activeTabId) {
          removeQueryTab(state.activeTabId);
        }
      }
    };

    window.electronAPI.on('new-connection', handleNewConnection);
    window.electronAPI.on('new-query', handleNewQuery);
    window.electronAPI.on('close-tab', handleCloseTab);
    window.electronAPI.on('export-csv', handleExportCSV);
    window.electronAPI.on('export-json', handleExportJSON);
    
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.electronAPI.removeAllListeners('new-connection');
      window.electronAPI.removeAllListeners('new-query');
      window.electronAPI.removeAllListeners('close-tab');
      window.electronAPI.removeAllListeners('export-csv');
      window.electronAPI.removeAllListeners('export-json');
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [addQueryTab, removeQueryTab, state.activeTabId]);

  const activeConnection = state.connections.find(c => c.id === state.activeConnectionId);

  return (
    <div className="app">
      <div className="top-bar" />
      <Sidebar
        connections={state.connections}
        activeConnectionId={state.activeConnectionId}
        schemas={state.schemas}
        connectionErrors={connectionErrors}
        connectingConnectionIds={connectingConnectionIds}
        onConnectionSelect={async (id) => {
          try {
            setConnectionErrors(prev => ({ ...prev, [id]: '' }));
            setConnectingConnectionIds(prev => new Set([...prev, id]));
            
            const connection = state.connections.find(c => c.id === id);
            if (connection) {
              await connect(connection);
              const schemas = await getSchemas(connection.id);
              setState(prev => ({ 
                ...prev, 
                activeConnectionId: id,
                schemas,
              }));
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setConnectionErrors(prev => ({ ...prev, [id]: errorMessage }));
          } finally {
            setConnectingConnectionIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(id);
              return newSet;
            });
          }
        }}
        onConnectionRemove={removeConnection}
        onNewConnection={() => setState(prev => ({ ...prev, showConnectionForm: true }))}
        onTableSelect={(schema, table) => {
          const sql = `SELECT * FROM ${schema}.${table} LIMIT 100;`;
          const newTab: QueryTab = {
            id: Date.now().toString(),
            title: `${schema}.${table}`,
            query: sql,
            isExecuting: false,
          };
          setState(prev => ({
            ...prev,
            queryTabs: [...prev.queryTabs, newTab],
            activeTabId: newTab.id,
          }));
        }}
      />
      
      <MainContent
        queryTabs={state.queryTabs}
        activeTabId={state.activeTabId}
        activeConnection={activeConnection}
        onTabSelect={(id) => setState(prev => ({ ...prev, activeTabId: id }))}
        onTabClose={removeQueryTab}
        onNewTab={addQueryTab}
        onQueryChange={(tabId, query) => updateQueryTab(tabId, { query })}
        onQueryExecute={executeQuery}
        schemas={state.schemas}
      />

      {state.showConnectionForm && (
        <ConnectionForm
          onConnect={addConnection}
          onCancel={() => setState(prev => ({ ...prev, showConnectionForm: false }))}
          isConnecting={state.isConnecting}
        />
      )}
    </div>
  );
};