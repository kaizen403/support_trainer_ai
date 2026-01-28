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

async function isAdmin(userId: string, organizationId: string): Promise<boolean> {
  const member = await prisma.member.findUnique({
    where: {
      userId_organizationId: { userId, organizationId },
    },
  });
  return member?.role === "admin" || member?.role === "owner";
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { activeOrganizationId } = session.session;
    if (!activeOrganizationId) {
      return res.status(400).json({ error: "No organization selected" });
    }

    const trainings = await prisma.training.findMany({
      where: { organizationId: activeOrganizationId },
      orderBy: { createdAt: "desc" },
    });

    return res.json(trainings);
  } catch (error) {
    console.error("Error fetching trainings:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { activeOrganizationId } = session.session;
    if (!activeOrganizationId) {
      return res.status(400).json({ error: "No organization selected" });
    }

    const training = await prisma.training.findFirst({
      where: {
        id: req.params.id,
        organizationId: activeOrganizationId,
      },
    });

    if (!training) {
      return res.status(404).json({ error: "Training not found" });
    }

    return res.json(training);
  } catch (error) {
    console.error("Error fetching training:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

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

    const isUserAdmin = await isAdmin(session.user.id, activeOrganizationId);
    if (!isUserAdmin) {
      return res.status(403).json({ error: "Only admins can create trainings" });
    }

    const { name, description, systemPrompt } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!description || typeof description !== "string" || description.trim().length === 0) {
      return res.status(400).json({ error: "Description is required" });
    }
    if (!systemPrompt || typeof systemPrompt !== "string" || systemPrompt.trim().length === 0) {
      return res.status(400).json({ error: "System prompt is required" });
    }

    const training = await prisma.training.create({
      data: {
        name: name.trim(),
        description: description.trim(),
        systemPrompt: systemPrompt.trim(),
        organizationId: activeOrganizationId,
      },
    });

    return res.status(201).json(training);
  } catch (error) {
    console.error("Error creating training:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { activeOrganizationId } = session.session;
    if (!activeOrganizationId) {
      return res.status(400).json({ error: "No organization selected" });
    }

    const isUserAdmin = await isAdmin(session.user.id, activeOrganizationId);
    if (!isUserAdmin) {
      return res.status(403).json({ error: "Only admins can update trainings" });
    }

    const existing = await prisma.training.findFirst({
      where: {
        id: req.params.id,
        organizationId: activeOrganizationId,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Training not found" });
    }

    const { name, description, systemPrompt } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!description || typeof description !== "string" || description.trim().length === 0) {
      return res.status(400).json({ error: "Description is required" });
    }
    if (!systemPrompt || typeof systemPrompt !== "string" || systemPrompt.trim().length === 0) {
      return res.status(400).json({ error: "System prompt is required" });
    }

    const training = await prisma.training.update({
      where: { id: req.params.id },
      data: {
        name: name.trim(),
        description: description.trim(),
        systemPrompt: systemPrompt.trim(),
      },
    });

    return res.json(training);
  } catch (error) {
    console.error("Error updating training:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { activeOrganizationId } = session.session;
    if (!activeOrganizationId) {
      return res.status(400).json({ error: "No organization selected" });
    }

    const isUserAdmin = await isAdmin(session.user.id, activeOrganizationId);
    if (!isUserAdmin) {
      return res.status(403).json({ error: "Only admins can delete trainings" });
    }

    const existing = await prisma.training.findFirst({
      where: {
        id: req.params.id,
        organizationId: activeOrganizationId,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Training not found" });
    }

    await prisma.training.delete({
      where: { id: req.params.id },
    });

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting training:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
