import { Router, Request, Response } from "express";
import multer from "multer";
import { prisma } from "@repo/db";
import { auth } from "../auth.js";
import { fromNodeHeaders } from "better-auth/node";
import {
  processDocumentForEmbedding,
  extractTextFromPdf,
  embeddingToVectorString,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
  type RAGResult,
} from "@repo/ai";
import { createId } from "@paralleldrive/cuid2";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["text/plain", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only .txt and .pdf files are supported"));
    }
  },
});

async function getSession(req: Request) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  return session;
}

// Skip admin check
async function isAdmin(): Promise<boolean> {
  return true;
}

async function verifyTrainingAccess(trainingId: string): Promise<boolean> {
  const training = await prisma.training.findFirst({
    where: { id: trainingId },
  });
  return !!training;
}

router.get("/:trainingId", async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const hasAccess = await verifyTrainingAccess(req.params.trainingId);
    if (!hasAccess) {
      return res.status(404).json({ error: "Training not found" });
    }

    const documents = await prisma.knowledgeDocument.findMany({
      where: { trainingId: req.params.trainingId },
      select: {
        id: true,
        filename: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post(
  "/:trainingId/upload",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const session = await getSession(req);
      if (!session) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const hasAccess = await verifyTrainingAccess(req.params.trainingId);
      if (!hasAccess) {
        return res.status(404).json({ error: "Training not found" });
      }

      const uploadedFile = req.file;
      if (!uploadedFile) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      let textContent: string;
      if (uploadedFile.mimetype === "application/pdf") {
        textContent = await extractTextFromPdf(uploadedFile.buffer);
      } else {
        textContent = uploadedFile.buffer.toString("utf-8");
      }

      if (!textContent || textContent.trim().length === 0) {
        return res.status(400).json({ error: "File contains no text content" });
      }

      const chunksWithEmbeddings = await processDocumentForEmbedding(
        textContent,
        DEFAULT_CHUNK_SIZE,
        DEFAULT_CHUNK_OVERLAP
      );

      const createdDocuments = [];
      for (const chunk of chunksWithEmbeddings) {
        const id = createId();
        const vectorString = embeddingToVectorString(chunk.embedding);

        await prisma.$executeRawUnsafe(`
          INSERT INTO "KnowledgeDocument" (id, "trainingId", filename, content, embedding, "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5::vector, NOW(), NOW())
        `, id, req.params.trainingId, uploadedFile.originalname, chunk.content, vectorString);

        createdDocuments.push({
          id,
          filename: uploadedFile.originalname,
          contentLength: chunk.content.length,
        });
      }

      return res.status(201).json({
        message: "Document uploaded and processed successfully",
        filename: uploadedFile.originalname,
        chunksCreated: createdDocuments.length,
        documents: createdDocuments,
      });
    } catch (error) {
      console.error("Error uploading document:", error);
      if (error instanceof Error && error.message.includes("pdf-parse")) {
        return res.status(400).json({
          error: "PDF parsing not available. Please upload a .txt file instead.",
        });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.delete("/:trainingId/:documentId", async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const hasAccess = await verifyTrainingAccess(req.params.trainingId);
    if (!hasAccess) {
      return res.status(404).json({ error: "Training not found" });
    }

    const document = await prisma.knowledgeDocument.findFirst({
      where: {
        id: req.params.documentId,
        trainingId: req.params.trainingId,
      },
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    await prisma.knowledgeDocument.delete({
      where: { id: req.params.documentId },
    });

    return res.json({ message: "Document deleted" });
  } catch (error) {
    console.error("Error deleting document:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
