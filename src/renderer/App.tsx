import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "./components/Sidebar";
import { MainContent } from "./components/MainContent";
import { ConnectionForm } from "./components/ConnectionForm";
import { QueryHistory } from "./components/QueryHistory";
import { AISettingsModal } from "./components/AISettingsModal";
import { TextToSQLModal } from "./components/TextToSQLModal";
import { useDatabase } from "./hooks/useDatabase";
import { useTheme } from "./hooks/useTheme";
import { v4 as uuidv4 } from "uuid";
import {
  DatabaseConnection,
  QueryTab,
  AppState,
  SchemaInfo,
  TableInfo,
  QueryLogEntry,
} from "./types";
import { generateTabName } from "./utils/tabNaming";
import {
  generateSmartTabName,
  refreshTabName,
  clearCredentialsCache,
} from "./utils/aiTabNaming";
import { extractErrorMessage } from "./utils/errorHandling";

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
    loadingTableSchemas: new Set(),
    tableSchemaCache: {},
    loadingSchemaDetails: new Set(),
    queryLogs: [],
    showQueryHistory: false,
  });

  const [editingConnection, setEditingConnection] =
    useState<DatabaseConnection | null>(null);
  const [showAISettings, setShowAISettings] = useState(false);
  const [showTextToSQL, setShowTextToSQL] = useState(false);

  const [connectionErrors, setConnectionErrors] = useState<
    Record<string, string>
  >({});
  const [connectingConnectionIds, setConnectingConnectionIds] = useState<
    Set<string>
  >(new Set());

  // Load connections on startup
  useEffect(() => {
    const savedConnections = JSON.parse(
      localStorage.getItem("messql_connections") || "[]",
    );

    // Migration: Update connections that use old-style IDs to use UUIDs
    const migrateConnections = async () => {
      const migratedConnections: DatabaseConnection[] = [];
      let needsMigration = false;

      for (const conn of savedConnections) {
        // Check if connection uses old-style ID format (contains colons)
        if (conn.id.includes(":")) {
          const newId = uuidv4();
          const oldId = conn.id;

          console.log(
            `Migrating connection "${conn.name}" from ID "${oldId}" to "${newId}"`,
          );

          // Migrate keychain password from old ID to new ID
          try {
            const password = await window.electronAPI.keychain.get(
              "postgres",
              oldId,
            );
            if (password) {
              await window.electronAPI.keychain.set(
                "postgres",
                newId,
                password,
              );
              await window.electronAPI.keychain.delete("postgres", oldId);
              console.log(`Migrated password for connection "${conn.name}"`);
            }
          } catch (error) {
            console.warn(
              `Failed to migrate password for connection "${conn.name}":`,
              error,
            );
            // Continue with migration even if password migration fails
          }

          migratedConnections.push({ ...conn, id: newId });
          needsMigration = true;
        } else {
          migratedConnections.push(conn);
        }
      }

      // Save migrated connections back to localStorage if any were updated
      if (needsMigration) {
        localStorage.setItem(
          "messql_connections",
          JSON.stringify(migratedConnections),
        );
        console.log("Connection migration completed");
      }

      setState((prev) => ({
        ...prev,
        connections: migratedConnections,
      }));
    };

    migrateConnections();

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

  const {
    connect,
    disconnect,
    query,
    cancelQuery,
    getSchemas,
    getTableSchema,
    getSchemaTableSchemas,
  } = useDatabase();

  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Load default schema table schemas in background for immediate autocomplete
  const loadDefaultSchemaTableSchemas = useCallback(
    async (connectionId: string, schemas: SchemaInfo[]) => {
      // Find the default schema (prefer 'public', then first available)
      const defaultSchema =
        schemas.find((s) => s.name === "public") || schemas[0];
      if (!defaultSchema || defaultSchema.tables.length === 0) return;

      // Mark schema as loading
      setState((prev) => ({
        ...prev,
        loadingSchemaDetails: new Set([
          ...prev.loadingSchemaDetails,
          defaultSchema.name,
        ]),
      }));

      try {
        // Use the optimized method to load all table schemas at once
        const tableSchemas = await getSchemaTableSchemas(
          connectionId,
          defaultSchema.name,
        );

        // Update cache and schema state
        setState((prev) => {
          const newCache = { ...prev.tableSchemaCache };
          const updatedSchemas = prev.schemas.map((s) => {
            if (s.name !== defaultSchema.name) return s;

            // Replace the tables with the fully loaded table schemas
            return { ...s, tables: tableSchemas };
          });

          // Update cache
          tableSchemas.forEach((table) => {
            const tableKey = `${defaultSchema.name}.${table.name}`;
            newCache[tableKey] = table;
          });

          return {
            ...prev,
            schemas: updatedSchemas,
            tableSchemaCache: newCache,
            loadingSchemaDetails: new Set(
              [...prev.loadingSchemaDetails].filter(
                (s) => s !== defaultSchema.name,
              ),
            ),
          };
        });
      } catch (error) {
        console.error("Error loading default schema table schemas:", error);
        setState((prev) => ({
          ...prev,
          loadingSchemaDetails: new Set(
            [...prev.loadingSchemaDetails].filter(
              (s) => s !== defaultSchema.name,
            ),
          ),
        }));
      }
    },
    [getSchemaTableSchemas],
  );

  const addConnection = useCallback(
    async (connection: DatabaseConnection) => {
      setState((prev) => ({ ...prev, isConnecting: true }));
      setConnectionError(null);

      const { error } = await connect(connection);

      if (error) {
        setConnectionError(error);
        setState((prev) => ({ ...prev, isConnecting: false }));
        return;
      }

      const schemas = await getSchemas(connection.id);

      const updatedConnections = [...state.connections, connection];

      setState((prev) => ({
        ...prev,
        connections: updatedConnections,
        activeConnectionId: connection.id,
        schemas,
        isConnecting: false,
        showConnectionForm: false,
        tableSchemaCache: {}, // Clear cache when adding new connection
        loadingTableSchemas: new Set(), // Clear loading state
        loadingSchemaDetails: new Set(), // Clear schema loading state
      }));

      // Save to localStorage
      localStorage.setItem(
        "messql_connections",
        JSON.stringify(updatedConnections),
      );

      // Load default schema table schemas in background
      loadDefaultSchemaTableSchemas(connection.id, schemas);
    },
    [connect, getSchemas, state.connections, loadDefaultSchemaTableSchemas],
  );

  const removeConnection = useCallback(
    async (connectionId: string) => {
      await disconnect(connectionId);
      const updatedConnections = state.connections.filter(
        (c) => c.id !== connectionId,
      );

      setState((prev) => ({
        ...prev,
        connections: updatedConnections,
        activeConnectionId:
          prev.activeConnectionId === connectionId
            ? null
            : prev.activeConnectionId,
        schemas: prev.activeConnectionId === connectionId ? [] : prev.schemas,
      }));

      // Save to localStorage and remove from keychain
      localStorage.setItem(
        "messql_connections",
        JSON.stringify(updatedConnections),
      );
      // Connection removed from array above
    },
    [disconnect, state.connections],
  );

  const addQueryTab = useCallback(() => {
    // Default to 'public' schema for PostgreSQL
    const defaultSchema =
      state.schemas.find((s) => s.name === "public")?.name ||
      state.schemas[0]?.name ||
      "public";

    const newTab: QueryTab = {
      id: Date.now().toString(),
      title: "New Query",
      query: "",
      isExecuting: false,
      selectedSchema: defaultSchema,
    };

    setState((prev) => ({
      ...prev,
      queryTabs: [...prev.queryTabs, newTab],
      activeTabId: newTab.id,
    }));
  }, [state.schemas]);

  const removeQueryTab = useCallback((tabId: string) => {
    setState((prev) => {
      const updatedTabs = prev.queryTabs.filter((t) => t.id !== tabId);
      const newActiveTabId =
        prev.activeTabId === tabId
          ? updatedTabs.length > 0
            ? updatedTabs[0].id
            : null
          : prev.activeTabId;

      return {
        ...prev,
        queryTabs: updatedTabs,
        activeTabId: newActiveTabId,
      };
    });
  }, []);

  const updateQueryTab = useCallback(
    (tabId: string, updates: Partial<QueryTab>) => {
      setState((prev) => ({
        ...prev,
        queryTabs: prev.queryTabs.map((tab) =>
          tab.id === tabId ? { ...tab, ...updates } : tab,
        ),
      }));
    },
    [],
  );

  const executeQuery = useCallback(
    async (tabId: string, sql: string, params: any[] = []) => {
      if (!state.activeConnectionId) return;

      const queryId = `${tabId}-${Date.now()}`;
      const startTime = Date.now();
      const connection = state.connections.find(
        (c) => c.id === state.activeConnectionId,
      );

      updateQueryTab(tabId, {
        isExecuting: true,
        error: undefined,
        activeQueryId: queryId,
      });

      try {
        const tab = state.queryTabs.find((t) => t.id === tabId);
        const schema = tab?.selectedSchema;

        const result = await query(
          state.activeConnectionId,
          sql,
          params,
          schema,
          queryId,
        );
        const duration = Date.now() - startTime;

        // Log successful query
        const logEntry: QueryLogEntry = {
          id: queryId,
          connectionId: state.activeConnectionId,
          connectionName: connection?.name || "Unknown",
          query: sql,
          schema,
          timestamp: new Date(),
          duration,
          rowCount: result.rowCount,
          success: true,
        };

        setState((prev) => ({
          ...prev,
          queryLogs: [logEntry, ...prev.queryLogs].slice(0, 1000), // Keep last 1000 queries
        }));

        updateQueryTab(tabId, {
          result,
          isExecuting: false,
          error: undefined,
          activeQueryId: undefined,
          title: await generateSmartTabName(sql),
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = extractErrorMessage(error);

        // Log failed query
        const logEntry: QueryLogEntry = {
          id: queryId,
          connectionId: state.activeConnectionId,
          connectionName: connection?.name || "Unknown",
          query: sql,
          schema: state.queryTabs.find((t) => t.id === tabId)?.selectedSchema,
          timestamp: new Date(),
          duration,
          error: errorMessage,
          success: false,
        };

        setState((prev) => ({
          ...prev,
          queryLogs: [logEntry, ...prev.queryLogs].slice(0, 1000), // Keep last 1000 queries
        }));

        updateQueryTab(tabId, {
          isExecuting: false,
          result: undefined,
          error: errorMessage,
          activeQueryId: undefined,
        });
      }
    },
    [
      state.activeConnectionId,
      state.connections,
      state.queryTabs,
      query,
      updateQueryTab,
    ],
  );

  const handleCancelQuery = useCallback(
    async (tabId: string) => {
      const tab = state.queryTabs.find((t) => t.id === tabId);
      if (tab?.activeQueryId) {
        try {
          await cancelQuery(tab.activeQueryId);
          updateQueryTab(tabId, {
            isExecuting: false,
            activeQueryId: undefined,
            error: "Query cancelled by user",
          });
        } catch (error) {
          console.error("Error cancelling query:", error);
        }
      }
    },
    [state.queryTabs, cancelQuery, updateQueryTab],
  );

  const loadSchemaDetails = useCallback(
    async (connectionId: string, schemaName: string) => {
      setState((prev) => ({
        ...prev,
        loadingSchemaDetails: new Set([
          ...prev.loadingSchemaDetails,
          schemaName,
        ]),
      }));

      try {
        const selectedSchemaInfo = state.schemas.find(
          (s) => s.name === schemaName,
        );
        if (!selectedSchemaInfo) return;

        const tableSchemaPromises = selectedSchemaInfo.tables.map(
          async (table) => {
            const tableKey = `${schemaName}.${table.name}`;
            if (state.tableSchemaCache[tableKey]) {
              return {
                key: tableKey,
                schema: state.tableSchemaCache[tableKey],
              };
            }
            try {
              const tableSchema = await getTableSchema(
                connectionId,
                schemaName,
                table.name,
              );
              return tableSchema
                ? { key: tableKey, schema: tableSchema }
                : null;
            } catch (error) {
              console.error(
                `Error loading schema for table ${table.name}:`,
                error,
              );
              return null;
            }
          },
        );

        const results = await Promise.all(tableSchemaPromises);

        setState((prev) => {
          const newCache = { ...prev.tableSchemaCache };
          const updatedSchemas = prev.schemas.map((s) => {
            if (s.name !== schemaName) return s;

            const updatedTables = s.tables.map((table) => {
              const result = results.find(
                (r) => r && r.key === `${schemaName}.${table.name}`,
              );
              return result ? result.schema : table;
            });

            return { ...s, tables: updatedTables };
          });

          results.forEach((result) => {
            if (result) {
              newCache[result.key] = result.schema;
            }
          });

          return {
            ...prev,
            schemas: updatedSchemas,
            tableSchemaCache: newCache,
            loadingSchemaDetails: new Set(
              [...prev.loadingSchemaDetails].filter((s) => s !== schemaName),
            ),
          };
        });
      } catch (error) {
        console.error("Error loading schema details:", error);
        setState((prev) => ({
          ...prev,
          loadingSchemaDetails: new Set(
            [...prev.loadingSchemaDetails].filter((s) => s !== schemaName),
          ),
        }));
      }
    },
    [state.schemas, state.tableSchemaCache, getTableSchema],
  );

  // Handle schema change for tabs
  const handleSchemaChange = useCallback(
    (tabId: string, schema: string) => {
      if (!state.activeConnectionId) return;

      updateQueryTab(tabId, { selectedSchema: schema });
      loadSchemaDetails(state.activeConnectionId, schema);
    },
    [state.activeConnectionId, updateQueryTab, loadSchemaDetails],
  );

  const saveConnection = useCallback(
    async (connection: DatabaseConnection) => {
      const updatedConnections = editingConnection
        ? state.connections.map((c) =>
            c.id === connection.id ? connection : c,
          )
        : [...state.connections, connection];

      setState((prev) => ({
        ...prev,
        connections: updatedConnections,
        showConnectionForm: false,
      }));

      setEditingConnection(null);
      localStorage.setItem(
        "messql_connections",
        JSON.stringify(updatedConnections),
      );

      // If we're editing the currently active connection, reconnect with new settings
      if (editingConnection && state.activeConnectionId === connection.id) {
        try {
          console.log(
            "Reconnecting to updated active connection:",
            connection.name,
          );

          // Disconnect first
          await disconnect(connection.id);

          // Wait a moment for clean disconnect
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Reconnect with new settings
          await connect(connection);

          console.log("Successfully reconnected to updated connection");
        } catch (error) {
          console.error("Failed to reconnect after connection update:", error);
          // Show error to user
          alert(
            `Connection updated but failed to reconnect: ${extractErrorMessage(error)}`,
          );
        }
      }
    },
    [
      state.connections,
      state.activeConnectionId,
      editingConnection,
      disconnect,
      connect,
    ],
  );

  const editConnection = useCallback((connection: DatabaseConnection) => {
    setEditingConnection(connection);
    setState((prev) => ({ ...prev, showConnectionForm: true, error: null }));
  }, []);

  useEffect(() => {
    const handleNewConnection = () => {
      setEditingConnection(null);
      setState((prev) => ({ ...prev, showConnectionForm: true, error: null }));
    };

    const handleAISettings = () => {
      setShowAISettings(true);
    };

    const handleTextToSQL = () => {
      setShowTextToSQL(true);
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
      if ((e.metaKey || e.ctrlKey) && e.key === "w") {
        e.preventDefault();
        if (state.activeTabId) {
          removeQueryTab(state.activeTabId);
        }
      }
    };

    window.electronAPI.on("new-connection", handleNewConnection);
    window.electronAPI.on("ai-settings", handleAISettings);
    window.electronAPI.on("text-to-sql", handleTextToSQL);
    window.electronAPI.on("new-query", handleNewQuery);
    window.electronAPI.on("close-tab", handleCloseTab);
    window.electronAPI.on("export-csv", handleExportCSV);
    window.electronAPI.on("export-json", handleExportJSON);

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.electronAPI.removeAllListeners("new-connection");
      window.electronAPI.removeAllListeners("ai-settings");
      window.electronAPI.removeAllListeners("text-to-sql");
      window.electronAPI.removeAllListeners("new-query");
      window.electronAPI.removeAllListeners("close-tab");
      window.electronAPI.removeAllListeners("export-csv");
      window.electronAPI.removeAllListeners("export-json");
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [addQueryTab, removeQueryTab, state.activeTabId]);

  const toggleQueryHistory = useCallback(() => {
    setState((prev) => ({ ...prev, showQueryHistory: !prev.showQueryHistory }));
  }, []);

  const handleRerunQuery = useCallback(
    async (query: string, schema?: string) => {
      if (!state.activeConnectionId) {
        alert("Please connect to a database first");
        return;
      }

      // Create a new tab with the query
      const newTab: QueryTab = {
        id: Date.now().toString(),
        title: await generateSmartTabName(query, { isRerun: true }),
        query: query,
        isExecuting: false,
        selectedSchema: schema || "public",
      };

      setState((prev) => ({
        ...prev,
        queryTabs: [...prev.queryTabs, newTab],
        activeTabId: newTab.id,
        showQueryHistory: false,
      }));
    },
    [state.activeConnectionId],
  );

  const activeConnection = state.connections.find(
    (c) => c.id === state.activeConnectionId,
  );

  return (
    <div className="app" data-testid="app-container">
      <div className="top-bar" data-testid="app-title" />
      <Sidebar
        connections={state.connections}
        activeConnectionId={state.activeConnectionId}
        schemas={state.schemas}
        connectionErrors={connectionErrors}
        connectingConnectionIds={connectingConnectionIds}
        loadingTableSchemas={state.loadingTableSchemas}
        onConnectionSelect={async (id) => {
          try {
            setConnectionErrors((prev) => ({ ...prev, [id]: "" }));
            setConnectingConnectionIds((prev) => new Set([...prev, id]));

            const connection = state.connections.find((c) => c.id === id);
            if (connection) {
              await connect(connection);
              const schemas = await getSchemas(connection.id);
              setState((prev) => ({
                ...prev,
                activeConnectionId: id,
                schemas,
                tableSchemaCache: {}, // Clear cache when switching connections
                loadingTableSchemas: new Set(), // Clear loading state
                loadingSchemaDetails: new Set(), // Clear schema loading state
              }));

              // Load default schema table schemas in background
              loadDefaultSchemaTableSchemas(connection.id, schemas);
            }
          } catch (error) {
            const errorMessage = extractErrorMessage(error);
            setConnectionErrors((prev) => ({ ...prev, [id]: errorMessage }));
          } finally {
            setConnectingConnectionIds((prev) => {
              const newSet = new Set(prev);
              newSet.delete(id);
              return newSet;
            });
          }
        }}
        onConnectionRemove={removeConnection}
        onConnectionEdit={editConnection}
        onNewConnection={() => {
          setEditingConnection(null);
          setState((prev) => ({
            ...prev,
            showConnectionForm: true,
            error: null,
          }));
        }}
        onTableSelect={async (schema, table) => {
          const tableKey = `${schema}.${table}`;

          // Check if we're already loading this table schema
          if (state.loadingTableSchemas.has(tableKey)) {
            return;
          }

          // Check if we already have this table schema in cache
          let tableSchema: TableInfo | undefined =
            state.tableSchemaCache[tableKey];

          if (!tableSchema) {
            // Mark as loading
            setState((prev) => ({
              ...prev,
              loadingTableSchemas: new Set([
                ...prev.loadingTableSchemas,
                tableKey,
              ]),
            }));

            try {
              tableSchema = await getTableSchema(
                state.activeConnectionId!,
                schema,
                table,
              );

              if (!tableSchema) {
                // Remove from loading state on error
                setState((prev) => ({
                  ...prev,
                  loadingTableSchemas: new Set(
                    [...prev.loadingTableSchemas].filter(
                      (key) => key !== tableKey,
                    ),
                  ),
                }));
                console.error("Table schema not found");
                return;
              }

              // Cache the result and update schemas
              const updatedSchemas = state.schemas.map((s) => {
                if (s.name === schema) {
                  return {
                    ...s,
                    tables: s.tables.map((t) =>
                      t.name === table ? tableSchema! : t,
                    ),
                  };
                }
                return s;
              });

              setState((prev) => ({
                ...prev,
                schemas: updatedSchemas,
                tableSchemaCache: {
                  ...prev.tableSchemaCache,
                  [tableKey]: tableSchema!,
                },
                loadingTableSchemas: new Set(
                  [...prev.loadingTableSchemas].filter(
                    (key) => key !== tableKey,
                  ),
                ),
              }));
            } catch (error) {
              // Remove from loading state on error
              setState((prev) => ({
                ...prev,
                loadingTableSchemas: new Set(
                  [...prev.loadingTableSchemas].filter(
                    (key) => key !== tableKey,
                  ),
                ),
              }));
              console.error("Error loading table schema:", error);
              return;
            }
          }

          const sql = `SELECT * FROM "${schema}"."${table}" LIMIT 100;`;
          const newTab: QueryTab = {
            id: Date.now().toString(),
            title: await generateSmartTabName(sql, {
              isTableSelect: true,
              schema,
              table,
            }),
            query: sql,
            isExecuting: false,
            selectedSchema: schema,
          };
          setState((prev) => ({
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
        onTabSelect={(id) => setState((prev) => ({ ...prev, activeTabId: id }))}
        onTabClose={removeQueryTab}
        onNewTab={addQueryTab}
        onQueryChange={(tabId, query) => updateQueryTab(tabId, { query })}
        onQueryExecute={executeQuery}
        onQueryCancel={handleCancelQuery}
        onSchemaChange={handleSchemaChange}
        schemas={state.schemas}
        onToggleHistory={toggleQueryHistory}
      />

      {state.showQueryHistory && (
        <QueryHistory
          queryLogs={state.queryLogs}
          onClose={toggleQueryHistory}
          onRerunQuery={handleRerunQuery}
        />
      )}

      {state.showConnectionForm && (
        <ConnectionForm
          onConnect={addConnection}
          onSave={saveConnection}
          onCancel={() => {
            setEditingConnection(null);
            setState((prev) => ({
              ...prev,
              showConnectionForm: false,
              error: null,
            }));
          }}
          isConnecting={state.isConnecting}
          error={connectionError}
          editConnection={editingConnection || undefined}
        />
      )}

      {showAISettings && (
        <AISettingsModal
          isOpen={showAISettings}
          onClose={() => setShowAISettings(false)}
          onSave={(credentials) => {
            console.log("AI credentials saved:", credentials);
            clearCredentialsCache(); // Clear cache so new credentials are used
            setShowAISettings(false);
          }}
        />
      )}

      {showTextToSQL && (
        <TextToSQLModal
          isOpen={showTextToSQL}
          onClose={() => setShowTextToSQL(false)}
          onGenerateSQL={(sql) => {
            // Create a new tab with the generated SQL immediately with a temporary name
            const newTabId = Date.now().toString();
            const newTab: QueryTab = {
              id: newTabId,
              title: "Generated SQL", // Temporary name
              query: sql,
              isExecuting: false,
              selectedSchema:
                state.queryTabs.find((tab) => tab.id === state.activeTabId)
                  ?.selectedSchema ||
                state.schemas[0]?.name ||
                "public",
            };

            setState((prev) => ({
              ...prev,
              queryTabs: [...prev.queryTabs, newTab],
              activeTabId: newTab.id,
            }));

            // Close modal immediately for responsive UX
            setShowTextToSQL(false);

            // Generate smart tab name in background
            generateSmartTabName(sql)
              .then((smartTitle) => {
                setState((prev) => ({
                  ...prev,
                  queryTabs: prev.queryTabs.map((tab) =>
                    tab.id === newTabId ? { ...tab, title: smartTitle } : tab,
                  ),
                }));
              })
              .catch(() => {
                // If AI naming fails, keep the temporary name
                console.log("AI tab naming failed, keeping temporary name");
              });
          }}
          schemas={state.schemas}
          activeConnectionId={state.activeConnectionId || undefined}
        />
      )}
    </div>
  );
};
