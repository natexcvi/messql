import React, { useState, useMemo } from 'react';
import { QueryLogEntry } from '../types';

interface QueryHistoryProps {
  queryLogs: QueryLogEntry[];
  onClose: () => void;
  onRerunQuery: (query: string, schema?: string) => void;
}

export const QueryHistory: React.FC<QueryHistoryProps> = ({ 
  queryLogs, 
  onClose, 
  onRerunQuery 
}) => {
  const [filterText, setFilterText] = useState('');
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);

  const filteredLogs = useMemo(() => {
    return queryLogs.filter(log => {
      if (showOnlyErrors && log.success) return false;
      if (filterText) {
        const searchText = filterText.toLowerCase();
        return log.query.toLowerCase().includes(searchText) ||
               log.connectionName.toLowerCase().includes(searchText) ||
               (log.schema && log.schema.toLowerCase().includes(searchText));
      }
      return true;
    });
  }, [queryLogs, filterText, showOnlyErrors]);

  const formatDuration = (duration?: number) => {
    if (!duration) return '-';
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const formatTimestamp = (timestamp: Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // If today, show time only
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString();
    }
    
    // If this year, show month and day
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + 
             ' ' + date.toLocaleTimeString();
    }
    
    // Otherwise show full date
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const truncateQuery = (query: string, maxLength: number = 200) => {
    const singleLine = query.replace(/\s+/g, ' ').trim();
    if (singleLine.length <= maxLength) return singleLine;
    return singleLine.substring(0, maxLength) + '...';
  };

  return (
    <div className="query-history-panel" data-testid="history-section">
      <div className="query-history-header">
        <h3>Query History</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="query-history-filters">
        <input
          type="text"
          placeholder="Filter queries..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="filter-input"
          data-testid="history-filter-input"
        />
        <label className="error-filter">
          <input
            type="checkbox"
            checked={showOnlyErrors}
            onChange={(e) => setShowOnlyErrors(e.target.checked)}
          />
          Show errors only
        </label>
      </div>

      <div className="query-history-list">
        {filteredLogs.length === 0 ? (
          <div className="empty-history">
            <p>No queries found</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div 
              key={log.id} 
              className={`query-log-entry ${log.success ? 'success' : 'error'}`}
              data-testid="history-item"
            >
              <div className="log-header">
                <span className="log-timestamp">{formatTimestamp(log.timestamp)}</span>
                <span className="log-connection">{log.connectionName}</span>
                {log.schema && <span className="log-schema">{log.schema}</span>}
                <span className="log-duration">{formatDuration(log.duration)}</span>
                {log.rowCount !== undefined && log.success && (
                  <span className="log-rows">{log.rowCount} rows</span>
                )}
              </div>
              
              <div className="log-query">
                <code>{truncateQuery(log.query)}</code>
              </div>
              
              {log.error && (
                <div className="log-error">
                  <strong>Error:</strong> {log.error}
                </div>
              )}
              
              <div className="log-actions">
                <button 
                  className="rerun-btn"
                  onClick={() => onRerunQuery(log.query, log.schema)}
                  title="Run this query again"
                >
                  Rerun
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};