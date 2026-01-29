import { describe, it, expect } from "vitest";
import { resolveDocumentFormat, resolveDocumentType } from "./documents.js";

describe("document utilities", () => {
  it("resolves document format from filename and mime", () => {
    expect(resolveDocumentFormat("guide.pdf", "application/pdf")).toBe("PDF");
    expect(
      resolveDocumentFormat(
        "persona.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
    ).toBe("DOCX");
    expect(resolveDocumentFormat("notes.md", "text/markdown")).toBe("MD");
    expect(resolveDocumentFormat("notes.txt", "text/plain")).toBe("TXT");
  });

  it("resolves document type from explicit input or filename", () => {
    expect(resolveDocumentType("policy", "policy-handbook.pdf")).toBe("POLICY");
    expect(resolveDocumentType(undefined, "persona-angry.md")).toBe("PERSONA");
    expect(resolveDocumentType(undefined, "product-guide.pdf")).toBe("PRODUCT");
    expect(resolveDocumentType(undefined, "misc.txt")).toBe("OTHER");
  });
});
