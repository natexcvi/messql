import { DatabaseConnection } from '../types';

const CONNECTIONS_KEY = 'messql_connections';

export interface StoredConnection {
  id: string;
  name: string;
  type: 'postgresql' | 'mysql';
  host: string;
  port: number;
  database: string;
  username: string;
  ssl?: boolean;
}

export const storageService = {
  saveConnections: (connections: DatabaseConnection[]): void => {
    try {
      // Only save connection info, not passwords (those go in keychain)
      const storedConnections: StoredConnection[] = connections.map(conn => ({
        id: conn.id,
        name: conn.name,
        type: conn.type,
        host: conn.host,
        port: conn.port,
        database: conn.database,
        username: conn.username,
        ssl: conn.ssl,
      }));
      
      localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(storedConnections));
    } catch (error) {
      console.error('Failed to save connections:', error);
    }
  },

  loadConnections: (): DatabaseConnection[] => {
    try {
      const stored = localStorage.getItem(CONNECTIONS_KEY);
      if (!stored) return [];
      
      const storedConnections: StoredConnection[] = JSON.parse(stored);
      return storedConnections.map(conn => ({
        id: conn.id,
        name: conn.name,
        type: conn.type || 'postgresql',
        host: conn.host,
        port: conn.port,
        database: conn.database,
        username: conn.username,
        ssl: conn.ssl,
      }));
    } catch (error) {
      console.error('Failed to load connections:', error);
      return [];
    }
  },

  removeConnection: (connectionId: string): void => {
    try {
      const connections = storageService.loadConnections();
      const updated = connections.filter(conn => conn.id !== connectionId);
      storageService.saveConnections(updated);
    } catch (error) {
      console.error('Failed to remove connection:', error);
    }
  },
};