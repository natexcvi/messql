import { useCallback } from 'react';
import { DatabaseConnection, QueryResult, SchemaInfo, TableInfo } from '../types';

export const useDatabase = () => {
  const connect = useCallback(async (connection: DatabaseConnection): Promise<{ error?: string }> => {
    // For restored connections, we might not have a password in keychain yet
    // In that case, we'll need to prompt the user for the password
    const password = await window.electronAPI.keychain.get('postgres', connection.id);
    
    if (!password) {
      return { error: `Password not found in keychain for connection "${connection.name}". Please reconnect to save the password.` };
    }

    // Connect to database
    await window.electronAPI.database.connect(connection);
    return {};
  }, []);

  const disconnect = useCallback(async (connectionId: string): Promise<void> => {
    await window.electronAPI.database.disconnect(connectionId);
  }, []);

  const query = useCallback(async (connectionId: string, sql: string, params: any[] = [], schema?: string): Promise<QueryResult> => {
    return await window.electronAPI.database.query(connectionId, sql, params, schema);
  }, []);

  const getSchemas = useCallback(async (connectionId: string): Promise<SchemaInfo[]> => {
    return await window.electronAPI.database.getSchemas(connectionId);
  }, []);

  const getTables = useCallback(async (connectionId: string, schema: string): Promise<TableInfo[]> => {
    return await window.electronAPI.database.getTables(connectionId, schema);
  }, []);

  const getTableSchema = useCallback(async (connectionId: string, schema: string, table: string): Promise<TableInfo | undefined> => {
    return await window.electronAPI.database.getTableSchema(connectionId, schema, table);
  }, []);

  const getSchemaTableSchemas = useCallback(async (connectionId: string, schema: string): Promise<TableInfo[]> => {
    return await window.electronAPI.database.getSchemaTableSchemas(connectionId, schema);
  }, []);

  const savePassword = useCallback(async (connectionId: string, password: string): Promise<void> => {
    await window.electronAPI.keychain.set('postgres', connectionId, password);
  }, []);

  const getPassword = useCallback(async (connectionId: string): Promise<string | null> => {
    return await window.electronAPI.keychain.get('postgres', connectionId);
  }, []);

  const deletePassword = useCallback(async (connectionId: string): Promise<void> => {
    await window.electronAPI.keychain.delete('postgres', connectionId);
  }, []);

  return {
    connect,
    disconnect,
    query,
    getSchemas,
    getTables,
    getTableSchema,
    getSchemaTableSchemas,
    savePassword,
    getPassword,
    deletePassword,
  };
};