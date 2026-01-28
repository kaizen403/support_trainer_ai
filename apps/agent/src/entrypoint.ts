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

interface RoomMetadata {
  trainingId?: string;
  sessionId?: string;
  systemPrompt?: string;
  avatar?: AvatarProfile;
  topK?: number;
}

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
    const state = {
      messages: toConversationMessages(this.chatCtx),
      trainingId: this.metadata.trainingId ?? "",
      systemPrompt: this.metadata.systemPrompt ?? "",
      avatar,
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
    const reliableKind = 0 as Parameters<
      NonNullable<typeof ctx.room.localParticipant>["publishData"]
    >[1];
    const publishTranscript = (payload: { sender: "user" | "agent"; text: string }) => {
      if (!payload.text.trim()) return;
      if (!ctx.room.localParticipant) return;

      void ctx.room.localParticipant
        .publishData(Buffer.from(JSON.stringify(payload)), reliableKind)
        .catch((error) => {
          console.error("Failed to publish transcript", error);
        });
    };

    const agent = new voice.Agent({
      instructions:
        `You are ${avatar.name}. ${avatar.persona} Keep responses concise and actionable.`,
    });

    const session = new voice.AgentSession({
      stt: new deepgram.STT({ apiKey: env.DEEPGRAM_API_KEY }),
      tts: new elevenlabs.TTS({
        apiKey: env.ELEVEN_API_KEY,
        voiceId: avatar.voiceId,
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
