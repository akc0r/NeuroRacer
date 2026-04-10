// ──────────────────────────────────────────────
// Shared TypeScript types for the AI Racing app
// ──────────────────────────────────────────────

/** Payload sent to POST /api/generations */
export interface SaveGenerationPayload {
  generation_number: number;
  population_size: number;
  best_fitness: number;
  avg_fitness: number;
  mutation_rate: number;
  best_brain_weights: string;
  checkpoints_passed: number;
  frames_survived: number;
}

/** Shape returned by the API for a single generation */
export interface GenerationRecord {
  id: number;
  generation_number: number;
  population_size: number;
  best_fitness: number;
  avg_fitness: number;
  mutation_rate: number;
  best_brain_weights: string;
  checkpoints_passed: number;
  frames_survived: number;
  created_at: string;
}

/** Real-time simulation stats shown in the HUD */
export interface SimStats {
  generation: number;
  aliveCars: number;
  bestFitness: number;
  avgFitness: number;
  frame: number;
  maxLaps: number;
}

/** Single data point for the fitness chart */
export interface FitnessDataPoint {
  generation: number;
  bestFitness: number;
  avgFitness: number;
}

/** A 2D vector */
export interface Vec2 {
  x: number;
  y: number;
}

/** A checkpoint on the track */
export interface Checkpoint {
  x: number;
  y: number;
}
