// ──────────────────────────────────────────────
// Canvas renderer for track, cars, and sensors
// ──────────────────────────────────────────────

import { Car } from "./Car";
import { Track } from "./Track";
import { CONFIG } from "@/lib/config";

const CAR_COLORS = {
  best: "#f59e0b",   // Amber — best car
  alive: "#22d3ee",  // Cyan — alive
  dead: "#52525b",   // Gray — dead
};

/** Draw the track (road surface, walls, checkpoints) */
export function drawTrack(ctx: CanvasRenderingContext2D, track: Track): void {
  // Canvas background
  ctx.fillStyle = "#18181b"; // slightly darker background
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Road surface (filled polygon between inner and outer limits)
  if (track.outerPoints.length > 0 && track.innerPoints.length > 0) {
    ctx.fillStyle = "#27272a"; // road color
    ctx.beginPath();
    // Outer boundary (clockwise)
    ctx.moveTo(track.outerPoints[0].x, track.outerPoints[0].y);
    for (let i = 1; i < track.outerPoints.length; i++) {
      ctx.lineTo(track.outerPoints[i].x, track.outerPoints[i].y);
    }
    ctx.closePath();

    // Inner boundary (counter-clockwise creates a hole with evenodd)
    ctx.moveTo(track.innerPoints[0].x, track.innerPoints[0].y);
    for (let i = track.innerPoints.length - 1; i >= 1; i--) {
      ctx.lineTo(track.innerPoints[i].x, track.innerPoints[i].y);
    }
    ctx.closePath();
    ctx.fill("evenodd");
  }

  // Outer walls
  ctx.strokeStyle = "#a855f7";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const w of track.outerWalls) {
    ctx.moveTo(w.x1, w.y1);
    ctx.lineTo(w.x2, w.y2);
  }
  ctx.stroke();

  // Inner walls
  ctx.strokeStyle = "#a855f7";
  ctx.beginPath();
  for (const w of track.innerWalls) {
    ctx.moveTo(w.x1, w.y1);
    ctx.lineTo(w.x2, w.y2);
  }
  ctx.stroke();

  // Checkpoints
  ctx.fillStyle = "rgba(168, 85, 247, 0.15)";
  for (const cp of track.checkpoints) {
    ctx.beginPath();
    ctx.arc(cp.x, cp.y, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  // Start position marker
  const [sx, sy] = track.startPosition;
  ctx.fillStyle = "#22c55e";
  ctx.beginPath();
  ctx.arc(sx, sy, 6, 0, Math.PI * 2);
  ctx.fill();
}

/** Draw a single car (triangle shape) + its sensor rays */
export function drawCar(
  ctx: CanvasRenderingContext2D,
  car: Car,
  rank: number
): void {
  const alpha = car.alive ? 1 : 0.2;
  let color: string;

  if (rank === 0 && car.alive) {
    color = CAR_COLORS.best;
  } else if (car.alive) {
    // Color gradient based on speed
    const speedRatio = Math.max(0, Math.min(1, Math.abs(car.speed) / CONFIG.MAX_SPEED));
    
    // from cyan (0, 211, 238) to pink/red (244, 63, 94)
    const r = Math.round(0 + speedRatio * 244);
    const g = Math.round(211 - speedRatio * (211 - 63));
    const b = Math.round(238 - speedRatio * (238 - 94));
    
    color = `rgb(${r}, ${g}, ${b})`;
  } else {
    color = CAR_COLORS.dead;
  }

  // Draw trail for alive cars
  if (car.alive && car.trailPositions.length > 1) {
    ctx.beginPath();
    ctx.moveTo(car.trailPositions[0].x, car.trailPositions[0].y);
    for (let i = 1; i < car.trailPositions.length; i++) {
      ctx.lineTo(car.trailPositions[i].x, car.trailPositions[i].y);
    }
    ctx.strokeStyle = `rgba(255, 255, 255, ${rank === 0 ? 0.3 : 0.05})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.globalAlpha = alpha;

  // Car body (triangle)
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-8, -6);
  ctx.lineTo(-8, 6);
  ctx.closePath();
  ctx.fill();

  // Glow effect for best car
  if (rank === 0 && car.alive) {
    ctx.shadowColor = CAR_COLORS.best;
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.restore();

  // Sensor rays (only for top 3 alive cars)
  if (car.alive && rank < 3) {
    drawSensors(ctx, car);
  }
}

/** Draw sensor rays for a car */
function drawSensors(ctx: CanvasRenderingContext2D, car: Car): void {
  const spread = CONFIG.RAY_SPREAD;
  ctx.lineWidth = 0.5;

  for (let i = 0; i < CONFIG.RAY_COUNT; i++) {
    const rayAngle =
      car.angle -
      spread / 2 +
      (spread / (CONFIG.RAY_COUNT - 1)) * i;
    const dist = car.sensors[i] * CONFIG.RAY_LENGTH;

    const endX = car.x + Math.cos(rayAngle) * dist;
    const endY = car.y + Math.sin(rayAngle) * dist;

    // Color based on proximity (green → red)
    const t = car.sensors[i];
    const r = Math.round(255 * (1 - t));
    const g = Math.round(255 * t);
    ctx.strokeStyle = `rgba(${r}, ${g}, 80, 0.5)`;

    ctx.beginPath();
    ctx.moveTo(car.x, car.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }
}
