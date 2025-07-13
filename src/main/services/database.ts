import { Client } from 'pg';
import { DatabaseConnection, QueryResult, SchemaInfo, TableInfo, ColumnInfo } from '../preload';

export class DatabaseService {
  private connections: Map<string, Client> = new Map();

  async connect(config: DatabaseConnection, password: string): Promise<string> {
    const client = new Client({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: password,
      ssl: config.ssl,
    });

    try {
      await client.connect();
      this.connections.set(config.id, client);
      return config.id;
    } catch (error) {
      throw new Error(`Failed to connect to database: ${error}`);
    }
  }

  async disconnect(connectionId: string): Promise<void> {
    const client = this.connections.get(connectionId);
    if (client) {
      await client.end();
      this.connections.delete(connectionId);
    }
  }

  async query(connectionId: string, sql: string): Promise<QueryResult> {
    const client = this.connections.get(connectionId);
    if (!client) {
      throw new Error('Connection not found');
    }

    const startTime = Date.now();
    try {
      const result = await client.query(sql);
      const duration = Date.now() - startTime;
      
      return {
        rows: result.rows,
        fields: result.fields,
        rowCount: result.rowCount || 0,
        duration,
      };
    } catch (error) {
      throw new Error(`Query failed: ${error}`);
    }
  }

  async getSchemas(connectionId: string): Promise<SchemaInfo[]> {
    const sql = `
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name;
    `;

    const result = await this.query(connectionId, sql);
    const schemas: SchemaInfo[] = [];

    for (const row of result.rows) {
      const tables = await this.getTables(connectionId, row.schema_name as string);
      schemas.push({
        name: row.schema_name as string,
        tables,
      });
    }

    return schemas;
  }

  async getTables(connectionId: string, schema: string): Promise<TableInfo[]> {
    const sql = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    const result = await this.query(connectionId, sql.replace('$1', `'${schema}'`));
    const tables: TableInfo[] = [];

    for (const row of result.rows) {
      const columns = await this.getTableColumns(connectionId, schema, row.table_name as string);
      tables.push({
        name: row.table_name as string,
        schema,
        columns,
      });
    }

    return tables;
  }

  async getTableSchema(connectionId: string, schema: string, table: string): Promise<TableInfo> {
    const columns = await this.getTableColumns(connectionId, schema, table);
    return {
      name: table,
      schema,
      columns,
    };
  }

  private async getTableColumns(connectionId: string, schema: string, table: string): Promise<ColumnInfo[]> {
    const sql = `
      SELECT 
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
        CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.table_schema = '${schema}'
        AND tc.table_name = '${table}'
        AND tc.constraint_type = 'PRIMARY KEY'
      ) pk ON c.column_name = pk.column_name
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.table_schema = '${schema}'
        AND tc.table_name = '${table}'
        AND tc.constraint_type = 'FOREIGN KEY'
      ) fk ON c.column_name = fk.column_name
      WHERE c.table_schema = '${schema}'
      AND c.table_name = '${table}'
      ORDER BY c.ordinal_position;
    `;

    const result = await this.query(connectionId, sql);
    
    return result.rows.map(row => ({
      name: row.column_name as string,
      type: row.data_type as string,
      nullable: row.is_nullable === 'YES',
      default: row.column_default as string | null,
      isPrimaryKey: row.is_primary_key as boolean,
      isForeignKey: row.is_foreign_key as boolean,
    }));
  }
}