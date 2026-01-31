import { Router, Request, Response } from "express";
import { prisma } from "@repo/db";
import { auth } from "../auth.js";
import { fromNodeHeaders } from "better-auth/node";

const router = Router();

async function getSession(req: Request) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  return session;
}

router.get("/trainees", async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const users = await prisma.user.findMany({
      include: {
        trainingSessions: {
          where: { status: "COMPLETED" },
          orderBy: { startedAt: "desc" },
          take: 10,
          include: {
            training: { select: { name: true } },
            assessment: true,
          },
        },
        assignments: {
          where: { status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
          include: {
            training: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const trainees = users.map((user) => {
      const completedSessions = user.trainingSessions;
      const averageScore =
        completedSessions.length > 0
          ? completedSessions.reduce(
              (sum: number, s: typeof completedSessions[0]) => sum + (s.assessment?.score || 0),
              0
            ) / completedSessions.length
          : 0;

      const skillProgression = calculateSkillProgression(completedSessions);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        joinedAt: user.createdAt,
        stats: {
          totalSessions: completedSessions.length,
          averageScore: Math.round(averageScore),
          lastSessionDate:
            completedSessions.length > 0
              ? completedSessions[0].startedAt
              : null,
        },
        skillProgression,
        recentSessions: completedSessions.slice(0, 5).map((s: typeof completedSessions[0]) => ({
          id: s.id,
          trainingName: s.training.name,
          score: s.assessment?.score || null,
          date: s.startedAt,
        })),
        activeAssignments: user.assignments.map((a: typeof user.assignments[0]) => ({
          id: a.id,
          trainingName: a.training.name,
          status: a.status,
          dueAt: a.dueAt,
        })),
      };
    });

    return res.json(trainees);
  } catch (error) {
    console.error("Error fetching trainees:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

function calculateSkillProgression(
  sessions: Array<{
    assessment: {
      clarityScore: number | null;
      protocolAdherenceScore: number | null;
      empathyScore: number | null;
      conversionPotentialScore: number | null;
    } | null;
  }>
) {
  if (sessions.length === 0) {
    return {
      clarity: 0,
      protocolAdherence: 0,
      empathy: 0,
      conversionPotential: 0,
    };
  }

  const scores = {
    clarity: 0,
    protocolAdherence: 0,
    empathy: 0,
    conversionPotential: 0,
  };

  let count = 0;
  for (const session of sessions) {
    if (session.assessment) {
      scores.clarity += session.assessment.clarityScore || 0;
      scores.protocolAdherence +=
        session.assessment.protocolAdherenceScore || 0;
      scores.empathy += session.assessment.empathyScore || 0;
      scores.conversionPotential +=
        session.assessment.conversionPotentialScore || 0;
      count++;
    }
  }

  if (count === 0) return scores;

  return {
    clarity: Math.round(scores.clarity / count),
    protocolAdherence: Math.round(scores.protocolAdherence / count),
    empathy: Math.round(scores.empathy / count),
    conversionPotential: Math.round(scores.conversionPotential / count),
  };
}

router.get("/comparative", async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const users = await prisma.user.findMany({
      include: {
        trainingSessions: {
          where: { status: "COMPLETED" },
          include: {
            assessment: true,
          },
        },
      },
    });

    const comparativeData = users.map((user) => {
      const sessions = user.trainingSessions;
      const scores = sessions.map((s: typeof sessions[0]) => s.assessment?.score || 0);
      const averageScore =
        scores.length > 0
          ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length
          : 0;

      return {
        userId: user.id,
        userName: user.name,
        sessionCount: sessions.length,
        averageScore: Math.round(averageScore),
        trend: scores.slice(-5),
      };
    });

    return res.json(comparativeData);
  } catch (error) {
    console.error("Error fetching comparative data:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/assignments", async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { userId, trainingId, dueAt } = req.body;

    if (!userId || !trainingId) {
      return res.status(400).json({ error: "userId and trainingId are required" });
    }

    const existingAssignment = await prisma.assignment.findFirst({
      where: {
        userId,
        trainingId,
        status: { in: ["ASSIGNED", "IN_PROGRESS"] },
      },
    });

    if (existingAssignment) {
      return res.status(409).json({ error: "User already has an active assignment for this training" });
    }

    const assignment = await prisma.assignment.create({
      data: {
        userId,
        trainingId,
        assignedById: session.user.id,
        dueAt: dueAt ? new Date(dueAt) : null,
      },
    });

    return res.status(201).json(assignment);
  } catch (error) {
    console.error("Error creating assignment:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/assignments", async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const assignments = await prisma.assignment.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        training: { select: { id: true, name: true } },
        assignedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(assignments);
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/assignments/:id", async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const assignment = await prisma.assignment.findFirst({
      where: { id: req.params.id },
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    await prisma.assignment.delete({
      where: { id: req.params.id },
    });

    return res.json({ message: "Assignment cancelled" });
  } catch (error) {
    console.error("Error deleting assignment:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
