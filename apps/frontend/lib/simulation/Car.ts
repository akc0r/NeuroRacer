// ──────────────────────────────────────────
// Car: physics, sensors, checkpoint detection
// ──────────────────────────────────────────

import { NeuralNetwork } from "./NeuralNetwork";
import { Track } from "./Track";
import { CONFIG } from "@/lib/config";

export class Car {
  x: number;
  y: number;
  angle: number;
  speed = 0;
  alive = true;
  fitness = 0;
  checkpoints = 0;
  laps = 0;
  sensors: number[];
  trailPositions: { x: number; y: number }[] = [];
  brain: NeuralNetwork;
  private idleFrames = 0;
  private framesSinceLastCheckpoint = 0;

  constructor(x: number, y: number, angle: number, brain: NeuralNetwork) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.sensors = new Array(CONFIG.RAY_COUNT).fill(1);
    this.brain = brain;
  }

  /** Advance the car by one frame */
  update(track: Track): void {
    if (!this.alive) return;

    // Cast sensor rays
    this.castRays(track);

    // Query neural network for controls
    const [steer, throttle] = this.brain.forward(this.sensors);

    // Apply physics
    this.angle += steer * CONFIG.TURN_SPEED;
    this.speed += throttle * CONFIG.ACCELERATION;
    this.speed = Math.max(
      -CONFIG.MAX_SPEED / 2,
      Math.min(CONFIG.MAX_SPEED, this.speed)
    );
    this.speed *= 1 - CONFIG.FRICTION;

    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;

    // Record trail position for rendering (1 in every X frames or based on distance)
    if (this.trailPositions.length === 0) {
      this.trailPositions.push({ x: this.x, y: this.y });
    } else {
      const last = this.trailPositions[this.trailPositions.length - 1];
      if (Math.hypot(this.x - last.x, this.y - last.y) > 10) {
        this.trailPositions.push({ x: this.x, y: this.y });
        if (this.trailPositions.length > 20) {
          this.trailPositions.shift();
        }
      }
    }

    // Wall collision check
    if (track.isOutside(this.x, this.y)) {
      this.alive = false;
      return;
    }

    // Checkpoint detection
    this.checkPassedCheckpoints(track);

    // Kill idle or backwards cars
    this.framesSinceLastCheckpoint++;
    if (this.framesSinceLastCheckpoint > 150) {
      this.alive = false;
    }

    if (Math.abs(this.speed) < 0.3) {
      this.idleFrames++;
      if (this.idleFrames > 60) this.alive = false;
    } else {
      this.idleFrames = 0;
    }

    // Accumulate fitness (reward for speed, but heavily weighted on checkpoints)
    this.fitness += Math.max(0, this.speed) * 0.1;
  }

  /** Cast sensor rays in a fan pattern around the car */
  private castRays(track: Track): void {
    const spread = CONFIG.RAY_SPREAD;
    for (let i = 0; i < CONFIG.RAY_COUNT; i++) {
      const rayAngle =
        this.angle -
        spread / 2 +
        (spread / (CONFIG.RAY_COUNT - 1)) * i;
      this.sensors[i] = track.raycast(
        this.x,
        this.y,
        rayAngle,
        CONFIG.RAY_LENGTH
      );
    }
  }

  /** Check if car crossed the next checkpoint */
  private checkPassedCheckpoints(track: Track): void {
    const nextIdx = this.checkpoints % track.checkpoints.length;
    const next = track.checkpoints[nextIdx];
    const dist = Math.hypot(this.x - next.x, this.y - next.y);
    if (dist < 40) { // slightly larger radius for detection to catch fast cars
      this.checkpoints++;
      this.framesSinceLastCheckpoint = 0;
      this.fitness += CONFIG.CHECKPOINT_REWARD;
      
      // Check if a full lap is completed
      if (this.checkpoints > 0 && this.checkpoints % track.checkpoints.length === 0) {
        this.laps++;
        this.fitness += CONFIG.LAP_REWARD;
      }
    }
  }
}
