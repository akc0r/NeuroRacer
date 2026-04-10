// ──────────────────────────────────────
// API client for the FastAPI backend
// ──────────────────────────────────────

import type { SaveGenerationPayload, GenerationRecord } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const api = {
  /** Save a completed generation */
  saveGeneration: async (payload: SaveGenerationPayload): Promise<GenerationRecord> => {
    const res = await fetch(`${BASE_URL}/api/generations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to save generation");
    return res.json();
  },

  /** List all saved generations */
  getGenerations: async (): Promise<GenerationRecord[]> => {
    const res = await fetch(`${BASE_URL}/api/generations`);
    return res.json();
  },

  /** Get the best generation ever recorded */
  getBestBrain: async (): Promise<GenerationRecord | null> => {
    const res = await fetch(`${BASE_URL}/api/generations/best`);
    if (res.status === 404) return null;
    return res.json();
  },

  /** Wipe all generation data */
  reset: async (): Promise<void> => {
    await fetch(`${BASE_URL}/api/reset`, { method: "DELETE" });
  },
};
