import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

const PersonaSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  traits: z.record(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export type PersonaProfile = z.infer<typeof PersonaSchema>;

function safeParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function fallbackPersona(content: string, filename?: string): PersonaProfile {
  const name = filename?.replace(/\.[^/.]+$/, "") || "Customer Persona";
  const description = content.trim().slice(0, 240) || "Customer persona extracted from training document.";
  return {
    name,
    description,
    traits: {
      tone: "unknown",
      expertise: "unknown",
    },
    tags: [],
  };
}

export async function extractPersonaProfile(
  content: string,
  options?: { filename?: string; modelName?: string; useLLM?: boolean }
): Promise<PersonaProfile> {
  if (options?.useLLM === false) {
    return fallbackPersona(content, options?.filename);
  }

  const modelName = options?.modelName ?? "gpt-4o-mini";
  const llm = new ChatOpenAI({ model: modelName, temperature: 0.2, maxTokens: 512 });
  const systemPrompt =
    "You extract customer persona profiles for call center training. " +
    "Return ONLY valid JSON with keys: name, description, traits, tags. " +
    "traits should be an object (e.g., tone, expertise, decision_maker, constraints). " +
    "tags should be short lowercase labels.";

  const result = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(content.slice(0, 6000)),
  ]);

  const text = typeof result.content === "string" ? result.content : JSON.stringify(result.content);
  const parsed = safeParseJson(text);
  const validation = PersonaSchema.safeParse(parsed);

  if (!validation.success) {
    return fallbackPersona(content, options?.filename);
  }

  return {
    name: validation.data.name,
    description: validation.data.description,
    traits: validation.data.traits ?? {},
    tags: validation.data.tags ?? [],
  };
}
