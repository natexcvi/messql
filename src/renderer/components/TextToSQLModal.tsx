import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface TableSchema {
  tableName: string;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    defaultValue?: string;
  }>;
  primaryKey?: string[];
  foreignKeys?: Array<{
    column: string;
    referencedTable: string;
    referencedColumn: string;
  }>;
}

interface AICredentials {
  provider: 'openai' | 'anthropic' | 'azure' | 'bedrock' | 'ollama';
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  resourceName?: string;
}

interface TextToSQLModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateSQL: (sql: string) => void;
  schemas: Array<{ name: string; tables: Array<{ name: string; columns: any[] }> }>;
}

export const TextToSQLModal: React.FC<TextToSQLModalProps> = ({
  isOpen,
  onClose,
  onGenerateSQL,
  schemas
}) => {
  const [prompt, setPrompt] = useState('');
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState<AICredentials | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAICredentials();
    }
  }, [isOpen]);

  const loadAICredentials = async () => {
    try {
      const providers: Array<AICredentials['provider']> = ['openai', 'anthropic', 'azure', 'bedrock', 'ollama'];
      
      for (const provider of providers) {
        const credentialsStr = await window.electronAPI.ai.getCredentials(provider);
        if (credentialsStr) {
          const creds = JSON.parse(credentialsStr) as AICredentials;
          setCredentials(creds);
          return;
        }
      }
      
      setError('No AI credentials configured. Please set up AI credentials in settings first.');
    } catch (error) {
      setError('Failed to load AI credentials');
    }
  };

  const convertSchemasToTableSchemas = (): TableSchema[] => {
    const tableSchemas: TableSchema[] = [];
    
    for (const schema of schemas) {
      for (const table of schema.tables) {
        tableSchemas.push({
          tableName: `${schema.name}.${table.name}`,
          columns: table.columns.map(col => ({
            name: col.name,
            type: col.type,
            nullable: col.nullable || false,
            defaultValue: col.defaultValue,
          })),
          primaryKey: table.columns
            .filter((col: any) => col.isPrimaryKey)
            .map((col: any) => col.name),
          foreignKeys: table.columns
            .filter((col: any) => col.foreignKey)
            .map((col: any) => ({
              column: col.name,
              referencedTable: col.foreignKey.table,
              referencedColumn: col.foreignKey.column,
            })),
        });
      }
    }
    
    return tableSchemas;
  };

  const handleGenerateSQL = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    if (!credentials) {
      setError('No AI credentials available');
      return;
    }

    setIsGenerating(true);
    setError('');
    setGeneratedSQL('');

    try {
      const tableSchemas = convertSchemasToTableSchemas();
      const sql = await window.electronAPI.ai.generateSQL(prompt, tableSchemas, credentials);
      setGeneratedSQL(sql);
    } catch (error: any) {
      setError(error.message || 'Failed to generate SQL');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseSQL = () => {
    if (generatedSQL) {
      onGenerateSQL(generatedSQL);
      onClose();
    }
  };

  const handleReset = () => {
    setPrompt('');
    setGeneratedSQL('');
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="connection-modal-overlay" onClick={onClose}>
      <div className="connection-modal" style={{ maxWidth: '800px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
        <div className="connection-modal-header">
          <h2>Text to SQL Generator</h2>
        </div>
        
        <form onSubmit={(e) => { e.preventDefault(); handleGenerateSQL(); }}>
          <div className="connection-modal-body">
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-group">
              <label htmlFor="prompt">Describe what you want to query:</label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Example: Show me all users who registered in the last 30 days with their order counts"
                rows={4}
                style={{ resize: 'vertical', minHeight: '100px' }}
                disabled={isGenerating}
                required
              />
            </div>

            {schemas.length === 0 && (
              <div className="info-message">
                <strong>Note:</strong> Connect to a database first to enable schema-aware SQL generation.
              </div>
            )}

            {schemas.length > 0 && (
              <div className="info-message">
                <strong>Available schemas:</strong> {schemas.map(s => s.name).join(', ')}<br/>
                <strong>Total tables:</strong> {schemas.reduce((sum, s) => sum + s.tables.length, 0)}
              </div>
            )}

            {generatedSQL && (
              <div className="form-group">
                <label htmlFor="generatedSQL">Generated SQL:</label>
                <textarea
                  id="generatedSQL"
                  value={generatedSQL}
                  onChange={(e) => setGeneratedSQL(e.target.value)}
                  rows={8}
                  style={{ 
                    resize: 'vertical', 
                    fontFamily: 'monospace', 
                    fontSize: '14px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)'
                  }}
                  disabled={isGenerating}
                />
              </div>
            )}
          </div>
          
          <div className="connection-modal-footer">
            <button 
              type="button"
              className="btn btn-secondary" 
              onClick={onClose}
              disabled={isGenerating}
            >
              Cancel
            </button>
            <button 
              type="button"
              className="btn btn-secondary" 
              onClick={handleReset}
              disabled={isGenerating}
            >
              Reset
            </button>
            <button 
              type="submit"
              className="btn btn-secondary" 
              disabled={isGenerating || !prompt.trim() || !credentials}
            >
              {isGenerating ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <LoadingSpinner size="small" />
                  Generating...
                </div>
              ) : (
                'Generate SQL'
              )}
            </button>
            {generatedSQL && (
              <button 
                type="button"
                className="btn btn-primary" 
                onClick={handleUseSQL}
                disabled={isGenerating}
              >
                Use This SQL
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};