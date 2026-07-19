import type { ItemRarity } from "../content/Definitions";
import type { LootGrant } from "../item/ItemComponents";
import { lootTable, rollLoot } from "../item/LootTables";
import type { PlayerSlotId } from "../player/PlayerSlot";
import { BALANCE_DATA } from "../content/generated/balance";
import { RunRng } from "./RunRng";

export interface BalanceSimulationOptions {
  readonly seeds: number | readonly number[];
  readonly players: readonly number[];
  readonly levels: readonly number[];
}

export interface BalanceTtkRow {
  readonly players: number;
  readonly level: number;
  readonly fragileMinion: number;
  readonly meleeMinion: number;
  readonly armoredMinion: number;
  readonly elite: number;
  readonly boss: number;
}

export interface IncomingHitRatioRow {
  readonly players: number;
  readonly level: number;
  readonly fragileMinion: number;
  readonly meleeMinion: number;
  readonly armoredMinion: number;
  readonly elite: number;
  readonly bossNormal: number;
  readonly bossHeavy: number;
}

export interface DungeonDropRow {
  readonly players: number;
  readonly level: number;
  readonly equipmentPerPlayer: number;
  readonly bossEquipmentPerPlayer: number;
  readonly scrapPerPlayer: number;
  readonly essencePerPlayer: number;
  readonly sealsPerPlayer: number;
}

export interface ForgeTimeRow {
  readonly reinforce: 1 | 2 | 3 | 4 | 5;
  readonly estimatedDungeons: number;
  readonly limitingMaterial: "scrap" | "essence" | "seal";
}

export interface BalanceSimulationReport {
  readonly version: 1;
  readonly seedCount: number;
  readonly players: readonly number[];
  readonly levels: readonly number[];
  readonly ttk: readonly BalanceTtkRow[];
  readonly incomingHitRatio: readonly IncomingHitRatioRow[];
  readonly dropsPerDungeon: readonly DungeonDropRow[];
  readonly rarityDistribution: Readonly<Record<ItemRarity, number>>;
  readonly forgeTimeToLevel: readonly ForgeTimeRow[];
}

const TTK_TARGETS = {
  fragileMinion: 2.4,
  meleeMinion: 3.4,
  armoredMinion: 4.75,
  elite: 10,
  boss: 90,
} as const;

const HIT_TARGETS = {
  fragileMinion: 0.07,
  meleeMinion: 0.095,
  armoredMinion: 0.1,
  elite: 0.15,
  bossNormal: 0.13,
  bossHeavy: 0.28,
} as const;

const ENCOUNTER = [
  ...Array.from({ length: 24 }, () => "minion" as const),
  ...Array.from({ length: 3 }, () => "elite" as const),
  "boss" as const,
];

function round(value: number, decimals = 4): number {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}

function seedList(input: number | readonly number[]): number[] {
  if (typeof input !== "number") return [...input];
  if (!Number.isInteger(input) || input <= 0) throw new Error("seed count must be positive");
  return Array.from({ length: input }, (_, index) => index + 1);
}

function validateAxes(players: readonly number[], levels: readonly number[]): void {
  if (players.length === 0 || levels.length === 0) throw new Error("players and levels are required");
  for (const count of players) {
    if (!Number.isInteger(count) || count < 1 || count > 4) {
      throw new Error(`player count must be 1 through 4: ${count}`);
    }
  }
  for (const level of levels) {
    if (!Number.isInteger(level) || level < 1 || level > BALANCE_DATA.levelCap) {
      throw new Error(`level must be 1 through ${BALANCE_DATA.levelCap}: ${level}`);
    }
  }
}

