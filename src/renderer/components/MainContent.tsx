import React, { useRef, useEffect } from "react";
import { TabBar } from "./TabBar";
import { QueryEditor, QueryEditorRef } from "./QueryEditor";
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
  onSchemaChange: (tabId: string, schema: string) => void;
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
  onSchemaChange,
  schemas,
}) => {
  const activeTab = queryTabs.find((tab) => tab.id === activeTabId);
  const queryEditorRef = useRef<QueryEditorRef>(null);

  // Focus the editor when activeTabId changes
  useEffect(() => {
    if (activeTabId && queryEditorRef.current) {
      // Small delay to ensure the editor is fully rendered
      setTimeout(() => {
        queryEditorRef.current?.focus();
      }, 100);
    }
  }, [activeTabId]);

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
          ref={queryEditorRef}
          tab={activeTab}
          connection={activeConnection}
          onQueryChange={onQueryChange}
          onQueryExecute={onQueryExecute}
          onSchemaChange={onSchemaChange}
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
