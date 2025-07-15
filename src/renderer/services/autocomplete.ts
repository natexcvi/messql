import { CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete';
import { SchemaInfo } from '../types';

export const createSQLCompletions = (schemas: SchemaInfo[]) => {
  return (context: CompletionContext): CompletionResult | null => {
    const word = context.matchBefore(/\w*/);
    if (!word) return null;

    const completions: Completion[] = [];

    // SQL keywords
    const sqlKeywords = [
      'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP',
      'ALTER', 'TABLE', 'INDEX', 'VIEW', 'FUNCTION', 'PROCEDURE', 'TRIGGER',
      'DATABASE', 'SCHEMA', 'GRANT', 'REVOKE', 'COMMIT', 'ROLLBACK', 'TRANSACTION',
      'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS', 'ON', 'USING',
      'GROUP', 'BY', 'ORDER', 'ASC', 'DESC', 'HAVING', 'LIMIT', 'OFFSET',
      'UNION', 'INTERSECT', 'EXCEPT', 'DISTINCT', 'ALL', 'EXISTS', 'IN', 'LIKE',
      'BETWEEN', 'IS', 'NULL', 'NOT', 'AND', 'OR', 'CASE', 'WHEN', 'THEN', 'ELSE',
      'END', 'AS', 'CAST', 'CONVERT', 'COALESCE', 'NULLIF', 'ISNULL'
    ];

    // Add SQL keywords
    sqlKeywords.forEach(keyword => {
      completions.push({
        label: keyword,
        type: 'keyword',
        boost: 10,
      });
    });

    // Add schema names
    schemas.forEach(schema => {
      completions.push({
        label: schema.name,
        type: 'namespace',
        boost: 50,
      });

      // Add table names
      schema.tables.forEach(table => {
        completions.push({
          label: table.name,
          type: 'class',
          boost: 40,
          detail: `${schema.name}.${table.name}`,
        });

        // Add qualified table names
        completions.push({
          label: `${schema.name}.${table.name}`,
          type: 'class',
          boost: 45,
        });

        // Add column names
        table.columns.forEach(column => {
          completions.push({
            label: column.name,
            type: 'property',
            boost: 30,
            detail: `${table.name}.${column.name} (${column.type})`,
          });

          // Add qualified column names
          completions.push({
            label: `${table.name}.${column.name}`,
            type: 'property',
            boost: 35,
            detail: `${column.type}`,
          });
        });
      });
    });

    // PostgreSQL functions
    const pgFunctions = [
      'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'ARRAY_AGG', 'STRING_AGG',
      'CONCAT', 'SUBSTRING', 'LENGTH', 'UPPER', 'LOWER', 'TRIM', 'LTRIM', 'RTRIM',
      'NOW', 'CURRENT_DATE', 'CURRENT_TIME', 'CURRENT_TIMESTAMP', 'EXTRACT',
      'DATE_TRUNC', 'AGE', 'INTERVAL', 'TO_CHAR', 'TO_DATE', 'TO_NUMBER',
      'GENERATE_SERIES', 'UNNEST', 'ARRAY_LENGTH', 'CARDINALITY',
      'JSON_AGG', 'JSON_OBJECT_AGG', 'JSON_EXTRACT_PATH', 'JSON_EXTRACT_PATH_TEXT',
      'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'LAG', 'LEAD', 'FIRST_VALUE', 'LAST_VALUE'
    ];

    pgFunctions.forEach(func => {
      completions.push({
        label: func,
        type: 'function',
        boost: 20,
      });
    });

    return {
      from: word.from,
      options: completions,
    };
  };
};