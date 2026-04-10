"use client";

// ────────────────────────────────────────────
// HUD overlay — real-time simulation stats
// ────────────────────────────────────────────

import type { SimStats } from "@/types";
import { Brain, Car, Timer, Trophy, Flag, Zap } from "lucide-react";
import { CONFIG } from "@/lib/config";

interface Props {
  stats: SimStats;
  speedMultiplier: number;
}

export function GenerationHUD({ stats, speedMultiplier }: Props) {
  const progressPct = Math.min(100, Math.round((stats.frame / CONFIG.MAX_FRAMES_PER_GEN) * 100));
  
  return (
    <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none w-48">
      <HUDItem
        icon={<Brain className="w-3.5 h-3.5 text-purple-400" />}
        label="Generation"
        value={`#${stats.generation}`}
        color="text-purple-300"
      />
      <HUDItem
        icon={<Car className="w-3.5 h-3.5 text-cyan-400" />}
        label="Alive"
        value={`${stats.aliveCars}`}
        color="text-cyan-300"
      />
      <HUDItem
        icon={<Trophy className="w-3.5 h-3.5 text-amber-400" />}
        label="Best Fitness"
        value={`${stats.bestFitness}`}
        color="text-amber-300"
      />
      <HUDItem
        icon={<Flag className="w-3.5 h-3.5 text-rose-400" />}
        label="Laps"
        value={`${stats.maxLaps}`}
        color="text-rose-300"
      />
      
      {/* Progress Box */}
      <div className="flex flex-col gap-1.5 bg-black/60 backdrop-blur-md px-3 py-2 rounded-lg border border-zinc-700/50 mt-1">
        <div className="flex justify-between items-center">
            <div className="flex gap-1.5 items-center">
                <Timer className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Frame</span>
            </div>
            <span className="text-xs font-mono font-bold text-zinc-300">{stats.frame} / {CONFIG.MAX_FRAMES_PER_GEN}</span>
        </div>
        <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-purple-500 h-full transition-all duration-300" style={{width: `${progressPct}%`}}></div>
        </div>
      </div>
      
      {speedMultiplier > 1 && (
        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-amber-500/50 mt-1 text-amber-400 w-fit">
          <Zap className="w-3 h-3 fill-amber-400" />
          <span className="text-[10px] font-mono font-bold uppercase">{speedMultiplier}x Speed</span>
        </div>
      )}
    </div>
  );
}

function HUDItem({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-700/50">
      {icon}
      <span className="text-[10px] font-mono text-zinc-500 uppercase">
        {label}
      </span>
      <span className={`text-xs font-mono font-bold ${color}`}>{value}</span>
    </div>
  );
}
