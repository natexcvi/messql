import { contextBridge, ipcRenderer } from 'electron';

export interface DatabaseConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  ssl?: boolean;
}

export interface QueryResult {
  rows: Record<string, unknown>[];
  fields: { name: string; dataTypeID: number }[];
  rowCount: number;
  duration: number;
}

export interface SchemaInfo {
  name: string;
  tables: TableInfo[];
}

export interface TableInfo {
  name: string;
  schema: string;
  columns: ColumnInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
}

contextBridge.exposeInMainWorld('electronAPI', {
  database: {
    connect: (config: DatabaseConnection) => 
      ipcRenderer.invoke('db:connect', config),
    disconnect: (connectionId: string) => 
      ipcRenderer.invoke('db:disconnect', connectionId),
    query: (connectionId: string, sql: string) => 
      ipcRenderer.invoke('db:query', connectionId, sql),
    getSchemas: (connectionId: string) => 
      ipcRenderer.invoke('db:getSchemas', connectionId),
    getTables: (connectionId: string, schema: string) => 
      ipcRenderer.invoke('db:getTables', connectionId, schema),
    getTableSchema: (connectionId: string, schema: string, table: string) => 
      ipcRenderer.invoke('db:getTableSchema', connectionId, schema, table),
  },
  keychain: {
    set: (service: string, account: string, password: string) => 
      ipcRenderer.invoke('keychain:set', service, account, password),
    get: (service: string, account: string) => 
      ipcRenderer.invoke('keychain:get', service, account),
    delete: (service: string, account: string) => 
      ipcRenderer.invoke('keychain:delete', service, account),
  },
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_, ...args) => callback(...args));
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

declare global {
  interface Window {
    electronAPI: {
      database: {
        connect: (config: DatabaseConnection) => Promise<string>;
        disconnect: (connectionId: string) => Promise<void>;
        query: (connectionId: string, sql: string) => Promise<QueryResult>;
        getSchemas: (connectionId: string) => Promise<SchemaInfo[]>;
        getTables: (connectionId: string, schema: string) => Promise<TableInfo[]>;
        getTableSchema: (connectionId: string, schema: string, table: string) => Promise<TableInfo>;
      };
      keychain: {
        set: (service: string, account: string, password: string) => Promise<void>;
        get: (service: string, account: string) => Promise<string | null>;
        delete: (service: string, account: string) => Promise<void>;
      };
      on: (channel: string, callback: (...args: unknown[]) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}