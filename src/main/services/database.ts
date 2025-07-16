import { Pool } from 'pg';
import format from 'pg-format';
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

  async query(connectionId: string, sql: string, params: any[] = [], schema?: string): Promise<QueryResult> {
    const pool = this.pools.get(connectionId);
    if (!pool) {
      throw new Error('Connection not found');
    }

    const client = await pool.connect();
    const startTime = Date.now();
    try {
      await client.query('BEGIN');

      if (schema) {
        const sql = format('SET search_path = %L, public', schema);
        await client.query(sql);
      }

      const statements = this.splitStatements(sql);
      let lastResult: any;

      for (const statement of statements) {
        if (statement.trim()) {
          lastResult = await client.query(statement, params);
        }
      }

      await client.query('COMMIT');
      const duration = Date.now() - startTime;
      
      return {
        rows: lastResult.rows,
        fields: lastResult.fields,
        rowCount: lastResult.rowCount || 0,
        duration,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Query failed: ${error}`);
    } finally {
      client.release();
    }
  }

  private splitStatements(sql: string): string[] {
    const statements: string[] = [];
    let currentStatement = '';
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const nextChar = sql[i + 1];

      if (inString) {
        if (char === stringChar) {
          if (nextChar === stringChar) {
            // Escaped string literal
            currentStatement += char + nextChar;
            i++;
          } else {
            inString = false;
            currentStatement += char;
          }
        } else {
          currentStatement += char;
        }
      } else {
        if (char === "'" || char === '"') {
          inString = true;
          stringChar = char;
          currentStatement += char;
        } else if (char === ';') {
          statements.push(currentStatement);
          currentStatement = '';
        } else {
          currentStatement += char;
        }
      }
    }

    if (currentStatement.trim()) {
      statements.push(currentStatement);
    }

    return statements;
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
        columns: [],
      });
    }

    return Array.from(schemasMap.values());
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