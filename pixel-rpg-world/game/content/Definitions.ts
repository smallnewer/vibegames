import type { ActionMotionDef, ActorAction } from "../actor/ActorComponents";
import type { DamageSpec } from "../combat/DamagePacket";

export type ContentId = string;
export type ItemRarity = "normal" | "magic" | "rare" | "unique";
export type AttackTag = "physical" | "fire" | "ice" | "poison" | "storm";
export type WeaponAbilitySlot = "melee" | "ranged";
export const ACTIVE_SKILL_SLOTS = [
  "skill_up",
  "skill_right",
  "skill_down",
  "skill_left",
] as const;
export type ActiveSkillSlot = typeof ACTIVE_SKILL_SLOTS[number];
export type AbilitySlot = WeaponAbilitySlot | ActiveSkillSlot;
export type PassiveSlot = "passive_1" | "passive_2";
export const EQUIPMENT_SLOTS = [
  "head",
  "chest",
  "wrists",
  "legs",
  "feet",
  "melee",
  "ranged",
] as const;
export type EquipmentSlot = typeof EQUIPMENT_SLOTS[number];

export const STAT_NAMES = [
  "might",
  "finesse",
  "vitality",
  "resolve",
  "maxHealth",
  "meleePower",
  "rangedPower",
  "skillPower",
  "moveSpeed",
  "armor",
  "fireResist",
  "iceResist",
  "poisonResist",
  "stormResist",
  "critRating",
  "critDamage",
  "attackSpeed",
  "cooldownRecovery",
  "damageBonus",
  "damageReduction",
  "pickupRadius",
] as const;
export type StatName = typeof STAT_NAMES[number];

export type StatBlock = Record<StatName, number>;
export type StatValues = Partial<Record<StatName, number>>;
export const DEFAULT_STAT_BLOCK: StatBlock = {
  might: 0,
  finesse: 0,
  vitality: 0,
  resolve: 0,
  maxHealth: 1,
  meleePower: 0,
  rangedPower: 0,
  skillPower: 0,
  moveSpeed: 0,
  armor: 0,
  fireResist: 0,
  iceResist: 0,
  poisonResist: 0,
  stormResist: 0,
  critRating: 0,
  critDamage: 1.5,
  attackSpeed: 1,
  cooldownRecovery: 0,
  damageBonus: 0,
  damageReduction: 0,
  pickupRadius: 1.4,
};

export function completeStatBlock(values: StatValues): StatBlock {
  return { ...DEFAULT_STAT_BLOCK, ...values };
}

// 所有来源只描述修正层，最终值统一由 StatSystem 按固定顺序计算。
export interface StatModifierSet {
  readonly flat?: StatValues;
  readonly percent?: StatValues;
  readonly final?: StatValues;
}

export type HealingValue =
  | { type: "flat"; amount: number }
  | { type: "stat"; stat: "maxHealth" | "skillPower"; scale: number };

export type AbilityTag = "weapon" | "movement" | "defense" | "area" | "summon";

export interface RankBonusDef {
  readonly rank: 3 | 5;
  readonly damageMultiplier?: number;
  readonly radiusAdd?: number;
  readonly durationAdd?: number;
  readonly targetCountAdd?: number;
  readonly charges?: 2;
  readonly applyStatus?: ContentId;
  readonly effect?: EffectNode;
}

// 效果节点只有白名单联合类型，内容不能注入任意脚本。
export type EffectNode =
  | { type: "sequence"; children: readonly EffectNode[] }
  | { type: "parallel"; children: readonly EffectNode[] }
  | { type: "delay"; seconds: number; child: EffectNode }
  | { type: "if_targets"; then: EffectNode; otherwise?: EffectNode }
  | { type: "select_self" }
  | { type: "query_melee"; range: number; frontDot: number }
  | { type: "query_circle"; center: "source" | "aim"; radius: number }
  | { type: "query_cone"; range: number; frontDot: number }
  | { type: "query_line"; length: number; width: number }
  | { type: "chain_targets"; range: number; maxTargets: number }
  | { type: "damage"; value: DamageSpec }
  | { type: "heal"; value: HealingValue }
  | {
      type: "spawn_projectile";
      value: DamageSpec;
      speed: number;
      lifetime: number;
      radius: number;
    }
  | {
      type: "apply_status";
      status: ContentId;
      stacks: number;
      durationAdd?: number;
      periodicMagnitude?: number;
    }
  | { type: "remove_status"; status: ContentId }
  | { type: "knockback"; distance: number }
  | { type: "teleport_forward"; distance: number }
  | { type: "summon_actor"; actor: ContentId; count: number; radius: number }
  | {
      type: "spawn_hazard";
      radius: number;
      duration: number;
      interval: number;
      visual: ContentId;
      relation?: "enemy" | "ally";
      child: EffectNode;
    }
  | { type: "spawn_summon"; actor: ContentId; duration: number; maxOwned: number }
  | { type: "repeat"; count: number; interval: number; child: EffectNode }
  | { type: "emit_visual"; visual: ContentId };

export interface AbilityDef {
  readonly id: ContentId;
  readonly name: string;
  readonly slot: WeaponAbilitySlot | "active";
  readonly tags: readonly AbilityTag[];
  readonly cooldown: number;
  readonly charges: 1 | 2;
  readonly action: ActorAction;
  readonly actionTime: number;
  readonly telegraphSeconds: number;
  readonly icon: ContentId;
  readonly visual: ContentId;
  readonly timeline?: {
    readonly impactAt: number;
    readonly motion?: ActionMotionDef;
  };
  readonly effect: EffectNode;
  readonly rankBonuses: readonly RankBonusDef[];
}

export type AbilityDefInput = Omit<
  AbilityDef,
  "tags" | "charges" | "telegraphSeconds" | "icon" | "rankBonuses"
> & Partial<Pick<
  AbilityDef,
  "tags" | "charges" | "telegraphSeconds" | "icon" | "rankBonuses"
>>;

export interface PassiveDef {
  readonly id: ContentId;
  readonly name: string;
  readonly modifiers: StatModifierSet;
  readonly rankModifiers?: readonly [StatModifierSet, StatModifierSet, StatModifierSet];
  readonly onKillStatus?: ContentId;
}

export interface StatusDef {
  id: ContentId;
  name: string;
  duration: number;
  maxStacks: number;
  stacking: "replace" | "refresh" | "stack";
  modifiers: StatModifierSet;
  visual?: ContentId;
}

export interface ItemDef {
  id: ContentId;
  name: string;
  slot: EquipmentSlot;
  visual: ContentId;
  ability?: ContentId;
  rarity?: ItemRarity;
  attackTags?: readonly AttackTag[];
  onHitStatus?: ContentId;
  modifiers: StatModifierSet;
  reinforce?: {
    readonly stat: StatName;
    readonly perLevel: number;
    readonly maxLevel: number;
  };
}
