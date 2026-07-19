import type { ActiveSkillSlot, EquipmentSlot, PassiveSlot } from "../content/Definitions";
import type { ItemInstance, MaterialId } from "../item/ItemComponents";
import type { PrimaryAttribute } from "../progression/ProgressionComponents";

export type HeroSaveId = "hero_1" | "hero_2";
export type ScreenShakeLevel = 0 | 0.5 | 1;

export interface GameSettingsV1 {
  readonly hudScale: number;
  readonly reducedFlash: boolean;
  readonly screenShake: ScreenShakeLevel;
  readonly damageNumbers: boolean;
}

export interface HeroSaveV1 {
  readonly archetype: string;
  readonly level: number;
  readonly experience: number;
  readonly allocated: Record<PrimaryAttribute, number>;
  readonly unspentAttributes: number;
  readonly unspentSkills: number;
  readonly skillRanks: Record<string, number>;
  readonly unlockedAbilities: readonly string[];
  readonly loadout: Record<ActiveSkillSlot, string | null>;
  readonly passives: Record<PassiveSlot, string | null>;
  readonly inventory: readonly ItemInstance[];
  readonly recovery: readonly ItemInstance[];
  readonly equipment: Partial<Record<EquipmentSlot, number>>;
  readonly materials: Record<MaterialId, number>;
  readonly nextItemId: number;
}

export interface SaveGameV1 {
  readonly version: 1;
  readonly profileId: "local";
  readonly world: {
    readonly unlockedDungeons: readonly string[];
    readonly firstClearBosses: readonly string[];
    readonly difficulty: "normal" | "echo";
  };
  readonly heroes: Record<HeroSaveId, HeroSaveV1>;
  readonly settings: GameSettingsV1;
  readonly savedAt: number;
}
