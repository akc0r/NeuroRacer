// ──────────────────────────────────────────────────────────────────
// Advanced Genetic Algorithm with tournament selection, adaptive
// mutation, stagnation detection, and species-aware diversity.
// ──────────────────────────────────────────────────────────────────

import { NeuralNetwork } from "./NeuralNetwork";
import { CONFIG } from "@/lib/config";

/** Internal state for adaptive mutation tracking */
let stagnationCounter = 0;
let lastBestFitness = -Infinity;
let currentAdaptiveMutationRate = CONFIG.MUTATION_RATE;
let currentAdaptiveMutationStrength = CONFIG.MUTATION_STRENGTH;

/** Reset the adaptive state (call on simulation reset) */
export function resetAdaptiveState(): void {
  stagnationCounter = 0;
  lastBestFitness = -Infinity;
  currentAdaptiveMutationRate = CONFIG.MUTATION_RATE;
  currentAdaptiveMutationStrength = CONFIG.MUTATION_STRENGTH;
}

/** Get current adaptive mutation info for display */
export function getAdaptiveState() {
  return {
    stagnationCounter,
    adaptiveMutationRate: currentAdaptiveMutationRate,
    adaptiveMutationStrength: currentAdaptiveMutationStrength,
  };
}

/**
 * Produce the next generation of neural networks.
 *
 * Strategy:
 * 1. Elitism — top N brains pass through unchanged
 * 2. Tournament selection — pick parents via competitive tournament
 * 3. Crossover — blend two parents' genes (uniform + arithmetic)
 * 4. Mutation — adaptive rate based on stagnation detection
 * 5. Injection — fresh random brains to maintain genetic diversity
 */
export function nextGeneration(
  brains: NeuralNetwork[],
  fitnesses: number[]
): NeuralNetwork[] {
  const popSize = CONFIG.POPULATION_SIZE;

  // Sort by fitness (descending)
  const ranked = fitnesses
    .map((f, i) => ({ f, i }))
    .sort((a, b) => b.f - a.f);

  const bestFitness = ranked[0].f;

  // ── Adaptive Mutation ──
  // Detect stagnation: if best fitness hasn't improved significantly
  const improvementThreshold = lastBestFitness * 0.02; // 2% improvement needed
  if (bestFitness <= lastBestFitness + Math.max(improvementThreshold, 5)) {
    stagnationCounter++;
  } else {
    stagnationCounter = Math.max(0, stagnationCounter - 2); // reduce slowly on improvement
  }
  lastBestFitness = Math.max(lastBestFitness, bestFitness);

  // Scale mutation based on stagnation level
  const stagnationFactor = Math.min(stagnationCounter / 10, 3.0); // up to 3x
  currentAdaptiveMutationRate = Math.min(
    0.8,
    CONFIG.MUTATION_RATE * (1 + stagnationFactor)
  );
  currentAdaptiveMutationStrength = Math.min(
    1.0,
    CONFIG.MUTATION_STRENGTH * (1 + stagnationFactor * 0.5)
  );

  const newBrains: NeuralNetwork[] = [];

  // ── 1. Elitism: keep top brains unchanged ──
  const eliteCount = Math.max(1, CONFIG.ELITISM);
  for (let i = 0; i < eliteCount && i < ranked.length; i++) {
    newBrains.push(brains[ranked[i].i].clone());
  }

  // ── 2. Fresh random injection for diversity (5% of population, min 1) ──
  const freshCount = Math.max(1, Math.floor(popSize * 0.05));
  // Increase injection on high stagnation
  const actualFreshCount = stagnationCounter > 15
    ? Math.max(freshCount, Math.floor(popSize * 0.15))
    : freshCount;

  for (let i = 0; i < actualFreshCount && newBrains.length < popSize; i++) {
    newBrains.push(
      new NeuralNetwork([
        CONFIG.INPUT_COUNT,
        ...CONFIG.HIDDEN_LAYERS,
        CONFIG.OUTPUT_COUNT,
      ])
    );
  }

  // ── 3. Fill the rest with crossover + mutation ──
  while (newBrains.length < popSize) {
    if (Math.random() < CONFIG.CROSSOVER_RATE) {
      // Select two parents via tournament selection
      const parent1 = tournamentSelect(brains, fitnesses, 3);
      const parent2 = tournamentSelect(brains, fitnesses, 3);

      // Choose crossover strategy
      const child = Math.random() < 0.5
        ? uniformCrossover(parent1, parent2)
        : arithmeticCrossover(parent1, parent2);

      adaptiveMutate(child);
      clampWeights(child);
      newBrains.push(child);
    } else {
      // Mutation-only child from tournament-selected parent
      const parent = tournamentSelect(brains, fitnesses, 3);
      const child = parent.clone();
      adaptiveMutate(child);
      clampWeights(child);
      newBrains.push(child);
    }
  }

  // If stagnation is extreme, do a partial population restart
  if (stagnationCounter > 25) {
    const keepCount = Math.max(eliteCount, Math.floor(popSize * 0.1));
    for (let i = keepCount; i < newBrains.length; i++) {
      newBrains[i] = new NeuralNetwork([
        CONFIG.INPUT_COUNT,
        ...CONFIG.HIDDEN_LAYERS,
        CONFIG.OUTPUT_COUNT,
      ]);
    }
    stagnationCounter = 0; // reset after catastrophic restart
    lastBestFitness = bestFitness * 0.5; // lower the bar
  }

  return newBrains;
}

