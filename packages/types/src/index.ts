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
  mode: TrainingMode;
  skillTags: string[];
  config?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeDocument {
  id: string;
  trainingId?: string;
  organizationId?: string;
  filename: string;
  documentType: DocumentType;
  format: DocumentFormat;
  ingestionStatus: IngestionStatus;
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
  mode: TrainingMode;
  personaId?: string;
  personaSnapshot?: Record<string, unknown>;
  skillTags: string[];
  status: SessionStatus;
  startedAt: Date;
  endedAt?: Date;
  transcript?: TranscriptData;
  coachingNotes?: Record<string, unknown>;
  recordingUrl?: string;
  recordingStatus: RecordingStatus;
  recordingMetadata?: Record<string, unknown>;
}

export type SessionStatus = 'active' | 'completed' | 'abandoned';

export type TrainingMode = 'simulation' | 'guided_interview';

export type DocumentType =
  | 'product'
  | 'persona'
  | 'script'
  | 'objection'
  | 'policy'
  | 'other';

export type DocumentFormat = 'pdf' | 'txt' | 'docx' | 'md';

export type IngestionStatus = 'processing' | 'indexed' | 'failed';

export type RecordingStatus = 'not_started' | 'recording' | 'completed' | 'failed';

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
  overallScore?: number;
  clarityScore?: number;
  protocolAdherenceScore?: number;
  empathyScore?: number;
  conversionPotentialScore?: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  coachingReport?: Record<string, unknown>;
  citations?: Array<{
    documentId: string;
    chunkContent: string;
    deviation: string;
    recommendation: string;
  }>;
  createdAt: Date;
}

export interface Persona {
  id: string;
  organizationId: string;
  trainingId?: string;
  name: string;
  description: string;
  traits?: Record<string, unknown>;
  tags: string[];
  sourceDocumentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Assignment {
  id: string;
  trainingId: string;
  userId: string;
  assignedById?: string;
  status: AssignmentStatus;
  dueAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type AssignmentStatus = 'assigned' | 'in_progress' | 'completed' | 'cancelled';

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
  mode?: TrainingMode;
  skillTags?: string[];
  config?: Record<string, unknown>;
}

export interface UpdateTrainingInput {
  name?: string;
  description?: string;
  systemPrompt?: string;
  mode?: TrainingMode;
  skillTags?: string[];
  config?: Record<string, unknown>;
}

export interface CreateSessionInput {
  trainingId: string;
  mode?: TrainingMode;
  personaId?: string;
}

export interface EndSessionInput {
  endReason: 'completed' | 'timeout' | 'user_ended';
}
