import type { InteractionState } from "./DungeonDefinitions";

export interface DungeonStateComponent {
  definition: string;
  resources: Record<string, number>;
  encounter: "idle" | "active" | "completed";
  door: "locked" | "open";
  portalUses: number;
}

export interface InteractableComponent {
  definition: string;
  state: InteractionState;
}

export interface EncounterMemberComponent {
  encounter: string;
  member?: string;
  eliteAffix?: string;
}
