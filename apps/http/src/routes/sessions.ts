import { Router, Request, Response } from "express";
import { RoomServiceClient } from "livekit-server-sdk";
import { fromNodeHeaders } from "better-auth/node";
import { createId } from "@paralleldrive/cuid2";
import {
  generateAvatarProfile,
  generateAssessment,
  type AvatarProfile,
  type TranscriptData,
  type AssessmentResult,
} from "@repo/ai";
import { env } from "@repo/config";
import { prisma } from "@repo/db";
import { auth } from "../auth.js";

const router = Router();
const roomService = new RoomServiceClient(
  env.LIVEKIT_URL,
  env.LIVEKIT_API_KEY,
  env.LIVEKIT_API_SECRET
);

async function getSession(req: Request) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  return session;
}

async function dispatchAgentToRoom(
  roomName: string,
  metadata: { sessionId: string; trainingId: string; avatar: AvatarProfile }
) {
  return {
    dispatchId: createId(),
    roomName,
    status: "queued",
    metadata,
  };
}

router.post("/", async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { activeOrganizationId } = session.session;
    if (!activeOrganizationId) {
      return res.status(400).json({ error: "No organization selected" });
    }

    const { trainingId } = req.body;
    if (!trainingId || typeof trainingId !== "string") {
      return res.status(400).json({ error: "trainingId is required" });
    }

    const training = await prisma.training.findFirst({
      where: { id: trainingId, organizationId: activeOrganizationId },
    });

    if (!training) {
      return res.status(404).json({ error: "Training not found" });
    }

    const avatar = generateAvatarProfile();
    const trainingSession = await prisma.trainingSession.create({
      data: {
        trainingId: training.id,
        userId: session.user.id,
        avatarName: avatar.name,
        avatarPersona: avatar.persona,
      },
    });

    const roomName = `training-${training.id}-${createId()}`;
    const topK = 5;
    const roomMetadata = JSON.stringify({
      trainingId: training.id,
      sessionId: trainingSession.id,
      systemPrompt: training.systemPrompt,
      avatar,
      topK,
    });

    await roomService.createRoom({
      name: roomName,
      metadata: roomMetadata,
    });

    const dispatch = await dispatchAgentToRoom(roomName, {
      trainingId: training.id,
      sessionId: trainingSession.id,
      avatar,
    });

    return res.status(201).json({
      sessionId: trainingSession.id,
      roomName,
      trainingId: training.id,
      avatar,
      dispatch,
    });
  } catch (error) {
    console.error("Error creating training session:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sessions = await prisma.trainingSession.findMany({
      where: { userId: session.user.id },
      include: {
        training: {
          select: {
            name: true,
          },
        },
        assessment: true,
      },
      orderBy: { startedAt: "desc" },
    });

    return res.json(sessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/analytics", async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { activeOrganizationId } = session.session;
    if (!activeOrganizationId) {
      return res.status(400).json({ error: "No organization selected" });
    }

    const [
      totalSessions,
      completedSessions,
      activeMembersData,
      averageScoreData,
      recentSessionsRaw,
      allSessionsForPerformance,
    ] = await Promise.all([
      prisma.trainingSession.count({
        where: { training: { organizationId: activeOrganizationId } },
      }),
      prisma.trainingSession.count({
        where: {
          training: { organizationId: activeOrganizationId },
          status: "COMPLETED",
        },
      }),
      prisma.trainingSession.findMany({
        where: { training: { organizationId: activeOrganizationId } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.assessment.aggregate({
        _avg: { score: true },
        where: {
          session: { training: { organizationId: activeOrganizationId } },
        },
      }),
      prisma.trainingSession.findMany({
        where: { training: { organizationId: activeOrganizationId } },
        orderBy: { startedAt: "desc" },
        take: 10,
        include: {
          training: { select: { name: true } },
          user: { select: { name: true } },
          assessment: { select: { score: true } },
        },
      }),
      prisma.trainingSession.findMany({
        where: { training: { organizationId: activeOrganizationId } },
        include: {
          training: { select: { name: true } },
          assessment: { select: { score: true } },
        },
      }),
    ]);

    const activeMembers = activeMembersData.length;
    const completionRate =
      totalSessions > 0
        ? Math.round((completedSessions / totalSessions) * 100)
        : 0;
    const averageScore = averageScoreData._avg.score || 0;

    const recentSessions = recentSessionsRaw.map((s: any) => ({
      id: s.id,
      user: s.user?.name || "Unknown User",
      training: s.training.name,
      score: s.assessment?.score || null,
      date: s.startedAt,
      status: s.status,
    }));

    const performanceMap = new Map<
      string,
      { totalScore: number; count: number; sessionCount: number }
    >();
    for (const s of (allSessionsForPerformance as any[])) {
      const trainingName = s.training.name;
      const stats = performanceMap.get(trainingName) || {
        totalScore: 0,
        count: 0,
        sessionCount: 0,
      };
      stats.sessionCount++;
      if (s.assessment) {
        stats.totalScore += s.assessment.score;
        stats.count++;
      }
      performanceMap.set(trainingName, stats);
    }

    const trainingPerformance = Array.from(performanceMap.entries()).map(
      ([name, stats]) => ({
        name,
        avgScore:
          stats.count > 0 ? Math.round(stats.totalScore / stats.count) : 0,
        sessions: stats.sessionCount,
      })
    );

    return res.json({
      overview: { totalSessions, activeMembers, averageScore, completionRate },
      recentSessions,
      trainingPerformance,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const trainingSession = await prisma.trainingSession.findFirst({
      where: { id: req.params.id, userId: session.user.id },
      include: {
        training: true,
        assessment: true,
      },
    });

    if (!trainingSession) {
      return res.status(404).json({ error: "Session not found" });
    }

    return res.json(trainingSession);
  } catch (error) {
    console.error("Error fetching session:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/end", async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { transcript } = req.body;
    if (!transcript) {
      return res.status(400).json({ error: "transcript is required" });
    }

    const trainingSession = await prisma.trainingSession.findFirst({
      where: { id: req.params.id, userId: session.user.id },
      include: { training: true },
    });

    if (!trainingSession) {
      return res.status(404).json({ error: "Session not found" });
    }

    const updatedSession = await prisma.trainingSession.update({
      where: { id: req.params.id },
      data: {
        status: "COMPLETED",
        endedAt: new Date(),
        transcript: transcript,
      },
    });

    generateAssessment(
      {
        transcript: transcript as TranscriptData,
        trainingName: trainingSession.training.name,
        systemPrompt: trainingSession.training.systemPrompt,
        avatarName: trainingSession.avatarName,
        avatarPersona: trainingSession.avatarPersona,
      },
      {}
    )
      .then(async (result: AssessmentResult) => {
        await prisma.assessment.create({
          data: {
            sessionId: trainingSession.id,
            score: result.score,
            feedback: result.feedback,
            strengths: result.strengths,
            improvements: result.improvements,
            categories: (result as any).categories,
            highlights: (result as any).highlights,
          } as any,
        });
        console.log(`Assessment created for session ${trainingSession.id}`);
      })
      .catch((err: unknown) => {
        console.error(`Assessment generation failed for session ${trainingSession.id}:`, err);
      });

    return res.json(updatedSession);
  } catch (error) {
    console.error("Error ending session:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/transcript", async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const trainingSession = await prisma.trainingSession.findFirst({
      where: { id: req.params.id, userId: session.user.id },
      select: {
        transcript: true,
      },
    });

    if (!trainingSession) {
      return res.status(404).json({ error: "Session not found" });
    }

    return res.json({ transcript: trainingSession.transcript });
  } catch (error) {
    console.error("Error fetching transcript:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/assessment", async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const trainingSession = await prisma.trainingSession.findFirst({
      where: { id: req.params.id, userId: session.user.id },
      include: { assessment: true },
    });

    if (!trainingSession) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (!trainingSession.assessment) {
      return res.status(404).json({ error: "Assessment not yet available" });
    }

    return res.json(trainingSession.assessment);
  } catch (error) {
    console.error("Error fetching assessment:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
