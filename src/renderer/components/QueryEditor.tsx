import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { EditorView, basicSetup } from "codemirror";
import { sql, PostgreSQL } from "@codemirror/lang-sql";
import { completionKeymap, acceptCompletion } from "@codemirror/autocomplete";
import { keymap, placeholder } from "@codemirror/view";
import { Prec, Compartment } from "@codemirror/state";
import { ayuLight, coolGlow } from "thememirror";
import { DatabaseConnection, QueryTab, SchemaInfo } from "../types";
import { QueryResults } from "./QueryResults";
import { DataTable } from "./DataTable";
import { VirtualDataTable } from "./VirtualDataTable";
import { useTheme } from "../hooks/useTheme";
import { format } from "sql-formatter";

// Convert our schema format to CodeMirror's expected format
const convertSchemaForCodeMirror = (
  schemas: SchemaInfo[],
  selectedSchema?: string,
) => {
  const result: Record<string, string[]> = {};

  // If a specific schema is selected, only use tables from that schema
  const targetSchema = selectedSchema
    ? schemas.find((s) => s.name === selectedSchema)
    : null;
  const schemasToProcess = targetSchema ? [targetSchema] : schemas;

  schemasToProcess.forEach((schema) => {
    schema.tables.forEach((table) => {
      // Use simple array format for columns to avoid circular references
      result[table.name] = table.columns.map((column) => column.name);
    });
  });

  return result;
};

interface QueryEditorProps {
  tab: QueryTab;
  connection: DatabaseConnection;
  onQueryChange: (tabId: string, query: string) => void;
  onQueryExecute: (tabId: string, query: string) => void;
  onQueryCancel: (tabId: string) => void;
  onSchemaChange: (tabId: string, schema: string) => void;
  schemas: SchemaInfo[];
}

export interface QueryEditorRef {
  focus: () => void;
}

