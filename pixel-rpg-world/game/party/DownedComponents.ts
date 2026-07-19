import type { EntityId } from "../core/World";

export type HeroLifeState = "alive" | "downed" | "dead";

export interface DownedComponent {
  state: HeroLifeState;
  timeLeft: number;
  revivedBy?: EntityId;
  reviveProgress: number;
}
