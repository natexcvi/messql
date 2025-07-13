import React, { useEffect, useRef, useCallback } from "react";
import { EditorView, basicSetup } from "codemirror";
import { sql } from "@codemirror/lang-sql";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { keymap } from "@codemirror/view";
import { DatabaseConnection, QueryTab, SchemaInfo } from "../types";
import { QueryResults } from "./QueryResults";
import { DataTable } from "./DataTable";
import { createSQLCompletions } from "../services/autocomplete";
import { Prec } from "@codemirror/state";

interface QueryEditorProps {
  tab: QueryTab;
  connection: DatabaseConnection;
  onQueryChange: (tabId: string, query: string) => void;
  onQueryExecute: (tabId: string, query: string) => void;
  schemas: SchemaInfo[];
}

export const QueryEditor: React.FC<QueryEditorProps> = ({
  tab,
  connection,
  onQueryChange,
  onQueryExecute,
  schemas,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize editor only once when component mounts
  useEffect(() => {
    if (!editorRef.current || isInitializedRef.current) return;

    const completions = createSQLCompletions(schemas);

    const view = new EditorView({
      doc: tab.query,
      extensions: [
        basicSetup,
        sql(),
        autocompletion({
          override: [completions],
        }),
        Prec.high(
          keymap.of([
            ...completionKeymap,
            {
              key: "Mod-Enter",
              run: () => {
                const query = view.state.doc.toString();
                onQueryExecute(tab.id, query);
                return true;
              },
            },
          ]),
        ),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newQuery = update.state.doc.toString();
            onQueryChange(tab.id, newQuery);
          }
        }),
      ],
      parent: editorRef.current,
    });

    viewRef.current = view;
    isInitializedRef.current = true;

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, []); // Only initialize once

  // Update query content when tab.query changes (e.g., when switching tabs)
  useEffect(() => {
    if (viewRef.current && viewRef.current.state.doc.toString() !== tab.query) {
      const transaction = viewRef.current.state.update({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: tab.query,
        },
      });
      viewRef.current.dispatch(transaction);
    }
  }, [tab.query, tab.id]);

  const handleExecute = () => {
    if (viewRef.current) {
      const query = viewRef.current.state.doc.toString();
      onQueryExecute(tab.id, query);
    }
  };

  return (
    <div className="query-editor">
      <div className="toolbar">
        <button
          onClick={handleExecute}
          disabled={tab.isExecuting}
          className="primary"
        >
          {tab.isExecuting ? "Executing..." : "Execute (⌘+Enter)"}
        </button>

        <span className="toolbar-info">Connected to: {connection.name}</span>
      </div>

      <div className="editor-container">
        <div
          ref={editorRef}
          style={{
            height: "100%",
          }}
        />
      </div>

      {tab.result ? (
        <DataTable result={tab.result} />
      ) : (
        <QueryResults
          result={tab.result}
          error={tab.error}
          isExecuting={tab.isExecuting}
        />
      )}
    </div>
  );
};
