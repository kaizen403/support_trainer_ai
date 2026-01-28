import { cli, ServerOptions } from "@livekit/agents";
import { env } from "@repo/config";
import { fileURLToPath } from "node:url";

const agentEntry = fileURLToPath(new URL("./entrypoint.ts", import.meta.url));

cli.runApp(
  new ServerOptions({
    agent: agentEntry,
    wsURL: env.LIVEKIT_URL,
    apiKey: env.LIVEKIT_API_KEY,
    apiSecret: env.LIVEKIT_API_SECRET,
  }),
);