/**
 * Tournament Selection: randomly pick `k` individuals, return the best.
 * More selective pressure than random elite selection, less than pure rank.
 */
function tournamentSelect(
  brains: NeuralNetwork[],
  fitnesses: number[],
  k: number
): NeuralNetwork {
  let bestIdx = Math.floor(Math.random() * brains.length);
  let bestFit = fitnesses[bestIdx];

  for (let i = 1; i < k; i++) {
    const idx = Math.floor(Math.random() * brains.length);
    if (fitnesses[idx] > bestFit) {
      bestFit = fitnesses[idx];
      bestIdx = idx;
    }
  }
  return brains[bestIdx];
}

/**
 * Uniform Crossover: for each gene (weight/bias), randomly pick from parent1 or parent2.
 * Good for mixing distant solutions.
 */
function uniformCrossover(
  parent1: NeuralNetwork,
  parent2: NeuralNetwork
): NeuralNetwork {
  const child = parent1.clone();
  for (let l = 0; l < child.weights.length; l++) {
    for (let r = 0; r < child.weights[l].length; r++) {
      for (let i = 0; i < child.weights[l][r].length; i++) {
        if (Math.random() > 0.5) {
          child.weights[l][r][i] = parent2.weights[l][r][i];
        }
      }
    }
  }
  for (let l = 0; l < child.biases.length; l++) {
    for (let i = 0; i < child.biases[l].length; i++) {
      if (Math.random() > 0.5) {
        child.biases[l][i] = parent2.biases[l][i];
      }
    }
  }
  return child;
}

/**
 * Arithmetic Crossover: blend weights with a random interpolation factor.
 * Creates children "between" parents in weight space — good for fine-tuning.
 */
function arithmeticCrossover(
  parent1: NeuralNetwork,
  parent2: NeuralNetwork
): NeuralNetwork {
  const child = parent1.clone();
  const alpha = 0.3 + Math.random() * 0.4; // blend factor [0.3, 0.7]

  for (let l = 0; l < child.weights.length; l++) {
    for (let r = 0; r < child.weights[l].length; r++) {
      for (let i = 0; i < child.weights[l][r].length; i++) {
        child.weights[l][r][i] =
          alpha * parent1.weights[l][r][i] +
          (1 - alpha) * parent2.weights[l][r][i];
      }
    }
  }
  for (let l = 0; l < child.biases.length; l++) {
    for (let i = 0; i < child.biases[l].length; i++) {
      child.biases[l][i] =
        alpha * parent1.biases[l][i] +
        (1 - alpha) * parent2.biases[l][i];
    }
  }
  return child;
}

/**
 * Adaptive Mutation: uses Gaussian perturbation with rate/strength
 * that scale with stagnation level.
 */
function adaptiveMutate(net: NeuralNetwork): void {
  const rate = currentAdaptiveMutationRate;
  const strength = currentAdaptiveMutationStrength;

  for (const layer of net.weights) {
    for (const row of layer) {
      for (let i = 0; i < row.length; i++) {
        if (Math.random() < rate) {
          // Gaussian mutation (Box-Muller)
          const u1 = Math.random();
          const u2 = Math.random();
          const gaussian =
            Math.sqrt(-2 * Math.log(u1 + 1e-10)) *
            Math.cos(2 * Math.PI * u2);
          row[i] += gaussian * strength;
        }
      }
    }
  }
  for (const layer of net.biases) {
    for (let i = 0; i < layer.length; i++) {
      if (Math.random() < rate) {
        const u1 = Math.random();
        const u2 = Math.random();
        const gaussian =
          Math.sqrt(-2 * Math.log(u1 + 1e-10)) *
          Math.cos(2 * Math.PI * u2);
        layer[i] += gaussian * strength;
      }
    }
  }
}

/**
 * Clamp all weights to [-3, 3] to prevent weight explosion.
 */
function clampWeights(net: NeuralNetwork): void {
  const limit = 3.0;
  for (const layer of net.weights) {
    for (const row of layer) {
      for (let i = 0; i < row.length; i++) {
        row[i] = Math.max(-limit, Math.min(limit, row[i]));
      }
    }
  }
  for (const layer of net.biases) {
    for (let i = 0; i < layer.length; i++) {
      layer[i] = Math.max(-limit, Math.min(limit, layer[i]));
    }
  }
}