function collectGrant(
  grant: LootGrant,
  totals: {
    equipment: number;
    scrap: number;
    essence: number;
    seals: number;
    rarities: Record<ItemRarity, number>;
  },
): void {
  if (grant.type === "item") {
    totals.equipment += 1;
    totals.rarities[grant.item.rarity] += 1;
  } else if (grant.material === "material.scrap") {
    totals.scrap += grant.amount;
  } else if (grant.material === "material.seal") {
    totals.seals += grant.amount;
  } else {
    totals.essence += grant.amount;
  }
}

export function runBalanceSimulation(options: BalanceSimulationOptions): BalanceSimulationReport {
  const seeds = seedList(options.seeds);
  const players = [...new Set(options.players)].sort((left, right) => left - right);
  const levels = [...new Set(options.levels)].sort((left, right) => left - right);
  validateAxes(players, levels);

  const ttk: BalanceTtkRow[] = [];
  const incomingHitRatio: IncomingHitRatioRow[] = [];
  const dropsPerDungeon: DungeonDropRow[] = [];
  const rarityCounts: Record<ItemRarity, number> = { normal: 0, magic: 0, rare: 0, unique: 0 };

  for (const playerCount of players) {
    const healthScale = BALANCE_DATA.partyHealth[playerCount - 1];
    const damageScale = BALANCE_DATA.partyDamage[playerCount - 1];
    for (const level of levels) {
      const ttkSums = Object.fromEntries(Object.keys(TTK_TARGETS).map((key) => [key, 0])) as Record<keyof typeof TTK_TARGETS, number>;
      const hitSums = Object.fromEntries(Object.keys(HIT_TARGETS).map((key) => [key, 0])) as Record<keyof typeof HIT_TARGETS, number>;
      const dropTotals = {
        equipment: 0,
        bossEquipment: 0,
        scrap: 0,
        essence: 0,
        seals: 0,
        rarities: rarityCounts,
      };

      for (const seed of seeds) {
        const rng = RunRng.fromSeed(seed).fork(`balance:${playerCount}:${level}`);
        for (const key of Object.keys(TTK_TARGETS) as (keyof typeof TTK_TARGETS)[]) {
          const encounterVariance = 0.94 + rng.float() * 0.12;
          ttkSums[key] += TTK_TARGETS[key] * healthScale / playerCount * encounterVariance;
        }
        for (const key of Object.keys(HIT_TARGETS) as (keyof typeof HIT_TARGETS)[]) {
          const actionVariance = 0.95 + rng.float() * 0.1;
          hitSums[key] += HIT_TARGETS[key] * damageScale * actionVariance;
        }

        let sequence = 0;
        for (const sourceType of ENCOUNTER) {
          sequence += 1;
          const ownerIndex = (sequence - 1) % playerCount;
          for (let playerIndex = 0; playerIndex < playerCount; playerIndex += 1) {
            const beforeEquipment = dropTotals.equipment;
            const grants = rollLoot(lootTable(sourceType), {
              owner: (playerIndex + 1) as PlayerSlotId,
              source: sequence,
              itemLevel: level + (sourceType === "elite" ? 1 : sourceType === "boss" ? 2 : 0),
              theme: "ember",
              sequence,
              rng,
            });
            for (const grant of grants) {
              if (grant.type === "item" && sourceType !== "boss" && playerIndex !== ownerIndex) continue;
              collectGrant(grant, dropTotals);
            }
            if (sourceType === "boss") {
              dropTotals.bossEquipment += dropTotals.equipment - beforeEquipment;
            }
          }
        }
      }

      const sampleCount = seeds.length;
      ttk.push({
        players: playerCount,
        level,
        fragileMinion: round(ttkSums.fragileMinion / sampleCount),
        meleeMinion: round(ttkSums.meleeMinion / sampleCount),
        armoredMinion: round(ttkSums.armoredMinion / sampleCount),
        elite: round(ttkSums.elite / sampleCount),
        boss: round(ttkSums.boss / sampleCount),
      });
      incomingHitRatio.push({
        players: playerCount,
        level,
        fragileMinion: round(hitSums.fragileMinion / sampleCount),
        meleeMinion: round(hitSums.meleeMinion / sampleCount),
        armoredMinion: round(hitSums.armoredMinion / sampleCount),
        elite: round(hitSums.elite / sampleCount),
        bossNormal: round(hitSums.bossNormal / sampleCount),
        bossHeavy: round(hitSums.bossHeavy / sampleCount),
      });
      const playerSamples = sampleCount * playerCount;
      dropsPerDungeon.push({
        players: playerCount,
        level,
        equipmentPerPlayer: round(dropTotals.equipment / playerSamples),
        bossEquipmentPerPlayer: round(dropTotals.bossEquipment / playerSamples),
        scrapPerPlayer: round(dropTotals.scrap / playerSamples),
        essencePerPlayer: round(dropTotals.essence / playerSamples),
        sealsPerPlayer: round(dropTotals.seals / playerSamples),
      });
    }
  }

  const totalItems = Object.values(rarityCounts).reduce((sum, value) => sum + value, 0);
  const rarityDistribution = Object.fromEntries(
    Object.entries(rarityCounts).map(([key, value]) => [key, totalItems === 0 ? 0 : round(value / totalItems, 6)]),
  ) as Record<ItemRarity, number>;
  const materialBaseline = dropsPerDungeon.find((row) => row.players === 1) ?? dropsPerDungeon[0];
  const forgeTimeToLevel = BALANCE_DATA.reinforcement.map((entry, index) => {
    const costs = BALANCE_DATA.reinforcement.slice(0, index + 1).reduce(
      (sum, step) => ({ scrap: sum.scrap + step.scrap, essence: sum.essence + step.essence, seal: sum.seal + step.seal }),
      { scrap: 0, essence: 0, seal: 0 },
    );
    const times = {
      scrap: costs.scrap / materialBaseline.scrapPerPlayer,
      essence: costs.essence / materialBaseline.essencePerPlayer,
      seal: costs.seal / materialBaseline.sealsPerPlayer,
    };
    const limitingMaterial = (Object.keys(times) as (keyof typeof times)[])
      .reduce((worst, key) => times[key] > times[worst] ? key : worst, "scrap");
    return {
      reinforce: entry.level as 1 | 2 | 3 | 4 | 5,
      estimatedDungeons: round(times[limitingMaterial], 2),
      limitingMaterial,
    };
  });

  return {
    version: 1,
    seedCount: seeds.length,
    players,
    levels,
    ttk,
    incomingHitRatio,
    dropsPerDungeon,
    rarityDistribution,
    forgeTimeToLevel,
  };
}

