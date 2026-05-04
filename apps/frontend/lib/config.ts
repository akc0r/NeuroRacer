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
  // ── Population ──
  POPULATION_SIZE: 50,           // larger population for better exploration
  ELITISM: 3,                    // keep top 3 unchanged
  MUTATION_RATE: 0.15,           // base rate (adaptive GA will scale this)
  MUTATION_STRENGTH: 0.3,        // base strength (adaptive GA will scale this)
  CROSSOVER_RATE: 0.6,           // 60% crossover, 40% mutation-only

  // ── Neural Network ──
  // Inputs: 7 sensors + normalized speed + normalized angular velocity = 9
  INPUT_COUNT: 9,
  HIDDEN_LAYERS: [16, 12],       // deeper network: 9 → 16 → 12 → 2
  OUTPUT_COUNT: 2,               // [steering, throttle]

  // ── Physics ──
  MAX_SPEED: 7,
  ACCELERATION: 0.35,
  FRICTION: 0.05,
  TURN_SPEED: 0.07,

  // ── Sensors ──
  RAY_COUNT: 7,
  RAY_LENGTH: 220,
  RAY_SPREAD: Math.PI * 1.2,    // 216° field of view

  // ── Simulation ──
  MAX_FRAMES_PER_GEN: 2000,     // more time to explore the track

  // ── Fitness rewards ──
  CHECKPOINT_REWARD: 150,        // base reward (progressive scaling in Car.ts)
  LAP_REWARD: 3000,              // large reward for completing a lap
};

/** Update config values at runtime (e.g. from UI sliders) */
export function updateConfig(patch: Partial<SimConfig>) {
  CONFIG = { ...CONFIG, ...patch };
}
