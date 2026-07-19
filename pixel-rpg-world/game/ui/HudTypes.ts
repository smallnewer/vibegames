import type { ActiveSkillSlot } from "../content/Definitions";
import type { EntityId } from "../core/World";
import type { HeroLifeState } from "../party/DownedComponents";
import type { PlayerSlotId } from "../player/PlayerSlot";

export interface StatusHudModel {
  readonly id: string;
  readonly icon: string;
  readonly stacks: number;
  readonly timeLeft: number;
}

export interface WeaponHudModel {
  readonly id?: string;
  readonly icon: string;
  readonly name: string;
  readonly cooldownLeft: number;
  readonly cooldownRatio: number;
  readonly charges: number;
  readonly maxCharges: number;
  readonly button: "X" | "Y";
}

export interface SkillHudModel {
  readonly id?: string;
  readonly icon?: string;
  readonly name: string;
  readonly cooldownLeft: number;
  readonly cooldownRatio: number;
  readonly charges: number;
  readonly maxCharges: number;
  readonly direction: "up" | "right" | "down" | "left";
}

export interface PlayerHudModel {
  readonly slot: PlayerSlotId;
  readonly actor: EntityId;
  readonly name: string;
  readonly level: number;
  readonly health: number;
  readonly maxHealth: number;
  readonly lifeState: HeroLifeState;
  readonly downedTimeLeft?: number;
  readonly statuses: readonly StatusHudModel[];
  readonly melee: WeaponHudModel;
  readonly ranged: WeaponHudModel;
  readonly rollCooldownRatio: number;
  readonly skills: Readonly<Record<ActiveSkillSlot, SkillHudModel>>;
}

export interface CombatHudModel {
  readonly players: readonly PlayerHudModel[];
  readonly boss?: {
    readonly name: string;
    readonly phaseName: string;
    readonly healthRatio: number;
  };
  readonly objective: {
    readonly id: string;
    readonly text: string;
    readonly current?: number;
    readonly total?: number;
    readonly changedAtTick: number;
  };
  readonly prompt?: {
    readonly action: "interact" | "revive";
    readonly text: string;
    readonly player: PlayerSlotId;
    readonly progress?: number;
  };
}
