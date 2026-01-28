// =============================================================================
// Better Auth Managed Types
// =============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: OrganizationSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationSettings {
  maxTrainees?: number;
  features?: string[];
}

// Better Auth organization member with role
export interface Member {
  id: string;
  userId: string;
  organizationId: string;
  role: MemberRole;
  createdAt: Date;
  updatedAt: Date;
}

export type MemberRole = 'owner' | 'admin' | 'member';

// =============================================================================
// Application Types
// =============================================================================

export interface Training {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  systemPrompt: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeDocument {
  id: string;
  trainingId: string;
  filename: string;
  content: string;
  embedding?: number[]; // vector(1536) for OpenAI ada-002
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainingSession {
  id: string;
  trainingId: string;
  userId: string;
  avatarName: string;
  avatarPersona: string;
  status: SessionStatus;
  startedAt: Date;
  endedAt?: Date;
  transcript?: TranscriptData;
}

export type SessionStatus = 'active' | 'completed' | 'abandoned';

export interface TranscriptData {
  messages: TranscriptMessage[];
  metadata: TranscriptMetadata;
}

export interface TranscriptMessage {
  role: 'user' | 'ai';
  text: string;
  timestamp: number; // ms from session start
  duration?: number; // speech duration in ms
}

export interface TranscriptMetadata {
  totalDuration: number;
  turnCount: number;
  endReason: 'completed' | 'timeout' | 'user_ended';
}

export interface Assessment {
  id: string;
  sessionId: string;
  score: number; // 0-100
  feedback: string;
  strengths: string[];
  improvements: string[];
  createdAt: Date;
}

// =============================================================================
// API Types
// =============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// =============================================================================
// WebSocket Event Types
// =============================================================================

export type WSEventType =
  | 'session.start'
  | 'session.message'
  | 'session.end'
  | 'audio.chunk'
  | 'transcription.partial'
  | 'transcription.final'
  | 'ai.response'
  | 'error';

export interface WSEvent<T = unknown> {
  type: WSEventType;
  sessionId: string;
  payload: T;
  timestamp: number;
}

export interface AudioChunkPayload {
  chunk: ArrayBuffer | string;
  format: 'wav' | 'webm' | 'opus';
  sampleRate: number;
}

export interface TranscriptionPayload {
  text: string;
  isFinal: boolean;
  confidence?: number;
}

// =============================================================================
// Utility Types
// =============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type WithTimestamps<T> = T & {
  createdAt: Date;
  updatedAt: Date;
};

// =============================================================================
// Input Types (for API requests)
// =============================================================================

export interface CreateTrainingInput {
  name: string;
  description: string;
  systemPrompt: string;
}

export interface UpdateTrainingInput {
  name?: string;
  description?: string;
  systemPrompt?: string;
}

export interface CreateSessionInput {
  trainingId: string;
}

export interface EndSessionInput {
  endReason: 'completed' | 'timeout' | 'user_ended';
}
