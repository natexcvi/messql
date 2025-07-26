import { generateText, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { createAzure } from '@ai-sdk/azure';
import { createOllama } from 'ollama-ai-provider';
import { z } from 'zod';

export interface AICredentials {
  provider: 'openai' | 'anthropic' | 'azure' | 'bedrock' | 'ollama';
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
      case 'openai': {
        const openai = createOpenAI({
          apiKey: credentials.apiKey,
          baseURL: credentials.baseUrl,
        });
        return openai(credentials.model || 'gpt-4o-mini');
      }
      
      case 'anthropic': {
        const anthropic = createAnthropic({
          apiKey: credentials.apiKey,
          baseURL: credentials.baseUrl,
        });
        return anthropic(credentials.model || 'claude-3-5-haiku-20241022');
      }
      
      case 'azure': {
        const azure = createAzure({
          apiKey: credentials.apiKey,
          resourceName: credentials.resourceName,
          baseURL: credentials.baseUrl,
        });
        return azure(credentials.model || 'gpt-4o');
      }
      
      case 'bedrock': {
        const bedrock = createAmazonBedrock({
          region: credentials.region || 'us-east-1',
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
        });
        return bedrock(credentials.model || 'anthropic.claude-3-5-haiku-20241022-v1:0');
      }
      
      case 'ollama': {
        const ollama = createOllama({
          baseURL: credentials.baseUrl || 'http://localhost:11434',
        });
        return ollama(credentials.model || 'llama3.2');
      }
      
      default:
        throw new Error(`Unsupported AI provider: ${credentials.provider}`);
    }
  }

  async generateTabName(query: string, credentials: AICredentials): Promise<string> {
    try {
      const model = this.getModel(credentials);
      
      const result = await generateText({
        model,
        prompt: `Given this SQL query, generate a short, descriptive tab name (max 20 characters). Return only the name, no quotes or explanation:

${query}`,
        temperature: 0.3,
      });

      return result.text.trim().replace(/['"]/g, '').substring(0, 20);
    } catch (error) {
      console.error('Failed to generate tab name:', error);
      throw error;
    }
  }

  async generateSQL(
    prompt: string, 
    schemas: TableSchema[], 
    credentials: AICredentials
  ): Promise<string> {
    try {
      const model = this.getModel(credentials);
      
      const schemaContext = schemas.map(schema => {
        const columns = schema.columns.map(col => 
          `${col.name} ${col.type}${col.nullable ? '' : ' NOT NULL'}${col.defaultValue ? ` DEFAULT ${col.defaultValue}` : ''}`
        ).join(', ');
        
        return `Table: ${schema.tableName}
Columns: ${columns}${schema.primaryKey ? `
Primary Key: ${schema.primaryKey.join(', ')}` : ''}${schema.foreignKeys?.length ? `
Foreign Keys: ${schema.foreignKeys.map(fk => `${fk.column} -> ${fk.referencedTable}.${fk.referencedColumn}`).join(', ')}` : ''}`;
      }).join('\n\n');

      const tools = {
        executeQuery: tool({
          description: 'Execute a SQL query against the database',
          parameters: z.object({
            query: z.string().describe('The SQL query to execute'),
            explanation: z.string().describe('Brief explanation of what the query does'),
          }),
        }),
      };

      const result = await generateText({
        model,
        tools,
        prompt: `You are a PostgreSQL expert. Generate a SQL query based on the user's request using the provided database schema.

Database Schema:
${schemaContext}

User Request: ${prompt}

Generate a SQL query that fulfills the user's request. Use the executeQuery tool to provide the query and explanation.`,
        temperature: 0.1,
      });

      // Extract the SQL query from tool calls
      if (result.toolCalls && result.toolCalls.length > 0) {
        const queryCall = result.toolCalls.find(call => call.toolName === 'executeQuery');
        if (queryCall && 'query' in queryCall.args) {
          return queryCall.args.query as string;
        }
      }

      // Fallback: try to extract SQL from the text response
      const sqlMatch = result.text.match(/```sql\n([\s\S]*?)\n```/);
      if (sqlMatch) {
        return sqlMatch[1].trim();
      }

      return result.text.trim();
    } catch (error) {
      console.error('Failed to generate SQL:', error);
      throw error;
    }
  }

  async validateCredentials(credentials: AICredentials): Promise<boolean> {
    try {
      const model = this.getModel(credentials);
      
      await generateText({
        model,
        prompt: 'Hello',
        maxTokens: 1,
      });
      
      return true;
    } catch (error) {
      console.error('AI credentials validation failed:', error);
      return false;
    }
  }
}