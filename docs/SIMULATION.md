# Simulation Engine

NeuroRacer uses a combination of **Feed-forward Neural Networks** and **Genetic Algorithms** (Neuroevolution) to train autonomous driving agents.

## Neural Network (The Brain)

Each car is equipped with a unique Neural Network.

### Architecture
- **Input Layer (5-7 nodes)**: Receives normalized proximity data from ultrasonic-like raycast sensors.
- **Hidden Layers (Configurable)**: Standard dense layers (default: 12, 10, 8 neurons).
- **Output Layer (2 nodes)**:
    1.  **Steering**: Left (-1) to Right (1).
    2.  **Acceleration**: Brake/Reverse (-1) to Full Throttle (1).

### Activation
The network uses `Math.tanh` as the activation function, ensuring outputs stay within the [-1, 1] range required for driving controls.

---

## Genetic Algorithm (The Trainer)

The population evolves through successive generations via **Natural Selection**.

### Fitness Function
Fitness is calculated based on:
1.  **Distance Travelled**: Reward for moving forward.
2.  **Checkpoints Passed**: Large rewards for crossing specific line-segments on the track.
3.  **Speed Penalty**: Penalizing cars that get stuck or drive too slowly.

### Evolutionary Operators
- **Elitism**: The top 5-10% of the population are carried over to the next generation without modification.
- **Selection**: "Parents" for the rest of the new generation are randomly selected from the elite group.
- **Mutation**: Children are clones of parents with random perturbations applied to their weights and biases based on the `MUTATION_RATE` and `MUTATION_STRENGTH`.

## Physics Engine
- **Raycasting**: Intersectional math between car vectors and track wall line segments.
- **Collision Detection**: Point-in-polygon verification for the car's bounding box.
- **Dynamics**: Simple vector addition for velocity, with friction and angular rotation.
