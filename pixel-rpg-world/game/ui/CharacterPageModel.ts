import type { StatBreakdown } from "../actor/Stats";
import { armorMitigation, critChance } from "../combat/CombatRatings";
import type { StatName } from "../content/Definitions";
import type { GameSnapshot } from "../core/GameSnapshot";
import type { PlayerSlotId } from "../player/PlayerSlot";
import type { PrimaryAttribute } from "../progression/ProgressionComponents";

export interface CharacterPageContext {
  readonly inDungeon: boolean;
}

export interface CharacterAttributeRow {
  readonly id: PrimaryAttribute;
  readonly label: string;
  readonly value: number;
  readonly focusId: string;
  readonly canAllocate: boolean;
}

export interface CharacterStatRow {
  readonly id: StatName | "critChance";
  readonly label: string;
  readonly formatted: string;
  readonly detail?: string;
  readonly source: StatBreakdown;
}

export interface CharacterStatSection {
  readonly id: "offense" | "defense" | "utility";
  readonly label: string;
  readonly rows: readonly CharacterStatRow[];
}

export interface CharacterPageModel {
  readonly level: number;
  readonly experience: number;
  readonly xpToNext: number;
  readonly unspentAttributes: number;
  readonly attributes: readonly CharacterAttributeRow[];
  readonly sections: readonly CharacterStatSection[];
  readonly reset: {
    readonly focusId: "character:reset";
    readonly enabled: boolean;
    readonly refundable: number;
    readonly reason?: string;
  };
}

const ATTRIBUTE_LABELS: Record<PrimaryAttribute, string> = {
  might: "力量",
  finesse: "灵巧",
  vitality: "体魄",
  resolve: "意志",
};

const OFFENSE = [
  ["meleePower", "近战强度"],
  ["rangedPower", "远程强度"],
  ["skillPower", "技能强度"],
  ["critChance", "暴击率"],
  ["critDamage", "暴击伤害"],
  ["attackSpeed", "攻击速度"],
  ["cooldownRecovery", "冷却恢复"],
  ["damageBonus", "伤害增幅"],
] as const;

const DEFENSE = [
  ["maxHealth", "最大生命"],
  ["armor", "护甲"],
  ["fireResist", "火焰抗性"],
  ["iceResist", "寒冰抗性"],
  ["poisonResist", "毒素抗性"],
  ["stormResist", "雷电抗性"],
  ["damageReduction", "全局减伤"],
] as const;

const UTILITY = [
  ["moveSpeed", "移动速度"],
  ["pickupRadius", "拾取半径"],
] as const;

function decimal(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatStat(id: CharacterStatRow["id"], value: number): string {
  if (
    id === "critChance"
    || id === "cooldownRecovery"
    || id === "fireResist"
    || id === "iceResist"
    || id === "poisonResist"
    || id === "stormResist"
    || id === "damageBonus"
    || id === "damageReduction"
  ) return percent(value);
  if (id === "critDamage") return `${value.toFixed(2)}×`;
  if (id === "attackSpeed") return `${value.toFixed(2)}×`;
  if (id === "moveSpeed") return value.toFixed(2);
  if (id === "pickupRadius") return `${value.toFixed(1)} m`;
  return decimal(value);
}

export function buildCharacterPageModel(
  snapshot: GameSnapshot,
  slot: PlayerSlotId,
  context: CharacterPageContext,
): CharacterPageModel {
  const player = snapshot.players.find((candidate) => candidate.slot === slot)
    ?? snapshot.players[0];
  if (!player) throw new Error("character page requires at least one player");
  const { progress } = player;

  const statRow = (
    id: CharacterStatRow["id"],
    label: string,
  ): CharacterStatRow => {
    const sourceId: StatName = id === "critChance" ? "critRating" : id;
    const source = progress.statBreakdown[sourceId];
    const value = id === "critChance"
      ? critChance(progress.stats.critRating, progress.level)
      : progress.stats[sourceId];
    return {
      id,
      label,
      formatted: formatStat(id, value),
      detail: id === "armor"
        ? `${percent(armorMitigation(value, progress.level))} 等级对等减伤`
        : undefined,
      source,
    };
  };

  const attributes = (Object.keys(ATTRIBUTE_LABELS) as PrimaryAttribute[]).map((id) => ({
    id,
    label: ATTRIBUTE_LABELS[id],
    value: progress.allocated[id],
    focusId: `character:${id}`,
    canAllocate: progress.unspentAttributes > 0,
  }));
  const refundable = attributes.reduce((total, attribute) => (
    total + Math.max(0, attribute.value - 10)
  ), 0);
  const resetReason = context.inDungeon
    ? "地下城中不能洗点"
    : refundable === 0
      ? "没有已分配的点数"
      : undefined;

  return {
    level: progress.level,
    experience: progress.experience,
    xpToNext: progress.xpToNext,
    unspentAttributes: progress.unspentAttributes,
    attributes,
    sections: [
      { id: "offense", label: "攻击", rows: OFFENSE.map(([id, label]) => statRow(id, label)) },
      { id: "defense", label: "防御", rows: DEFENSE.map(([id, label]) => statRow(id, label)) },
      { id: "utility", label: "功能", rows: UTILITY.map(([id, label]) => statRow(id, label)) },
    ],
    reset: {
      focusId: "character:reset",
      enabled: !context.inDungeon && refundable > 0,
      refundable,
      reason: resetReason,
    },
  };
}
