export * from './rag.js';
export * from './conversation.js';
export * from './assessment.js';
export * from './persona.js';

export interface AIConfig {
  provider: 'openai' | 'anthropic';
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface ConversationContext {
  sessionId: string;
  trainingId: string;
  persona: {
    name: string;
    background: string;
    personality: string;
    objectives: string[];
    constraints: string[];
  };
  history: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
}

export async function generateResponse(
  _context: ConversationContext,
  _config: AIConfig
): Promise<string> {
  throw new Error('AI integration not implemented - placeholder only');
}

export async function evaluateSession(
  _context: ConversationContext,
  _criteria: unknown[]
): Promise<unknown> {
  throw new Error('AI evaluation not implemented - placeholder only');
}
