// ─────────────────────────────────────────
// Simulation configuration (mutable at runtime)
// ─────────────────────────────────────────

export interface SimConfig {
  POPULATION_SIZE: number;
  ELITISM: number;
  MUTATION_RATE: number;
  MUTATION_STRENGTH: number;
  INPUT_COUNT: number;
  HIDDEN_LAYERS: number[];
  OUTPUT_COUNT: number;
  MAX_SPEED: number;
  ACCELERATION: number;
  FRICTION: number;
  TURN_SPEED: number;
  RAY_COUNT: number;
  RAY_LENGTH: number;
  RAY_SPREAD: number;
  MAX_FRAMES_PER_GEN: number;
  CHECKPOINT_REWARD: number;
  LAP_REWARD: number;
  CROSSOVER_RATE: number;
}

export let CONFIG: SimConfig = {
  POPULATION_SIZE: 30,
  ELITISM: 2,
  MUTATION_RATE: 0.1,
  MUTATION_STRENGTH: 0.2,
  INPUT_COUNT: 7,
  HIDDEN_LAYERS: [8],
  OUTPUT_COUNT: 2,
  MAX_SPEED: 8,
  ACCELERATION: 0.4,
  FRICTION: 0.05,
  TURN_SPEED: 0.06,
  RAY_COUNT: 7,
  RAY_LENGTH: 250,
  RAY_SPREAD: Math.PI * 1.2,
  MAX_FRAMES_PER_GEN: 1500,
  CHECKPOINT_REWARD: 100,
  LAP_REWARD: 2000,
  CROSSOVER_RATE: 0.5,
};

/** Update config values at runtime (e.g. from UI sliders) */
export function updateConfig(patch: Partial<SimConfig>) {
  CONFIG = { ...CONFIG, ...patch };
}
