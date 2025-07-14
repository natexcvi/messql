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
    const schemasSql = `
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name;
    `;
    const schemasResult = await this.query(connectionId, schemasSql);
    const schemaNames = schemasResult.rows.map(row => row.schema_name as string);

    const tablesAndColumnsSql = `
      SELECT
        t.table_schema,
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
        CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key
      FROM information_schema.tables t
      JOIN information_schema.columns c ON t.table_schema = c.table_schema AND t.table_name = c.table_name
      LEFT JOIN (
        SELECT ku.table_schema, ku.table_name, ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
      ) pk ON c.table_schema = pk.table_schema AND c.table_name = pk.table_name AND c.column_name = pk.column_name
      LEFT JOIN (
        SELECT ku.table_schema, ku.table_name, ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
      ) fk ON c.table_schema = fk.table_schema AND c.table_name = fk.table_name AND c.column_name = fk.column_name
      WHERE t.table_schema = ANY($1)
      AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_schema, t.table_name, c.ordinal_position;
    `;

    const tablesAndColumnsResult = await this.query(connectionId, tablesAndColumnsSql, [schemaNames]);

    const schemasMap = new Map<string, SchemaInfo>();

    for (const schemaName of schemaNames) {
      schemasMap.set(schemaName, { name: schemaName, tables: [] });
    }

    for (const row of tablesAndColumnsResult.rows) {
      const schema = schemasMap.get(row.table_schema as string);
      if (schema) {
        let table = schema.tables.find(t => t.name === row.table_name);
        if (!table) {
          table = {
            name: row.table_name as string,
            schema: row.table_schema as string,
            columns: [],
          };
          schema.tables.push(table);
        }
        table.columns.push({
          name: row.column_name as string,
          type: row.data_type as string,
          nullable: row.is_nullable === 'YES',
          default: row.column_default as string | null,
          isPrimaryKey: row.is_primary_key as boolean,
          isForeignKey: row.is_foreign_key as boolean,
        });
      }
    }

    return Array.from(schemasMap.values());
  }

  async getTableSchema(connectionId: string, schema: string, table: string): Promise<TableInfo | undefined> {
    const schemas = await this.getSchemas(connectionId);
    const currentSchema = schemas.find(s => s.name === schema);
    return currentSchema?.tables.find(t => t.name === table);
  }
}