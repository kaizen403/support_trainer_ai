import {
  DEFAULT_API_CONNECT_OPTIONS,
  type APIConnectOptions,
  defineAgent,
  llm,
  type JobContext,
  voice,
} from "@livekit/agents";
import * as deepgram from "@livekit/agents-plugin-deepgram";
import * as elevenlabs from "@livekit/agents-plugin-elevenlabs";
import { env } from "@repo/config";
import {
  createConversationGraph,
  generateAvatarProfile,
  type AvatarProfile,
  type ConversationMessage,
  type RAGResult,
  type RetrievalRequest,
} from "@repo/ai";
import { prisma } from "@repo/db";
import { randomUUID } from "node:crypto";

type PersonaPreset = "RUDE" | "CHILL" | "UNEXPECTED" | "NEUTRAL" | "DEMANDING";

const DEFAULT_VOICE_ID = "bIHbv24MWmeRgasZH58o";
const LEGACY_VOICE_ID = "TxGEqnHWrfWFTf9X9X9D";
const REPLACEMENT_VOICE_ID = "TX3LPaxmHKxFdv7VOQHJ";

interface ScenarioMetadata {
  personaPreset: PersonaPreset;
  temperament: string;
  expertise: string;
  complexity: string;
}

interface RoomMetadata {
  trainingId?: string;
  sessionId?: string;
  systemPrompt?: string;
  avatar?: AvatarProfile;
  topK?: number;
  mode?: "simulation" | "guided_interview";
  personaId?: string;
  scenario?: ScenarioMetadata | null;
}

const PERSONA_PRESET_INSTRUCTIONS: Record<PersonaPreset, string> = {
  RUDE: "You are frustrated and angry. Use aggressive language, interrupt frequently, and show impatience. Be hostile and difficult to work with.",
  CHILL: "You are relaxed and easy-going. Be cooperative, friendly, and patient. Take your time and be understanding.",
  UNEXPECTED: "You are unpredictable. Change topics suddenly, ask unexpected questions, and keep the trainee on their toes. Be surprising and unconventional.",
  NEUTRAL: "You are professional and straightforward. Maintain a neutral, business-like tone. Be balanced and objective.",
  DEMANDING: "You have high expectations and demand immediate solutions. Threaten to ask for a manager if not satisfied. Be persistent and uncompromising.",
};

const conversationGraph = createConversationGraph({
  retriever: async ({ trainingId, queryEmbedding, topK }: RetrievalRequest) => {
    if (!trainingId || !queryEmbedding) {
      return [];
    }

    const results = await prisma.$queryRawUnsafe<RAGResult[]>(
      `
        SELECT 
          id as "documentId",
          filename,
          content,
          1 - (embedding <=> $1::vector) as similarity
        FROM "KnowledgeDocument"
        WHERE "trainingId" = $2
        ORDER BY similarity DESC
        LIMIT $3
      `,
      queryEmbedding,
      trainingId,
      topK
    );

    return results.map((result: RAGResult) => ({
      ...result,
      similarity: Number(result.similarity),
    }));
  },
});

function parseRoomMetadata(raw?: string): RoomMetadata {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as RoomMetadata;
  } catch {
    return {};
  }
}

function resolveVoiceId(value?: string) {
  if (!value) return DEFAULT_VOICE_ID;
  if (value === LEGACY_VOICE_ID) return REPLACEMENT_VOICE_ID;
  return value;
}

function toConversationMessages(chatCtx: llm.ChatContext): ConversationMessage[] {
  return chatCtx.items
    .filter((item) => item.type === "message")
    .map((item) => {
      const role = item.role === "developer" ? "system" : item.role;
      const content = item.textContent ?? "";
      return {
        role: role === "assistant" || role === "user" || role === "system" ? role : "user",
        content,
      };
    })
    .filter((message) => message.content.length > 0);
}

class LLMAdapter extends llm.LLM {
  constructor(
    private readonly graph: ReturnType<typeof createConversationGraph>,
    private readonly metadata: RoomMetadata
  ) {
    super();
  }

  label() {
    return "langgraph-adapter";
  }