export const QueryEditor = forwardRef<QueryEditorRef, QueryEditorProps>(
  (
    { tab, connection, onQueryChange, onQueryExecute, onQueryCancel, onSchemaChange, schemas },
    ref,
  ) => {
    const { isDark } = useTheme();
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const isInitializedRef = useRef(false);
    const currentTabIdRef = useRef<string | null>(null);
    const sqlCompartmentRef = useRef<Compartment>(new Compartment());
    const themeCompartmentRef = useRef<Compartment>(new Compartment());
    const keymapCompartmentRef = useRef<Compartment>(new Compartment());

    // Listen for custom save event triggered by keyboard shortcut
    useEffect(() => {
      const handleSaveEvent = () => {
        if (viewRef.current && viewRef.current.state.doc.toString().trim()) {
          handleSaveQuery();
        }
      };
      
      document.addEventListener('triggerSave', handleSaveEvent);
      return () => document.removeEventListener('triggerSave', handleSaveEvent);
    }, []);

    // Helper function to create the keymap extension
    const createKeymapExtension = (tabId: string, executeCallback: typeof onQueryExecute) => {
      return Prec.high(
        keymap.of([
          ...completionKeymap,
          {
            key: "Tab",
            run: acceptCompletion,
          },
          {
            key: "Mod-Enter",
            run: () => {
              const query = viewRef.current?.state.doc.toString() || "";
              executeCallback(tabId, query);
              return true;
            },
          },
          {
            key: "Mod-Shift-i",
            run: () => {
              if (viewRef.current) {
                const currentQuery = viewRef.current.state.doc.toString();
                if (!currentQuery.trim()) return false;
                
                try {
                  const formattedQuery = format(currentQuery, {
                    language: 'postgresql',
                    keywordCase: 'upper',
                    identifierCase: 'lower',
                    linesBetweenQueries: 2,
                  });
                  
                  const transaction = viewRef.current.state.update({
                    changes: {
                      from: 0,
                      to: viewRef.current.state.doc.length,
                      insert: formattedQuery,
                    },
                  });
                  
                  viewRef.current.dispatch(transaction);
                  onQueryChange(tabId, formattedQuery);
                } catch (error) {
                  console.error('Error formatting query:', error);
                }
              }
              return true;
            },
          },
          {
            key: "Mod-s",
            run: () => {
              // Trigger save modal
              const saveEvent = new CustomEvent('triggerSave');
              document.dispatchEvent(saveEvent);
              return true;
            },
          },
        ]),
      );
    };

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

      let schema;
      try {
        schema = convertSchemaForCodeMirror(schemas, tab.selectedSchema);
      } catch (error) {
        console.warn(
          "Error converting schema for CodeMirror, using basic SQL without schema:",
          error,
        );
        schema = {};
      }

      // Create placeholder text based on platform
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? '⌘' : 'Ctrl';
      const placeholderText = `Write your SQL query here or press ${modKey}+Shift+T to use AI SQL Generator...`;

      const view = new EditorView({
        doc: tab.query,
        extensions: [
          basicSetup,
          placeholder(placeholderText),
          sqlCompartmentRef.current.of(sql({
            dialect: PostgreSQL,
            schema: Object.keys(schema).length > 0 ? schema : undefined,
            upperCaseKeywords: true,
          })),
          themeCompartmentRef.current.of(isDark ? coolGlow : ayuLight),
          keymapCompartmentRef.current.of(createKeymapExtension(tab.id, onQueryExecute)),
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
    }, [tab.id]); // Only reinitialize when tab changes

    // Update SQL schema when schemas or selectedSchema changes
    useEffect(() => {
      if (!viewRef.current) return;

      let schema;
      try {
        schema = convertSchemaForCodeMirror(schemas, tab.selectedSchema);
      } catch (error) {
        console.warn("Error converting schema for CodeMirror:", error);
        schema = {};
      }

      const sqlExtension = sql({
        dialect: PostgreSQL,
        schema: Object.keys(schema).length > 0 ? schema : undefined,
        upperCaseKeywords: true,
      });

      viewRef.current.dispatch({
        effects: sqlCompartmentRef.current.reconfigure(sqlExtension),
      });
    }, [tab.selectedSchema, schemas]);

    // Update theme when isDark changes
    useEffect(() => {
      if (!viewRef.current) return;

      const themeExtension = isDark ? coolGlow : ayuLight;
      viewRef.current.dispatch({
        effects: themeCompartmentRef.current.reconfigure(themeExtension),
      });
    }, [isDark]);

    // Update keymap when onQueryExecute changes
    useEffect(() => {
      if (!viewRef.current) return;

      const keymapExtension = createKeymapExtension(tab.id, onQueryExecute);
      viewRef.current.dispatch({
        effects: keymapCompartmentRef.current.reconfigure(keymapExtension),
      });
    }, [onQueryExecute, tab.id]);

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

    const handleSaveQuery = async () => {
      const query = viewRef.current?.state.doc.toString() || tab.query;
      try {
        const filePath = await window.electronAPI.file.saveQuery(query);
        if (filePath) {
          console.log('Query saved to:', filePath);
        }
      } catch (error) {
        console.error('Error saving query:', error);
      }
    };

    const handleLoadQuery = async () => {
      try {
        const content = await window.electronAPI.file.loadQuery();
        if (content && viewRef.current) {
          const transaction = viewRef.current.state.update({
            changes: {
              from: 0,
              to: viewRef.current.state.doc.length,
              insert: content,
            },
          });
          viewRef.current.dispatch(transaction);
          onQueryChange(tab.id, content);
        }
      } catch (error) {
        console.error('Error loading query:', error);
      }
    };

    const handleFormatQuery = () => {
      if (!viewRef.current) return;
      
      const currentQuery = viewRef.current.state.doc.toString();
      if (!currentQuery.trim()) return;
      
      try {
        const formattedQuery = format(currentQuery, {
          language: 'postgresql',
          keywordCase: 'upper',
          identifierCase: 'lower',
          linesBetweenQueries: 2,
        });
        
        // Update CodeMirror with formatted query
        const transaction = viewRef.current.state.update({
          changes: {
            from: 0,
            to: viewRef.current.state.doc.length,
            insert: formattedQuery,
          },
        });
        
        viewRef.current.dispatch(transaction);
        
        // Update tab state
        onQueryChange(tab.id, formattedQuery);
      } catch (error) {
        console.error('Error formatting query:', error);
        // Could show a toast notification here
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
          
          {tab.isExecuting && (
            <button
              onClick={() => onQueryCancel(tab.id)}
              className="secondary"
              title="Cancel running query"
            >
              Cancel
            </button>
          )}
          
          <button
            onClick={handleSaveQuery}
            className="secondary"
            title="Save query (⌘+S)"
            disabled={!tab.query.trim()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            Save
          </button>
          
          <button
            onClick={handleLoadQuery}
            className="secondary"
            title="Load query from file"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Load
          </button>
          
          <button
            onClick={handleFormatQuery}
            className="secondary"
            title="Format query (⌘+Shift+I)"
            disabled={!tab.query.trim() || tab.isExecuting}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            Format
          </button>

          <div className="schema-selector">
            <label htmlFor={`schema-select-${tab.id}`}>Schema:</label>
            <select
              id={`schema-select-${tab.id}`}
              value={tab.selectedSchema || ""}
              onChange={(e) => onSchemaChange(tab.id, e.target.value)}
              disabled={tab.isExecuting}
            >
              {schemas.map((schema) => (
                <option key={schema.name} value={schema.name}>
                  {schema.name}
                </option>
              ))}
            </select>
          </div>

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
            tab.result.rows.length > 1000 ? (
              <VirtualDataTable result={tab.result} />
            ) : (
              <DataTable result={tab.result} />
            )
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
