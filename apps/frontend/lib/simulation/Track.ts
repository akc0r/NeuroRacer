// ──────────────────────────────────────────────────────────────────
// Track: procedural circuit generation using Catmull-Rom splines
// with variable width, smooth curves, and proper checkpoints.
// ──────────────────────────────────────────────────────────────────

import type { Checkpoint } from "@/types";

/** A wall segment (line) */
interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** 2D point */
interface Point {
  x: number;
  y: number;
}

/**
 * Generates a smooth, closed-loop racing circuit using Catmull-Rom
 * spline interpolation through randomly placed control points.
 *
 * Key improvements over the old oval-wobble approach:
 * - Random control points create genuinely different layouts
 * - Catmull-Rom ensures C1 continuity (smooth tangents)
 * - Angular sorting prevents self-intersection
 * - Variable track width adds visual interest
 * - Proper centerline-based checkpoint placement
 * - Robust inner/outer detection with winding correction
 */
export class Track {
  outerWalls: Wall[] = [];
  innerWalls: Wall[] = [];
  checkpoints: Checkpoint[] = [];
  startPosition: [number, number] = [0, 0];
  startAngle = 0;

  outerPoints: Point[] = [];
  innerPoints: Point[] = [];

  /** The smooth centerline points (for rendering the racing line) */
  centerPoints: Point[] = [];

  seed = Math.random();

  constructor(canvasWidth = 900, canvasHeight = 600) {
    this.generate(canvasWidth, canvasHeight);
  }

  regenerate(canvasWidth = 900, canvasHeight = 600) {
    this.seed = Math.random();
    this.generate(canvasWidth, canvasHeight);
  }

  /** Generate the track geometry */
  generate(w: number, h: number) {
    const cx = w / 2;
    const cy = h / 2;

    this.outerPoints = [];
    this.innerPoints = [];
    this.outerWalls = [];
    this.innerWalls = [];
    this.checkpoints = [];
    this.centerPoints = [];

    // ── Step 1: Generate random control points around the center ──
    const controlPoints = this.generateControlPoints(cx, cy, w, h);

    // ── Step 2: Interpolate with Catmull-Rom spline ──
    const splineResolution = 10; // points per segment
    const centerline = this.catmullRomLoop(controlPoints, splineResolution);

    // ── Step 3: Smooth the centerline to remove any sharp kinks ──
    const smoothed = this.smoothPoints(centerline, 3);
    this.centerPoints = smoothed;

    // ── Step 4: Generate boundaries on both sides of the centerline ──
    const baseTrackWidth = Math.min(w, h) * 0.11; // wider tracks for easier learning
    const minWidth = baseTrackWidth * 0.85;
    const maxWidth = baseTrackWidth * 1.2;

    // Compute the center of mass of the centerline to determine normal direction
    let comX = 0, comY = 0;
    for (const p of smoothed) {
      comX += p.x;
      comY += p.y;
    }
    comX /= smoothed.length;
    comY /= smoothed.length;

    const sideA: Point[] = [];
    const sideB: Point[] = [];

    for (let i = 0; i < smoothed.length; i++) {
      const prev = smoothed[(i - 1 + smoothed.length) % smoothed.length];
      const next = smoothed[(i + 1) % smoothed.length];

      // Tangent direction
      const tx = next.x - prev.x;
      const ty = next.y - prev.y;
      const len = Math.sqrt(tx * tx + ty * ty) || 1;

      // Two perpendicular directions
      const n1x = -ty / len;
      const n1y = tx / len;

      // Variable width: gentle sinusoidal variation
      const widthPhase = (i / smoothed.length) * Math.PI * 4;
      const widthFactor = 0.5 + 0.5 * Math.sin(widthPhase + this.seed * 7);
      const halfWidth = (minWidth + (maxWidth - minWidth) * widthFactor) / 2;

      sideA.push({
        x: smoothed[i].x + n1x * halfWidth,
        y: smoothed[i].y + n1y * halfWidth,
      });
      sideB.push({
        x: smoothed[i].x - n1x * halfWidth,
        y: smoothed[i].y - n1y * halfWidth,
      });
    }

    // ── Step 4b: Determine which side is "outer" (farther from center) ──
    // Compute average distance from center of mass for each side
    let avgDistA = 0, avgDistB = 0;
    for (let i = 0; i < sideA.length; i++) {
      avgDistA += Math.hypot(sideA[i].x - comX, sideA[i].y - comY);
      avgDistB += Math.hypot(sideB[i].x - comX, sideB[i].y - comY);
    }

    if (avgDistA >= avgDistB) {
      this.outerPoints = sideA;
      this.innerPoints = sideB;
    } else {
      this.outerPoints = sideB;
      this.innerPoints = sideA;
    }

    // ── Step 5: Build walls from consecutive boundary points ──
    const n = this.outerPoints.length;
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      this.outerWalls.push({
        x1: this.outerPoints[i].x,
        y1: this.outerPoints[i].y,
        x2: this.outerPoints[next].x,
        y2: this.outerPoints[next].y,
      });
      this.innerWalls.push({
        x1: this.innerPoints[i].x,
        y1: this.innerPoints[i].y,
        x2: this.innerPoints[next].x,
        y2: this.innerPoints[next].y,
      });
    }

