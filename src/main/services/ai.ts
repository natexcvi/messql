import { generateText, tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createAzure } from "@ai-sdk/azure";
import { createOllama } from "ollama-ai-provider";
import { z } from "zod";

export interface AICredentials {
  provider: "openai" | "anthropic" | "azure" | "bedrock" | "ollama";
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  resourceName?: string;
}

export interface TableSchema {
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

export interface DatabaseFunctions {
  getSchemas: (connectionId: string) => Promise<any[]>;
  getTableSchema: (
    connectionId: string,
    schema: string,
    table: string,
  ) => Promise<any>;
}

export class AIService {
  private getModel(credentials: AICredentials) {
    switch (credentials.provider) {
      case "openai": {
        const openai = createOpenAI({
          apiKey: credentials.apiKey,
          baseURL: credentials.baseUrl,
        });
        return openai(credentials.model || "gpt-4.1-mini");
      }

      case "anthropic": {
        const anthropic = createAnthropic({
          apiKey: credentials.apiKey,
          baseURL: credentials.baseUrl,
        });
        return anthropic(credentials.model || "claude-3-7-haiku");
      }

      case "azure": {
        const azure = createAzure({
          apiKey: credentials.apiKey,
          resourceName: credentials.resourceName,
          baseURL: credentials.baseUrl,
        });
        return azure(credentials.model || "gpt-4o");
      }

      case "bedrock": {
        const bedrock = createAmazonBedrock({
          region: credentials.region || "us-east-1",
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
        });
        return bedrock(
          credentials.model || "anthropic.claude-3-5-haiku-20241022-v1:0",
        );
      }

      case "ollama": {
        const ollama = createOllama({
          baseURL: credentials.baseUrl || "http://127.0.0.1:11434/api",
        });
        return ollama(credentials.model || "llama3.2");
      }

      default:
        throw new Error(`Unsupported AI provider: ${credentials.provider}`);
    }
  }

