"use client";

// ──────────────────────────────────────────────
// Brain viewer — visualize NN topology
// ──────────────────────────────────────────────

import { useEffect, useRef } from "react";
import { CONFIG } from "@/lib/config";
import { Brain } from "lucide-react";

/**
 * Draws a simple network topology diagram showing layers & connections.
 * Static visualization — shows the architecture, not live weights.
 */
export function BrainViewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    draw();
  }, []);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const layers = [
      CONFIG.INPUT_COUNT,
      ...CONFIG.HIDDEN_LAYERS,
      CONFIG.OUTPUT_COUNT,
    ];
    const layerCount = layers.length;
    const layerSpacing = w / (layerCount + 1);

    const nodeRadius = 8;
    const layerPositions: { x: number; y: number }[][] = [];

    // Calculate positions
    for (let l = 0; l < layerCount; l++) {
      const x = layerSpacing * (l + 1);
      const nodeCount = layers[l];
      const totalHeight = (nodeCount - 1) * 30;
      const startY = h / 2 - totalHeight / 2;
      const positions: { x: number; y: number }[] = [];

      for (let n = 0; n < nodeCount; n++) {
        positions.push({ x, y: startY + n * 30 });
      }
      layerPositions.push(positions);
    }

    // Draw connections
    for (let l = 0; l < layerCount - 1; l++) {
      for (const from of layerPositions[l]) {
        for (const to of layerPositions[l + 1]) {
          ctx.strokeStyle = "rgba(168, 85, 247, 0.12)";
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.stroke();
        }
      }
    }

    // Draw nodes
    const layerColors = ["#22d3ee", "#a855f7", "#f59e0b"];
    for (let l = 0; l < layerCount; l++) {
      const color = layerColors[Math.min(l, layerColors.length - 1)];
      for (const pos of layerPositions[l]) {
        // Glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, nodeRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Inner
        ctx.fillStyle = "#18181b";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, nodeRadius - 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Labels
    ctx.fillStyle = "#52525b";
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    const labels = ["Input", ...CONFIG.HIDDEN_LAYERS.map((_, i) => `Hidden ${i + 1}`), "Output"];
    for (let l = 0; l < layerCount; l++) {
      const x = layerSpacing * (l + 1);
      ctx.fillText(labels[l], x, h - 8);
    }
  }

  return (
    <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-purple-400" />
        <h2 className="text-xs font-mono text-zinc-400 uppercase tracking-widest">
          Network Topology
        </h2>
      </div>
      <canvas
        ref={canvasRef}
        width={320}
        height={180}
        className="w-full rounded-lg"
      />
    </div>
  );
}
