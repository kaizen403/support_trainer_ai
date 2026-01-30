import { describe, it, expect } from "vitest";
import { resolveTrainingMode, toGraphMode } from "./sessions.js";

describe("session mode helpers", () => {
  it("normalizes training mode inputs", () => {
    expect(resolveTrainingMode("simulation")).toBe("SIMULATION");
    expect(resolveTrainingMode("guided_interview")).toBe("GUIDED_INTERVIEW");
    expect(resolveTrainingMode("SIMULATION")).toBe("SIMULATION");
    expect(resolveTrainingMode(undefined, "GUIDED_INTERVIEW")).toBe("GUIDED_INTERVIEW");
  });

  it("maps db mode to graph mode", () => {
    expect(toGraphMode("SIMULATION")).toBe("simulation");
    expect(toGraphMode("GUIDED_INTERVIEW")).toBe("guided_interview");
  });
});
