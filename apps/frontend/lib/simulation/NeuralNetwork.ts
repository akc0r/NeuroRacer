// ──────────────────────────────────────────────────────────────
// Advanced feedforward neural network with proper initialization
// and per-layer activation functions
// ──────────────────────────────────────────────────────────────

export type Weights = number[][][]; // [layer][neuron][weight]

/** Activation function types */
type ActivationFn = (x: number) => number;

/** Leaky ReLU — avoids dead neurons, better gradient flow than standard ReLU */
const leakyReLU: ActivationFn = (x) => (x > 0 ? x : 0.01 * x);

/** Hyperbolic tangent — maps to [-1, 1], ideal for output controls */
const tanh: ActivationFn = (x) => Math.tanh(x);

/**
 * Xavier (Glorot) initialization — optimal for tanh activations.
 * Samples from uniform distribution [-limit, +limit] where limit = sqrt(6 / (fan_in + fan_out))
 */
function xavierInit(fanIn: number, fanOut: number): number {
  const limit = Math.sqrt(6.0 / (fanIn + fanOut));
  return (Math.random() * 2 - 1) * limit;
}

/**
 * He initialization — optimal for ReLU/LeakyReLU activations.
 * Samples from normal-ish distribution with std = sqrt(2 / fan_in)
 */
function heInit(fanIn: number): number {
  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const normal = Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
  return normal * Math.sqrt(2.0 / fanIn);
}

export class NeuralNetwork {
  weights: Weights;
  biases: number[][];
  layerSizes: number[];

  constructor(layerSizes: number[]) {
    this.layerSizes = layerSizes;
    this.weights = [];
    this.biases = [];

    if (layerSizes.length < 2) return;

    for (let i = 0; i < layerSizes.length - 1; i++) {
      const fanIn = layerSizes[i];
      const fanOut = layerSizes[i + 1];
      const isOutputLayer = i === layerSizes.length - 2;

      // Use He init for hidden layers (LeakyReLU), Xavier for output layer (tanh)
      const initFn = isOutputLayer
        ? () => xavierInit(fanIn, fanOut)
        : () => heInit(fanIn);

      this.weights.push(
        Array.from({ length: fanOut }, () =>
          Array.from({ length: fanIn }, initFn)
        )
      );
      // Initialize biases to small values (not zero, to break symmetry slightly)
      this.biases.push(
        Array.from({ length: fanOut }, () => (Math.random() - 0.5) * 0.1)
      );
    }
  }

  /**
   * Run a forward pass through the network.
   * Hidden layers use Leaky ReLU, output layer uses tanh.
   */
  forward(inputs: number[]): number[] {
    let current = inputs;
    const lastLayer = this.weights.length - 1;

    for (let l = 0; l < this.weights.length; l++) {
      const activation: ActivationFn = l === lastLayer ? tanh : leakyReLU;
      const nextLayer = new Array(this.biases[l].length);

      for (let j = 0; j < this.biases[l].length; j++) {
        let sum = this.biases[l][j];
        const weights_j = this.weights[l][j];
        for (let i = 0; i < weights_j.length; i++) {
          sum += weights_j[i] * current[i];
        }
        nextLayer[j] = activation(sum);
      }
      current = nextLayer;
    }
    return current; // [steering, throttle]
  }

  /** Deep clone this network */
  clone(): NeuralNetwork {
    const copy = new NeuralNetwork([]);
    copy.layerSizes = [...this.layerSizes];
    copy.weights = this.weights.map((l) => l.map((row) => [...row]));
    copy.biases = this.biases.map((l) => [...l]);
    return copy;
  }

  /** Count total number of trainable parameters (weights + biases) */
  parameterCount(): number {
    let count = 0;
    for (let l = 0; l < this.weights.length; l++) {
      for (const row of this.weights[l]) {
        count += row.length;
      }
      count += this.biases[l].length;
    }
    return count;
  }

  /** Serialize to JSON string */
  serialize(): string {
    return JSON.stringify({
      weights: this.weights,
      biases: this.biases,
      layerSizes: this.layerSizes,
    });
  }

  /** Deserialize from JSON string */
  static deserialize(json: string): NeuralNetwork {
    const { weights, biases, layerSizes } = JSON.parse(json);
    const net = new NeuralNetwork([]);
    net.weights = weights;
    net.biases = biases;
    net.layerSizes = layerSizes;
    return net;
  }
}
