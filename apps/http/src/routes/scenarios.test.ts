import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { prisma } from "@repo/db";
import { auth } from "../auth.js";
import scenariosRouter from "./scenarios.js";

// Mock Prisma
vi.mock("@repo/db", () => ({
  prisma: {
    scenario: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock auth
vi.mock("../auth.js", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

// Helper to create mock request
function createMockRequest(
  method: string,
  path: string,
  body: any = {},
  params: any = {},
  headers: any = {}
) {
  return {
    method,
    path,
    body,
    params,
    headers,
  } as unknown as Request;
}

// Helper to create mock response
function createMockResponse() {
  const res: any = {
    status: vi.fn(() => res),
    json: vi.fn(() => res),
  };
  return res as unknown as Response;
}

describe("Scenario CRUD API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/scenarios", () => {
    it("should return list of scenarios when authenticated", async () => {
      const mockScenarios = [
        {
          id: "scenario1",
          name: "Scenario 1",
          description: "Test scenario 1",
          personaPreset: "RUDE",
          temperament: "Test temperament",
          expertise: "Test expertise",
          complexity: "Test complexity",
          organizationId: "org1",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockAuth.api.getSession.mockResolvedValue({
        user: { id: "user1" },
        session: { id: "session1" },
      });

      mockPrisma.scenario.findMany.mockResolvedValue(mockScenarios);

      const req = createMockRequest("GET", "/api/scenarios", {}, {}, {});
      const res = createMockResponse();

      // Get the handler
      const handlers = (scenariosRouter as any).stack.filter(
        (layer: any) => layer.route?.path === "/" && layer.route?.methods?.get
      );

      if (handlers.length > 0) {
        await handlers[0].route?.stack[0].handle(req, res);
        expect(res.json).toHaveBeenCalledWith(mockScenarios);
        expect(mockAuth.api.getSession).toHaveBeenCalled();
        expect(mockPrisma.scenario.findMany).toHaveBeenCalledWith({
          orderBy: { createdAt: "desc" },
        });
      }
    });

    it("should return 401 when not authenticated", async () => {
      mockAuth.api.getSession.mockResolvedValue(null);

      const req = createMockRequest("GET", "/api/scenarios", {}, {}, {});
      const res = createMockResponse();

      const handlers = (scenariosRouter as any).stack.filter(
        (layer: any) => layer.route?.path === "/" && layer.route?.methods?.get
      );

      if (handlers.length > 0) {
        await handlers[0].route?.stack[0].handle(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        expect(mockPrisma.scenario.findMany).not.toHaveBeenCalled();
      }
    });

    it("should return 500 on database error", async () => {
      mockAuth.api.getSession.mockResolvedValue({
        user: { id: "user1" },
        session: { id: "session1" },
      });

      mockPrisma.scenario.findMany.mockRejectedValue(new Error("DB Error"));

      const req = createMockRequest("GET", "/api/scenarios", {}, {}, {});
      const res = createMockResponse();

      const handlers = (scenariosRouter as any).stack.filter(
        (layer: any) => layer.route?.path === "/" && layer.route?.methods?.get
      );

      if (handlers.length > 0) {
        await handlers[0].route?.stack[0].handle(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
      }
    });
  });

  describe("GET /api/scenarios/:id", () => {
    it("should return scenario by id when authenticated", async () => {
      const mockScenario = {
        id: "scenario1",
        name: "Scenario 1",
        description: "Test scenario 1",
        personaPreset: "RUDE",
        temperament: "Test temperament",
        expertise: "Test expertise",
        complexity: "Test complexity",
        organizationId: "org1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAuth.api.getSession.mockResolvedValue({
        user: { id: "user1" },
        session: { id: "session1" },
      });

      mockPrisma.scenario.findFirst.mockResolvedValue(mockScenario);

      const req = createMockRequest("GET", "/api/scenarios/scenario1", {}, { id: "scenario1" }, {});
      const res = createMockResponse();

      const handlers = (scenariosRouter as any).stack.filter(
        (layer: any) => layer.route?.path === "/:id" && layer.route?.methods?.get
      );

      if (handlers.length > 0) {
        await handlers[0].route?.stack[0].handle(req, res);
        expect(res.json).toHaveBeenCalledWith(mockScenario);
        expect(mockPrisma.scenario.findFirst).toHaveBeenCalledWith({
          where: { id: "scenario1" },
        });
      }
    });

    it("should return 404 when scenario not found", async () => {
      mockAuth.api.getSession.mockResolvedValue({
        user: { id: "user1" },
        session: { id: "session1" },
      });

      mockPrisma.scenario.findFirst.mockResolvedValue(null);

      const req = createMockRequest("GET", "/api/scenarios/nonexistent", {}, { id: "nonexistent" }, {});
      const res = createMockResponse();

      const handlers = (scenariosRouter as any).stack.filter(
        (layer: any) => layer.route?.path === "/:id" && layer.route?.methods?.get
      );

      if (handlers.length > 0) {
        await handlers[0].route?.stack[0].handle(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: "Scenario not found" });
      }
    });

    it("should return 401 when not authenticated", async () => {
      mockAuth.api.getSession.mockResolvedValue(null);

      const req = createMockRequest("GET", "/api/scenarios/scenario1", {}, { id: "scenario1" }, {});
      const res = createMockResponse();

      const handlers = (scenariosRouter as any).stack.filter(
        (layer: any) => layer.route?.path === "/:id" && layer.route?.methods?.get
      );

      if (handlers.length > 0) {
        await handlers[0].route?.stack[0].handle(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
      }
    });
  });

  describe("POST /api/scenarios", () => {
    it("should create scenario with valid data when authenticated", async () => {
      const newScenario = {
        id: "scenario1",
        name: "New Scenario",
        description: "New description",
        personaPreset: "RUDE",
        temperament: "Test temperament",
        expertise: "Test expertise",
        complexity: "Test complexity",
        organizationId: "default",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const body = {
        name: "New Scenario",
        description: "New description",
        personaPreset: "RUDE",
        temperament: "Test temperament",
        expertise: "Test expertise",
        complexity: "Test complexity",
      };

      mockAuth.api.getSession.mockResolvedValue({
        user: { id: "user1" },
        session: { id: "session1" },
      });

      mockPrisma.scenario.create.mockResolvedValue(newScenario);

      const req = createMockRequest("POST", "/api/scenarios", body, {}, {});
      const res = createMockResponse();

      const handlers = (scenariosRouter as any).stack.filter(
        (layer: any) => layer.route?.path === "/" && layer.route?.methods?.post
      );

      if (handlers.length > 0) {
        await handlers[0].route?.stack[0].handle(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(newScenario);
        expect(mockPrisma.scenario.create).toHaveBeenCalledWith({
          data: {
            name: "New Scenario",
            description: "New description",
            personaPreset: "RUDE",
            temperament: "Test temperament",
            expertise: "Test expertise",
            complexity: "Test complexity",
            organizationId: "default",
          },
        });
      }
    });

    it("should return 400 when name is missing", async () => {
      mockAuth.api.getSession.mockResolvedValue({
        user: { id: "user1" },
        session: { id: "session1" },
      });

      const body = {
        description: "Test description",
        personaPreset: "RUDE",
        temperament: "Test temperament",
        expertise: "Test expertise",
        complexity: "Test complexity",
      };

      const req = createMockRequest("POST", "/api/scenarios", body, {}, {});
      const res = createMockResponse();

      const handlers = (scenariosRouter as any).stack.filter(
        (layer: any) => layer.route?.path === "/" && layer.route?.methods?.post
      );

      if (handlers.length > 0) {
        await handlers[0].route?.stack[0].handle(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "Name is required" });
        expect(mockPrisma.scenario.create).not.toHaveBeenCalled();
      }
    });

    it("should return 400 when description is missing", async () => {
      mockAuth.api.getSession.mockResolvedValue({
        user: { id: "user1" },
        session: { id: "session1" },
      });

      const body = {
        name: "Test scenario",
        personaPreset: "RUDE",
        temperament: "Test temperament",
        expertise: "Test expertise",
        complexity: "Test complexity",
      };

      const req = createMockRequest("POST", "/api/scenarios", body, {}, {});
      const res = createMockResponse();

      const handlers = (scenariosRouter as any).stack.filter(
        (layer: any) => layer.route?.path === "/" && layer.route?.methods?.post
      );

      if (handlers.length > 0) {
        await handlers[0].route?.stack[0].handle(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "Description is required" });
      }
    });

    it("should return 400 when personaPreset is invalid", async () => {
      mockAuth.api.getSession.mockResolvedValue({
        user: { id: "user1" },
        session: { id: "session1" },
      });

      const body = {
        name: "Test scenario",
        description: "Test description",
        personaPreset: "INVALID",
        temperament: "Test temperament",
        expertise: "Test expertise",
        complexity: "Test complexity",
      };

      const req = createMockRequest("POST", "/api/scenarios", body, {}, {});
      const res = createMockResponse();

      const handlers = (scenariosRouter as any).stack.filter(
        (layer: any) => layer.route?.path === "/" && layer.route?.methods?.post
      );

      if (handlers.length > 0) {
        await handlers[0].route?.stack[0].handle(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: "Valid personaPreset is required (RUDE, CHILL, UNEXPECTED, NEUTRAL, DEMANDING)",
        });
      }
    });

    it("should return 400 when name is empty string", async () => {
      mockAuth.api.getSession.mockResolvedValue({
        user: { id: "user1" },
        session: { id: "session1" },
      });

      const body = {
        name: "   ",
        description: "Test description",
        personaPreset: "RUDE",
        temperament: "Test temperament",
        expertise: "Test expertise",
        complexity: "Test complexity",
      };

      const req = createMockRequest("POST", "/api/scenarios", body, {}, {});
      const res = createMockResponse();

      const handlers = (scenariosRouter as any).stack.filter(
        (layer: any) => layer.route?.path === "/" && layer.route?.methods?.post
      );

      if (handlers.length > 0) {
        await handlers[0].route?.stack[0].handle(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "Name is required" });
      }
    });

    it("should return 401 when not authenticated", async () => {
      mockAuth.api.getSession.mockResolvedValue(null);

      const body = {
        name: "Test scenario",
        description: "Test description",
        personaPreset: "RUDE",
        temperament: "Test temperament",
        expertise: "Test expertise",
        complexity: "Test complexity",
      };

      const req = createMockRequest("POST", "/api/scenarios", body, {}, {});
      const res = createMockResponse();

      const handlers = (scenariosRouter as any).stack.filter(
        (layer: any) => layer.route?.path === "/" && layer.route?.methods?.post
      );

      if (handlers.length > 0) {
        await handlers[0].route?.stack[0].handle(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
      }
    });
  });

  describe("PUT /api/scenarios/:id", () => {
    it("should update scenario with valid data when authenticated", async () => {
      const existingScenario = {
        id: "scenario1",
        name: "Old Scenario",
        description: "Old description",
        personaPreset: "RUDE",
        temperament: "Test temperament",
        expertise: "Test expertise",
        complexity: "Test complexity",
        organizationId: "org1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedScenario = {
        id: "scenario1",
        name: "Updated Scenario",
        description: "Updated description",
        personaPreset: "CHILL",
        temperament: "Updated temperament",
        expertise: "Updated expertise",
        complexity: "Updated complexity",
        organizationId: "org1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const body = {
        name: "Updated Scenario",
        description: "Updated description",
        personaPreset: "CHILL",
        temperament: "Updated temperament",
        expertise: "Updated expertise",
        complexity: "Updated complexity",
      };

      mockAuth.api.getSession.mockResolvedValue({
        user: { id: "user1" },
        session: { id: "session1" },
      });

      mockPrisma.scenario.findFirst.mockResolvedValue(existingScenario);
      mockPrisma.scenario.update.mockResolvedValue(updatedScenario);

      const req = createMockRequest("PUT", "/api/scenarios/scenario1", body, { id: "scenario1" }, {});
      const res = createMockResponse();

      const handlers = (scenariosRouter as any).stack.filter(
        (layer: any) => layer.route?.path === "/:id" && layer.route?.methods?.put
      );

      if (handlers.length > 0) {
        await handlers[0].route?.stack[0].handle(req, res);
        expect(res.json).toHaveBeenCalledWith(updatedScenario);
        expect(mockPrisma.scenario.findFirst).toHaveBeenCalledWith({
          where: { id: "scenario1" },
        });
        expect(mockPrisma.scenario.update).toHaveBeenCalledWith({
          where: { id: "scenario1" },
          data: {
            name: "Updated Scenario",
            description: "Updated description",
            personaPreset: "CHILL",
            temperament: "Updated temperament",
            expertise: "Updated expertise",
            complexity: "Updated complexity",
          },
        });
      }
    });

    it("should return 404 when scenario not found", async () => {
      mockAuth.api.getSession.mockResolvedValue({
        user: { id: "user1" },
        session: { id: "session1" },
      });

      mockPrisma.scenario.findFirst.mockResolvedValue(null);

      const body = {
        name: "Updated Scenario",
        description: "Updated description",
        personaPreset: "RUDE",
        temperament: "Test temperament",
        expertise: "Test expertise",
        complexity: "Test complexity",
      };

      const req = createMockRequest("PUT", "/api/scenarios/nonexistent", body, { id: "nonexistent" }, {});
      const res = createMockResponse();

      const handlers = (scenariosRouter as any).stack.filter(
        (layer: any) => layer.route?.path === "/:id" && layer.route?.methods?.put
      );

      if (handlers.length > 0) {
        await handlers[0].route?.stack[0].handle(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: "Scenario not found" });
        expect(mockPrisma.scenario.update).not.toHaveBeenCalled();
      }
    });

    it("should return 400 on validation errors", async () => {
      mockAuth.api.getSession.mockResolvedValue({
        user: { id: "user1" },
        session: { id: "session1" },
      });

      mockPrisma.scenario.findFirst.mockResolvedValue({
        id: "scenario1",
        name: "Old name",
        description: "Old description",
        personaPreset: "RUDE",
        temperament: "Test temperament",
        expertise: "Test expertise",
        complexity: "Test complexity",
        organizationId: "org1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const body = {
        name: "",
        description: "Test description",
        personaPreset: "RUDE",
        temperament: "Test temperament",
        expertise: "Test expertise",
        complexity: "Test complexity",
      };

      const req = createMockRequest("PUT", "/api/scenarios/scenario1", body, { id: "scenario1" }, {});
      const res = createMockResponse();

      const handlers = (scenariosRouter as any).stack.filter(
        (layer: any) => layer.route?.path === "/:id" && layer.route?.methods?.put
      );

      if (handlers.length > 0) {
        await handlers[0].route?.stack[0].handle(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "Name is required" });
      }
    });

    it("should return 401 when not authenticated", async () => {
      mockAuth.api.getSession.mockResolvedValue(null);

      const body = {
        name: "Updated Scenario",
        description: "Updated description",
        personaPreset: "RUDE",
        temperament: "Test temperament",
        expertise: "Test expertise",
        complexity: "Test complexity",
      };

      const req = createMockRequest("PUT", "/api/scenarios/scenario1", body, { id: "scenario1" }, {});
      const res = createMockResponse();

      const handlers = (scenariosRouter as any).stack.filter(
        (layer: any) => layer.route?.path === "/:id" && layer.route?.methods?.put
      );

      if (handlers.length > 0) {
        await handlers[0].route?.stack[0].handle(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
      }
    });
  });

  describe("DELETE /api/scenarios/:id", () => {
    it("should delete scenario when authenticated", async () => {
      const existingScenario = {
        id: "scenario1",
        name: "Scenario to delete",
        description: "Test description",
        personaPreset: "RUDE",
        temperament: "Test temperament",
        expertise: "Test expertise",
        complexity: "Test complexity",
        organizationId: "org1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAuth.api.getSession.mockResolvedValue({
        user: { id: "user1" },
        session: { id: "session1" },
      });

      mockPrisma.scenario.findFirst.mockResolvedValue(existingScenario);
      mockPrisma.scenario.delete.mockResolvedValue(existingScenario);

      const req = createMockRequest("DELETE", "/api/scenarios/scenario1", {}, { id: "scenario1" }, {});
      const res = createMockResponse();

      const handlers = (scenariosRouter as any).stack.filter(
        (layer: any) => layer.route?.path === "/:id" && layer.route?.methods?.delete
      );

      if (handlers.length > 0) {
        await handlers[0].route?.stack[0].handle(req, res);
        expect(res.json).toHaveBeenCalledWith({ message: "Scenario deleted" });
        expect(mockPrisma.scenario.findFirst).toHaveBeenCalledWith({
          where: { id: "scenario1" },
        });
        expect(mockPrisma.scenario.delete).toHaveBeenCalledWith({
          where: { id: "scenario1" },
        });
      }
    });

    it("should return 404 when scenario not found", async () => {
      mockAuth.api.getSession.mockResolvedValue({
        user: { id: "user1" },
        session: { id: "session1" },
      });

      mockPrisma.scenario.findFirst.mockResolvedValue(null);

      const req = createMockRequest("DELETE", "/api/scenarios/nonexistent", {}, { id: "nonexistent" }, {});
      const res = createMockResponse();

      const handlers = (scenariosRouter as any).stack.filter(
        (layer: any) => layer.route?.path === "/:id" && layer.route?.methods?.delete
      );

      if (handlers.length > 0) {
        await handlers[0].route?.stack[0].handle(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: "Scenario not found" });
        expect(mockPrisma.scenario.delete).not.toHaveBeenCalled();
      }
    });

    it("should return 401 when not authenticated", async () => {
      mockAuth.api.getSession.mockResolvedValue(null);

      const req = createMockRequest("DELETE", "/api/scenarios/scenario1", {}, { id: "scenario1" }, {});
      const res = createMockResponse();

      const handlers = (scenariosRouter as any).stack.filter(
        (layer: any) => layer.route?.path === "/:id" && layer.route?.methods?.delete
      );

      if (handlers.length > 0) {
        await handlers[0].route?.stack[0].handle(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
      }
    });
  });
});
