export interface DatabaseConnection {
  type: 'postgresql' | 'mysql';
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

export interface QueryTab {
  id: string;
  title: string;
  query: string;
  result?: QueryResult;
  isExecuting: boolean;
  error?: string;
}

export interface AppState {
  connections: DatabaseConnection[];
  activeConnectionId: string | null;
  schemas: SchemaInfo[];
  queryTabs: QueryTab[];
  activeTabId: string | null;
  isConnecting: boolean;
  showConnectionForm: boolean;
}