import type { ActiveSkillSlot, PassiveSlot } from "../content/Definitions";
import type { GameSnapshot, ItemSnapshot } from "../core/GameSnapshot";
import { emptyMaterialWallet, fixedItemInstance, type ItemInstance } from "../item/ItemComponents";
import {
  WORLD_ROUTE,
  isWorldDungeonId,
  type WorldProgress,
} from "../session/WorldProgress";
import type { HeroSaveId, HeroSaveV1, SaveGameV1 } from "./SaveSchema";
import { PLAYER_ABILITY_IDS } from "../content/generated/abilities";

const STARTER_ABILITIES = [
  ...PLAYER_ABILITY_IDS,
  "passive.execution_rush",
  "passive.hawkeye",
  "passive.iron_vitality",
  "passive.runic_ward",
] as const;

export function createDefaultHeroSave(): HeroSaveV1 {
  const inventory = [
    fixedItemInstance(1, "item.rust_blade"),
    fixedItemInstance(2, "item.hunter_bow"),
    fixedItemInstance(3, "item.traveler_cap"),
    fixedItemInstance(4, "item.traveler_tunic"),
    fixedItemInstance(5, "item.traveler_bracers"),
    fixedItemInstance(6, "item.traveler_pants"),
    fixedItemInstance(7, "item.traveler_boots"),
  ];
  return {
    archetype: "hero.ember_runner",
    level: 1,
    experience: 0,
    allocated: { might: 10, finesse: 10, vitality: 10, resolve: 10 },
    unspentAttributes: 0,
    unspentSkills: 1,
    skillRanks: {
      "ability.battle_focus": 1,
      "ability.ember_nova": 1,
      "ability.shadow_step": 1,
      "ability.molten_guard": 1,
      "passive.iron_vitality": 1,
    },
    unlockedAbilities: [...STARTER_ABILITIES],
    loadout: {
      skill_up: "ability.battle_focus",
      skill_right: "ability.ember_nova",
      skill_down: "ability.shadow_step",
      skill_left: "ability.molten_guard",
    },
    passives: { passive_1: "passive.iron_vitality", passive_2: null },
    inventory,
    recovery: [],
    equipment: { head: 3, chest: 4, wrists: 5, legs: 6, feet: 7, melee: 1, ranged: 2 },
    materials: emptyMaterialWallet(),
    nextItemId: 8,
  };
}

export function createDefaultSave(savedAt = Date.now()): SaveGameV1 {
  return {
    version: 1,
    profileId: "local",
    world: {
      unlockedDungeons: [WORLD_ROUTE[0]],
      firstClearBosses: [],
      difficulty: "normal",
    },
    heroes: { hero_1: createDefaultHeroSave(), hero_2: createDefaultHeroSave() },
    settings: {
      hudScale: 1,
      reducedFlash: false,
      screenShake: 1,
      damageNumbers: false,
    },
    savedAt,
  };
}

export function worldProgressFromSave(save: SaveGameV1): WorldProgress {
  const unlocked = WORLD_ROUTE.filter((id) => save.world.unlockedDungeons.includes(id));
  const clearedNormal = WORLD_ROUTE.filter((id) => save.world.firstClearBosses.includes(id));
  return {
    unlockedDungeons: unlocked.length > 0 ? unlocked : [WORLD_ROUTE[0]],
    clearedNormal,
    echoUnlocked: WORLD_ROUTE.every((id) => clearedNormal.includes(id)),
  };
}

export function saveWithWorldProgress(
  save: SaveGameV1,
  progress: WorldProgress,
  savedAt = Date.now(),
): SaveGameV1 {
  return {
    ...save,
    world: {
      ...save.world,
      unlockedDungeons: [...progress.unlockedDungeons],
      firstClearBosses: [...progress.clearedNormal],
    },
    savedAt,
  };
}

function itemInstance(item: ItemSnapshot): ItemInstance {
  return {
    id: item.id,
    definition: item.definition,
    itemLevel: item.itemLevel,
    baseRoll: item.baseRoll,
    theme: item.theme,
    rarity: item.rarity,
    affixes: item.affixes.map((affix) => ({ ...affix })),
    reinforce: item.reinforce,
    favorite: item.favorite,
  };
}

export function saveWithSnapshot(
  save: SaveGameV1,
  snapshot: GameSnapshot,
  savedAt = Date.now(),
): SaveGameV1 {
  const heroes = { ...save.heroes };
  for (const player of snapshot.players) {
    const heroId = `hero_${player.slot}` as HeroSaveId;
    if (!(heroId in heroes)) continue;
    const actor = snapshot.actors.find((candidate) => candidate.id === player.actor);
    const progress = player.progress;
    heroes[heroId] = {
      archetype: actor?.archetype ?? heroes[heroId].archetype,
      level: progress.level,
      experience: progress.experience,
      allocated: { ...progress.allocated },
      unspentAttributes: progress.unspentAttributes,
      unspentSkills: progress.unspentSkills,
      skillRanks: { ...progress.skillRanks },
      unlockedAbilities: [...progress.unlockedAbilities],
      loadout: Object.fromEntries(([
        "skill_up",
        "skill_right",
        "skill_down",
        "skill_left",
      ] as ActiveSkillSlot[]).map((slot) => [slot, progress.abilities[slot].id ?? null])) as Record<ActiveSkillSlot, string | null>,
      passives: Object.fromEntries(([
        "passive_1",
        "passive_2",
      ] as PassiveSlot[]).map((slot) => [slot, progress.passives[slot].id ?? null])) as Record<PassiveSlot, string | null>,
      inventory: progress.items.map(itemInstance),
      recovery: progress.recovery.map(itemInstance),
      equipment: { ...progress.equipment.slots },
      materials: { ...progress.materials },
      nextItemId: progress.nextItemId,
    };
  }
  return { ...save, heroes, savedAt };
}

export function heroSavesForDungeon(save: SaveGameV1, playerCount: number): readonly HeroSaveV1[] {
  return (["hero_1", "hero_2"] as HeroSaveId[]).slice(0, playerCount).map((id) => save.heroes[id]);
}

export function isSaveWorldDungeon(value: string): boolean {
  return isWorldDungeonId(value);
}
