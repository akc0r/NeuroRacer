// ──────────────────────────────────────────────────────────
// Track: oval circuit with walls, checkpoints, and raycasting
// ──────────────────────────────────────────────────────────

import type { Checkpoint } from "@/types";

/** A wall segment (line) */
interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Generates an oval-ish track from a spline of control points.
 * The track has inner and outer walls, plus checkpoints for fitness.
 */
export class Track {
  outerWalls: Wall[] = [];
  innerWalls: Wall[] = [];
  checkpoints: Checkpoint[] = [];
  startPosition: [number, number] = [0, 0];
  startAngle = 0; // Direction to face at the start

  outerPoints: { x: number; y: number }[] = [];
  innerPoints: { x: number; y: number }[] = [];

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
    const radiusX = w * 0.38;
    const radiusY = h * 0.38;
    const trackWidth = 80; // slightly wider
    const segments = 100; // more segments for smoother curve

    this.outerPoints = [];
    this.innerPoints = [];
    this.outerWalls = [];
    this.innerWalls = [];
    this.checkpoints = [];

    // Midline points (used to compute start tangent)
    const midPoints: { x: number; y: number }[] = [];

    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      // Fixed integer frequencies for a perfectly closed smooth loop
      const f1 = Math.floor(this.seed * 3) + 2; // 2 to 4
      const f2 = Math.floor(this.seed * 3) + 1; // 1 to 3
      const wobble = 1 + 0.15 * Math.sin(angle * f1) + 0.08 * Math.cos(angle * f2);

      const outerR_x = (radiusX + trackWidth / 2) * wobble;
      const outerR_y = (radiusY + trackWidth / 2) * wobble;
      const innerR_x = (radiusX - trackWidth / 2) * wobble;
      const innerR_y = (radiusY - trackWidth / 2) * wobble;

      this.outerPoints.push({
        x: cx + Math.cos(angle) * outerR_x,
        y: cy + Math.sin(angle) * outerR_y,
      });
      this.innerPoints.push({
        x: cx + Math.cos(angle) * innerR_x,
        y: cy + Math.sin(angle) * innerR_y,
      });
      midPoints.push({
        x: cx + Math.cos(angle) * radiusX * wobble,
        y: cy + Math.sin(angle) * radiusY * wobble,
      });

      // Checkpoint at midline more frequently to encourage optimizing the line
      if (i % 2 === 0) {
        this.checkpoints.push({
          x: cx + Math.cos(angle) * radiusX * wobble,
          y: cy + Math.sin(angle) * radiusY * wobble,
        });
      }
    }

    // Build walls from consecutive points
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
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

    // Find the midline point closest to the top center to use as start
    const topCenter = { x: cx, y: cy - radiusY };
    let closestIdx = 0;
    let closestDist = Infinity;
    for (let i = 0; i < midPoints.length; i++) {
      const d = Math.hypot(midPoints[i].x - topCenter.x, midPoints[i].y - topCenter.y);
      if (d < closestDist) {
        closestDist = d;
        closestIdx = i;
      }
    }

    // Start position: snap to the closest midline point
    this.startPosition = [midPoints[closestIdx].x, midPoints[closestIdx].y];

    // Start angle: tangent direction from this point to the next
    const nextIdx = (closestIdx + 1) % segments;
    const dx = midPoints[nextIdx].x - midPoints[closestIdx].x;
    const dy = midPoints[nextIdx].y - midPoints[closestIdx].y;
    this.startAngle = Math.atan2(dy, dx);

    // Reorder checkpoints so the first one is ahead of the start
    // Find the checkpoint closest to the next midline position
    const aheadX = midPoints[(closestIdx + 4) % segments].x;
    const aheadY = midPoints[(closestIdx + 4) % segments].y;
    let closestCpIdx = 0;
    let closestCpDist = Infinity;
    for (let i = 0; i < this.checkpoints.length; i++) {
      const d = Math.hypot(this.checkpoints[i].x - aheadX, this.checkpoints[i].y - aheadY);
      if (d < closestCpDist) {
        closestCpDist = d;
        closestCpIdx = i;
      }
    }
    // Rotate checkpoint array so the first one is ahead of start
    this.checkpoints = [
      ...this.checkpoints.slice(closestCpIdx),
      ...this.checkpoints.slice(0, closestCpIdx),
    ];
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
    polygon: { x: number; y: number }[]
  ): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x,
        yi = polygon[i].y;
      const xj = polygon[j].x,
        yj = polygon[j].y;
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }
}
