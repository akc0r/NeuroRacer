"use client";

// ──────────────────────────────────────────
// Fitness history chart (best + average)
// ──────────────────────────────────────────

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { FitnessDataPoint } from "@/types";
import { TrendingUp } from "lucide-react";

interface Props {
  data: FitnessDataPoint[];
}

export function GenerationChart({ data }: Props) {
  return (
    <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-xl p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-amber-400" />
        <h2 className="text-xs font-mono text-zinc-400 uppercase tracking-widest">
          Fitness History
        </h2>
      </div>

      {/* Legend */}
      <div className="flex gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="text-[10px] font-mono text-zinc-500">Best</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-500" />
          <span className="text-[10px] font-mono text-zinc-500">Average</span>
        </div>
      </div>

      {/* Chart */}
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data}>
            <XAxis
              dataKey="generation"
              stroke="#52525b"
              tick={{ fontSize: 10 }}
            />
            <YAxis stroke="#52525b" tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                background: "#18181b",
                border: "1px solid #3f3f46",
                borderRadius: 8,
                fontSize: 11,
                fontFamily: "monospace",
              }}
              labelStyle={{ color: "#a1a1aa" }}
            />
            <Line
              type="monotone"
              dataKey="bestFitness"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              name="Best"
            />
            <Line
              type="monotone"
              dataKey="avgFitness"
              stroke="#6b7280"
              strokeWidth={1.5}
              dot={false}
              name="Avg"
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[160px] flex items-center justify-center">
          <p className="text-xs font-mono text-zinc-600">
            Start the simulation to see data
          </p>
        </div>
      )}
    </div>
  );
}