    // ── Step 6: Place checkpoints along the centerline ──
    const totalCheckpoints = Math.max(15, Math.min(40, Math.floor(smoothed.length / 4)));
    const checkpointInterval = Math.max(1, Math.floor(smoothed.length / totalCheckpoints));
    for (let i = 0; i < smoothed.length; i += checkpointInterval) {
      this.checkpoints.push({
        x: smoothed[i].x,
        y: smoothed[i].y,
      });
    }

    // ── Step 7: Determine start position and angle ──
    // Pick the centerline point closest to the top of the canvas
    const topCenter: Point = { x: cx, y: cy * 0.45 };
    let closestIdx = 0;
    let closestDist = Infinity;
    for (let i = 0; i < smoothed.length; i++) {
      const d = Math.hypot(
        smoothed[i].x - topCenter.x,
        smoothed[i].y - topCenter.y
      );
      if (d < closestDist) {
        closestDist = d;
        closestIdx = i;
      }
    }

    this.startPosition = [smoothed[closestIdx].x, smoothed[closestIdx].y];

    // Start angle: tangent direction at start
    const nextIdx = (closestIdx + 1) % smoothed.length;
    const dx = smoothed[nextIdx].x - smoothed[closestIdx].x;
    const dy = smoothed[nextIdx].y - smoothed[closestIdx].y;
    this.startAngle = Math.atan2(dy, dx);

    // ── Step 8: Reorder checkpoints so the first one is ahead of start ──
    const aheadIdx = (closestIdx + checkpointInterval * 2) % smoothed.length;
    const aheadPt = smoothed[aheadIdx];
    let closestCpIdx = 0;
    let closestCpDist = Infinity;
    for (let i = 0; i < this.checkpoints.length; i++) {
      const d = Math.hypot(
        this.checkpoints[i].x - aheadPt.x,
        this.checkpoints[i].y - aheadPt.y
      );
      if (d < closestCpDist) {
        closestCpDist = d;
        closestCpIdx = i;
      }
    }
    this.checkpoints = [
      ...this.checkpoints.slice(closestCpIdx),
      ...this.checkpoints.slice(0, closestCpIdx),
    ];

