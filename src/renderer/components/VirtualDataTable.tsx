import React, { useState, useRef, useCallback, useMemo, CSSProperties, useEffect } from 'react';
import { VariableSizeGrid as Grid } from 'react-window';
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

  const gridRef = useRef<Grid>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 800, height: 600 });
  
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

  // Handle container resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerDimensions({
          width: rect.width,
          height: rect.height - 40, // Subtract header height
        });
      }
    };

    updateDimensions();
    
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Calculate total width for the grid
  const totalWidth = useMemo(() => {
    return fields.reduce((sum, field) => {
      return sum + (columns[field.name]?.width || DEFAULT_COLUMN_WIDTH);
    }, 0);
  }, [fields, columns]);


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

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columns]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
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

    // Clear cache and recompute sizes
    if (gridRef.current) {
      gridRef.current.resetAfterColumnIndex(0);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
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
  }, [handleMouseMove]);

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

  // Cell renderer for both header and data cells
  const Cell = ({ columnIndex, rowIndex, style }: { columnIndex: number; rowIndex: number; style: CSSProperties }) => {
    const field = fields[columnIndex];
    if (!field) return null;
    const columnState = columns[field.name] || { width: DEFAULT_COLUMN_WIDTH, isResizing: false };

    // Header row
    if (rowIndex === 0) {
      return (
        <div
          style={{
            ...style,
            display: 'flex',
            alignItems: 'center',
            backgroundColor: columnState.isResizing ? 'var(--accent-secondary)' : 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-primary)',
            borderBottom: '2px solid var(--border-primary)',
            borderTop: '1px solid var(--border-primary)',
            padding: '0 12px',
            fontWeight: 600,
            fontSize: '13px',
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            boxSizing: 'border-box',
          }}
        >
          {field.name}
          {(columnIndex < fields.length - 1 || fields.length === 1) && (
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
        </div>
      );
    }

    // Data rows
    const row = filteredRows[rowIndex - 1]; // Subtract 1 because row 0 is header
    if (!row) return null;
    const value = row[field.name];

    return (
      <div
        style={{
          ...style,
          borderRight: '1px solid var(--border-primary)',
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
  };

  const columnWidth = useCallback((index: number) => {
    const field = fields[index];
    return columns[field.name]?.width || DEFAULT_COLUMN_WIDTH;
  }, [fields, columns]);

  const rowHeight = useCallback((index: number) => {
    return index === 0 ? HEADER_HEIGHT : ROW_HEIGHT;
  }, []);

  if (!fields.length || !rows.length) {
    return (
      <div className="empty-results">
        <p>No results to display</p>
      </div>
    );
  }

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

      <div className="virtual-grid-container" style={{ height: 'calc(100% - 40px)', position: 'relative' }}>
        <Grid
          ref={gridRef}
          columnCount={fields.length}
          columnWidth={columnWidth}
          height={containerDimensions.height}
          rowCount={filteredRows.length + 1} // +1 for header
          rowHeight={rowHeight}
          width={containerDimensions.width}
          overscanRowCount={10}
          overscanColumnCount={2}
          style={{ overflow: 'auto' }}
        >
          {Cell}
        </Grid>
      </div>
    </div>
  );
};