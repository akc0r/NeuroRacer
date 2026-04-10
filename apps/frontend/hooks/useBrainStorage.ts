"use client";

// ──────────────────────────────────────────────
// Hook for saving/loading brains locally
// ──────────────────────────────────────────────

import { NeuralNetwork } from "@/lib/simulation/NeuralNetwork";

const STORAGE_KEY = "neuroracer_best_brain";

export function useBrainStorage() {
  const saveToLocal = (brain: NeuralNetwork) => {
    try {
      localStorage.setItem(STORAGE_KEY, brain.serialize());
      alert("Brain saved locally!");
    } catch (e) {
      console.error(e);
      alert("Failed to save brain locally.");
    }
  };

  const loadFromLocal = (): NeuralNetwork | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return NeuralNetwork.deserialize(data);
      }
      alert("No brain found in local storage.");
    } catch (e) {
      console.error(e);
      alert("Failed to load brain from local storage.");
    }
    return null;
  };

  const downloadBrain = (brain: NeuralNetwork) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(brain.serialize());
    const el = document.createElement("a");
    el.setAttribute("href", dataStr);
    el.setAttribute("download", `neuroracer_brain_${Date.now()}.json`);
    document.body.appendChild(el);
    el.click();
    el.remove();
  };

  const uploadBrain = (file: File): Promise<NeuralNetwork> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const contents = e.target?.result as string;
          const brain = NeuralNetwork.deserialize(contents);
          resolve(brain);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  return { saveToLocal, loadFromLocal, downloadBrain, uploadBrain };
}