    // ── Step 9: Validate — ensure start is on track. If not, regenerate ──
    if (this.isOutside(this.startPosition[0], this.startPosition[1])) {
      // Fallback: try shifting start slightly toward center
      this.startPosition = [
        this.startPosition[0] * 0.95 + comX * 0.05,
        this.startPosition[1] * 0.95 + comY * 0.05,
      ];
      // If still outside, just regenerate with a new seed
      if (this.isOutside(this.startPosition[0], this.startPosition[1])) {
        this.seed = Math.random();
        this.generate(w, h);
        return;
      }
    }
  }

  /**
   * Generate random control points arranged in a loop.
   * Uses angular placement with random radii, then sorts by angle
   * to guarantee a non-self-intersecting polygon.
   */
  private generateControlPoints(
    cx: number,
    cy: number,
    w: number,
    h: number
  ): Point[] {
    const rng = this.seededRandom(this.seed);

    // Number of control points: 7-12 for interesting variety
    const numPoints = 7 + Math.floor(rng() * 6);

    // Generate points at random angles with varying radii
    const angleStep = (Math.PI * 2) / numPoints;
    const points: Point[] = [];

    const maxRadiusX = w * 0.33;
    const maxRadiusY = h * 0.33;
    const minRadiusX = w * 0.15;
    const minRadiusY = h * 0.15;

    for (let i = 0; i < numPoints; i++) {
      // Base angle with slight random perturbation
      const baseAngle = angleStep * i;
      const angleJitter = (rng() - 0.5) * angleStep * 0.4;
      const angle = baseAngle + angleJitter;

      // Random radius between min and max
      const radiusFactor = 0.4 + rng() * 0.6;
      const rx = minRadiusX + (maxRadiusX - minRadiusX) * radiusFactor;
      const ry = minRadiusY + (maxRadiusY - minRadiusY) * radiusFactor;

      points.push({
        x: cx + Math.cos(angle) * rx,
        y: cy + Math.sin(angle) * ry,
      });
    }

    // Sort by angle from center to prevent self-intersection
    points.sort((a, b) => {
      return Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx);
    });

    return points;
  }

  /**
   * Catmull-Rom spline interpolation for a closed loop.
   * Produces smooth curves passing exactly through all control points.
   */
  private catmullRomLoop(points: Point[], resolution: number): Point[] {
    const result: Point[] = [];
    const n = points.length;
    const tension = 0.5; // Standard Catmull-Rom tension

    for (let i = 0; i < n; i++) {
      const p0 = points[(i - 1 + n) % n];
      const p1 = points[i];
      const p2 = points[(i + 1) % n];
      const p3 = points[(i + 2) % n];

      for (let t = 0; t < resolution; t++) {
        const s = t / resolution;
        const s2 = s * s;
        const s3 = s2 * s;

        // Catmull-Rom basis functions
        const x =
          tension *
          ((-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * s3 +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * s2 +
            (-p0.x + p2.x) * s +
            2 * p1.x);

        const y =
          tension *
          ((-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * s3 +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * s2 +
            (-p0.y + p2.y) * s +
            2 * p1.y);

        result.push({ x, y });
      }
    }

    return result;
  }

  /**
   * Laplacian smoothing: average each point with its neighbors.
   * Repeat `iterations` times for smoother results.
   */
  private smoothPoints(points: Point[], iterations: number): Point[] {
    let current = points;
    for (let iter = 0; iter < iterations; iter++) {
      const smoothed: Point[] = [];
      const n = current.length;
      for (let i = 0; i < n; i++) {
        const prev = current[(i - 1 + n) % n];
        const curr = current[i];
        const next = current[(i + 1) % n];
        smoothed.push({
          x: curr.x * 0.5 + (prev.x + next.x) * 0.25,
          y: curr.y * 0.5 + (prev.y + next.y) * 0.25,
        });
      }
      current = smoothed;
    }
    return current;
  }

  /** Simple seeded PRNG (mulberry32) for reproducible tracks */
  private seededRandom(seed: number): () => number {
    let state = Math.floor(seed * 2147483647) || 1;
    return () => {
      state |= 0;
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Cast a ray and return normalized distance to nearest wall (0=touching, 1=max range) */
  raycast(x: number, y: number, angle: number, maxLength: number): number {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let closest = 1;

    const allWalls = [...this.outerWalls, ...this.innerWalls];
    for (const wall of allWalls) {
      const t = this.raySegmentIntersect(x, y, dx, dy, wall, maxLength);
      if (t !== null && t < closest) {
        closest = t;
      }
    }
    return closest;
  }

  /** Check if a point is outside the track (outside outer or inside inner) */
  isOutside(x: number, y: number): boolean {
    const insideOuter = this.isInsidePolygon(x, y, this.outerPoints);
    const insideInner = this.isInsidePolygon(x, y, this.innerPoints);
    return !insideOuter || insideInner;
  }

  /** Ray-segment intersection, returns normalized t (0-1) or null */
  private raySegmentIntersect(
    ox: number,
    oy: number,
    dx: number,
    dy: number,
    wall: Wall,
    maxLen: number
  ): number | null {
    const sx = wall.x2 - wall.x1;
    const sy = wall.y2 - wall.y1;
    const denom = dx * sy - dy * sx;
    if (Math.abs(denom) < 1e-10) return null;

    const t = ((wall.x1 - ox) * sy - (wall.y1 - oy) * sx) / denom;
    const u = ((wall.x1 - ox) * dy - (wall.y1 - oy) * dx) / denom;

    if (t >= 0 && t <= maxLen && u >= 0 && u <= 1) {
      return t / maxLen;
    }
    return null;
  }

  /** Point-in-polygon using ray casting algorithm */
  private isInsidePolygon(
    px: number,
    py: number,
    polygon: Point[]
  ): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x,
        yi = polygon[i].y;
      const xj = polygon[j].x,
        yj = polygon[j].y;
      if (
        yi > py !== yj > py &&
        px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
      ) {
        inside = !inside;
      }
    }
    return inside;
  }
}
