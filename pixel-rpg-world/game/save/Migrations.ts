import { emptyMaterialWallet, type ItemInstance } from "../item/ItemComponents";
import type { HeroSaveV1, SaveGameV1 } from "./SaveSchema";

const RARITY = {
  common: "normal",
  rare: "magic",
  epic: "rare",
  legendary: "unique",
} as const;

function legacyItem(value: Record<string, unknown>): ItemInstance {
  const rarity = RARITY[value.rarity as keyof typeof RARITY] ?? "normal";
  return {
    id: Number(value.id),
    definition: String(value.definition),
    itemLevel: 1,
    baseRoll: 5_000,
    theme: "ember",
    rarity,
    affixes: [],
    reinforce: 0,
    favorite: false,
  };
}

function legacyHero(value: Record<string, unknown>): HeroSaveV1 {
  const inventory = Array.isArray(value.inventory)
    ? value.inventory.map((item) => legacyItem(item as Record<string, unknown>))
    : [];
  const recovery = Array.isArray(value.recovery)
    ? value.recovery.map((item) => legacyItem(item as Record<string, unknown>))
    : [];
  const attributes = value.attributes as Record<string, number> | undefined;
  const loadout = {
    skill_up: typeof value.ability_1 === "string" ? value.ability_1 : null,
    skill_right: typeof value.ability_2 === "string" ? value.ability_2 : null,
    skill_down: typeof value.ability_3 === "string" ? value.ability_3 : null,
    skill_left: null,
  };
  const skillRanks = Object.fromEntries(Object.values(loadout).flatMap((ability) => (
    ability ? [[ability, 1]] : []
  )));
  return {
    archetype: typeof value.archetype === "string" ? value.archetype : "hero.ember_runner",
    level: 1,
    experience: Number(value.experience ?? 0),
    allocated: {
      might: Number(attributes?.might ?? 10),
      finesse: Number(attributes?.finesse ?? 10),
      vitality: Number(attributes?.vitality ?? 10),
      resolve: Number(attributes?.resolve ?? 10),
    },
    unspentAttributes: 0,
    unspentSkills: 0,
    skillRanks,
    unlockedAbilities: [...Object.keys(skillRanks), "passive.iron_vitality"].sort(),
    loadout,
    passives: { passive_1: null, passive_2: null },
    inventory,
    recovery,
    equipment: { ...(value.equipment as HeroSaveV1["equipment"] ?? {}) },
    materials: {
      ...emptyMaterialWallet(),
      "material.scrap": Number(value.emberDust ?? 0),
    },
    nextItemId: Number(value.nextItemId ?? Math.max(0, ...inventory.map((item) => item.id)) + 1),
  };
}

export function migrateToLatest(input: unknown): unknown {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return input;
  const source = input as Record<string, unknown>;
  if (source.version === 1) {
    const oldSettings = typeof source.settings === "object"
      && source.settings !== null
      && !Array.isArray(source.settings)
      ? source.settings as Record<string, unknown>
      : {};
    return {
      ...source,
      settings: {
        ...oldSettings,
        hudScale: oldSettings.hudScale ?? 1,
        reducedFlash: oldSettings.reducedFlash ?? false,
        screenShake: oldSettings.screenShake ?? 1,
        damageNumbers: oldSettings.damageNumbers ?? false,
      },
    };
  }
  if (source.version !== 0) return input;
  const heroes = source.heroes as Record<string, Record<string, unknown>> | undefined;
  if (!heroes?.hero_1 || !heroes.hero_2) return input;
  const migrated: SaveGameV1 = {
    version: 1,
    profileId: "local",
    world: {
      unlockedDungeons: ["dungeon.production_foundation"],
      firstClearBosses: [],
      difficulty: "normal",
    },
    heroes: {
      hero_1: legacyHero(heroes.hero_1),
      hero_2: legacyHero(heroes.hero_2),
    },
    settings: {
      hudScale: 1,
      reducedFlash: false,
      screenShake: 1,
      damageNumbers: false,
    },
    savedAt: Number(source.savedAt ?? Date.now()),
  };
  return migrated;
}
