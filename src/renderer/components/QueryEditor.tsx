import React, {
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { EditorView, basicSetup } from "codemirror";
import { sql } from "@codemirror/lang-sql";
import { autocompletion, completionKeymap, acceptCompletion } from "@codemirror/autocomplete";
import { syntaxTree } from "@codemirror/language";
import { keymap } from "@codemirror/view";
import { DatabaseConnection, QueryTab, SchemaInfo } from "../types";
import { QueryResults } from "./QueryResults";
import { DataTable } from "./DataTable";
import { Prec } from "@codemirror/state";
import { ayuMirage, ayuLight } from "../themes/ayuMirage";
import { useTheme } from "../hooks/useTheme";
import { useDatabase } from "../hooks/useDatabase";

interface QueryEditorProps {
  tab: QueryTab;
  connection: DatabaseConnection;
  onQueryChange: (tabId: string, query: string) => void;
  onQueryExecute: (tabId: string, query: string) => void;
  schemas: SchemaInfo[];
  onSchemaUpdate: (schemas: SchemaInfo[]) => void;
}

export interface QueryEditorRef {
  focus: () => void;
}

export const QueryEditor = forwardRef<QueryEditorRef, QueryEditorProps>(
  ({ tab, connection, onQueryChange, onQueryExecute, schemas, onSchemaUpdate }, ref) => {
    const { isDark } = useTheme();
    const { getTableColumns } = useDatabase();
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

      const view = new EditorView({
        doc: tab.query,
        extensions: [
          basicSetup,
          sql({
            dialect: connection.type,
            schema: schemas.reduce((acc, schema) => {
              acc[schema.name] = schema.tables.map(t => t.name);
              return acc;
            }, {}),
            tables: schemas.flatMap(s => s.tables).map(t => ({
              label: t.name,
              columns: t.columns.map(c => ({ label: c.name }))
            })),
          }),
          isDark ? ayuMirage : ayuLight,
          autocompletion({
            override: [
              async (context) => {
                const { state, pos } = context;
                const tree = syntaxTree(state);
                const token = tree.resolve(pos, -1);

                // If we are inside a table name, fetch columns
                if (token.name === "Identifier" || token.name === "QuotedIdentifier") {
                  const tableName = state.sliceDoc(token.from, token.to);
                  const schema = schemas.find(s => s.tables.some(t => t.name === tableName));
                  if (schema) {
                    const table = schema.tables.find(t => t.name === tableName);
                    if (table && table.columns.length === 0) {
                      const columns = await getTableColumns(connection.id, schema.name, table.name);
                      const newSchemas = schemas.map(s => {
                        if (s.name === schema.name) {
                          return {
                            ...s,
                            tables: s.tables.map(t => {
                              if (t.name === tableName) {
                                return { ...t, columns };
                              }
                              return t;
                            }),
                          };
                        }
                        return s;
                      });
                      onSchemaUpdate(newSchemas);
                    }
                  }
                }
                return null;
              },
            ],
          }),
          Prec.high(
            keymap.of([
              ...completionKeymap,
              {
                key: "Tab",
                run: acceptCompletion,
              },
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
    }, [tab.id, schemas, isDark]); // Reinitialize when tab or theme changes

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
