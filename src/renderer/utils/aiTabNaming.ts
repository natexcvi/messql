import { generateTabName } from './tabNaming';

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

// Cache for AI-generated names to avoid repeated calls for the same query
const tabNameCache = new Map<string, string>();

// Simple preference storage for AI naming
let aiNamingEnabled = true;
let cachedCredentials: AICredentials | null = null;

export function setAINamingEnabled(enabled: boolean): void {
  aiNamingEnabled = enabled;
}

export function isAINamingEnabled(): boolean {
  return aiNamingEnabled;
}

export async function loadAICredentials(): Promise<AICredentials | null> {
  if (cachedCredentials) {
    return cachedCredentials;
  }

  try {
    // Try to load credentials for each provider in order of preference
    const providers: Array<AICredentials['provider']> = ['openai', 'anthropic', 'azure', 'bedrock', 'ollama'];
    
    for (const provider of providers) {
      const credentialsStr = await window.electronAPI.ai.getCredentials(provider);
      if (credentialsStr) {
        const credentials = JSON.parse(credentialsStr) as AICredentials;
        cachedCredentials = credentials;
        return credentials;
      }
    }
  } catch (error) {
    console.warn('Failed to load AI credentials:', error);
  }

  return null;
}

export function clearCredentialsCache(): void {
  cachedCredentials = null;
}

export async function generateAITabName(query: string): Promise<string> {
  // If AI naming is disabled, use the rule-based approach
  if (!aiNamingEnabled) {
    return generateTabName(query);
  }

  // Check cache first
  const cacheKey = query.trim().toLowerCase();
  if (tabNameCache.has(cacheKey)) {
    return tabNameCache.get(cacheKey)!;
  }

  try {
    // Load AI credentials
    const credentials = await loadAICredentials();
    if (!credentials) {
      console.log('No AI credentials available, falling back to rule-based naming');
      return generateTabName(query);
    }

    // Generate AI-powered tab name
    const aiName = await window.electronAPI.ai.generateTabName(query, credentials);
    
    if (aiName && aiName.trim().length > 0) {
      // Cache the result
      tabNameCache.set(cacheKey, aiName);
      
      // Limit cache size to prevent memory issues
      if (tabNameCache.size > 100) {
        const firstKey = tabNameCache.keys().next().value;
        if (firstKey) {
          tabNameCache.delete(firstKey);
        }
      }
      
      return aiName;
    }
  } catch (error) {
    console.warn('AI tab naming failed, falling back to rule-based naming:', error);
  }

  // Fall back to rule-based naming
  const fallbackName = generateTabName(query);
  tabNameCache.set(cacheKey, fallbackName);
  return fallbackName;
}

// Enhanced function that handles both query execution and new tab scenarios
export async function generateSmartTabName(
  query: string, 
  context?: {
    isTableSelect?: boolean;
    schema?: string;
    table?: string;
    isRerun?: boolean;
  }
): Promise<string> {
  // Handle special cases that don't need AI
  if (context?.isTableSelect && context.schema && context.table) {
    return `"${context.schema}"."${context.table}"`;
  }
  
  if (context?.isRerun) {
    return 'Rerun Query';
  }

  // For empty queries, return default
  if (!query || query.trim().length === 0) {
    return 'New Query';
  }

  // Use AI naming for actual queries
  return await generateAITabName(query);
}

// Function to refresh a tab name (useful for when users change AI settings)
export async function refreshTabName(query: string): Promise<string> {
  const cacheKey = query.trim().toLowerCase();
  tabNameCache.delete(cacheKey); // Clear cache for this query
  return await generateAITabName(query);
}