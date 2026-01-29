const DOCUMENT_TYPES = [
  "PRODUCT",
  "PERSONA",
  "SCRIPT",
  "OBJECTION",
  "POLICY",
  "OTHER",
] as const;

export type DocumentTypeValue = typeof DOCUMENT_TYPES[number];

const DOCUMENT_FORMATS = ["PDF", "TXT", "DOCX", "MD"] as const;
export type DocumentFormatValue = typeof DOCUMENT_FORMATS[number];

export function resolveDocumentFormat(
  filename: string,
  mimetype: string
): DocumentFormatValue {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf") || mimetype === "application/pdf") return "PDF";
  if (
    lower.endsWith(".docx") ||
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "DOCX";
  }
  if (lower.endsWith(".md") || lower.endsWith(".markdown") || mimetype.includes("markdown")) {
    return "MD";
  }
  return "TXT";
}

export function resolveDocumentType(
  input?: string,
  filename?: string
): DocumentTypeValue {
  const normalized = input?.toUpperCase();
  if (normalized && (DOCUMENT_TYPES as readonly string[]).includes(normalized)) {
    return normalized as DocumentTypeValue;
  }

  const lower = filename?.toLowerCase() ?? "";
  if (lower.includes("persona")) return "PERSONA";
  if (lower.includes("script")) return "SCRIPT";
  if (lower.includes("objection")) return "OBJECTION";
  if (lower.includes("policy")) return "POLICY";
  if (lower.includes("product") || lower.includes("guide")) return "PRODUCT";
  return "OTHER";
}
