import type { EntityId } from "../core/World";
import type { SkillRank } from "../progression/ProgressionComponents";

export interface StatusInstance {
  id: string;
  stacks: number;
  duration: number;
  timeLeft: number;
  source?: EntityId;
  sourceSkillRank?: SkillRank;
  periodicMagnitude?: number;
}

export interface StatusApplication {
  readonly source?: EntityId;
  readonly sourceSkillRank?: SkillRank;
  readonly durationAdd?: number;
  readonly periodicMagnitude?: number;
}

export interface StatusComponent {
  values: StatusInstance[];
}
