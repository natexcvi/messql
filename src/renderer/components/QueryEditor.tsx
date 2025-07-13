import React, {
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
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

export interface QueryEditorRef {
  focus: () => void;
}

export const QueryEditor = forwardRef<QueryEditorRef, QueryEditorProps>(
  ({ tab, connection, onQueryChange, onQueryExecute, schemas }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const isInitializedRef = useRef(false);
    const currentTabIdRef = useRef<string | null>(null);

    // Expose focus method to parent components
    useImperativeHandle(ref, () => ({
      focus: () => {
        if (viewRef.current) {
          viewRef.current.focus();
        }
      },
    }));

    // Initialize editor when component mounts or tab changes
    useEffect(() => {
      if (!editorRef.current) return;

      // If we're switching to a different tab, reinitialize the editor
      if (currentTabIdRef.current !== tab.id) {
        // Destroy existing editor if it exists
        if (viewRef.current) {
          viewRef.current.destroy();
          viewRef.current = null;
          isInitializedRef.current = false;
        }
        currentTabIdRef.current = tab.id;
      }

      if (isInitializedRef.current) return;

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
    }, [tab.id, schemas]); // Reinitialize when tab changes

    // Update query content when tab.query changes (e.g., when switching tabs)
    useEffect(() => {
      if (
        viewRef.current &&
        viewRef.current.state.doc.toString() !== tab.query
      ) {
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

        <div className="results-section">
          {tab.error && (
            <div className="error-banner">
              <strong>Error:</strong> {tab.error}
            </div>
          )}
          
          {tab.result ? (
            <DataTable result={tab.result} />
          ) : !tab.error ? (
            <QueryResults
              result={tab.result}
              error={tab.error}
              isExecuting={tab.isExecuting}
            />
          ) : null}
        </div>
      </div>
    );
  },
);

QueryEditor.displayName = "QueryEditor";
