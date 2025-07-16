import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { EditorView, basicSetup } from "codemirror";
import { sql, PostgreSQL } from "@codemirror/lang-sql";
import { completionKeymap, acceptCompletion } from "@codemirror/autocomplete";
import { keymap } from "@codemirror/view";
import { Prec, Compartment } from "@codemirror/state";
import { ayuLight, coolGlow } from "thememirror";
import { DatabaseConnection, QueryTab, SchemaInfo } from "../types";
import { QueryResults } from "./QueryResults";
import { DataTable } from "./DataTable";
import { useTheme } from "../hooks/useTheme";

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
  onSchemaChange: (tabId: string, schema: string) => void;
  schemas: SchemaInfo[];
}

export interface QueryEditorRef {
  focus: () => void;
}

export const QueryEditor = forwardRef<QueryEditorRef, QueryEditorProps>(
  (
    { tab, connection, onQueryChange, onQueryExecute, onSchemaChange, schemas },
    ref,
  ) => {
    const { isDark } = useTheme();
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const isInitializedRef = useRef(false);
    const currentTabIdRef = useRef<string | null>(null);
    const sqlCompartmentRef = useRef<Compartment>(new Compartment());
    const themeCompartmentRef = useRef<Compartment>(new Compartment());

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

      const view = new EditorView({
        doc: tab.query,
        extensions: [
          basicSetup,
          sqlCompartmentRef.current.of(sql({
            dialect: PostgreSQL,
            schema: Object.keys(schema).length > 0 ? schema : undefined,
            upperCaseKeywords: true,
          })),
          themeCompartmentRef.current.of(isDark ? coolGlow : ayuLight),
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
