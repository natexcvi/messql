import { useCallback } from 'react';
import { DatabaseConnection, QueryResult, SchemaInfo, TableInfo } from '../types';

export const useDatabase = () => {
  const connect = useCallback(async (connection: DatabaseConnection): Promise<void> => {
    // First, try to get password from keychain
    const password = await window.electronAPI.keychain.get('postgres', connection.id);
    
    if (!password) {
      throw new Error('Password not found in keychain');
    }

    // Connect to database
    await window.electronAPI.database.connect({
      ...connection,
      // Password will be handled by the main process
    });
  }, []);

  const disconnect = useCallback(async (connectionId: string): Promise<void> => {
    await window.electronAPI.database.disconnect(connectionId);
  }, []);

  const query = useCallback(async (connectionId: string, sql: string): Promise<QueryResult> => {
    return await window.electronAPI.database.query(connectionId, sql);
  }, []);

  const getSchemas = useCallback(async (connectionId: string): Promise<SchemaInfo[]> => {
    return await window.electronAPI.database.getSchemas(connectionId);
  }, []);

  const getTables = useCallback(async (connectionId: string, schema: string): Promise<TableInfo[]> => {
    return await window.electronAPI.database.getTables(connectionId, schema);
  }, []);

  const getTableSchema = useCallback(async (connectionId: string, schema: string, table: string): Promise<TableInfo> => {
    return await window.electronAPI.database.getTableSchema(connectionId, schema, table);
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
    savePassword,
    getPassword,
    deletePassword,
  };
};