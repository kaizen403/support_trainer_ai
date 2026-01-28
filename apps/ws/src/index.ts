import express from "express";
import { WebSocketServer } from "ws";
import { env } from "@repo/config";

const app = express();
const port = env.PORT_WS;

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

const server = app.listen(port, () => {
  console.log(`WS server listening on http://localhost:${port}`);
});

const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
  socket.send(JSON.stringify({ type: "welcome" }));

  socket.on("message", (data) => {
    socket.send(data.toString());
  });
});
