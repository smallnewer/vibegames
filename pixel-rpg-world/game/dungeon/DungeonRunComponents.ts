import type { PlayerSlotId } from "../player/PlayerSlot";

export type DungeonRunPhase =
  | "entering"
  | "exploring"
  | "encounter"
  | "elite_reward"
  | "boss_intro"
  | "boss_combat"
  | "reward"
  | "completed"
  | "party_wipe";

export interface DungeonRunComponent {
  definition: string;
  phase: DungeonRunPhase;
  activeEncounter?: string;
  completedEncounters: string[];
  checkpoint?: string;
  claimedRewardPlayers: PlayerSlotId[];
  runSeed: number;
  difficulty: "normal" | "echo";
}

export interface DungeonObjectiveSnapshot {
  readonly id: string;
  readonly current: number;
  readonly total: number;
  readonly text: string;
}
