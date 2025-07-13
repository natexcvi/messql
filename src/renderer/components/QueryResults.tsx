import React from 'react';
import { QueryResult } from '../types';

interface QueryResultsProps {
  result?: QueryResult;
  error?: string;
  isExecuting: boolean;
}

export const QueryResults: React.FC<QueryResultsProps> = ({
  result,
  error,
  isExecuting,
}) => {
  if (isExecuting) {
    return (
      <div className="results-container">
        <div className="loading">
          <div>Executing query...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-container">
        <div className="error">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="results-container">
        <div className="empty-state">
          <div>No results yet</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
            Execute a query to see results here
          </div>
        </div>
      </div>
    );
  }

  const { rows, fields, rowCount, duration } = result;

  return (
    <div className="results-container">
      <div style={{ 
        padding: '10px', 
        backgroundColor: '#f8f8f8', 
        borderBottom: '1px solid #e0e0e0',
        fontSize: '12px',
        color: '#666'
      }}>
        {rowCount} rows returned in {duration}ms
      </div>
      
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table className="results-table">
          <thead>
            <tr>
              {fields.map((field, index) => (
                <th key={index}>{field.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {fields.map((field, fieldIndex) => (
                  <td key={fieldIndex}>
                    {row[field.name] === null ? (
                      <span style={{ color: '#999', fontStyle: 'italic' }}>NULL</span>
                    ) : (
                      String(row[field.name])
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};