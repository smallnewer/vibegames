import type { ActorFaction } from "../actor/ActorComponents";
import type { EffectNode } from "../content/Definitions";
import type { EntityId } from "../core/World";
import type { SkillRank } from "../progression/ProgressionComponents";

export interface HazardComponent {
  owner: EntityId;
  faction: ActorFaction;
  x: number;
  z: number;
  radius: number;
  timeLeft: number;
  interval: number;
  tickLeft: number;
  child: EffectNode;
  visual: string;
  relation: "enemy" | "ally";
  skillId: string;
  actionSequence: number;
  skillRank?: SkillRank;
}

export interface HazardSpawnRequest {
  source: EntityId;
  x: number;
  z: number;
  radius: number;
  duration: number;
  interval: number;
  child: EffectNode;
  visual: string;
  relation?: "enemy" | "ally";
  skillId: string;
  actionSequence: number;
  skillRank?: SkillRank;
}
