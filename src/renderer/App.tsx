import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';
import { ConnectionForm } from './components/ConnectionForm';
import { useDatabase } from './hooks/useDatabase';
import { DatabaseConnection, QueryTab, AppState } from './types';

export const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    connections: [],
    activeConnectionId: null,
    schemas: [],
    queryTabs: [],
    activeTabId: null,
    isConnecting: false,
    showConnectionForm: false,
  });

  const { connect, disconnect, query, getSchemas } = useDatabase();

  const addConnection = useCallback(async (connection: DatabaseConnection) => {
    setState(prev => ({ ...prev, isConnecting: true }));
    
    try {
      await connect(connection);
      const schemas = await getSchemas(connection.id);
      
      setState(prev => ({
        ...prev,
        connections: [...prev.connections, connection],
        activeConnectionId: connection.id,
        schemas,
        isConnecting: false,
        showConnectionForm: false,
      }));
    } catch (error) {
      console.error('Failed to connect:', error);
      setState(prev => ({ ...prev, isConnecting: false }));
    }
  }, [connect, getSchemas]);

  const removeConnection = useCallback(async (connectionId: string) => {
    await disconnect(connectionId);
    setState(prev => ({
      ...prev,
      connections: prev.connections.filter(c => c.id !== connectionId),
      activeConnectionId: prev.activeConnectionId === connectionId ? null : prev.activeConnectionId,
      schemas: prev.activeConnectionId === connectionId ? [] : prev.schemas,
    }));
  }, [disconnect]);

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
        title: sql.split('\n')[0].substring(0, 30) + '...' || 'Query',
      });
    } catch (error) {
      updateQueryTab(tabId, { 
        isExecuting: false, 
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

    window.electronAPI.on('new-connection', handleNewConnection);
    window.electronAPI.on('new-query', handleNewQuery);

    return () => {
      window.electronAPI.removeAllListeners('new-connection');
      window.electronAPI.removeAllListeners('new-query');
    };
  }, [addQueryTab]);

  const activeConnection = state.connections.find(c => c.id === state.activeConnectionId);

  return (
    <div className="app">
      <Sidebar
        connections={state.connections}
        activeConnectionId={state.activeConnectionId}
        schemas={state.schemas}
        onConnectionSelect={(id) => setState(prev => ({ ...prev, activeConnectionId: id }))}
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