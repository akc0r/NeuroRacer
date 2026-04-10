"use client";

// ──────────────────────────────────────────
// Main simulation hook — game loop + GA
// ──────────────────────────────────────────

import { useRef, useState, useCallback } from "react";
import { NeuralNetwork } from "@/lib/simulation/NeuralNetwork";
import { Car } from "@/lib/simulation/Car";
import { Track } from "@/lib/simulation/Track";
import { nextGeneration } from "@/lib/simulation/GeneticAlgorithm";
import { drawTrack, drawCar } from "@/lib/simulation/Renderer";
import { CONFIG } from "@/lib/config";
import { api } from "@/lib/api";
import type { SimStats, FitnessDataPoint } from "@/types";

export function useSimulation(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const carsRef = useRef<Car[]>([]);
  const brainsRef = useRef<NeuralNetwork[]>([]);
  const trackRef = useRef<Track | null>(null);
  const frameRef = useRef(0);
  const genRef = useRef(0);
  const rafRef = useRef<number>(0);
  const runningRef = useRef(false);

  const [stats, setStats] = useState<SimStats>({
    generation: 0,
    aliveCars: 0,
    bestFitness: 0,
    avgFitness: 0,
    frame: 0,
    maxLaps: 0,
  });
  const [fitnessHistory, setFitnessHistory] = useState<FitnessDataPoint[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [speedMultiplier, _setSpeedMultiplier] = useState(1);
  const speedRef = useRef(1);

  const setSpeedMultiplier = useCallback((val: number) => {
    speedRef.current = val;
    _setSpeedMultiplier(val);
  }, []);

  /** Spawn a new generation of cars */
  const spawnGeneration = useCallback((brains: NeuralNetwork[]) => {
    genRef.current++;
    frameRef.current = 0;
    brainsRef.current = brains;
    const track = trackRef.current!;
    const [sx, sy] = track.startPosition;
    const angle = track.startAngle;
    carsRef.current = brains.map((b) => new Car(sx, sy, angle, b));
  }, []);

  /** One frame of the simulation */
  const tick = useCallback(() => {
    if (!runningRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const track = trackRef.current!;

    let cars = carsRef.current;
    
    // Process physics X times per visual frame
    for (let step = 0; step < speedRef.current; step++) {
      frameRef.current++;
      
      let aliveCars = 0;
      for (const car of cars) {
        car.update(track);
        if (car.alive) aliveCars++;
      }

      const allDead = aliveCars === 0;
      const timeout = frameRef.current >= CONFIG.MAX_FRAMES_PER_GEN;

      if (allDead || timeout) {
        const fitnesses = cars.map((c) => c.fitness);
        const newBrains = nextGeneration(brainsRef.current, fitnesses);
        
        let bestGenFitness = 0;
        let totalGenFitness = 0;
        cars.forEach(c => {
           bestGenFitness = Math.max(bestGenFitness, c.fitness);
           totalGenFitness += c.fitness;
        });

        setFitnessHistory((prev) => [
          ...prev,
          {
            generation: genRef.current,
            bestFitness: Math.round(bestGenFitness),
            avgFitness: Math.round(totalGenFitness / cars.length),
          },
        ]);

        const bestIdx = fitnesses.indexOf(Math.max(...fitnesses));
        api
          .saveGeneration({
            generation_number: genRef.current,
            population_size: CONFIG.POPULATION_SIZE,
            best_fitness: bestGenFitness,
            avg_fitness: totalGenFitness / cars.length,
            mutation_rate: CONFIG.MUTATION_RATE,
            best_brain_weights: cars[bestIdx].brain.serialize(),
            checkpoints_passed: Math.max(...cars.map((c) => c.checkpoints)),
            frames_survived: frameRef.current,
          })
          .catch(console.error);

        spawnGeneration(newBrains);
        cars = carsRef.current; // reference new cars
        break; // skip remaining physics steps this frame if we just spawned
      }
    }

    // Now render everything
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTrack(ctx, track);

    let currentBestFitness = 0;
    let currentTotalFitness = 0;
    let currentAliveCars = 0;
    let currentMaxLaps = 0;

    for (const car of cars) {
      if (car.alive) currentAliveCars++;
      currentBestFitness = Math.max(currentBestFitness, car.fitness);
      currentTotalFitness += car.fitness;
      currentMaxLaps = Math.max(currentMaxLaps, car.laps);
    }

    const sortedCars = [...cars].sort((a, b) => b.fitness - a.fitness);
    for (let i = sortedCars.length - 1; i >= 0; i--) {
      drawCar(ctx, sortedCars[i], i);
    }

    setStats({
      generation: genRef.current,
      aliveCars: currentAliveCars,
      bestFitness: Math.round(currentBestFitness),
      avgFitness: Math.round(currentTotalFitness / Math.max(1, cars.length)),
      frame: frameRef.current,
      maxLaps: currentMaxLaps,
    });

    rafRef.current = requestAnimationFrame(tick);
  }, [canvasRef, spawnGeneration]);

  /** Start the simulation */
  const start = useCallback((loadedBrain?: NeuralNetwork) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize track if needed
    if (!trackRef.current) {
        trackRef.current = new Track(canvas.width, canvas.height);
    }

    let initialBrains: NeuralNetwork[];
    if (loadedBrain) {
      // Seed all cars with the loaded brain + mutations
      initialBrains = Array.from(
        { length: CONFIG.POPULATION_SIZE },
        (_, i) => i === 0 ? loadedBrain.clone() : loadedBrain.clone() // one exact copy, others maybe mutate? actually let the GA handle nextgen.
        // Actually slightly better to just use it as all brains, the nextGeneration will mutate them.
      );
    } else {
      initialBrains = Array.from(
        { length: CONFIG.POPULATION_SIZE },
        () =>
          new NeuralNetwork([
            CONFIG.INPUT_COUNT,
            ...CONFIG.HIDDEN_LAYERS,
            CONFIG.OUTPUT_COUNT,
          ])
      );
    }

    runningRef.current = true;
    setIsRunning(true);
    spawnGeneration(initialBrains);
    rafRef.current = requestAnimationFrame(tick);
  }, [canvasRef, spawnGeneration, tick]);

  /** Stop the simulation */
  const stop = useCallback(() => {
    runningRef.current = false;
    setIsRunning(false);
    cancelAnimationFrame(rafRef.current);
  }, []);

  /** Reset everything */
  const reset = useCallback(() => {
    stop();
    genRef.current = 0;
    frameRef.current = 0;
    carsRef.current = [];
    brainsRef.current = [];
    setStats({
      generation: 0,
      aliveCars: 0,
      bestFitness: 0,
      avgFitness: 0,
      frame: 0,
      maxLaps: 0,
    });
    setFitnessHistory([]);

    // Clear the canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [canvasRef, stop]);

  /** Generate a new procedural track */
  const changeTrack = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!trackRef.current) {
       trackRef.current = new Track(canvas.width, canvas.height);
    } else {
       trackRef.current.regenerate(canvas.width, canvas.height);
    }
    // Stop running if currently running, waiting for user to restart
    if (runningRef.current) {
        stop();
    }
    
    // Clear canvas and draw new track immediately
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawTrack(ctx, trackRef.current);
    }
  }, [canvasRef, stop]);

  /** Function to get best brain currently */
  const getBestBrain = useCallback(() => {
      const cars = carsRef.current;
      if (cars.length === 0) return null;
      const sorted = [...cars].sort((a,b) => b.fitness - a.fitness);
      return sorted[0].brain;
  }, []);

  return { start, stop, reset, changeTrack, stats, fitnessHistory, isRunning, speedMultiplier, setSpeedMultiplier, getBestBrain };
}
