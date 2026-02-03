import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { buildRetrievalQuery, type RAGResult } from "./rag.js";

export interface AvatarProfile {
  name: string;
  persona: string;
  voiceId: string;
}

export interface ConversationMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ConversationGraphState {
  messages: ConversationMessage[];
  trainingId: string;
  systemPrompt?: string;
  avatar: AvatarProfile;
  mode?: "simulation" | "guided_interview";
  topK?: number;
  ragResults?: RAGResult[];
  response?: string;
}

export interface RetrievalRequest {
  trainingId: string;
  queryEmbedding: string;
  topK: number;
}

export interface ConversationGraphConfig {
  retriever?: (params: RetrievalRequest) => Promise<RAGResult[]>;
  model?: {
    name?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

const ConversationStateAnnotation = Annotation.Root({
  messages: Annotation<ConversationMessage[]>(),
  trainingId: Annotation<string>(),
  systemPrompt: Annotation<string | undefined>(),
  avatar: Annotation<AvatarProfile>(),
  mode: Annotation<"simulation" | "guided_interview" | undefined>(),
  topK: Annotation<number | undefined>(),
  ragResults: Annotation<RAGResult[] | undefined>(),
  response: Annotation<string | undefined>(),
});

const avatarProfiles: AvatarProfile[] = [
  {
    name: "Maya Patel",
    persona:
      "A friendly but impatient customer who values quick resolutions and clear explanations.",
    voiceId: "21m00Tcm4TlvDq8ikWAM",
  },
  {
    name: "James Carter",
    persona:
      "A skeptical customer who asks detailed questions and needs reassurance before agreeing.",
    voiceId: "ErXwobaYiN019PkySvjV",
  },
  {
    name: "Elena Torres",
    persona:
      "A polite customer with a complex issue who expects empathy and step-by-step guidance.",
    voiceId: "EXAVITQu4vr4xnSDxMaL",
  },
  {
    name: "Noah Brooks",
    persona:
      "A time-pressed customer who wants concise options and a recommended next step.",
    voiceId: "TX3LPaxmHKxFdv7VOQHJ",
  },
];

export function generateAvatarProfile(): AvatarProfile {
  const selected = avatarProfiles[Math.floor(Math.random() * avatarProfiles.length)];
  return { ...selected };
}

function formatRagResults(results: RAGResult[]): string {
  if (results.length === 0) return "";
  return results
    .map(
      (result, index) =>
        `${index + 1}. [${result.filename}] ${result.content.trim()}`
    )
    .join("\n");
}

function toChatMessages(history: ConversationMessage[]): BaseMessage[] {
  return history
    .map((message) => {
      if (message.role === "user") {
        return new HumanMessage(message.content);
      }
      if (message.role === "assistant") {
        return new AIMessage(message.content);
      }
      return new SystemMessage(message.content);
    })
    .filter((message) => message.content.length > 0);
}

export function createConversationGraph(config: ConversationGraphConfig) {
  const modelName = config.model?.name ?? "gpt-4o-mini";
  const temperature = config.model?.temperature ?? 0.4;
  const maxTokens = config.model?.maxTokens ?? 256;
  const llm = new ChatOpenAI({ model: modelName, temperature, maxTokens });

  const graph = new StateGraph(ConversationStateAnnotation)
    .addNode("retrieve", async (state: ConversationGraphState) => {
      const lastUserMessage = [...(state.messages ?? [])]
        .reverse()
        .find((message) => message.role === "user");

      if (!lastUserMessage || !state.trainingId || !config.retriever) {
        return { ragResults: [] };
      }

      const { queryEmbedding } = await buildRetrievalQuery({
        trainingId: state.trainingId,
        query: lastUserMessage.content,
        topK: state.topK ?? 5,
      });

      const ragResults = await config.retriever({
        trainingId: state.trainingId,
        queryEmbedding,
        topK: state.topK ?? 5,
      });

      return { ragResults };
    })
    .addNode("respond", async (state: ConversationGraphState) => {
      const ragResults = state.ragResults ?? [];
      const ragContext = formatRagResults(ragResults);
      const persona = state.avatar?.persona
        ? `${state.avatar.name}: ${state.avatar.persona}`
        : state.avatar?.name ?? "";
      const mode = state.mode ?? "simulation";
      const modeInstruction =
        mode === "guided_interview"
          ? "You are a call center training interviewer. Ask the trainee targeted questions about product knowledge, objection handling, and company policies. Keep responses concise and drive the trainee to explain their reasoning."
          : "You are a call center training customer simulation.";

      const systemParts = [
        modeInstruction,
        state.systemPrompt ? `Training instructions:\n${state.systemPrompt}` : "",
        persona ? `Persona: ${persona}` : "",
        ragContext ? `Knowledge base context:\n${ragContext}` : "",
        mode === "guided_interview"
          ? "Interview the trainee and provide a single question or follow-up prompt at a time."
          : "Respond as the customer with concise, actionable replies.",
      ].filter((part) => part.trim().length > 0);

      const messages = [
        new SystemMessage(systemParts.join("\n\n")),
        ...toChatMessages(state.messages ?? []),
      ];

      const result = await llm.invoke(messages);
      const response =
        typeof result.content === "string"
          ? result.content
          : JSON.stringify(result.content);

      return {
        response,
        messages: [...(state.messages ?? []), { role: "assistant", content: response }],
      };
    })
    .addEdge(START, "retrieve")
    .addEdge("retrieve", "respond")
    .addEdge("respond", END);

  return graph.compile({
    name: "conversation_graph",
    description: "Retrieve RAG context and generate a response.",
  });
}
