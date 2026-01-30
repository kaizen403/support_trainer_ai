const TRAINING_MODES = ["SIMULATION", "GUIDED_INTERVIEW"] as const;
export type TrainingModeValue = typeof TRAINING_MODES[number];

export function resolveTrainingMode(input: unknown, fallback?: string): TrainingModeValue {
  if (typeof input === "string") {
    const normalized = input.toUpperCase();
    if ((TRAINING_MODES as readonly string[]).includes(normalized)) {
      return normalized as TrainingModeValue;
    }
    if (input === "simulation") return "SIMULATION";
    if (input === "guided_interview") return "GUIDED_INTERVIEW";
  }
  if (fallback && (TRAINING_MODES as readonly string[]).includes(fallback)) {
    return fallback as TrainingModeValue;
  }
  return "SIMULATION";
}

export function toGraphMode(dbMode: string): "simulation" | "guided_interview" {
  return dbMode === "GUIDED_INTERVIEW" ? "guided_interview" : "simulation";
}
