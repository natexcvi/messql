import React from "react";
import { TabBar } from "./TabBar";
import { QueryEditor } from "./QueryEditor";
import { DatabaseConnection, QueryTab, SchemaInfo } from "../types";

interface MainContentProps {
  queryTabs: QueryTab[];
  activeTabId: string | null;
  activeConnection: DatabaseConnection | undefined;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  onNewTab: () => void;
  onQueryChange: (tabId: string, query: string) => void;
  onQueryExecute: (tabId: string, query: string) => void;
  schemas: SchemaInfo[];
}

export const MainContent: React.FC<MainContentProps> = ({
  queryTabs,
  activeTabId,
  activeConnection,
  onTabSelect,
  onTabClose,
  onNewTab,
  onQueryChange,
  onQueryExecute,
  schemas,
}) => {
  const activeTab = queryTabs.find((tab) => tab.id === activeTabId);

  if (!activeConnection) {
    return (
      <div className="main-content">
        <div className="empty-state">
          <h3>No Connection Selected</h3>
          <p>Select a connection from the sidebar to start querying</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <TabBar
        tabs={queryTabs}
        activeTabId={activeTabId}
        onTabSelect={onTabSelect}
        onTabClose={onTabClose}
        onNewTab={onNewTab}
      />

      {activeTab ? (
        <QueryEditor
          tab={activeTab}
          connection={activeConnection}
          onQueryChange={onQueryChange}
          onQueryExecute={onQueryExecute}
          schemas={schemas}
        />
      ) : (
        <div className="empty-state">
          <h3>No Query Tab Open</h3>
          <p>Create a new query tab to get started</p>
        </div>
      )}
    </div>
  );
};
