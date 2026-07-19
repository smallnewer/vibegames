import type { EntityId } from "../core/World";

export interface EncounterRuntimeComponent {
  definition: string;
  state: "idle" | "active" | "completed";
  waveIndex: number;
  nextWaveIn: number;
  members: EntityId[];
  partySizeAtStart: 1 | 2 | 3 | 4;
  baseLevel: number;
}
