import React from 'react';
import { QueryTab } from '../types';

interface TabBarProps {
  tabs: QueryTab[];
  activeTabId: string | null;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  onNewTab: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onNewTab,
}) => {
  return (
    <div className="tab-bar">
      {tabs.map(tab => (
        <div
          key={tab.id}
          className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
          onClick={() => onTabSelect(tab.id)}
        >
          <span>{tab.title}</span>
          <span
            className="tab-close"
            onClick={(e) => {
              e.stopPropagation();
              onTabClose(tab.id);
            }}
          >
            ×
          </span>
        </div>
      ))}
      
      <button
        onClick={onNewTab}
        style={{
          background: 'none',
          border: 'none',
          padding: '10px 15px',
          cursor: 'pointer',
          fontSize: '16px',
          color: '#666',
        }}
      >
        +
      </button>
    </div>
  );
};