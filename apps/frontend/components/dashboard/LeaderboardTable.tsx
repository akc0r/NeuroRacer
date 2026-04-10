"use client";

// ────────────────────────────────────────────────
// Leaderboard table — all saved generations
// ────────────────────────────────────────────────

import { useGenerations } from "@/hooks/useGenerations";
import { Trophy, Clock, Brain, Activity } from "lucide-react";

export function LeaderboardTable() {
  const { generations, isLoading, isError } = useGenerations();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-red-400 font-mono">
          Failed to load data. Is the backend running?
        </p>
      </div>
    );
  }

  if (generations.length === 0) {
    return (
      <div className="text-center py-10">
        <Brain className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
        <p className="text-sm text-zinc-500 font-mono">
          No generations recorded yet.
        </p>
        <p className="text-xs text-zinc-600 font-mono mt-1">
          Run a simulation to see results here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-sm font-mono">
        <thead>
          <tr className="bg-zinc-900/80 text-zinc-400 text-xs uppercase tracking-wider">
            <th className="px-4 py-3 text-left">#</th>
            <th className="px-4 py-3 text-left">
              <span className="flex items-center gap-1.5">
                <Trophy className="w-3 h-3 text-amber-400" />
                Best Fitness
              </span>
            </th>
            <th className="px-4 py-3 text-left">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-cyan-400" />
                Avg Fitness
              </span>
            </th>
            <th className="px-4 py-3 text-left">Checkpoints</th>
            <th className="px-4 py-3 text-left">Population</th>
            <th className="px-4 py-3 text-left">Mutation</th>
            <th className="px-4 py-3 text-left">Frames</th>
            <th className="px-4 py-3 text-left">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Time
              </span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {generations.map((gen) => (
            <tr
              key={gen.id}
              className="hover:bg-zinc-800/50 transition-colors"
            >
              <td className="px-4 py-3 text-zinc-300">
                {gen.generation_number}
              </td>
              <td className="px-4 py-3 text-amber-400 font-bold">
                {Math.round(gen.best_fitness)}
              </td>
              <td className="px-4 py-3 text-zinc-400">
                {Math.round(gen.avg_fitness)}
              </td>
              <td className="px-4 py-3 text-purple-400">
                {gen.checkpoints_passed}
              </td>
              <td className="px-4 py-3 text-zinc-500">
                {gen.population_size}
              </td>
              <td className="px-4 py-3 text-zinc-500">
                {gen.mutation_rate.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-zinc-500">
                {gen.frames_survived}
              </td>
              <td className="px-4 py-3 text-zinc-600 text-xs">
                {new Date(gen.created_at).toLocaleTimeString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
