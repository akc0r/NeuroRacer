"use client";

// ────────────────────────────────────────────
// Simulation controls panel (play/stop/reset)
// ────────────────────────────────────────────

import { useState, useRef } from "react";
import { CONFIG, updateConfig } from "@/lib/config";
import { Play, Square, RotateCcw, Dna, Users, Zap, Shuffle, Save, Upload, Download, FastForward } from "lucide-react";
import { useBrainStorage } from "@/hooks/useBrainStorage";
import { NeuralNetwork } from "@/lib/simulation/NeuralNetwork";

interface Props {
  onStart: (brain?: NeuralNetwork) => void;
  onStop: () => void;
  onReset: () => void;
  onChangeTrack: () => void;
  isRunning: boolean;
  speedMultiplier: number;
  setSpeedMultiplier: (v: number) => void;
  getBestBrain: () => NeuralNetwork | null;
}

export function SimulationControls({
  onStart,
  onStop,
  onReset,
  onChangeTrack,
  isRunning,
  speedMultiplier,
  setSpeedMultiplier,
  getBestBrain
}: Props) {
  const [mutationRate, setMutationRate] = useState(CONFIG.MUTATION_RATE);
  const [populationSize, setPopulationSize] = useState(CONFIG.POPULATION_SIZE);
  const { saveToLocal, loadFromLocal, downloadBrain, uploadBrain } = useBrainStorage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const brain = await uploadBrain(file);
      onReset();
      onStart(brain);
    } catch (err) {
      alert("Failed to load brain from file.");
    }
  };

  return (
    <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-amber-400" />
        <h2 className="text-xs font-mono text-zinc-400 uppercase tracking-widest">
          Simulation Controls
        </h2>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => (isRunning ? onStop() : onStart())}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-mono text-sm font-medium transition-all duration-200 ${
            isRunning
              ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
          }`}
        >
          {isRunning ? (
            <>
              <Square className="w-4 h-4" /> Stop
            </>
          ) : (
            <>
              <Play className="w-4 h-4" /> Start
            </>
          )}
        </button>
        <button
          onClick={onReset}
          disabled={isRunning}
          className="p-2.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Reset"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={onChangeTrack}
          className="p-2.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-indigo-400 hover:border-indigo-500 transition-all duration-200"
          title="New Random Track"
        >
          <Shuffle className="w-4 h-4" />
        </button>
      </div>

      {/* Speed Multiplier */}
      <div className="space-y-2">
        <label className="text-xs text-zinc-400 font-mono flex items-center gap-1.5">
            <FastForward className="w-3 h-3" /> Simulation Speed
        </label>
        <div className="grid grid-cols-4 gap-1.5">
            {[1, 2, 5, 10].map((speed) => (
                <button
                    key={speed}
                    onClick={() => setSpeedMultiplier(speed)}
                    className={`py-1 rounded text-xs font-mono transition-all ${
                        speedMultiplier === speed 
                        ? "bg-amber-500/20 text-amber-400 border py-[3px] border-amber-500/50" 
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300 border border-transparent"
                    }`}
                >
                    {speed}x
                </button>
            ))}
        </div>
      </div>

      {/* Brain Storage */}
      <div className="space-y-2">
        <label className="text-xs text-zinc-400 font-mono flex items-center gap-1.5">
            <Save className="w-3 h-3" /> Brain Management
        </label>
        <div className="grid grid-cols-2 gap-1.5">
            <button
                onClick={() => {
                   const b = getBestBrain();
                   if (b) saveToLocal(b);
                   else alert("No alive cars to save.");
                }}
                className="py-1.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white flex justify-center items-center gap-1"
            >
                <Save className="w-3 h-3" /> Save Best
            </button>
            <button
                onClick={() => {
                   const b = loadFromLocal();
                   if (b) {
                      onReset();
                      onStart(b);
                   }
                }}
                className="py-1.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white flex justify-center items-center gap-1"
            >
                <Upload className="w-3 h-3" /> Load Saved
            </button>
            <button
                onClick={() => {
                   const b = getBestBrain();
                   if (b) downloadBrain(b);
                   else alert("No alive cars to save.");
                }}
                className="py-1.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white flex justify-center items-center gap-1"
            >
                <Download className="w-3 h-3" /> Download
            </button>
            <button
                onClick={() => fileInputRef.current?.click()}
                className="py-1.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white flex justify-center items-center gap-1"
            >
                <Upload className="w-3 h-3" /> Upload JSON
            </button>
            <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleLoadFromFile} />
        </div>
      </div>

      {/* Separator */}
      <div className="h-px bg-zinc-800" />

      {/* Mutation Rate */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs text-zinc-400 font-mono flex items-center gap-1.5">
            <Dna className="w-3 h-3" /> Mutation Rate
          </label>
          <span className="text-xs font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
            {mutationRate.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min={0.01}
          max={0.5}
          step={0.01}
          value={mutationRate}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setMutationRate(v);
            updateConfig({ MUTATION_RATE: v });
          }}
          className="w-full accent-amber-400 h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer"
        />
      </div>

      {/* Population Size */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs text-zinc-400 font-mono flex items-center gap-1.5">
            <Users className="w-3 h-3" /> Population
          </label>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded">
            {populationSize}
          </span>
        </div>
        <input
          type="range"
          min={5}
          max={100}
          step={5}
          value={populationSize}
          onChange={(e) => {
            const v = parseInt(e.target.value);
            setPopulationSize(v);
            updateConfig({ POPULATION_SIZE: v });
          }}
          className="w-full accent-cyan-400 h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer"
        />
      </div>
    </div>
  );
}
