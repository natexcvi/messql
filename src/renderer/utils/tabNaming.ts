export function generateTabName(query: string): string {
  // Remove comments and normalize whitespace
  const cleanQuery = query
    .replace(/--.*$/gm, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .toLowerCase();

  // Extract main operation
  const operation = cleanQuery.match(/^(select|insert|update|delete|create|drop|alter|truncate)/)?.[1] || 'query';

  // Extract table names
  const tableMatches = cleanQuery.match(/(?:from|into|update|table)\s+([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)/gi);
  const tables = tableMatches
    ?.map(match => match.replace(/^(from|into|update|table)\s+/i, ''))
    .filter((table, index, self) => self.indexOf(table) === index) || [];

  // Extract column names for SELECT queries
  let columns: string[] = [];
  if (operation === 'select') {
    const selectMatch = cleanQuery.match(/select\s+(.+?)\s+from/);
    if (selectMatch) {
      const columnsPart = selectMatch[1];
      if (columnsPart === '*') {
        columns = ['all'];
      } else {
        columns = columnsPart
          .split(',')
          .map(col => col.trim().split(/\s+as\s+/i).pop()?.split('.').pop() || '')
          .filter(col => col && col !== '')
          .slice(0, 3); // Limit to first 3 columns
      }
    }
  }

  // Generate descriptive name
  if (operation === 'select' && tables.length > 0) {
    const tableName = tables[0].split('.').pop();
    if (columns.length > 0 && columns[0] !== 'all') {
      return `${tableName} (${columns.join(', ')})`;
    }
    return `${tableName} - ${operation}`;
  }

  if (tables.length > 0) {
    const tableList = tables.map(t => t.split('.').pop()).join(', ');
    return `${operation} ${tableList}`;
  }

  // Check for specific query patterns
  if (cleanQuery.includes('show tables')) return 'Show Tables';
  if (cleanQuery.includes('show databases')) return 'Show Databases';
  if (cleanQuery.includes('show schemas')) return 'Show Schemas';
  if (cleanQuery.includes('describe') || cleanQuery.includes('desc ')) return 'Describe Table';
  
  // Default to operation or 'Query'
  return operation.charAt(0).toUpperCase() + operation.slice(1);
}