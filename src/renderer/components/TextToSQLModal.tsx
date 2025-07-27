import React, { useState, useEffect } from "react";
import { LoadingSpinner } from "./LoadingSpinner";
import {
  MdOutlineSmartToy,
  MdOutlineAutoAwesome,
  MdOutlineInsights,
} from "react-icons/md";

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
  provider: "openai" | "anthropic" | "azure" | "bedrock" | "ollama";
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
  schemas: Array<{
    name: string;
    tables: Array<{ name: string; columns: any[] }>;
  }>;
  activeConnectionId?: string;
}

export const TextToSQLModal: React.FC<TextToSQLModalProps> = ({
  isOpen,
  onClose,
  onGenerateSQL,
  schemas,
  activeConnectionId,
}) => {
  const [prompt, setPrompt] = useState("");
  const [generatedSQL, setGeneratedSQL] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState<AICredentials | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAICredentials();
    }
  }, [isOpen]);

  const loadAICredentials = async () => {
    try {
      const providers: Array<AICredentials["provider"]> = [
        "openai",
        "anthropic",
        "azure",
        "bedrock",
        "ollama",
      ];

      for (const provider of providers) {
        const credentialsStr =
          await window.electronAPI.ai.getCredentials(provider);
        if (credentialsStr) {
          const creds = JSON.parse(credentialsStr) as AICredentials;
          setCredentials(creds);
          return;
        }
      }

      setError(
        "No AI credentials configured. Please set up AI credentials in settings first.",
      );
    } catch (error) {
      setError("Failed to load AI credentials");
    }
  };

  const convertSchemasToTableSchemas = (): TableSchema[] => {
    const tableSchemas: TableSchema[] = [];

    for (const schema of schemas) {
      for (const table of schema.tables) {
        tableSchemas.push({
          tableName: `${schema.name}.${table.name}`,
          columns: table.columns.map((col) => ({
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
      setError("Please enter a prompt");
      return;
    }

    if (!credentials) {
      setError("No AI credentials available");
      return;
    }

    setIsGenerating(true);
    setError("");
    setGeneratedSQL("");

    try {
      console.log("Starting SQL generation...");
      const tableSchemas = convertSchemasToTableSchemas();
      console.log("Table schemas prepared:", tableSchemas.length);

      const sql = await window.electronAPI.ai.generateSQL(
        prompt,
        tableSchemas,
        credentials,
        activeConnectionId,
      );
      console.log("Generated SQL:", sql);

      if (!sql || sql.trim() === "") {
        console.error("Received empty SQL response");
        setError("No SQL was generated. Please try rephrasing your request.");
      } else {
        setGeneratedSQL(sql);
      }
    } catch (error: any) {
      console.error("SQL generation error:", error);
      setError(error.message || "Failed to generate SQL");
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
    setPrompt("");
    setGeneratedSQL("");
    setError("");
  };

  if (!isOpen) return null;

  return (
    <div className="connection-modal-overlay" onClick={onClose}>
      <div
        className="connection-modal"
        style={{ maxWidth: "800px", width: "90%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="connection-modal-header">
          <h2>
            <MdOutlineSmartToy
              style={{
                fontSize: "20px",
                marginRight: "8px",
                verticalAlign: "middle",
              }}
            />
            AI SQL Generator
          </h2>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleGenerateSQL();
          }}
        >
          <div className="connection-modal-body">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="prompt">
                Describe what you want to query:
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--text-tertiary)",
                    fontWeight: "normal",
                    marginLeft: "8px",
                  }}
                >
                  (AI will explore your database schema to generate accurate
                  SQL)
                </span>
              </label>
              <textarea
                id="prompt"
                className="styled-textarea"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what data you want to query in plain English...

Examples:
• Show me all users who registered in the last 30 days
• Find the top 10 customers by total order value
• List all products that are out of stock
• Get monthly sales totals for this year"
                rows={5}
                disabled={isGenerating}
                required
              />
            </div>

            {schemas.length === 0 && (
              <div className="info-message">
                <strong>Note:</strong> Connect to a database first to enable
                schema-aware SQL generation.
              </div>
            )}

            {schemas.length > 0 && (
              <div className="info-message">
                <strong>
                  <MdOutlineInsights
                    style={{
                      fontSize: "14px",
                      marginRight: "4px",
                      verticalAlign: "middle",
                    }}
                  />
                  AI Ready:
                </strong>{" "}
                Connected to database with {schemas.length} schema
                {schemas.length !== 1 ? "s" : ""} and{" "}
                {schemas.reduce((sum, s) => sum + s.tables.length, 0)} tables
                <br />
                <span style={{ fontSize: "12px", opacity: 0.9 }}>
                  The AI will intelligently explore your database structure to
                  generate optimized queries
                </span>
              </div>
            )}

            <div
              className={`form-group sql-result-container ${generatedSQL || isGenerating ? "show" : ""} ${isGenerating ? "generating" : ""}`}
            >
              <label htmlFor="generatedSQL">
                {isGenerating ? (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <LoadingSpinner size="small" />
                    Generating SQL...
                  </span>
                ) : (
                  "Generated SQL:"
                )}
              </label>
              {isGenerating ? (
                <div className="sql-skeleton">
                  <div className="skeleton-line" style={{ width: "60%" }}></div>
                  <div className="skeleton-line" style={{ width: "80%" }}></div>
                  <div className="skeleton-line" style={{ width: "45%" }}></div>
                  <div className="skeleton-line" style={{ width: "70%" }}></div>
                  <div className="skeleton-line" style={{ width: "55%" }}></div>
                </div>
              ) : (
                <textarea
                  id="generatedSQL"
                  className="styled-textarea sql-editor"
                  value={generatedSQL}
                  onChange={(e) => setGeneratedSQL(e.target.value)}
                  rows={8}
                  disabled={isGenerating}
                />
              )}
            </div>
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
              className="btn btn-primary"
              disabled={isGenerating || !prompt.trim() || !credentials}
              style={{
                minWidth: "140px",
                fontWeight: 600,
              }}
            >
              {isGenerating ? (
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <LoadingSpinner size="small" />
                  Generating...
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <MdOutlineAutoAwesome style={{ fontSize: "16px" }} />
                  Generate SQL
                </div>
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
