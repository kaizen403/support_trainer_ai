import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { env } from "@repo/config";
import { auth } from "./auth.js";
import trainingsRouter from "./routes/trainings.js";
import documentsRouter from "./routes/documents.js";
import sessionsRouter from "./routes/sessions.js";
import teamRouter from "./routes/team.js";

const app = express();
const port = env.PORT_HTTP;

app.use(cors({
  origin: [env.BETTER_AUTH_URL, "http://localhost:3000"],
  credentials: true,
}));

app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/api/trainings", trainingsRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/team", teamRouter);

app.listen(port, () => {
  console.log(`HTTP API listening on http://localhost:${port}`);
});
