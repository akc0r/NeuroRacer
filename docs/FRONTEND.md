# Frontend Documentation

The NeuroRacer frontend is a Modern Next.js application that handles both the 2D game engine and the administration dashboard.

## Technology Stack
- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Styling**: Tailwind CSS
- **Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Animations**: Framer Motion
- **Data Fetching**: SWR / Axios
- **Charts**: Recharts

## Key Components

### `SimulationCanvas.tsx`
The heart of the application. It manages the HTML5 Canvas context and drives the `Renderer` to draw the track and cars.

### `GenerationHUD.tsx`
A high-performance overlay that displays real-time statistics (Current generation, Alive count, Best Fitness) using Framer Motion for smooth transitions.

### `SimulationControls.tsx`
Provides real-time interactive tuning of the simulation parameters:
- **Mutation Rate**: Probability of weight modification.
- **Population Size**: Number of cars spawned per generation.
- **Speeds/Physics**: Constants for acceleration and friction.

## Custom Hooks

### `useSimulation.ts`
Manages the simulation life-cycle:
- Spawning new generations.
- Running the `tick()` function at 60fps.
- Detecting extinction events.
- Synchronizing results with the backend API.

## Design System
The UI follows a strict **Dark Zinc** theme, using contrasting colors for simulation actors:
- **Track Walls**: Purple
- **Best Car**: Amber (Gold)
- **Standard Cars**: Cyan-to-Red gradient based on speed.