  async generateTabName(
    query: string,
    credentials: AICredentials,
  ): Promise<string> {
    try {
      const model = this.getModel(credentials);

      const result = await generateText({
        model,
        prompt: `Given this SQL query, generate a short, descriptive tab name (max 20 characters). Return only the name, no quotes or explanation:

${query}`,
        temperature: 0.3,
      });

      return result.text.trim().replace(/['"]/g, "").substring(0, 20);
    } catch (error) {
      console.error("Failed to generate tab name:", error);
      throw error;
    }
  }

  async generateSQL(
    prompt: string,
    schemas: TableSchema[],
    credentials: AICredentials,
    connectionId?: string,
    dbFunctions?: DatabaseFunctions,
  ): Promise<string> {
    try {
      console.log("Starting SQL generation with prompt:", prompt);
      console.log("Number of schemas provided:", schemas.length);

      const model = this.getModel(credentials);

      // Extract just schema names for initial context
      const schemaNames = [
        ...new Set(
          schemas.map((table) => {
            const parts = table.tableName.split(".");
            return parts.length > 1 ? parts[0] : "public";
          }),
        ),
      ];

      // Create a map for quick lookup
      const schemaMap = new Map<string, TableSchema[]>();
      schemas.forEach((table) => {
        const [schemaName] = table.tableName.includes(".")
          ? table.tableName.split(".")
          : ["public"];

        if (!schemaMap.has(schemaName)) {
          schemaMap.set(schemaName, []);
        }
        schemaMap.get(schemaName)!.push(table);
      });

      const tools = {
        listSchemas: tool({
          description: "List all available database schemas",
          parameters: z.object({}),
          execute: async () => {
            console.log("Tool: listSchemas called");
            return { schemas: schemaNames };
          },
        }),
        listTables: tool({
          description: "List all tables in a specific schema",
          parameters: z.object({
            schema: z.string().describe("The schema name to list tables from"),
          }),
          execute: async ({ schema }) => {
            console.log("Tool: listTables called for schema:", schema);
            let tables = schemaMap.get(schema) || [];

            // If no tables found and we have an active connection, try to load schema
            if (tables.length === 0 && connectionId && dbFunctions) {
              console.log(
                "No tables found in cache, attempting to load schema:",
                schema,
              );
              try {
                // Get basic schema info first
                const freshSchemas = await dbFunctions.getSchemas(connectionId);
                const targetSchema = freshSchemas.find(
                  (s: any) => s.name === schema,
                );

                if (targetSchema && targetSchema.tables.length > 0) {
                  // Update our local schema map with fresh data
                  const freshTableSchemas: TableSchema[] =
                    targetSchema.tables.map((table: any) => ({
                      tableName: `${schema}.${table.name}`,
                      columns: table.columns || [],
                      primaryKey: [],
                      foreignKeys: [],
                    }));

                  schemaMap.set(schema, freshTableSchemas);
                  tables = freshTableSchemas;

                  console.log(
                    "Successfully loaded schema on demand:",
                    schema,
                    "tables:",
                    tables.length,
                  );
                } else {
                  console.warn("Schema exists but has no tables:", schema);
                  return {
                    schema,
                    tables: [],
                    note: `Schema '${schema}' exists but contains no tables.`,
                  };
                }
              } catch (error) {
                console.error("Failed to load schema on demand:", error);
                return {
                  schema,
                  tables: [],
                  error:
                    "Failed to load schema information. Please check your database connection.",
                };
              }
            } else if (tables.length === 0) {
              console.warn(
                "No connection ID or database functions provided for lazy schema loading",
              );
              return {
                schema,
                tables: [],
                note: "Schema not loaded yet. Please ensure database connection is established.",
              };
            }

            const tableNames = tables.map((t) => {
              const tableName = t.tableName.includes(".")
                ? t.tableName.split(".")[1]
                : t.tableName;
              return tableName;
            });
            console.log("Returning tables:", tableNames);
            return {
              schema,
              tables: tableNames,
            };
          },
        }),
        getTableSchema: tool({
          description: "Get detailed schema information for a specific table",
          parameters: z.object({
            schema: z.string().describe("The schema name"),
            table: z.string().describe("The table name"),
          }),
          execute: async ({ schema, table }) => {
            console.log(
              "Tool: getTableSchema called for:",
              `${schema}.${table}`,
            );
            let tableSchema = schemas.find(
              (t) =>
                t.tableName === `${schema}.${table}` ||
                (schema === "public" && t.tableName === table),
            );

            // If not found in provided schemas and we have connection, try to load it
            if (!tableSchema?.columns.length && connectionId && dbFunctions) {
              console.log(
                "Table schema not found in cache, attempting to load:",
                `${schema}.${table}`,
              );
              try {
                // Get detailed table schema
                const freshTableSchema = await dbFunctions.getTableSchema(
                  connectionId,
                  schema,
                  table,
                );

                if (freshTableSchema) {
                  // Convert to our TableSchema format
                  tableSchema = {
                    tableName: `${schema}.${table}`,
                    columns: freshTableSchema.columns || [],
                    primaryKey: freshTableSchema.columns
                      .filter((col: any) => col.isPrimaryKey)
                      .map((col: any) => col.name),
                    foreignKeys: freshTableSchema.columns
                      .filter((col: any) => col.foreignKey)
                      .map((col: any) => ({
                        column: col.name,
                        referencedTable: col.foreignKey.table,
                        referencedColumn: col.foreignKey.column,
                      })),
                  };

                  console.log(
                    "Successfully loaded table schema on demand:",
                    `${schema}.${table}`,
                  );
                } else {
                  console.log(
                    "Table not found in database:",
                    `${schema}.${table}`,
                  );
                  return {
                    error: `Table ${schema}.${table} not found in database`,
                  };
                }
              } catch (error) {
                console.error("Failed to load table schema on demand:", error);
                return {
                  error: `Failed to load schema for table ${schema}.${table}`,
                };
              }
            }

            if (!tableSchema) {
              console.log("Table not found:", `${schema}.${table}`);
              return { error: `Table ${schema}.${table} not found` };
            }

            const result = {
              tableName: `${schema}.${table}`,
              columns: tableSchema.columns.map((col) => ({
                name: col.name,
                type: col.type,
                nullable: col.nullable,
                default: col.defaultValue,
              })),
              primaryKey: tableSchema.primaryKey,
              foreignKeys: tableSchema.foreignKeys,
            };
            console.log("Returning table schema:", result);
            return result;
          },
        }),
      };

      console.log("Available schemas:", schemaNames);
      console.log("Calling generateText with tools...");

      const result = await generateText({
        model,
        tools,
        prompt: `You are a PostgreSQL expert. Your job is to generate a SQL query based on the user's request.

Available schemas: ${schemaNames.join(", ")}

IMPORTANT: You MUST follow this exact process:
1. Use listSchemas tool to see available schemas
2. Use listTables tool to explore tables in relevant schemas
3. Use getTableSchema tool to get column details for tables you need
4. After gathering the information you need, provide your final answer in the following JSON format:

{
  "sql": "Your complete SQL query here",
  "explanation": "Brief explanation of what the query does"
}

IMPORTANT: Your final response MUST be valid JSON in the exact format shown above. Include SQL comments in the query itself to explain complex parts, but do not put any comments after the last semicolon!

User Request: ${prompt}`,
        temperature: 0.1,
        maxRetries: 3,
        maxSteps: 16, // Increase steps to allow more exploration
      });

      console.log("Generation result:", {
        text: result.text,
        toolCalls: result.toolCalls?.length || 0,
        toolCallNames: result.toolCalls?.map((call) => call.toolName),
      });

      // Extract the SQL query from the structured response
      console.log("Parsing structured response...");
      try {
        // Find the JSON response in the text (it might be preceded by tool call outputs)
        const jsonMatch = result.text.match(
          /\{[\s\S]*"sql"[\s\S]*"explanation"[\s\S]*\}/m,
        );
        if (jsonMatch) {
          const jsonResponse = JSON.parse(jsonMatch[0]);
          if (jsonResponse.sql && typeof jsonResponse.sql === "string") {
            console.log("Found SQL in structured response:", jsonResponse.sql);
            // Add the explanation as a comment at the top of the SQL
            const sqlWithComment = `-- ${jsonResponse.explanation}\n\n${jsonResponse.sql}`;
            return sqlWithComment;
          }
        }
      } catch (parseError) {
        console.log("JSON parsing failed:", parseError);
      }

      // Fallback: return the raw text if parsing fails
      console.warn(
        "Failed to extract structured SQL response, returning raw text",
      );
      return result.text;
    } catch (error) {
      console.error("Failed to generate SQL:", error);
      throw error;
    }
  }

  async validateCredentials(credentials: AICredentials): Promise<boolean> {
    try {
      const model = this.getModel(credentials);

      await generateText({
        model,
        prompt: "Hello",
        maxTokens: 1,
      });

      return true;
    } catch (error) {
      console.error("AI credentials validation failed:", error);
      return false;
    }
  }
}
