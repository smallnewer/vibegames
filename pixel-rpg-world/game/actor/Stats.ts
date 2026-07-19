import {
  DEFAULT_STAT_BLOCK,
  STAT_NAMES,
  type StatBlock,
  type StatName,
} from "../content/Definitions";
import type { PrimaryAttribute } from "../progression/ProgressionComponents";

export interface StatBreakdown {
  base: number;
  flat: number;
  percent: number;
  finalMultiplier: number;
  value: number;
}

export type StatBreakdownMap = Record<StatName, StatBreakdown>;

// 创建角色时就补齐结构，后续 UI 不需要判断某项数值是否存在。
export function createStatBreakdown(base: StatBlock): StatBreakdownMap {
  return Object.fromEntries(STAT_NAMES.map((name) => [name, {
    base: base[name] ?? DEFAULT_STAT_BLOCK[name],
    flat: 0,
    percent: 0,
    finalMultiplier: 1,
    value: base[name] ?? DEFAULT_STAT_BLOCK[name],
  }])) as StatBreakdownMap;
}

export interface StatsComponent {
  base: StatBlock;
  final: StatBlock;
  breakdown: StatBreakdownMap;
}

export function derivePrimaryStats(
  level: number,
  allocated: Readonly<Record<PrimaryAttribute, number>>,
): Partial<StatBlock> {
  const { might, finesse, vitality, resolve } = allocated;
  return {
    might,
    finesse,
    vitality,
    resolve,
    maxHealth: 60 * 1.06 ** (level - 1) + level * 4 + vitality * 5,
    meleePower: might * 0.8,
    rangedPower: finesse * 0.8,
    skillPower: resolve * 0.8,
    armor: might * 0.25,
    critRating: finesse * 0.5,
    fireResist: resolve * 0.0015,
    iceResist: resolve * 0.0015,
    poisonResist: resolve * 0.0015,
    stormResist: resolve * 0.0015,
  };
}

export const deriveStats = derivePrimaryStats;
