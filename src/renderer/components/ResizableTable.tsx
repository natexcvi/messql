import React, { useState, useRef, useEffect, useCallback } from 'react';
import { QueryResult } from '../types';
import { exportToCSV, exportToJSON } from '../utils/export';

interface ResizableTableProps {
  result: QueryResult;
}

export const ResizableTable: React.FC<ResizableTableProps> = ({ result }) => {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  useEffect(() => {
    // Initialize column widths
    const initialWidths: Record<string, number> = {};
    result.fields.forEach(field => {
      initialWidths[field.name] = 150; // Default width
    });
    setColumnWidths(initialWidths);
  }, [result.fields]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingColumn) return;
    
    const diff = e.clientX - startXRef.current;
    const newWidth = Math.max(80, startWidthRef.current + diff); // Minimum width of 80px
    
    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn]: newWidth
    }));
  }, [resizingColumn]);

  const handleMouseUp = useCallback(() => {
    setResizingColumn(null);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
  }, [handleMouseMove]);

  useEffect(() => {
    if (resizingColumn) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [resizingColumn, handleMouseMove, handleMouseUp]);

  const handleMouseDown = (e: React.MouseEvent, columnName: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    startXRef.current = e.clientX;
    startWidthRef.current = columnWidths[columnName] || 150;
    setResizingColumn(columnName);
  };

  const { rows, fields, rowCount, duration } = result;

  const handleExportCSV = () => {
    exportToCSV(result, `query_results_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportJSON = () => {
    exportToJSON(result, `query_results_${new Date().toISOString().split('T')[0]}.json`);
  };

  return (
    <div className="results-container">
      <div className="results-header">
        <div className="results-info">
          {rowCount} rows returned in {duration}ms
        </div>
        <div className="export-buttons">
          <button onClick={handleExportCSV} className="export-btn">
            Export CSV
          </button>
          <button onClick={handleExportJSON} className="export-btn">
            Export JSON
          </button>
        </div>
      </div>
      
      <div className="results-table-container">
        <table ref={tableRef} className="results-table">
          <thead>
            <tr>
              {fields.map((field, index) => (
                <th
                  key={index}
                  style={{ width: columnWidths[field.name] || 150 }}
                  className={resizingColumn === field.name ? 'resizing' : ''}
                >
                  {field.name}
                  <div
                    className={`column-resizer ${resizingColumn === field.name ? 'resizing' : ''}`}
                    onMouseDown={(e) => handleMouseDown(e, field.name)}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {fields.map((field, fieldIndex) => (
                  <td 
                    key={fieldIndex}
                    style={{ width: columnWidths[field.name] || 150 }}
                  >
                    {row[field.name] === null ? (
                      <span className="null-value">NULL</span>
                    ) : typeof row[field.name] === 'object' ? (
                      <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                        {JSON.stringify(row[field.name])}
                      </span>
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