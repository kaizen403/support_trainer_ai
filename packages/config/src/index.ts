import { z } from "zod";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const envSchema = z.object({
  PORT_HTTP: z.string().default("4000").transform(Number),
  PORT_WS: z.string().default("4001").transform(Number),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  CI: z.string().optional().transform((val) => val === "true" || val === "1"),

  DATABASE_URL: z.string().url(),

  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url(),

  LIVEKIT_API_KEY: z.string().min(1),
  LIVEKIT_API_SECRET: z.string().min(1),
  LIVEKIT_URL: z.string().url(),

  DEEPGRAM_API_KEY: z.string().min(1),
  ELEVEN_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),

  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:4000"),
  NEXT_PUBLIC_WS_URL: z.string().url().default("ws://localhost:4001"),
  NEXT_PUBLIC_LIVEKIT_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
