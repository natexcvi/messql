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
  const { rows, fields, rowCount, duration } = result;
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
        <div className="data-table" style={{ overflow: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: 'max-content' }}>
            <thead>
              <tr>
                {fields.map((field, index) => {
                  const columnState = columns[field.name] || { width: 150, isResizing: false };
                  return (
                    <th
                      key={field.name}
                      style={{
                        width: columnState.width,
                        minWidth: columnState.width,
                        maxWidth: columnState.width,
                        position: 'sticky',
                        top: 0,
                        backgroundColor: columnState.isResizing ? '#eff6ff' : '#f8f9fa',
                        border: '1px solid #e5e5e5',
                        padding: '8px 12px',
                        fontSize: '11px',
                        fontWeight: 500,
                        color: '#374151',
                        textAlign: 'left',
                        userSelect: 'none',
                        zIndex: 10,
                      }}
                    >
                      {field.name}
                      {index < fields.length - 1 && (
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
                      )}
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