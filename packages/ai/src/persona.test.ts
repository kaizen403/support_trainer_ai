// @vitest-environment node
import { describe, it, expect } from "vitest";
import { extractPersonaProfile } from "./persona.js";

describe("extractPersonaProfile", () => {
  it("returns fallback persona when LLM is disabled", async () => {
    const profile = await extractPersonaProfile("Callers need empathy.", {
      filename: "persona-angry.md",
      useLLM: false,
    });

    expect(profile.name).toBe("persona-angry");
    expect(profile.description).toContain("Callers need empathy");
  });
});
