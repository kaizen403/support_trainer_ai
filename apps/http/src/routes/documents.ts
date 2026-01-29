import { Router, Request, Response } from "express";
import multer from "multer";
import { prisma } from "@repo/db";
import { auth } from "../auth.js";
import { fromNodeHeaders } from "better-auth/node";
import {
  processDocumentForEmbedding,
  extractTextFromPdf,
  extractTextFromDocx,
  extractTextFromMarkdown,
  extractPersonaProfile,
  embeddingToVectorString,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
} from "@repo/ai";
import { createId } from "@paralleldrive/cuid2";
import {
  resolveDocumentFormat,
  resolveDocumentType,
} from "../lib/documents.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "text/plain",
      "text/markdown",
      "text/x-markdown",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only .txt, .md, .pdf, and .docx files are supported"));
    }
  },
});

async function getSession(req: Request) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  return session;
}

async function getTraining(trainingId: string) {
  return prisma.training.findFirst({
    where: { id: trainingId },
  });
}


router.get("/:trainingId", async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const training = await getTraining(req.params.trainingId);
    if (!training) {
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

    const training = await getTraining(req.params.trainingId);
    if (!training) {
      return res.status(404).json({ error: "Training not found" });
    }

      const uploadedFile = req.file;
      if (!uploadedFile) {
        return res.status(400).json({ error: "No file uploaded" });
      }

    const format = resolveDocumentFormat(uploadedFile.originalname, uploadedFile.mimetype);
    const documentType = resolveDocumentType(
      typeof req.body.documentType === "string" ? req.body.documentType : undefined,
      uploadedFile.originalname
    );

    let textContent: string;
    if (format === "PDF") {
      textContent = await extractTextFromPdf(uploadedFile.buffer);
    } else if (format === "DOCX") {
      textContent = await extractTextFromDocx(uploadedFile.buffer);
    } else if (format === "MD") {
      textContent = await extractTextFromMarkdown(uploadedFile.buffer.toString("utf-8"));
    } else {
      textContent = uploadedFile.buffer.toString("utf-8");
    }

    if (!textContent || textContent.trim().length === 0) {
      return res.status(400).json({ error: "File contains no text content" });
    }

    let personaRecord: { id: string } | null = null;
    if (documentType === "PERSONA") {
      const profile = await extractPersonaProfile(textContent, {
        filename: uploadedFile.originalname,
      });
      personaRecord = await prisma.persona.create({
        data: {
          organizationId: training.organizationId,
          name: profile.name,
          description: profile.description,
          traits: profile.traits ?? {},
          tags: profile.tags ?? [],
        },
      });
    }

      const chunksWithEmbeddings = await processDocumentForEmbedding(
        textContent,
        DEFAULT_CHUNK_SIZE,
        DEFAULT_CHUNK_OVERLAP
      );

    const createdDocuments = [];
    let firstDocumentId: string | null = null;
    for (const chunk of chunksWithEmbeddings) {
      const id = createId();
      if (!firstDocumentId) {
        firstDocumentId = id;
      }
      const vectorString = embeddingToVectorString(chunk.embedding);

    await prisma.$executeRawUnsafe(`
          INSERT INTO "KnowledgeDocument" (id, "trainingId", "organizationId", filename, "documentType", format, "ingestionStatus", content, embedding, "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector, NOW(), NOW())
        `, id, req.params.trainingId, training.organizationId, uploadedFile.originalname, documentType, format, "INDEXED", chunk.content, vectorString);

      createdDocuments.push({
        id,
        filename: uploadedFile.originalname,
        contentLength: chunk.content.length,
      });
    }

    if (personaRecord && firstDocumentId) {
      await prisma.persona.update({
        where: { id: personaRecord.id },
        data: { sourceDocumentId: firstDocumentId },
      });
    }

    return res.status(201).json({
      message: "Document uploaded and processed successfully",
      filename: uploadedFile.originalname,
      documentType,
      format,
      status: "indexed",
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
    if (error instanceof Error && error.message.toLowerCase().includes("docx")) {
      return res.status(400).json({
        error: "DOCX parsing failed. Please upload a .txt or .md file instead.",
      });
    }
    if (error instanceof Error && error.message.toLowerCase().includes("markdown")) {
      return res.status(400).json({
        error: "Markdown parsing failed. Please upload a .txt file instead.",
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

    const training = await getTraining(req.params.trainingId);
    if (!training) {
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
