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
        generateSQL: (prompt: string, schemas: any[], credentials: any, connectionId?: string) => Promise<string>;
        validateCredentials: (credentials: any) => Promise<boolean>;
        setCredentials: (provider: string, credentials: string) => Promise<void>;
        getCredentials: (provider: string) => Promise<string | null>;
        deleteCredentials: (provider: string) => Promise<void>;
      };
    };
  }
}