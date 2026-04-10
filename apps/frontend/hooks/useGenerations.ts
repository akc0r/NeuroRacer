"use client";

// ────────────────────────────────────────
// Hook for fetching generation history
// ────────────────────────────────────────

import useSWR from "swr";
import type { GenerationRecord } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/** Fetch all generations from the backend, auto-refreshing every 5s */
export function useGenerations() {
  const { data, error, isLoading, mutate } = useSWR<GenerationRecord[]>(
    `${BASE_URL}/api/generations`,
    fetcher,
    { refreshInterval: 5000 }
  );

  return {
    generations: data ?? [],
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}
