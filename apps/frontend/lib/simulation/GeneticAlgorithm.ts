// ──────────────────────────────────────────
// Genetic algorithm: selection + mutation
// ──────────────────────────────────────────

import { NeuralNetwork } from "./NeuralNetwork";
import { CONFIG } from "@/lib/config";

/**
 * Produce the next generation of neural networks from current brains + fitnesses.
 * Uses elitism (keep best unchanged) + mutation of top parents.
 */
export function nextGeneration(
  brains: NeuralNetwork[],
  fitnesses: number[]
): NeuralNetwork[] {
  // Sort by fitness (descending)
  const ranked = fitnesses
    .map((f, i) => ({ f, i }))
    .sort((a, b) => b.f - a.f);

  const newBrains: NeuralNetwork[] = [];

  // Elitism: keep top brains without mutation
  for (let i = 0; i < CONFIG.ELITISM; i++) {
    newBrains.push(brains[ranked[i].i].clone());
  }

  // Fill the rest by crossover and mutation
  while (newBrains.length < CONFIG.POPULATION_SIZE) {
    if (Math.random() < CONFIG.CROSSOVER_RATE && newBrains.length < CONFIG.POPULATION_SIZE) {
      // Crossover between two random elite parents
      const parent1Idx = ranked[Math.floor(Math.random() * CONFIG.ELITISM)].i;
      const parent2Idx = ranked[Math.floor(Math.random() * CONFIG.ELITISM)].i;
      const child = crossover(brains[parent1Idx], brains[parent2Idx]);
      mutate(child);
      newBrains.push(child);
    } else {
      // Just clone and mutate
      const parentIdx = ranked[Math.floor(Math.random() * CONFIG.ELITISM)].i;
      const child = brains[parentIdx].clone();
      mutate(child);
      newBrains.push(child);
    }
  }

  return newBrains;
}

/** Crossover: blend weights from two parents */
function crossover(parent1: NeuralNetwork, parent2: NeuralNetwork): NeuralNetwork {
  const child = parent1.clone();
  for (let l = 0; l < child.weights.length; l++) {
    for (let r = 0; r < child.weights[l].length; r++) {
      for (let i = 0; i < child.weights[l][r].length; i++) {
        // 50% chance to inherit from parent2
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

/** Apply random mutations to a neural network's weights */
function mutate(net: NeuralNetwork): void {
  for (const layer of net.weights) {
    for (const row of layer) {
      for (let i = 0; i < row.length; i++) {
        if (Math.random() < CONFIG.MUTATION_RATE) {
          row[i] += (Math.random() * 2 - 1) * CONFIG.MUTATION_STRENGTH;
        }
      }
    }
  }
  for (const layer of net.biases) {
    for (let i = 0; i < layer.length; i++) {
      if (Math.random() < CONFIG.MUTATION_RATE) {
        layer[i] += (Math.random() * 2 - 1) * CONFIG.MUTATION_STRENGTH;
      }
    }
  }
}