  chat({ chatCtx, toolCtx, connOptions }: {
    chatCtx: llm.ChatContext;
    toolCtx?: llm.ToolContext;
    connOptions?: APIConnectOptions;
  }) {
    const resolvedConnOptions = connOptions ?? DEFAULT_API_CONNECT_OPTIONS;
    return new GraphStream(this, {
      chatCtx,
      toolCtx,
      connOptions: resolvedConnOptions,
    }, this.graph, this.metadata);
  }
}

class GraphStream extends llm.LLMStream {
  constructor(
    llmInstance: llm.LLM,
    args: { chatCtx: llm.ChatContext; toolCtx?: llm.ToolContext; connOptions: APIConnectOptions },
    private readonly graph: ReturnType<typeof createConversationGraph>,
    private readonly metadata: RoomMetadata
  ) {
    super(llmInstance, args);
  }

  protected async run(): Promise<void> {
    const avatar = this.metadata.avatar ?? generateAvatarProfile();
    const mode = this.metadata.mode ?? "simulation";
    const state = {
      messages: toConversationMessages(this.chatCtx),
      trainingId: this.metadata.trainingId ?? "",
      systemPrompt: this.metadata.systemPrompt ?? "",
      avatar,
      mode,
      topK: this.metadata.topK ?? 5,
      ragResults: [],
    };

    const result = await this.graph.invoke(state);
    const response = result.response ?? "";

    this.queue.put({
      id: randomUUID(),
      delta: {
        role: "assistant",
        content: response,
      },
    });
  }
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    const metadata = parseRoomMetadata(ctx.room.metadata ?? undefined);
    const avatar = metadata.avatar ?? generateAvatarProfile();
    const scenario = metadata.scenario;

    // Log scenario info for debugging
    if (scenario) {
      console.log("[Agent] Scenario loaded:", {
        personaPreset: scenario.personaPreset,
        temperament: scenario.temperament,
        expertise: scenario.expertise,
        complexity: scenario.complexity,
      });
    } else {
      console.log("[Agent] No scenario metadata - using default behavior");
    }

    const publishTranscript = (payload: { sender: "user" | "agent"; text: string }) => {
      if (!payload.text.trim()) return;
      if (!ctx.room.localParticipant) return;

      void ctx.room.localParticipant
        .publishData(Buffer.from(JSON.stringify(payload)), { reliable: true })
        .catch((error) => {
          console.error("Failed to publish transcript", error);
        });
    };

    // Build persona instruction based on scenario preset
    const personaInstruction = scenario?.personaPreset
      ? PERSONA_PRESET_INSTRUCTIONS[scenario.personaPreset]
      : PERSONA_PRESET_INSTRUCTIONS.NEUTRAL;

    const modeInstruction =
      metadata.mode === "guided_interview"
        ? "You are a call center training interviewer. Ask concise, structured questions and wait for trainee responses."
        : `You are ${avatar.name}. ${avatar.persona} ${personaInstruction} Keep responses concise and actionable.`;

    const agent = new voice.Agent({
      instructions: modeInstruction,
    });

    const session = new voice.AgentSession({
      stt: new deepgram.STT({ apiKey: env.DEEPGRAM_API_KEY }),
      tts: new elevenlabs.TTS({
        apiKey: env.ELEVEN_API_KEY,
        voiceId: resolveVoiceId(avatar.voiceId),
      }),
      llm: new LLMAdapter(conversationGraph, {
        ...metadata,
        avatar,
      }),
    });

    session.on(voice.AgentSessionEventTypes.UserInputTranscribed, (ev) => {
      publishTranscript({ sender: "user", text: ev.transcript });
    });

    session.on(voice.AgentSessionEventTypes.ConversationItemAdded, (ev) => {
      if (ev.item.role !== "assistant") return;
      const content = Array.isArray(ev.item.content)
        ? ev.item.content
            .map((part) => {
              if (typeof part === "string") return part;
              if ("text" in part && typeof part.text === "string") return part.text;
              return "";
            })
            .join("")
        : ev.item.content ?? "";
      publishTranscript({ sender: "agent", text: content });
    });

    await session.start({ agent, room: ctx.room });
  },
});
