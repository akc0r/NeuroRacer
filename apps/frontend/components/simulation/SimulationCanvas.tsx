"use client";

// ──────────────────────────────────────────────
// Main simulation canvas — wires useSimulation
// ──────────────────────────────────────────────

import { useRef, useEffect } from "react";
import { useSimulation } from "@/hooks/useSimulation";
import { SimulationControls } from "./SimulationControls";
import { GenerationHUD } from "./GenerationHUD";
import { GenerationChart } from "@/components/dashboard/GenerationChart";
import { BrainViewer } from "@/components/dashboard/BrainViewer";

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;

export function SimulationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { start, stop, reset, changeTrack, stats, fitnessHistory, isRunning, speedMultiplier, setSpeedMultiplier, getBestBrain } =
    useSimulation(canvasRef);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (isRunning) stop();
        else start();
      } else if (e.code === "KeyR") {
        reset();
      } else if (e.key === "+" || e.key === "=") {
        const speeds = [1, 2, 5, 10];
        const idx = speeds.indexOf(speedMultiplier);
        if (idx < speeds.length - 1) setSpeedMultiplier(speeds[idx + 1]);
      } else if (e.key === "-") {
        const speeds = [1, 2, 5, 10];
        const idx = speeds.indexOf(speedMultiplier);
        if (idx > 0) setSpeedMultiplier(speeds[idx - 1]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRunning, start, stop, reset, speedMultiplier, setSpeedMultiplier]);

  return (
    <div className="flex flex-col lg:flex-row gap-0 h-screen w-full">
      {/* Main canvas area */}
      <div className="relative flex-1 flex items-center justify-center bg-zinc-900 border-r border-zinc-800 min-w-0">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="rounded-lg shadow-2xl shadow-purple-500/10 border border-zinc-800"
          style={{ maxWidth: "100%", maxHeight: "100%" }}
        />
        <GenerationHUD stats={stats} speedMultiplier={speedMultiplier} />
      </div>

      {/* Side panel */}
      <aside className="w-full lg:w-[380px] flex flex-col gap-4 p-6 overflow-y-auto bg-zinc-950 border-l border-zinc-800">
        <SimulationControls
          onStart={start}
          onStop={stop}
          onReset={reset}
          onChangeTrack={changeTrack}
          isRunning={isRunning}
          speedMultiplier={speedMultiplier}
          setSpeedMultiplier={setSpeedMultiplier}
          getBestBrain={getBestBrain}
        />
        <GenerationChart data={fitnessHistory} />
        <BrainViewer />
      </aside>
    </div>
  );
}
