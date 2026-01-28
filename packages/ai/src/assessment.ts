import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

export interface TranscriptMessage {
  role: "user" | "ai";
  text: string;
  timestamp: number;
}

export interface TranscriptData {
  messages: TranscriptMessage[];
  metadata?: {
    totalDuration?: number;
    turnCount?: number;
    endReason?: string;
  };
}

export interface AssessmentInput {
  transcript: TranscriptData | TranscriptMessage[];
  trainingName: string;
  systemPrompt: string;
  avatarName: string;
  avatarPersona: string;
}

export interface AssessmentResult {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  categories: {
    empathy: { score: number; notes: string };
    clarity: { score: number; notes: string };
    resolution: { score: number; notes: string };
    professionalism: { score: number; notes: string };
  };
  highlights: {
    quote: string;
    type: "positive" | "negative";
    note: string;
  }[];
}

const AssessmentSchema = z.object({
  score: z.number().int().min(0).max(100),
  feedback: z.string().min(1),
  strengths: z.array(z.string()).min(1),
  improvements: z.array(z.string()),
  categories: z.object({
    empathy: z.object({ score: z.number().int().min(0).max(100), notes: z.string() }),
    clarity: z.object({ score: z.number().int().min(0).max(100), notes: z.string() }),
    resolution: z.object({ score: z.number().int().min(0).max(100), notes: z.string() }),
    professionalism: z.object({ score: z.number().int().min(0).max(100), notes: z.string() }),
  }),
  highlights: z.array(
    z.object({
      quote: z.string(),
      type: z.enum(["positive", "negative"]),
      note: z.string(),
    })
  ),
});

function normalizeTranscript(
  transcript: TranscriptData | TranscriptMessage[]
): TranscriptMessage[] {
  if (Array.isArray(transcript)) {
    return transcript;
  }
  return transcript.messages ?? [];
}

function formatTranscript(messages: TranscriptMessage[]): string {
  if (messages.length === 0) {
    return "(No conversation recorded)";
  }
  return messages
    .map((msg) => {
      const speaker = msg.role === "user" ? "Agent" : "Customer";
      return `${speaker}: ${msg.text}`;
    })
    .join("\n");
}

function buildSystemPrompt(input: AssessmentInput): string {
  return `You are an expert call center training evaluator. Assess the agent's performance in a simulated customer service call.

Training Context:
- Training: ${input.trainingName}
- Customer Avatar: ${input.avatarName} - ${input.avatarPersona}
- Training Instructions: ${input.systemPrompt}

Evaluation Criteria:
1. Communication clarity and professionalism
2. Problem-solving and issue resolution
3. Empathy and customer rapport
4. Product/service knowledge application
5. Adherence to training guidelines

Provide your assessment as JSON with:
- score: integer 0-100 (overall performance)
- feedback: 2-3 sentence summary of performance
- strengths: array of 2-4 specific things done well
- improvements: array of 1-3 areas for improvement (empty if excellent)
- categories: object with empathy, clarity, resolution, professionalism (each with { score: 0-100, notes: string })
- highlights: array of { quote: string, type: "positive" | "negative", note: string } objects capturing key moments

Be specific and actionable. Reference actual moments from the conversation.`;
}

export interface AssessmentConfig {
  model?: {
    name?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export async function generateAssessment(
  input: AssessmentInput,
  config: AssessmentConfig = {}
): Promise<AssessmentResult> {
  const modelName = config.model?.name ?? "gpt-4o-mini";
  const temperature = config.model?.temperature ?? 0.3;
  const maxTokens = config.model?.maxTokens ?? 2048;

  const llm = new ChatOpenAI({
    model: modelName,
    temperature,
    maxTokens,
  });

  const messages = normalizeTranscript(input.transcript);
  const formattedTranscript = formatTranscript(messages);
  const systemPrompt = buildSystemPrompt(input);

  const userPrompt = `Evaluate this training call transcript:

${formattedTranscript}

Respond with valid JSON only.`;

  const response = await llm.invoke([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  const content =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  let jsonStr = content.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr);
  const validated = AssessmentSchema.parse(parsed);

  return {
    score: validated.score,
    feedback: validated.feedback,
    strengths: validated.strengths,
    improvements: validated.improvements,
    categories: validated.categories,
    highlights: validated.highlights,
  };
}
