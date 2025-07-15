import { Pool } from 'pg';
import { DatabaseConnection, QueryResult, SchemaInfo, TableInfo, ColumnInfo } from '../preload';

export class DatabaseService {
  private pools: Map<string, Pool> = new Map();

  async connect(config: DatabaseConnection, password: string): Promise<{ connectionId: string; error?: string }> {
    const pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: password,
      ssl: config.ssl,
      max: config.maxConnections || 10,
    });

    try {
      // Test the connection
      const client = await pool.connect();
      client.release();

      this.pools.set(config.id, pool);
      return { connectionId: config.id };
    } catch (error) {
      return { connectionId: config.id, error: (error as Error).message };
    }
  }

  async disconnect(connectionId: string): Promise<void> {
    const pool = this.pools.get(connectionId);
    if (pool) {
      await pool.end();
      this.pools.delete(connectionId);
    }
  }

  async query(connectionId: string, sql: string, params: any[] = []): Promise<QueryResult> {
    const pool = this.pools.get(connectionId);
    if (!pool) {
      throw new Error('Connection not found');
    }

    const startTime = Date.now();
    try {
      const result = await pool.query(sql, params);
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
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      AND table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name;
    `;

    const result = await this.query(connectionId, sql);
    const schemasMap = new Map<string, SchemaInfo>();

    for (const row of result.rows) {
      const schemaName = row.table_schema as string;
      if (!schemasMap.has(schemaName)) {
        schemasMap.set(schemaName, { name: schemaName, tables: [] });
      }
      schemasMap.get(schemaName)!.tables.push({
        name: row.table_name as string,
        schema: schemaName,
        columns: [], // Initially empty, to be lazy-loaded
      });
    }

    return Array.from(schemasMap.values());
  }

  async getTableColumns(connectionId: string, schema: string, table: string): Promise<ColumnInfo[]> {
    const sql = `
      SELECT
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default
      FROM information_schema.columns c
      WHERE c.table_schema = $1 AND c.table_name = $2
      ORDER BY c.ordinal_position;
    `;

    const result = await this.query(connectionId, sql, [schema, table]);
    return result.rows.map(row => ({
      name: row.column_name as string,
      type: row.data_type as string,
      nullable: row.is_nullable === 'YES',
      default: row.column_default as string | null,
      isPrimaryKey: false, // This info is not essential for autocomplete
      isForeignKey: false, // and can be fetched later if needed
    }));
  }

  async getTableSchema(connectionId: string, schema: string, table: string): Promise<TableInfo> {
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
        SELECT ku.table_schema, ku.table_name, ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.table_schema = $1 AND tc.table_name = $2 AND tc.constraint_type = 'PRIMARY KEY'
      ) pk ON c.table_schema = pk.table_schema AND c.table_name = pk.table_name AND c.column_name = pk.column_name
      LEFT JOIN (
        SELECT ku.table_schema, ku.table_name, ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.table_schema = $1 AND tc.table_name = $2 AND tc.constraint_type = 'FOREIGN KEY'
      ) fk ON c.table_schema = fk.table_schema AND c.table_name = fk.table_name AND c.column_name = fk.column_name
      WHERE c.table_schema = $1 AND c.table_name = $2
      ORDER BY c.ordinal_position;
    `;

    const result = await this.query(connectionId, sql, [schema, table]);
    const columns = result.rows.map(row => ({
      name: row.column_name as string,
      type: row.data_type as string,
      nullable: row.is_nullable === 'YES',
      default: row.column_default as string | null,
      isPrimaryKey: row.is_primary_key as boolean,
      isForeignKey: row.is_foreign_key as boolean,
    }));

    return {
      name: table,
      schema,
      columns,
    };
  }
}