import { contextBridge, ipcRenderer } from 'electron';

export interface DatabaseConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  ssl?: boolean;
  maxConnections?: number;
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

let hasOpenTabsCallback: (() => boolean) | null = null;

contextBridge.exposeInMainWorld('electronAPI', {
  database: {
    connect: (config: DatabaseConnection) => 
      ipcRenderer.invoke('db:connect', config),
    disconnect: (connectionId: string) => 
      ipcRenderer.invoke('db:disconnect', connectionId),
    query: (connectionId: string, sql: string, params: any[], schema?: string, queryId?: string) =>
      ipcRenderer.invoke('db:query', connectionId, sql, params, schema, queryId),
    cancelQuery: (queryId: string) =>
      ipcRenderer.invoke('db:cancelQuery', queryId),
    getSchemas: (connectionId: string) => 
      ipcRenderer.invoke('db:getSchemas', connectionId),
    getTables: (connectionId: string, schema: string) => 
      ipcRenderer.invoke('db:getTables', connectionId, schema),
    getTableSchema: (connectionId: string, schema: string, table: string) => 
      ipcRenderer.invoke('db:getTableSchema', connectionId, schema, table),
    getSchemaTableSchemas: (connectionId: string, schema: string) => 
      ipcRenderer.invoke('db:getSchemaTableSchemas', connectionId, schema),
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
  setHasOpenTabsCallback: (callback: () => boolean) => {
    hasOpenTabsCallback = callback;
  },
  hasOpenTabs: () => {
    return hasOpenTabsCallback ? hasOpenTabsCallback() : false;
  },
  theme: {
    get: () => ipcRenderer.invoke('theme:get'),
    onChange: (callback: (isDark: boolean) => void) => {
      ipcRenderer.on('theme:changed', (_, isDark) => callback(isDark));
    },
    removeChangeListener: () => {
      ipcRenderer.removeAllListeners('theme:changed');
    },
  },
  file: {
    saveQuery: (content: string) => ipcRenderer.invoke('file:saveQuery', content),
    loadQuery: () => ipcRenderer.invoke('file:loadQuery'),
  },
  ai: {
    generateTabName: (query: string, credentials: any) => 
      ipcRenderer.invoke('ai:generateTabName', query, credentials),
    generateSQL: (prompt: string, schemas: any[], credentials: any) => 
      ipcRenderer.invoke('ai:generateSQL', prompt, schemas, credentials),
    validateCredentials: (credentials: any) => 
      ipcRenderer.invoke('ai:validateCredentials', credentials),
    setCredentials: (provider: string, credentials: string) => 
      ipcRenderer.invoke('ai:setCredentials', provider, credentials),
    getCredentials: (provider: string) => 
      ipcRenderer.invoke('ai:getCredentials', provider),
    deleteCredentials: (provider: string) => 
      ipcRenderer.invoke('ai:deleteCredentials', provider),
  },
});

declare global {
  interface Window {
    electronAPI: {
      database: {
        connect: (config: DatabaseConnection) => Promise<{ connectionId: string; error?: string }>;
        disconnect: (connectionId: string) => Promise<void>;
        query: (connectionId: string, sql: string, params: any[], schema?: string, queryId?: string) => Promise<QueryResult>;
        cancelQuery: (queryId: string) => Promise<void>;
        getSchemas: (connectionId: string) => Promise<SchemaInfo[]>;
        getTables: (connectionId: string, schema: string) => Promise<TableInfo[]>;
        getTableSchema: (connectionId: string, schema: string, table: string) => Promise<TableInfo | undefined>;
        getSchemaTableSchemas: (connectionId: string, schema: string) => Promise<TableInfo[]>;
      };
      keychain: {
        set: (service: string, account: string, password: string) => Promise<void>;
        get: (service: string, account: string) => Promise<string | null>;
        delete: (service: string, account: string) => Promise<void>;
      };
      on: (channel: string, callback: (...args: unknown[]) => void) => void;
      removeAllListeners: (channel: string) => void;
      setHasOpenTabsCallback: (callback: () => boolean) => void;
      hasOpenTabs: () => boolean;
      theme: {
        get: () => Promise<boolean>;
        onChange: (callback: (isDark: boolean) => void) => void;
        removeChangeListener: () => void;
      };
      file: {
        saveQuery: (content: string) => Promise<string | null>;
        loadQuery: () => Promise<string | null>;
      };
      ai: {
        generateTabName: (query: string, credentials: any) => Promise<string>;
        generateSQL: (prompt: string, schemas: any[], credentials: any) => Promise<string>;
        validateCredentials: (credentials: any) => Promise<boolean>;
        setCredentials: (provider: string, credentials: string) => Promise<void>;
        getCredentials: (provider: string) => Promise<string | null>;
        deleteCredentials: (provider: string) => Promise<void>;
      };
    };
  }
}