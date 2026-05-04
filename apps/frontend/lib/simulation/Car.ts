// ──────────────────────────────────────────────────────────────
// Car: physics, sensors, checkpoint detection, advanced fitness
// ──────────────────────────────────────────────────────────────

import { NeuralNetwork } from "./NeuralNetwork";
import { Track } from "./Track";
import { CONFIG } from "@/lib/config";

export class Car {
  x: number;
  y: number;
  angle: number;
  speed = 0;
  angularVelocity = 0;
  alive = true;
  fitness = 0;
  checkpoints = 0;
  laps = 0;
  sensors: number[];
  trailPositions: { x: number; y: number }[] = [];
  brain: NeuralNetwork;

  /** Distance traveled along the track (accumulated) */
  private distanceTraveled = 0;
  private prevX = 0;
  private prevY = 0;
  private idleFrames = 0;
  private framesSinceLastCheckpoint = 0;
  private totalFrames = 0;

  constructor(x: number, y: number, angle: number, brain: NeuralNetwork) {
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.angle = angle;
    this.sensors = new Array(CONFIG.RAY_COUNT).fill(1);
    this.brain = brain;
  }

  /** Advance the car by one frame */
  update(track: Track): void {
    if (!this.alive) return;
    this.totalFrames++;

    // Save previous position for distance calculation
    this.prevX = this.x;
    this.prevY = this.y;

    // Cast sensor rays
    this.castRays(track);

    // ── Build neural network inputs ──
    // Sensors (RAY_COUNT values, normalized 0-1)
    // + normalized speed (-1 to 1)
    // + normalized angular velocity (-1 to 1)
    const normalizedSpeed = this.speed / CONFIG.MAX_SPEED;
    const normalizedAngVel = Math.max(-1, Math.min(1, this.angularVelocity / 0.15));

    const inputs = [...this.sensors, normalizedSpeed, normalizedAngVel];

    // Query neural network for controls
    const [steer, throttle] = this.brain.forward(inputs);

    // ── Apply physics with angular velocity smoothing ──
    // Smooth steering via angular velocity (more realistic car feel)
    const targetAngVel = steer * CONFIG.TURN_SPEED;
    this.angularVelocity += (targetAngVel - this.angularVelocity) * 0.3;
    this.angle += this.angularVelocity;

    // Acceleration with speed-dependent turning penalty
    const turnPenalty = 1 - Math.abs(this.angularVelocity) * 2;
    const effectiveAccel = throttle * CONFIG.ACCELERATION * Math.max(0.3, turnPenalty);
    this.speed += effectiveAccel;

    // Clamp speed
    this.speed = Math.max(
      -CONFIG.MAX_SPEED * 0.3, // limited reverse speed
      Math.min(CONFIG.MAX_SPEED, this.speed)
    );

    // Apply friction (more friction at lower speeds for natural deceleration)
    const frictionMultiplier = Math.abs(this.speed) < 1 ? 1.5 : 1.0;
    this.speed *= 1 - CONFIG.FRICTION * frictionMultiplier;

    // Update position
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;

    // Track distance traveled
    const dx = this.x - this.prevX;
    const dy = this.y - this.prevY;
    this.distanceTraveled += Math.sqrt(dx * dx + dy * dy);

    // Record trail position for rendering
    if (this.trailPositions.length === 0) {
      this.trailPositions.push({ x: this.x, y: this.y });
    } else {
      const last = this.trailPositions[this.trailPositions.length - 1];
      if (Math.hypot(this.x - last.x, this.y - last.y) > 10) {
        this.trailPositions.push({ x: this.x, y: this.y });
        if (this.trailPositions.length > 30) {
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

    // ── Kill conditions ──
    this.framesSinceLastCheckpoint++;

    // Kill if no checkpoint reached in too long (scales with difficulty)
    if (this.framesSinceLastCheckpoint > 200) {
      this.alive = false;
    }

    // Kill idle / stuck cars
    if (Math.abs(this.speed) < 0.2) {
      this.idleFrames++;
      if (this.idleFrames > 80) this.alive = false;
    } else {
      this.idleFrames = 0;
    }

    // ── Accumulate fitness ──
    // Reward forward speed (penalize reverse)
    this.fitness += Math.max(0, this.speed) * 0.05;

    // Small reward for staying close to center (encourages clean lines)
    const minSensor = Math.min(...this.sensors);
    if (minSensor > 0.15) {
      this.fitness += 0.02; // small bonus for not hugging walls
    }
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
    if (dist < 45) {
      this.checkpoints++;
      this.framesSinceLastCheckpoint = 0;

      // Progressive checkpoint reward: later checkpoints worth more
      const progressBonus = 1 + (this.checkpoints * 0.02);
      this.fitness += CONFIG.CHECKPOINT_REWARD * progressBonus;

      // Speed bonus at checkpoint: reward maintaining speed through checkpoints
      const speedBonus = Math.max(0, this.speed / CONFIG.MAX_SPEED) * 20;
      this.fitness += speedBonus;

      // Check if a full lap is completed
      if (
        this.checkpoints > 0 &&
        this.checkpoints % track.checkpoints.length === 0
      ) {
        this.laps++;
        this.fitness += CONFIG.LAP_REWARD;
      }
    }
  }
}
