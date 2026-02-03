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

// Skip admin check - allow all authenticated users (matches trainings.ts pattern)
async function isAdmin(_userId: string, _organizationId: string): Promise<boolean> {
  return true;
}

const VALID_PERSONA_PRESETS = ["RUDE", "CHILL", "UNEXPECTED", "NEUTRAL", "DEMANDING"];

router.get("/", async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get all scenarios without org filter (matches trainings.ts pattern)
    const scenarios = await prisma.scenario.findMany({
      orderBy: { createdAt: "desc" },
    });

    return res.json(scenarios);
  } catch (error) {
    console.error("Error fetching scenarios:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const scenario = await prisma.scenario.findFirst({
      where: {
        id: req.params.id,
      },
    });

    if (!scenario) {
      return res.status(404).json({ error: "Scenario not found" });
    }

    return res.json(scenario);
  } catch (error) {
    console.error("Error fetching scenario:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { name, description, personaPreset, temperament, expertise, complexity } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!description || typeof description !== "string" || description.trim().length === 0) {
      return res.status(400).json({ error: "Description is required" });
    }
    if (!personaPreset || !VALID_PERSONA_PRESETS.includes(personaPreset)) {
      return res.status(400).json({ error: "Valid personaPreset is required (RUDE, CHILL, UNEXPECTED, NEUTRAL, DEMANDING)" });
    }
    if (!temperament || typeof temperament !== "string" || temperament.trim().length === 0) {
      return res.status(400).json({ error: "Temperament is required" });
    }
    if (!expertise || typeof expertise !== "string" || expertise.trim().length === 0) {
      return res.status(400).json({ error: "Expertise is required" });
    }
    if (!complexity || typeof complexity !== "string" || complexity.trim().length === 0) {
      return res.status(400).json({ error: "Complexity is required" });
    }

    const scenario = await prisma.scenario.create({
      data: {
        name: name.trim(),
        description: description.trim(),
        personaPreset,
        temperament: temperament.trim(),
        expertise: expertise.trim(),
        complexity: complexity.trim(),
        organizationId: "default", // Placeholder org
      },
    });

    return res.status(201).json(scenario);
  } catch (error) {
    console.error("Error creating scenario:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const existing = await prisma.scenario.findFirst({
      where: {
        id: req.params.id,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Scenario not found" });
    }

    const { name, description, personaPreset, temperament, expertise, complexity } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!description || typeof description !== "string" || description.trim().length === 0) {
      return res.status(400).json({ error: "Description is required" });
    }
    if (!personaPreset || !VALID_PERSONA_PRESETS.includes(personaPreset)) {
      return res.status(400).json({ error: "Valid personaPreset is required (RUDE, CHILL, UNEXPECTED, NEUTRAL, DEMANDING)" });
    }
    if (!temperament || typeof temperament !== "string" || temperament.trim().length === 0) {
      return res.status(400).json({ error: "Temperament is required" });
    }
    if (!expertise || typeof expertise !== "string" || expertise.trim().length === 0) {
      return res.status(400).json({ error: "Expertise is required" });
    }
    if (!complexity || typeof complexity !== "string" || complexity.trim().length === 0) {
      return res.status(400).json({ error: "Complexity is required" });
    }

    const scenario = await prisma.scenario.update({
      where: { id: req.params.id },
      data: {
        name: name.trim(),
        description: description.trim(),
        personaPreset,
        temperament: temperament.trim(),
        expertise: expertise.trim(),
        complexity: complexity.trim(),
      },
    });

    return res.json(scenario);
  } catch (error) {
    console.error("Error updating scenario:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const existing = await prisma.scenario.findFirst({
      where: {
        id: req.params.id,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Scenario not found" });
    }

    await prisma.scenario.delete({
      where: { id: req.params.id },
    });

    return res.json({ message: "Scenario deleted" });
  } catch (error) {
    console.error("Error deleting scenario:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
