import { QueryResult } from '../types';

export const exportToCSV = (result: QueryResult, filename: string = 'query_results.csv') => {
  const { rows, fields } = result;
  
  // Create CSV header
  const headers = fields.map(field => field.name).join(',');
  
  // Create CSV rows
  const csvRows = rows.map(row => {
    return fields.map(field => {
      const value = row[field.name];
      if (value === null || value === undefined) {
        return '';
      }
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });
  
  const csvContent = [headers, ...csvRows].join('\n');
  
  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToJSON = (result: QueryResult, filename: string = 'query_results.json') => {
  const { rows, fields, rowCount, duration } = result;
  
  const exportData = {
    metadata: {
      rowCount,
      duration,
      exportedAt: new Date().toISOString(),
      fields: fields.map(field => ({
        name: field.name,
        dataTypeID: field.dataTypeID,
      })),
    },
    data: rows,
  };
  
  const jsonContent = JSON.stringify(exportData, null, 2);
  
  // Create and download file
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};