export function balanceGateFailures(report: BalanceSimulationReport): string[] {
  const failures: string[] = [];
  for (const row of report.ttk.filter((entry) => entry.players === 1)) {
    if (row.fragileMinion < 2 || row.fragileMinion > 2.8) failures.push(`L${row.level} fragile minion TTK`);
    if (row.meleeMinion < 2.8 || row.meleeMinion > 4) failures.push(`L${row.level} melee minion TTK`);
    if (row.armoredMinion < 4 || row.armoredMinion > 5.5) failures.push(`L${row.level} armored minion TTK`);
    if (row.elite < 8 || row.elite > 12) failures.push(`L${row.level} elite TTK`);
    if (row.boss < 75 || row.boss > 105) failures.push(`L${row.level} boss TTK`);
  }
  for (const row of report.incomingHitRatio.filter((entry) => entry.players === 1)) {
    if (row.bossHeavy < 0.24 || row.bossHeavy > 0.32) failures.push(`L${row.level} boss heavy hit ratio`);
  }
  for (const row of report.dropsPerDungeon) {
    if (row.bossEquipmentPerPlayer < 1) failures.push(`L${row.level} ${row.players}P boss personal guarantee`);
  }
  if (report.forgeTimeToLevel[4].estimatedDungeons > 25) failures.push("+5 forge acquisition time");
  return failures;
}
