import { generateObject, generateText, tool } from "ai";
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
          baseURL: credentials.baseUrl || "http://localhost:11434",
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
        const [schemaName, tableName] = table.tableName.includes(".")
          ? table.tableName.split(".")
          : ["public", table.tableName];

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
            const tables = schemaMap.get(schema) || [];
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
            const tableSchema = schemas.find(
              (t) =>
                t.tableName === `${schema}.${table}` ||
                (schema === "public" && t.tableName === table),
            );

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
        executeQuery: tool({
          description:
            "REQUIRED: Use this tool to provide your final SQL query answer. This is the ONLY way to return SQL to the user.",
          parameters: z.object({
            query: z
              .string()
              .describe("The complete SQL query that answers the user request"),
            explanation: z
              .string()
              .describe("Brief explanation of what the query does"),
          }),
          execute: async ({ query, explanation }) => {
            console.log("Tool: executeQuery called with:", {
              query,
              explanation,
            });
            return { query, explanation, status: "ready" };
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
4. After gathering the information you need, you MUST call the executeQuery tool with your final SQL query

You MUST end by calling executeQuery with the SQL query. Do not provide explanations in regular text - only use the executeQuery tool for your final answer.

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

      // Extract the SQL query from tool calls
      if (result.toolCalls && result.toolCalls.length > 0) {
        const queryCall = result.toolCalls.find(
          (call) => call.toolName === "executeQuery",
        );
        console.log("Found executeQuery call:", queryCall);

        if (queryCall && "query" in queryCall.args) {
          const sqlQuery = queryCall.args.query as string;
          console.log("Extracted SQL query:", sqlQuery);
          return sqlQuery;
        }
      }

      // Fallback: try to extract SQL from the text response
      console.log("No executeQuery tool call found, trying text extraction...");

      // Try multiple SQL extraction patterns
      const patterns = [
        /```sql\n([\s\S]*?)\n```/i,
        /```\n(SELECT[\s\S]*?);?\n```/i,
        /```\n(INSERT[\s\S]*?);?\n```/i,
        /```\n(UPDATE[\s\S]*?);?\n```/i,
        /```\n(DELETE[\s\S]*?);?\n```/i,
        /```\n(WITH[\s\S]*?);?\n```/i,
        /(SELECT[\s\S]*?);?\s*$/i,
        /(INSERT[\s\S]*?);?\s*$/i,
        /(UPDATE[\s\S]*?);?\s*$/i,
        /(DELETE[\s\S]*?);?\s*$/i,
        /(WITH[\s\S]*?);?\s*$/i,
      ];

      for (const pattern of patterns) {
        const match = result.text.match(pattern);
        if (match && match[1]) {
          const sql = match[1].trim().replace(/;$/, "");
          if (sql.length > 10) {
            // Basic sanity check
            console.log(
              "Found SQL with pattern:",
              pattern.toString(),
              "SQL:",
              sql,
            );
            return sql;
          }
        }
      }

      // If no SQL found, return an error message instead of the explanation text
      console.log("No SQL found in response text:", result.text);
      throw new Error(
        "AI did not generate a valid SQL query. Please try rephrasing your request or check your database connection.",
      );
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
