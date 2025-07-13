import React, { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { sql } from '@codemirror/lang-sql';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { keymap } from '@codemirror/view';
import { DatabaseConnection, QueryTab, SchemaInfo } from '../types';
import { QueryResults } from './QueryResults';
import { createSQLCompletions } from '../services/autocomplete';

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

  useEffect(() => {
    if (!editorRef.current) return;

    const completions = createSQLCompletions(schemas);

    const view = new EditorView({
      doc: tab.query,
      extensions: [
        basicSetup,
        sql(),
        autocompletion({
          override: [completions],
        }),
        keymap.of([
          ...completionKeymap,
          {
            key: 'Cmd-Enter',
            run: () => {
              const query = view.state.doc.toString();
              onQueryExecute(tab.id, query);
              return true;
            },
          },
        ]),
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

    return () => {
      view.destroy();
    };
  }, [tab.id, schemas]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update doc content when query changes without recreating editor
  useEffect(() => {
    if (viewRef.current && viewRef.current.state.doc.toString() !== tab.query) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: tab.query,
        },
      });
    }
  }, [tab.query]);

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
        >
          {tab.isExecuting ? 'Executing...' : 'Execute (⌘+Enter)'}
        </button>
        
        <span className="toolbar-info">
          Connected to: {connection.name}
        </span>
      </div>

      <div className="editor-container">
        <div
          ref={editorRef}
          style={{
            height: '100%',
          }}
        />
      </div>

      <QueryResults
        result={tab.result}
        error={tab.error}
        isExecuting={tab.isExecuting}
      />
    </div>
  );
};