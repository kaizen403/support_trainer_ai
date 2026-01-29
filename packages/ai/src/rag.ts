import OpenAI from "openai";
import mammoth from "mammoth";
import { unified } from "unified";
import remarkParse from "remark-parse";
import stripMarkdown from "strip-markdown";

const openai = new OpenAI();

export const EMBEDDING_MODEL = "text-embedding-ada-002";
export const EMBEDDING_DIMENSIONS = 1536;
export const DEFAULT_CHUNK_SIZE = 500;
export const DEFAULT_CHUNK_OVERLAP = 100;

export function chunkDocument(
  content: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  overlap: number = DEFAULT_CHUNK_OVERLAP
): string[] {
  const charChunkSize = chunkSize * 4; // ~4 chars per token
  const charOverlap = overlap * 4;

  const cleanedContent = content.replace(/\s+/g, " ").trim();

  if (cleanedContent.length <= charChunkSize) {
    return [cleanedContent];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < cleanedContent.length) {
    let end = start + charChunkSize;

    if (end < cleanedContent.length) {
      const boundarySearchStart = end - Math.floor(charChunkSize * 0.2);
      const chunkSection = cleanedContent.slice(boundarySearchStart, end);
      const sentenceMatch = chunkSection.match(/[.!?]\s+[A-Z]/);
      
      if (sentenceMatch && sentenceMatch.index !== undefined) {
        end = boundarySearchStart + sentenceMatch.index + 1;
      } else {
        const lastSpace = cleanedContent.lastIndexOf(" ", end);
        if (lastSpace > start) {
          end = lastSpace;
        }
      }
    }

    const chunk = cleanedContent.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    start = end - charOverlap;
    if (start < 0) start = 0;
    if (start >= cleanedContent.length - 10) break;
  }

  return chunks;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });

  return response.data[0].embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const batchSize = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });

    const embeddings = response.data.map(
      (item: { embedding: number[] }) => item.embedding
    );
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}

export function embeddingToVectorString(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    // pdf-parse is optional dependency for PDF support
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text;
  } catch {
    throw new Error(
      "PDF parsing failed. Install pdf-parse: pnpm add pdf-parse"
    );
  }
}

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch {
    throw new Error(
      "DOCX parsing failed. Install mammoth: pnpm add mammoth"
    );
  }
}

export async function extractTextFromMarkdown(content: string): Promise<string> {
  try {
    const file = await unified()
      .use(remarkParse)
      .use(stripMarkdown)
      .process(content);
    return String(file).trim();
  } catch {
    throw new Error(
      "Markdown parsing failed. Install remark-parse and strip-markdown"
    );
  }
}

export interface RAGResult {
  content: string;
  similarity: number;
  documentId: string;
  filename: string;
}

export interface RetrieveOptions {
  trainingId: string;
  query: string;
  topK?: number;
}

export async function buildRetrievalQuery(
  options: RetrieveOptions
): Promise<{ queryEmbedding: string }> {
  const embedding = await generateEmbedding(options.query);
  const queryEmbedding = embeddingToVectorString(embedding);
  return { queryEmbedding };
}

export interface ChunkWithEmbedding {
  content: string;
  embedding: number[];
}

export async function processDocumentForEmbedding(
  content: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  overlap: number = DEFAULT_CHUNK_OVERLAP
): Promise<ChunkWithEmbedding[]> {
  const chunks = chunkDocument(content, chunkSize, overlap);
  const embeddings = await generateEmbeddings(chunks);

  return chunks.map((chunkContent, index) => ({
    content: chunkContent,
    embedding: embeddings[index],
  }));
}
