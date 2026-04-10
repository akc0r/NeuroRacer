"use client";

import { LeaderboardTable } from "@/components/dashboard/LeaderboardTable";
import { Trophy } from "lucide-react";
import { api } from "@/lib/api";
import { useGenerations } from "@/hooks/useGenerations";

export default function LeaderboardPage() {
  const { refresh } = useGenerations();

  async function handleReset() {
    if (!confirm("Are you sure you want to delete all generation data?")) return;
    await api.reset();
    refresh();
  }

  return (
    <div className="min-h-[calc(100vh-48px)] bg-zinc-950 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-400/10 border border-amber-400/20">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Generation History
              </h1>
              <p className="text-sm text-zinc-500 font-mono mt-0.5">
                All recorded generations from your simulations
              </p>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-lg text-xs font-mono text-red-400 border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 transition-all"
          >
            Reset All Data
          </button>
        </div>

        {/* Table */}
        <LeaderboardTable />
      </div>
    </div>
  );
}
