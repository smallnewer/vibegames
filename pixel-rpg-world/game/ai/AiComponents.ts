import type { EntityId } from "../core/World";
import type { AbilitySlot } from "../content/Definitions";

export interface PendingAiCast {
  slot: AbilitySlot;
  ability: string;
  target: EntityId;
  targetX: number;
  targetZ: number;
  timeLeft: number;
  duration: number;
  recoverySeconds: number;
  abilityEpoch?: number;
}

export interface AiStateComponent {
  homeX: number;
  homeZ: number;
  target?: EntityId;
  thinkLeft: number;
  targetSwitchLeft: number;
  recoveryLeft: number;
  moveX: number;
  moveZ: number;
  threat: Map<EntityId, number>;
  phaseAbilityEpoch?: number;
  phaseActionUses: Map<AbilitySlot, number>;
  pendingCast?: PendingAiCast;
}
