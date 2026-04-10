import { SimulationCanvas } from "@/components/simulation/SimulationCanvas";

export default function HomePage() {
  return (
    <div className="h-[calc(100vh-48px)] bg-zinc-950">
      <SimulationCanvas />
    </div>
  );
}
