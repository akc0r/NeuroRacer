// ──────────────────────────────────────────
// Simple feedforward neural network
// ──────────────────────────────────────────

export type Weights = number[][][]; // [layer][neuron][weight]

export class NeuralNetwork {
  weights: Weights;
  biases: number[][];
  layerSizes: number[];

  constructor(layerSizes: number[]) {
    this.layerSizes = layerSizes;
    this.weights = [];
    this.biases = [];

    for (let i = 0; i < layerSizes.length - 1; i++) {
      this.weights.push(
        Array.from({ length: layerSizes[i + 1] }, () =>
          Array.from({ length: layerSizes[i] }, () => Math.random() * 2 - 1)
        )
      );
      this.biases.push(
        Array.from({ length: layerSizes[i + 1] }, () => Math.random() * 2 - 1)
      );
    }
  }

  /** Run a forward pass through the network */
  forward(inputs: number[]): number[] {
    let current = inputs;
    for (let l = 0; l < this.weights.length; l++) {
      const nextLayer = this.biases[l].map((bias, j) => {
        const sum = this.weights[l][j].reduce(
          (acc, w, i) => acc + w * current[i],
          bias
        );
        return Math.tanh(sum);
      });
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
