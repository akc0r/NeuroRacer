# 🏎️ AI Racing — Neuroevolution Full-Stack

> Simulation de conduite autonome par algorithme génétique.  
> **Frontend** : Next.js 14 · TypeScript · Tailwind CSS · shadcn/ui · Framer Motion  
> **Backend** : FastAPI · Python · SQLite · SQLModel

---

## 📖 Table of Contents

1. [Architecture](#architecture)
2. [Structure du monorepo](#structure-du-monorepo)
3. [Backend — FastAPI](#backend--fastapi)
   - [Installation](#installation-backend)
   - [Modèles de données](#modèles-de-données)
   - [Endpoints REST](#endpoints-rest)
   - [Code des routes](#code-des-routes)
4. [Frontend — Next.js](#frontend--nextjs)
   - [Installation](#installation-frontend)
   - [Structure des pages & composants](#structure-des-pages--composants)
   - [Le moteur de simulation (client-side)](#le-moteur-de-simulation-client-side)
   - [Composants shadcn utilisés](#composants-shadcn-utilisés)
   - [Appels API depuis le frontend](#appels-api-depuis-le-frontend)
5. [Configuration partagée](#configuration-partagée)
6. [Lancer le projet](#lancer-le-projet)
7. [Variables d'environnement](#variables-denvironnement)
8. [Déploiement](#déploiement)

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                     NAVIGATEUR                      │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │         Next.js App (Client Side)           │   │
│  │                                             │   │
│  │  ┌──────────────┐   ┌──────────────────┐   │   │
│  │  │ Canvas Sim   │   │   shadcn/ui HUD  │   │   │
│  │  │ (NN + GA)    │ ←→│   Stats/Controls │   │   │
│  │  └──────────────┘   └──────────────────┘   │   │
│  │           │                                 │   │
│  │    fetch() / axios                          │   │
│  └───────────┼─────────────────────────────────┘   │
└──────────────┼──────────────────────────────────────┘
               │  HTTP REST (JSON)
               ▼
┌──────────────────────────────┐
│      FastAPI Backend         │
│                              │
│  POST /api/generations       │  ← save best brain + stats
│  GET  /api/generations       │  ← history list
│  GET  /api/generations/best  │  ← best brain ever
│  DELETE /api/reset           │  ← wipe all data
│                              │
│  SQLite (SQLModel ORM)       │
└──────────────────────────────┘
```

**Règle clé :** La simulation (réseau de neurones, raycasts, algorithme génétique) tourne **100% côté client** dans le navigateur. Le backend est uniquement une couche de **persistance** — il n'exécute aucune logique de simulation.

---

## Structure du monorepo

```
ai-racing/
│
├── apps/
│   ├── frontend/                  # Next.js 14 App Router
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx           # Page principale avec la simulation
│   │   │   ├── leaderboard/
│   │   │   │   └── page.tsx       # Historique des générations
│   │   │   └── api/               # Route handlers Next.js (proxy optionnel)
│   │   ├── components/
│   │   │   ├── simulation/
│   │   │   │   ├── SimulationCanvas.tsx   # Canvas + game loop
│   │   │   │   ├── SimulationControls.tsx # Sliders, boutons
│   │   │   │   └── GenerationHUD.tsx      # Overlay stats temps réel
│   │   │   ├── dashboard/
│   │   │   │   ├── GenerationChart.tsx    # Courbe fitness par génération
│   │   │   │   ├── LeaderboardTable.tsx   # shadcn Table
│   │   │   │   └── BrainViewer.tsx        # Visualisation réseau de neurones
│   │   │   └── ui/                        # Composants shadcn (auto-générés)
│   │   ├── lib/
│   │   │   ├── simulation/
│   │   │   │   ├── NeuralNetwork.ts
│   │   │   │   ├── GeneticAlgorithm.ts
│   │   │   │   ├── Car.ts
│   │   │   │   ├── Track.ts
│   │   │   │   └── Renderer.ts
│   │   │   ├── api.ts             # Client API vers FastAPI
│   │   │   └── config.ts          # Paramètres de simulation
│   │   ├── hooks/
│   │   │   ├── useSimulation.ts   # Hook principal de la simulation
│   │   │   └── useGenerations.ts  # Hook SWR pour l'historique
│   │   ├── types/
│   │   │   └── index.ts           # Types partagés
│   │   ├── tailwind.config.ts
│   │   ├── next.config.ts
│   │   └── package.json
│   │
│   └── backend/                   # FastAPI
│       ├── main.py
│       ├── models.py
│       ├── routes/
│       │   ├── generations.py
│       │   └── health.py
│       ├── database.py
│       ├── requirements.txt
│       └── .env
│
├── packages/
│   └── shared-types/              # Types TS partagés (optionnel)
│       └── index.ts
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Backend — FastAPI

### Installation Backend

```bash
cd apps/backend

# Créer un environnement virtuel
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

# Installer les dépendances
pip install fastapi uvicorn sqlmodel python-dotenv

# Sauvegarder
pip freeze > requirements.txt

# Lancer le serveur
uvicorn main:app --reload --port 8000
```

La doc interactive Swagger sera disponible sur `http://localhost:8000/docs`.

---

### Modèles de données

**`apps/backend/models.py`**

```python
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
import json

class GenerationBase(SQLModel):
    generation_number: int
    population_size: int
    best_fitness: float
    avg_fitness: float
    mutation_rate: float
    best_brain_weights: str          # JSON sérialisé des poids du meilleur réseau
    checkpoints_passed: int
    frames_survived: int

class Generation(GenerationBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class GenerationCreate(GenerationBase):
    pass

class GenerationRead(GenerationBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
```

---

### Endpoints REST

| Méthode  | Route                        | Description                            |
|----------|------------------------------|----------------------------------------|
| `GET`    | `/health`                    | Sanity check                           |
| `POST`   | `/api/generations`           | Sauvegarder une génération             |
| `GET`    | `/api/generations`           | Lister toutes les générations          |
| `GET`    | `/api/generations/best`      | Récupérer le meilleur cerveau          |
| `GET`    | `/api/generations/{id}`      | Détail d'une génération                |
| `DELETE` | `/api/reset`                 | Effacer toutes les données             |

---

### Code des routes

**`apps/backend/database.py`**

```python
from sqlmodel import create_engine, Session, SQLModel

DATABASE_URL = "sqlite:///./ai_racing.db"
engine = create_engine(DATABASE_URL, echo=True)

def create_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
```

**`apps/backend/routes/generations.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import Generation, GenerationCreate, GenerationRead

router = APIRouter(prefix="/api/generations", tags=["generations"])

@router.post("/", response_model=GenerationRead)
def save_generation(data: GenerationCreate, session: Session = Depends(get_session)):
    gen = Generation.from_orm(data)
    session.add(gen)
    session.commit()
    session.refresh(gen)
    return gen

@router.get("/", response_model=list[GenerationRead])
def list_generations(session: Session = Depends(get_session)):
    return session.exec(select(Generation).order_by(Generation.generation_number)).all()

@router.get("/best", response_model=GenerationRead)
def get_best(session: Session = Depends(get_session)):
    result = session.exec(
        select(Generation).order_by(Generation.best_fitness.desc()).limit(1)
    ).first()
    if not result:
        raise HTTPException(status_code=404, detail="No generations saved yet")
    return result

@router.get("/{gen_id}", response_model=GenerationRead)
def get_generation(gen_id: int, session: Session = Depends(get_session)):
    gen = session.get(Generation, gen_id)
    if not gen:
        raise HTTPException(status_code=404, detail="Generation not found")
    return gen
```

**`apps/backend/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_db
from routes import generations

app = FastAPI(title="AI Racing API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db()

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(generations.router)
```

---

## Frontend — Next.js

### Installation Frontend

```bash
cd apps/frontend

# Créer le projet Next.js
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*"

# Initialiser shadcn/ui
npx shadcn@latest init
# Choisir : Default style, Zinc color, CSS variables: yes

# Ajouter les composants shadcn nécessaires
npx shadcn@latest add button card slider badge table tabs
npx shadcn@latest add chart tooltip separator progress

# Dépendances supplémentaires
npm install framer-motion swr axios recharts lucide-react
```

---

### Structure des pages & composants

**`app/page.tsx`** — Page principale

```tsx
import { SimulationCanvas } from "@/components/simulation/SimulationCanvas";
import { SimulationControls } from "@/components/simulation/SimulationControls";
import { GenerationHUD } from "@/components/simulation/GenerationHUD";
import { GenerationChart } from "@/components/dashboard/GenerationChart";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white font-mono">
      <div className="grid grid-cols-[1fr_380px] h-screen gap-0">
        {/* Zone principale — simulation */}
        <div className="relative flex items-center justify-center bg-zinc-900 border-r border-zinc-800">
          <SimulationCanvas />
          <GenerationHUD />
        </div>

        {/* Panneau latéral — contrôles + stats */}
        <aside className="flex flex-col gap-4 p-6 overflow-y-auto bg-zinc-950">
          <SimulationControls />
          <GenerationChart />
        </aside>
      </div>
    </main>
  );
}
```

**`app/leaderboard/page.tsx`**

```tsx
import { LeaderboardTable } from "@/components/dashboard/LeaderboardTable";

export default function LeaderboardPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-8 tracking-tight">
        Generation History
      </h1>
      <LeaderboardTable />
    </main>
  );
}
```

---

### Le moteur de simulation (client-side)

**`lib/simulation/NeuralNetwork.ts`**

```typescript
export type Weights = number[][][];  // [layer][neuron][weight]

export class NeuralNetwork {
  weights: Weights;
  biases: number[][];
  layerSizes: number[];

  constructor(layerSizes: number[]) {
    this.layerSizes = layerSizes;
    this.weights = [];
    this.biases = [];
    for (let i = 0; i < layerSizes.length - 1; i++) {
      this.weights.push(
        Array.from({ length: layerSizes[i + 1] }, () =>
          Array.from({ length: layerSizes[i] }, () => Math.random() * 2 - 1)
        )
      );
      this.biases.push(
        Array.from({ length: layerSizes[i + 1] }, () => Math.random() * 2 - 1)
      );
    }
  }

  forward(inputs: number[]): number[] {
    let current = inputs;
    for (let l = 0; l < this.weights.length; l++) {
      current = this.biases[l].map((bias, j) => {
        const sum = this.weights[l][j].reduce(
          (acc, w, i) => acc + w * current[i], bias
        );
        return Math.tanh(sum);
      });
    }
    return current; // [steering, throttle]
  }

  clone(): NeuralNetwork {
    const copy = new NeuralNetwork([]);
    copy.layerSizes = [...this.layerSizes];
    copy.weights = this.weights.map(l => l.map(row => [...row]));
    copy.biases  = this.biases.map(l => [...l]);
    return copy;
  }

  serialize(): string {
    return JSON.stringify({ weights: this.weights, biases: this.biases, layerSizes: this.layerSizes });
  }

  static deserialize(json: string): NeuralNetwork {
    const { weights, biases, layerSizes } = JSON.parse(json);
    const net = new NeuralNetwork([]);
    net.weights = weights;
    net.biases = biases;
    net.layerSizes = layerSizes;
    return net;
  }
}
```

**`lib/simulation/GeneticAlgorithm.ts`**

```typescript
import { NeuralNetwork } from "./NeuralNetwork";
import { CONFIG } from "@/lib/config";

export function nextGeneration(
  brains: NeuralNetwork[],
  fitnesses: number[]
): NeuralNetwork[] {
  // Trier par fitness décroissante
  const ranked = fitnesses
    .map((f, i) => ({ f, i }))
    .sort((a, b) => b.f - a.f);

  const newBrains: NeuralNetwork[] = [];

  // Élitisme : conserver les meilleurs sans mutation
  for (let i = 0; i < CONFIG.ELITISM; i++) {
    newBrains.push(brains[ranked[i].i].clone());
  }

  // Remplir la population par mutation des meilleurs
  while (newBrains.length < CONFIG.POPULATION_SIZE) {
    const parentIdx = ranked[Math.floor(Math.random() * CONFIG.ELITISM)].i;
    const child = brains[parentIdx].clone();
    mutate(child);
    newBrains.push(child);
  }

  return newBrains;
}

function mutate(net: NeuralNetwork): void {
  for (const layer of net.weights) {
    for (const row of layer) {
      for (let i = 0; i < row.length; i++) {
        if (Math.random() < CONFIG.MUTATION_RATE) {
          row[i] += (Math.random() * 2 - 1) * CONFIG.MUTATION_STRENGTH;
        }
      }
    }
  }
}
```

**`lib/simulation/Car.ts`**

```typescript
import { NeuralNetwork } from "./NeuralNetwork";
import { Track } from "./Track";
import { CONFIG } from "@/lib/config";

export interface CarState {
  x: number;
  y: number;
  angle: number;
  speed: number;
  alive: boolean;
  fitness: number;
  sensors: number[];
  checkpoints: number;
}

export class Car {
  x: number;
  y: number;
  angle: number;
  speed: number = 0;
  alive: boolean = true;
  fitness: number = 0;
  checkpoints: number = 0;
  sensors: number[];
  brain: NeuralNetwork;
  idleFrames: number = 0;

  constructor(x: number, y: number, brain: NeuralNetwork) {
    this.x = x;
    this.y = y;
    this.angle = -Math.PI / 2; // Pointe vers le haut
    this.sensors = new Array(CONFIG.RAY_COUNT).fill(1);
    this.brain = brain;
  }

  update(track: Track): void {
    if (!this.alive) return;

    this.castRays(track);

    const [steer, throttle] = this.brain.forward(this.sensors);
    this.angle += steer * CONFIG.TURN_SPEED;
    this.speed += throttle * CONFIG.ACCELERATION;
    this.speed = Math.max(-CONFIG.MAX_SPEED / 2,
                          Math.min(CONFIG.MAX_SPEED, this.speed));
    this.speed *= (1 - CONFIG.FRICTION);

    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;

    if (this.collidesWithWall(track)) {
      this.alive = false;
      return;
    }

    this.checkPassedCheckpoints(track);

    // Pénaliser les voitures qui restent immobiles
    if (Math.abs(this.speed) < 0.3) {
      this.idleFrames++;
      if (this.idleFrames > 60) this.alive = false;
    } else {
      this.idleFrames = 0;
    }

    this.fitness += Math.max(0, this.speed);
  }

  private castRays(track: Track): void {
    const spread = CONFIG.RAY_SPREAD;
    for (let i = 0; i < CONFIG.RAY_COUNT; i++) {
      const rayAngle = this.angle - spread / 2 + (spread / (CONFIG.RAY_COUNT - 1)) * i;
      this.sensors[i] = track.raycast(this.x, this.y, rayAngle, CONFIG.RAY_LENGTH);
    }
  }

  private collidesWithWall(track: Track): boolean {
    return track.isOutside(this.x, this.y);
  }

  private checkPassedCheckpoints(track: Track): void {
    const next = track.checkpoints[this.checkpoints % track.checkpoints.length];
    const dist = Math.hypot(this.x - next.x, this.y - next.y);
    if (dist < 30) {
      this.checkpoints++;
      this.fitness += CONFIG.CHECKPOINT_REWARD;
    }
  }
}
```

**`hooks/useSimulation.ts`**

```typescript
"use client";

import { useRef, useState, useCallback } from "react";
import { NeuralNetwork } from "@/lib/simulation/NeuralNetwork";
import { Car } from "@/lib/simulation/Car";
import { Track } from "@/lib/simulation/Track";
import { nextGeneration } from "@/lib/simulation/GeneticAlgorithm";
import { CONFIG } from "@/lib/config";
import { api } from "@/lib/api";

export interface SimStats {
  generation: number;
  aliveCars: number;
  bestFitness: number;
  avgFitness: number;
  frame: number;
}

export function useSimulation(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const carsRef = useRef<Car[]>([]);
  const brainsRef = useRef<NeuralNetwork[]>([]);
  const trackRef = useRef<Track>(new Track());
  const frameRef = useRef(0);
  const genRef = useRef(0);
  const rafRef = useRef<number>(0);
  const [stats, setStats] = useState<SimStats>({
    generation: 0, aliveCars: 0, bestFitness: 0, avgFitness: 0, frame: 0
  });

  const spawnGeneration = useCallback((brains: NeuralNetwork[]) => {
    genRef.current++;
    frameRef.current = 0;
    brainsRef.current = brains;
    const [sx, sy] = trackRef.current.startPosition;
    carsRef.current = brains.map(b => new Car(sx, sy, b));
  }, []);

  const tick = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const track = trackRef.current;

    frameRef.current++;
    const cars = carsRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    track.draw(ctx);

    let aliveCars = 0;
    let bestFitness = 0;
    let totalFitness = 0;

    for (const car of cars) {
      car.update(track);
      if (car.alive) aliveCars++;
      bestFitness = Math.max(bestFitness, car.fitness);
      totalFitness += car.fitness;
    }

    // Dessiner les voitures (meilleures en premier)
    [...cars]
      .sort((a, b) => b.fitness - a.fitness)
      .forEach((car, i) => track.drawCar(ctx, car, i));

    const avgFitness = totalFitness / cars.length;

    setStats({
      generation: genRef.current,
      aliveCars,
      bestFitness: Math.round(bestFitness),
      avgFitness: Math.round(avgFitness),
      frame: frameRef.current,
    });

    const allDead = aliveCars === 0;
    const timeout = frameRef.current >= CONFIG.MAX_FRAMES_PER_GEN;

    if (allDead || timeout) {
      const fitnesses = cars.map(c => c.fitness);
      const newBrains = nextGeneration(brainsRef.current, fitnesses);

      // Sauvegarder sur le backend
      api.saveGeneration({
        generation_number: genRef.current,
        population_size: CONFIG.POPULATION_SIZE,
        best_fitness: bestFitness,
        avg_fitness: avgFitness,
        mutation_rate: CONFIG.MUTATION_RATE,
        best_brain_weights: cars[fitnesses.indexOf(Math.max(...fitnesses))].brain.serialize(),
        checkpoints_passed: Math.max(...cars.map(c => c.checkpoints)),
        frames_survived: frameRef.current,
      }).catch(console.error); // Non-bloquant

      spawnGeneration(newBrains);
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [canvasRef, spawnGeneration]);

  const start = useCallback(() => {
    const initialBrains = Array.from(
      { length: CONFIG.POPULATION_SIZE },
      () => new NeuralNetwork([CONFIG.INPUT_COUNT, ...CONFIG.HIDDEN_LAYERS, CONFIG.OUTPUT_COUNT])
    );
    spawnGeneration(initialBrains);
    rafRef.current = requestAnimationFrame(tick);
  }, [spawnGeneration, tick]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
  }, []);

  return { start, stop, stats };
}
```

---

### Composants shadcn utilisés

**`components/simulation/SimulationControls.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Play, Square, RotateCcw } from "lucide-react";
import { CONFIG, updateConfig } from "@/lib/config";

interface Props {
  onStart: () => void;
  onStop: () => void;
  isRunning: boolean;
}

export function SimulationControls({ onStart, onStop, isRunning }: Props) {
  const [mutationRate, setMutationRate] = useState(CONFIG.MUTATION_RATE);
  const [populationSize, setPopulationSize] = useState(CONFIG.POPULATION_SIZE);

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-mono text-zinc-400 uppercase tracking-widest">
          Simulation Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Boutons Play/Stop */}
        <div className="flex gap-2">
          <Button
            onClick={isRunning ? onStop : onStart}
            variant={isRunning ? "destructive" : "default"}
            className="flex-1"
          >
            {isRunning ? <><Square className="w-4 h-4 mr-2" />Stop</> : <><Play className="w-4 h-4 mr-2" />Start</>}
          </Button>
          <Button variant="outline" size="icon" disabled={isRunning}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        <Separator className="bg-zinc-800" />

        {/* Mutation Rate */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-xs text-zinc-400 font-mono">Mutation Rate</label>
            <Badge variant="outline" className="font-mono text-xs">
              {mutationRate.toFixed(2)}
            </Badge>
          </div>
          <Slider
            value={[mutationRate]}
            min={0.01} max={0.5} step={0.01}
            onValueChange={([v]) => { setMutationRate(v); updateConfig({ MUTATION_RATE: v }); }}
            className="w-full"
          />
        </div>

        {/* Population Size */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-xs text-zinc-400 font-mono">Population</label>
            <Badge variant="outline" className="font-mono text-xs">
              {populationSize}
            </Badge>
          </div>
          <Slider
            value={[populationSize]}
            min={5} max={100} step={5}
            onValueChange={([v]) => { setPopulationSize(v); updateConfig({ POPULATION_SIZE: v }); }}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
}
```

**`components/dashboard/GenerationChart.tsx`**

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: { generation: number; bestFitness: number; avgFitness: number }[];
}

export function GenerationChart({ data }: Props) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-mono text-zinc-400 uppercase tracking-widest">
          Fitness History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data}>
            <XAxis dataKey="generation" stroke="#52525b" tick={{ fontSize: 10 }} />
            <YAxis stroke="#52525b" tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 6 }}
              labelStyle={{ color: "#a1a1aa" }}
            />
            <Line type="monotone" dataKey="bestFitness" stroke="#f59e0b" strokeWidth={2} dot={false} name="Best" />
            <Line type="monotone" dataKey="avgFitness" stroke="#6b7280" strokeWidth={1.5} dot={false} name="Avg" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

---

### Appels API depuis le frontend

**`lib/api.ts`**

```typescript
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface SaveGenerationPayload {
  generation_number: number;
  population_size: number;
  best_fitness: number;
  avg_fitness: number;
  mutation_rate: number;
  best_brain_weights: string;
  checkpoints_passed: number;
  frames_survived: number;
}

export const api = {
  saveGeneration: async (payload: SaveGenerationPayload) => {
    const res = await fetch(`${BASE_URL}/api/generations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to save generation");
    return res.json();
  },

  getGenerations: async () => {
    const res = await fetch(`${BASE_URL}/api/generations`);
    return res.json();
  },

  getBestBrain: async () => {
    const res = await fetch(`${BASE_URL}/api/generations/best`);
    if (res.status === 404) return null;
    return res.json();
  },

  reset: async () => {
    await fetch(`${BASE_URL}/api/reset`, { method: "DELETE" });
  },
};
```

---

## Configuration partagée

**`lib/config.ts`**

```typescript
export interface SimConfig {
  POPULATION_SIZE: number;
  ELITISM: number;
  MUTATION_RATE: number;
  MUTATION_STRENGTH: number;
  INPUT_COUNT: number;
  HIDDEN_LAYERS: number[];
  OUTPUT_COUNT: number;
  MAX_SPEED: number;
  ACCELERATION: number;
  FRICTION: number;
  TURN_SPEED: number;
  RAY_COUNT: number;
  RAY_LENGTH: number;
  RAY_SPREAD: number;
  MAX_FRAMES_PER_GEN: number;
  CHECKPOINT_REWARD: number;
}

export let CONFIG: SimConfig = {
  POPULATION_SIZE: 30,
  ELITISM: 2,
  MUTATION_RATE: 0.1,
  MUTATION_STRENGTH: 0.2,
  INPUT_COUNT: 5,
  HIDDEN_LAYERS: [6],
  OUTPUT_COUNT: 2,
  MAX_SPEED: 4,
  ACCELERATION: 0.2,
  FRICTION: 0.05,
  TURN_SPEED: 0.03,
  RAY_COUNT: 5,
  RAY_LENGTH: 150,
  RAY_SPREAD: Math.PI,
  MAX_FRAMES_PER_GEN: 1500,
  CHECKPOINT_REWARD: 100,
};

// Permet de modifier la config à chaud depuis les sliders UI
export function updateConfig(patch: Partial<SimConfig>) {
  CONFIG = { ...CONFIG, ...patch };
}
```

---

## Lancer le projet

### Développement (deux terminaux)

```bash
# Terminal 1 — Backend
cd apps/backend
source venv/bin/activate
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd apps/frontend
npm run dev
```

Frontend : `http://localhost:3000`  
API docs  : `http://localhost:8000/docs`

### Avec Docker Compose

```yaml
# docker-compose.yml
services:
  backend:
    build: ./apps/backend
    ports:
      - "8000:8000"
    volumes:
      - ./apps/backend:/app
      - sqlite_data:/app/data

  frontend:
    build: ./apps/frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
    depends_on:
      - backend

volumes:
  sqlite_data:
```

```bash
docker-compose up --build
```

---

## Variables d'environnement

**`apps/frontend/.env.local`**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**`apps/backend/.env`**
```env
DATABASE_URL=sqlite:///./ai_racing.db
CORS_ORIGINS=http://localhost:3000
```

---

## Déploiement

| Service       | Frontend (Next.js) | Backend (FastAPI)     |
|---------------|--------------------|-----------------------|
| **Gratuit**   | Vercel             | Railway / Render      |
| **Payant**    | Vercel Pro         | Fly.io / AWS          |
| **Self-host** | Docker + Nginx     | Docker + Nginx        |

### Vercel (frontend)

```bash
cd apps/frontend
npx vercel --prod
# Ajouter NEXT_PUBLIC_API_URL dans les env vars Vercel
```

### Railway (backend)

1. Connecter le repo GitHub à Railway
2. Sélectionner `apps/backend` comme root directory
3. Start command : `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Ajouter `DATABASE_URL` et `CORS_ORIGINS` dans les variables d'environnement

---

*La simulation tourne dans le navigateur. Le backend ne dort jamais.*