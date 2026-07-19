export const WORLD_ROUTE = [
  "dungeon.production_foundation",
  "dungeon.frost_mine",
  "dungeon.sunken_library",
  "dungeon.moss_sanctum",
  "dungeon.storm_throne",
] as const;

export type WorldDungeonId = typeof WORLD_ROUTE[number];
export type DungeonDifficulty = "normal" | "echo";

export interface WorldProgress {
  readonly unlockedDungeons: readonly WorldDungeonId[];
  readonly clearedNormal: readonly WorldDungeonId[];
  readonly echoUnlocked: boolean;
}

export interface WorldNodeDef {
  readonly id: WorldDungeonId;
  readonly name: string;
  readonly levelBand: readonly [number, number];
  readonly boss: string;
  readonly bossTitle: string;
  readonly material: string;
  readonly theme: "ember" | "frost" | "tide" | "spore" | "storm";
  readonly unlocked: boolean;
  readonly cleared: boolean;
  readonly lockedReason?: string;
}

const NODE_DATA: Readonly<Record<WorldDungeonId, Omit<WorldNodeDef, "unlocked" | "cleared" | "lockedReason">>> = {
  "dungeon.production_foundation": {
    id: "dungeon.production_foundation",
    name: "余烬监城",
    levelBand: [1, 6],
    boss: "赫恩",
    bossTitle: "铁誓典狱长",
    material: "余烬炉心",
    theme: "ember",
  },
  "dungeon.frost_mine": {
    id: "dungeon.frost_mine",
    name: "霜钟矿井",
    levelBand: [6, 12],
    boss: "伊萨",
    bossTitle: "盲眼矿监",
    material: "霜钟碎片",
    theme: "frost",
  },
  "dungeon.sunken_library": {
    id: "dungeon.sunken_library",
    name: "沉潮书库",
    levelBand: [12, 18],
    boss: "弥娅",
    bossTitle: "末席馆长",
    material: "潮蚀书页",
    theme: "tide",
  },
  "dungeon.moss_sanctum": {
    id: "dungeon.moss_sanctum",
    name: "苔王圣所",
    levelBand: [18, 24],
    boss: "奥恩",
    bossTitle: "药师王",
    material: "心脉孢子",
    theme: "spore",
  },
  "dungeon.storm_throne": {
    id: "dungeon.storm_throne",
    name: "风暴王台",
    levelBand: [24, 30],
    boss: "凯洛",
    bossTitle: "守雷摄政王",
    material: "雷冠残片",
    theme: "storm",
  },
};

export function isWorldDungeonId(value: string): value is WorldDungeonId {
  return (WORLD_ROUTE as readonly string[]).includes(value);
}

export function createDefaultWorldProgress(): WorldProgress {
  return {
    unlockedDungeons: [WORLD_ROUTE[0]],
    clearedNormal: [],
    echoUnlocked: false,
  };
}

export function canEnterWorldNode(
  progress: WorldProgress,
  dungeon: WorldDungeonId,
  options: Readonly<{ debugOverride?: boolean }> = {},
): boolean {
  return options.debugOverride === true || progress.unlockedDungeons.includes(dungeon);
}

export function applyDungeonClear(
  progress: WorldProgress,
  dungeon: WorldDungeonId,
  difficulty: DungeonDifficulty,
): WorldProgress {
  if (difficulty === "echo" || progress.clearedNormal.includes(dungeon)) return progress;
  const clearedNormal = WORLD_ROUTE.filter((id) => (
    id === dungeon || progress.clearedNormal.includes(id)
  ));
  const currentIndex = WORLD_ROUTE.indexOf(dungeon);
  const next = WORLD_ROUTE[currentIndex + 1];
  const unlockedDungeons = WORLD_ROUTE.filter((id) => (
    progress.unlockedDungeons.includes(id) || id === dungeon || id === next
  ));
  return {
    unlockedDungeons,
    clearedNormal,
    echoUnlocked: WORLD_ROUTE.every((id) => clearedNormal.includes(id)),
  };
}

export function worldRouteNodes(progress: WorldProgress): readonly WorldNodeDef[] {
  return WORLD_ROUTE.map((id, index) => {
    const unlocked = progress.unlockedDungeons.includes(id);
    return {
      ...NODE_DATA[id],
      unlocked,
      cleared: progress.clearedNormal.includes(id),
      lockedReason: unlocked
        ? undefined
        : `先完成${NODE_DATA[WORLD_ROUTE[Math.max(0, index - 1)]].name}`,
    };
  });
}
