import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import { QueryResult } from '../types';
import { exportToCSV, exportToJSON } from '../utils/export';

interface VirtualDataTableProps {
  result: QueryResult;
}

interface ColumnState {
  width: number;
  isResizing: boolean;
}

const HEADER_HEIGHT = 40;
const ROW_HEIGHT = 35;
const MIN_COLUMN_WIDTH = 50;
const DEFAULT_COLUMN_WIDTH = 150;

export const VirtualDataTable: React.FC<VirtualDataTableProps> = ({ result }) => {
  const { rows = [], fields = [], rowCount = 0, duration = 0 } = result || {};
  const [columns, setColumns] = useState<Record<string, ColumnState>>(() => {
    const initial: Record<string, ColumnState> = {};
    fields.forEach(field => {
      initial[field.name] = { width: DEFAULT_COLUMN_WIDTH, isResizing: false };
    });
    return initial;
  });
  const [filterText, setFilterText] = useState('');

  const listRef = useRef<List>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const resizeState = useRef<{
    columnName: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  // Update columns when fields change
  useEffect(() => {
    setColumns(prev => {
      const newColumns: Record<string, ColumnState> = {};
      fields.forEach(field => {
        newColumns[field.name] = prev[field.name] || { width: DEFAULT_COLUMN_WIDTH, isResizing: false };
      });
      return newColumns;
    });
  }, [fields]);

  const handleMouseDown = useCallback((e: React.MouseEvent, columnName: string) => {
    e.preventDefault();
    e.stopPropagation();

    const currentWidth = columns[columnName]?.width || DEFAULT_COLUMN_WIDTH;

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
      const newWidth = Math.max(MIN_COLUMN_WIDTH, currentResize.startWidth + diff);

      setColumns(prev => ({
        ...prev,
        [currentResize.columnName]: {
          ...prev[currentResize.columnName],
          width: newWidth,
          isResizing: true,
        },
      }));
    };

    const handleMouseUp = () => {
      const currentResize = resizeState.current;
      if (!currentResize) return;

      setColumns(prev => ({
        ...prev,
        [currentResize.columnName]: {
          ...prev[currentResize.columnName],
          isResizing: false,
        },
      }));

      resizeState.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columns]);

  const handleExportCSV = useCallback(() => {
    exportToCSV(result);
  }, [result]);

  const handleExportJSON = useCallback(() => {
    exportToJSON(result);
  }, [result]);

  // Filter rows based on filter text
  const filteredRows = useMemo(() => {
    if (!filterText) return rows;
    
    const lowerFilter = filterText.toLowerCase();
    return rows.filter(row => {
      return fields.some(field => {
        const value = row[field.name];
        if (value === null) return false;
        return String(value).toLowerCase().includes(lowerFilter);
      });
    });
  }, [rows, fields, filterText]);

  // Row renderer for virtual list
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const row = filteredRows[index];
    if (!row) return null;

    return (
      <div style={style}>
        <div style={{ display: 'flex', height: ROW_HEIGHT }}>
          {fields.map((field, fieldIndex) => {
            const columnState = columns[field.name] || { width: DEFAULT_COLUMN_WIDTH, isResizing: false };
            const value = row[field.name];
            
            return (
              <div
                key={field.name}
                style={{
                  width: columnState.width,
                  minWidth: columnState.width,
                  maxWidth: columnState.width,
                  borderRight: fieldIndex < fields.length - 1 ? '1px solid var(--border-primary)' : 'none',
                  borderBottom: '1px solid var(--border-primary)',
                  backgroundColor: 'var(--bg-primary)',
                  padding: '6px 12px',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  boxSizing: 'border-box',
                }}
              >
                {value === null ? (
                  <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '11px' }}>
                    NULL
                  </span>
                ) : typeof value === 'object' ? (
                  <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                    {JSON.stringify(value)}
                  </span>
                ) : (
                  String(value)
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }, [filteredRows, fields, columns]);

  if (!fields.length || !rows.length) {
    return (
      <div className="empty-results">
        <p>No results to display</p>
      </div>
    );
  }

  const totalWidth = fields.reduce((sum, field) => {
    return sum + (columns[field.name]?.width || DEFAULT_COLUMN_WIDTH);
  }, 0);

  return (
    <div className="virtual-data-table" ref={containerRef}>
      <div className="results-header">
        <div className="results-info">
          <span className="row-count">{rowCount.toLocaleString()} rows</span>
          <span className="duration">{duration}ms</span>
          {filterText && <span className="filtered-count">{filteredRows.length} filtered</span>}
        </div>
        <div className="results-actions">
          <input
            type="text"
            placeholder="Filter results..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="filter-input"
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              borderRadius: '4px',
              border: '1px solid var(--border-primary)',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              minWidth: '150px',
              marginRight: '8px',
            }}
          />
          <button onClick={handleExportCSV} className="export-btn">
            Export CSV
          </button>
          <button onClick={handleExportJSON} className="export-btn">
            Export JSON
          </button>
        </div>
      </div>

      <div className="virtual-table-container" style={{ height: 'calc(100% - 40px)', display: 'flex', flexDirection: 'column' }}>
        {/* Fixed Header */}
        <div 
          ref={headerRef}
          style={{ 
            height: HEADER_HEIGHT,
            overflow: 'hidden',
            flexShrink: 0,
            borderBottom: '2px solid var(--border-primary)',
            backgroundColor: 'var(--bg-secondary)',
          }}
        >
          <div style={{ display: 'flex', height: HEADER_HEIGHT, width: totalWidth }}>
            {fields.map((field, index) => {
              const columnState = columns[field.name] || { width: DEFAULT_COLUMN_WIDTH, isResizing: false };
              
              return (
                <div
                  key={field.name}
                  style={{
                    width: columnState.width,
                    minWidth: columnState.width,
                    maxWidth: columnState.width,
                    borderRight: index < fields.length - 1 ? '1px solid var(--border-primary)' : 'none',
                    backgroundColor: columnState.isResizing ? 'var(--accent-secondary)' : 'var(--bg-secondary)',
                    padding: '0 12px',
                    fontWeight: 600,
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    boxSizing: 'border-box',
                    position: 'relative',
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
                      zIndex: 10,
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
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable Body */}
        <div 
          style={{ flex: 1, overflow: 'auto' }}
          onScroll={(e) => {
            if (headerRef.current) {
              headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
            }
          }}
        >
          <List
            ref={listRef}
            height={400} // This will be overridden by the parent container
            itemCount={filteredRows.length}
            itemSize={ROW_HEIGHT}
            width={totalWidth}
          >
            {Row}
          </List>
        </div>
      </div>
    </div>
  );
};