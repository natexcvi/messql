import React, { useState, useRef, useCallback } from 'react';
import { QueryResult } from '../types';
import { exportToCSV, exportToJSON } from '../utils/export';

interface DataTableProps {
  result: QueryResult;
}

interface ColumnState {
  width: number;
  isResizing: boolean;
}

export const DataTable: React.FC<DataTableProps> = ({ result }) => {
  const { rows = [], fields = [], rowCount = 0, duration = 0 } = result || {};
  const [columns, setColumns] = useState<Record<string, ColumnState>>(() => {
    const initial: Record<string, ColumnState> = {};
    fields.forEach(field => {
      initial[field.name] = { width: 150, isResizing: false };
    });
    return initial;
  });

  const resizeState = useRef<{
    columnName: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent, columnName: string) => {
    e.preventDefault();
    e.stopPropagation();

    const currentWidth = columns[columnName]?.width || 150;

    resizeState.current = {
      columnName,
      startX: e.clientX,
      startWidth: currentWidth,
    };

    setColumns(prev => ({
      ...prev,
      [columnName]: { 
        ...prev[columnName], 
        width: currentWidth, 
        isResizing: true 
      },
    }));

    const handleMouseMove = (e: MouseEvent) => {
      const currentResize = resizeState.current;
      if (!currentResize) return;

      const diff = e.clientX - currentResize.startX;
      const newWidth = Math.max(80, currentResize.startWidth + diff);

      setColumns(prev => ({
        ...prev,
        [currentResize.columnName]: {
          ...prev[currentResize.columnName],
          width: newWidth,
        },
      }));
    };

    const handleMouseUp = () => {
      const currentResize = resizeState.current;
      if (currentResize) {
        setColumns(prev => ({
          ...prev,
          [currentResize.columnName]: {
            ...prev[currentResize.columnName],
            isResizing: false,
          },
        }));
      }

      resizeState.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [columns]);

  const handleExportCSV = useCallback(() => {
    exportToCSV(result, `query_results_${new Date().toISOString().split('T')[0]}.csv`);
  }, [result]);

  const handleExportJSON = useCallback(() => {
    exportToJSON(result, `query_results_${new Date().toISOString().split('T')[0]}.json`);
  }, [result]);

  // Don't render if no fields or result
  if (!result || !fields || fields.length === 0) {
    return (
      <div className="results-container">
        <div className="results-header">
          <div className="results-info">No data to display</div>
        </div>
      </div>
    );
  }

  return (
    <div className="results-container" style={{ marginTop: 0, paddingTop: 0 }}>
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

      <div className="results-table-container" style={{ overflow: 'auto', marginTop: 0, paddingTop: 0 }}>
        <div className="data-table" style={{ marginTop: 0, paddingTop: 0 }}>
          <table style={{ borderCollapse: 'collapse', width: 'max-content', borderSpacing: 0, marginTop: 0 }}>
            <thead style={{ borderTop: '2px solid var(--border-primary)' }}>
              <tr style={{ borderTop: '2px solid var(--border-primary)' }}>
                {fields.map((field, index) => {
                  const columnState = columns[field.name] || { width: 150, isResizing: false };
                  return (
                    <th
                      key={field.name}
                      className="data-table-header"
                      style={{
                        width: columnState.width,
                        minWidth: columnState.width,
                        maxWidth: columnState.width,
                        backgroundColor: columnState.isResizing ? 'var(--accent-secondary)' : 'var(--bg-secondary)',
                        position: 'sticky',
                        top: -1,
                        zIndex: 20,
                        border: '1px solid var(--border-primary)',
                        borderTop: '2px solid var(--border-primary)',
                        margin: 0,
                        padding: '10px 12px',
                      }}
                    >
                      {field.name}
                      <div
                        style={{
                          position: 'absolute',
                          right: -2,
                          top: 0,
                          bottom: 0,
                          width: 4,
                          cursor: 'col-resize',
                          backgroundColor: columnState.isResizing ? '#3b82f6' : 'transparent',
                          zIndex: 11,
                        }}
                        onMouseDown={(e) => handleMouseDown(e, field.name)}
                        onMouseEnter={(e) => {
                          if (!resizeState.current) {
                            (e.target as HTMLElement).style.backgroundColor = '#3b82f6';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!resizeState.current) {
                            (e.target as HTMLElement).style.backgroundColor = 'transparent';
                          }
                        }}
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {fields.map((field) => {
                    const columnState = columns[field.name] || { width: 150, isResizing: false };
                    return (
                      <td
                        key={field.name}
                        style={{
                          width: columnState.width,
                          minWidth: columnState.width,
                          maxWidth: columnState.width,
                          border: '1px solid #f3f4f6',
                          padding: '6px 12px',
                          fontSize: '12px',
                          color: '#111827',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {row[field.name] === null ? (
                          <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '11px' }}>
                            NULL
                          </span>
                        ) : (
                          String(row[field.name])
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};