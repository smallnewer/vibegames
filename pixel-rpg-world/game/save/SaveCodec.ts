import {
  ACTIVE_SKILL_SLOTS,
  EQUIPMENT_SLOTS,
  type EquipmentSlot,
  type PassiveSlot,
} from "../content/Definitions";
import {
  ITEM_THEMES,
  MATERIAL_IDS,
  type ItemInstance,
} from "../item/ItemComponents";
import { PRIMARY_ATTRIBUTES } from "../progression/ProgressionComponents";
import type { HeroSaveId, HeroSaveV1, SaveGameV1 } from "./SaveSchema";

export interface SaveIssue {
  readonly path: string;
  readonly message: string;
}

export type DecodeSaveResult =
  | { readonly ok: true; readonly value: SaveGameV1 }
  | { readonly ok: false; readonly issues: readonly SaveIssue[] };

type UnknownRecord = Record<string, unknown>;
const HERO_IDS: readonly HeroSaveId[] = ["hero_1", "hero_2"];
const PASSIVE_SLOTS: readonly PassiveSlot[] = ["passive_1", "passive_2"];
const RARITIES = ["normal", "magic", "rare", "unique"] as const;

function record(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function issue(issues: SaveIssue[], path: string, message: string): void {
  issues.push({ path, message });
}

function finiteNumber(
  value: unknown,
  path: string,
  issues: SaveIssue[],
  options: Readonly<{ integer?: boolean; min?: number; max?: number }> = {},
): value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issue(issues, path, "must be a finite number");
    return false;
  }
  if (options.integer && !Number.isInteger(value)) issue(issues, path, "must be an integer");
  if (options.min !== undefined && value < options.min) issue(issues, path, `must be at least ${options.min}`);
  if (options.max !== undefined && value > options.max) issue(issues, path, `must be at most ${options.max}`);
  return true;
}

function stringOrNull(value: unknown, path: string, issues: SaveIssue[]): void {
  if (value !== null && (typeof value !== "string" || value.length === 0)) {
    issue(issues, path, "must be a nonempty string or null");
  }
}

function exactKeys(
  value: UnknownRecord,
  keys: readonly string[],
  path: string,
  issues: SaveIssue[],
): void {
  for (const key of keys) if (!(key in value)) issue(issues, `${path}.${key}`, "is required");
  for (const key of Object.keys(value)) if (!keys.includes(key)) issue(issues, `${path}.${key}`, "is unknown");
}

function validateItem(value: unknown, path: string, issues: SaveIssue[]): value is ItemInstance {
  if (!record(value)) {
    issue(issues, path, "must be an item object");
    return false;
  }
  finiteNumber(value.id, `${path}.id`, issues, { integer: true, min: 1 });
  if (typeof value.definition !== "string" || value.definition.length === 0) {
    issue(issues, `${path}.definition`, "must be a nonempty string");
  }
  finiteNumber(value.itemLevel, `${path}.itemLevel`, issues, { integer: true, min: 1, max: 30 });
  finiteNumber(value.baseRoll, `${path}.baseRoll`, issues, { integer: true, min: 0, max: 10_000 });
  if (!ITEM_THEMES.includes(value.theme as typeof ITEM_THEMES[number])) {
    issue(issues, `${path}.theme`, "is unknown");
  }
  if (!RARITIES.includes(value.rarity as typeof RARITIES[number])) {
    issue(issues, `${path}.rarity`, "is unknown");
  }
  finiteNumber(value.reinforce, `${path}.reinforce`, issues, { integer: true, min: 0, max: 5 });
  if (typeof value.favorite !== "boolean") issue(issues, `${path}.favorite`, "must be boolean");
  if (!Array.isArray(value.affixes)) {
    issue(issues, `${path}.affixes`, "must be an array");
  } else {
    value.affixes.forEach((affix, index) => {
      const affixPath = `${path}.affixes[${index}]`;
      if (!record(affix)) return issue(issues, affixPath, "must be an object");
      if (typeof affix.definition !== "string" || affix.definition.length === 0) {
        issue(issues, `${affixPath}.definition`, "must be a nonempty string");
      }
      finiteNumber(affix.roll, `${affixPath}.roll`, issues, { integer: true, min: 0, max: 10_000 });
    });
  }
  return true;
}

function validateItems(value: unknown, path: string, issues: SaveIssue[]): ItemInstance[] {
  if (!Array.isArray(value)) {
    issue(issues, path, "must be an array");
    return [];
  }
  return value.flatMap((item, index) => (
    validateItem(item, `${path}[${index}]`, issues) ? [item] : []
  ));
}

function validateStringArray(value: unknown, path: string, issues: SaveIssue[]): void {
  if (!Array.isArray(value)) return issue(issues, path, "must be an array");
  const seen = new Set<string>();
  value.forEach((entry, index) => {
    if (typeof entry !== "string" || entry.length === 0) {
      issue(issues, `${path}[${index}]`, "must be a nonempty string");
    } else if (seen.has(entry)) issue(issues, `${path}[${index}]`, "is duplicate");
    else seen.add(entry);
  });
}

function validateHero(value: unknown, path: string, issues: SaveIssue[]): void {
  if (!record(value)) return issue(issues, path, "must be a hero object");
  if (typeof value.archetype !== "string" || value.archetype.length === 0) {
    issue(issues, `${path}.archetype`, "must be a nonempty string");
  }
  finiteNumber(value.level, `${path}.level`, issues, { integer: true, min: 1, max: 30 });
  finiteNumber(value.experience, `${path}.experience`, issues, { integer: true, min: 0 });
  finiteNumber(value.unspentAttributes, `${path}.unspentAttributes`, issues, { integer: true, min: 0 });
  finiteNumber(value.unspentSkills, `${path}.unspentSkills`, issues, { integer: true, min: 0 });

  if (!record(value.allocated)) issue(issues, `${path}.allocated`, "must be an object");
  else {
    exactKeys(value.allocated, PRIMARY_ATTRIBUTES, `${path}.allocated`, issues);
    for (const attribute of PRIMARY_ATTRIBUTES) {
      finiteNumber(value.allocated[attribute], `${path}.allocated.${attribute}`, issues, {
        integer: true,
        min: 10,
      });
    }
  }
  if (!record(value.skillRanks)) issue(issues, `${path}.skillRanks`, "must be an object");
  else for (const [skill, rank] of Object.entries(value.skillRanks)) {
    if (!skill.startsWith("ability.") && !skill.startsWith("passive.")) {
      issue(issues, `${path}.skillRanks.${skill}`, "must be an ability or passive ID");
    }
    finiteNumber(rank, `${path}.skillRanks.${skill}`, issues, {
      integer: true,
      min: 1,
      max: skill.startsWith("passive.") ? 3 : 5,
    });
  }
  validateStringArray(value.unlockedAbilities, `${path}.unlockedAbilities`, issues);
  if (!record(value.loadout)) issue(issues, `${path}.loadout`, "must be an object");
  else {
    exactKeys(value.loadout, ACTIVE_SKILL_SLOTS, `${path}.loadout`, issues);
    for (const slot of ACTIVE_SKILL_SLOTS) stringOrNull(value.loadout[slot], `${path}.loadout.${slot}`, issues);
  }
  if (!record(value.passives)) issue(issues, `${path}.passives`, "must be an object");
  else {
    exactKeys(value.passives, PASSIVE_SLOTS, `${path}.passives`, issues);
    for (const slot of PASSIVE_SLOTS) stringOrNull(value.passives[slot], `${path}.passives.${slot}`, issues);
  }

  const inventory = validateItems(value.inventory, `${path}.inventory`, issues);
  const recovery = validateItems(value.recovery, `${path}.recovery`, issues);
  const ids = new Set<number>();
  for (const item of [...inventory, ...recovery]) {
    if (ids.has(item.id)) issue(issues, `${path}.items`, `duplicate item ID ${item.id}`);
    ids.add(item.id);
  }
  if (!record(value.equipment)) issue(issues, `${path}.equipment`, "must be an object");
  else for (const [slot, itemId] of Object.entries(value.equipment)) {
    if (!EQUIPMENT_SLOTS.includes(slot as EquipmentSlot)) {
      issue(issues, `${path}.equipment.${slot}`, "is unknown");
      continue;
    }
    if (finiteNumber(itemId, `${path}.equipment.${slot}`, issues, { integer: true, min: 1 })
      && !ids.has(itemId)) {
      issue(issues, `${path}.equipment.${slot}`, "points outside inventory/recovery");
    }
  }
  if (!record(value.materials)) issue(issues, `${path}.materials`, "must be an object");
  else {
    exactKeys(value.materials, MATERIAL_IDS, `${path}.materials`, issues);
    for (const material of MATERIAL_IDS) {
      finiteNumber(value.materials[material], `${path}.materials.${material}`, issues, {
        integer: true,
        min: 0,
      });
    }
  }
  if (finiteNumber(value.nextItemId, `${path}.nextItemId`, issues, { integer: true, min: 1 })) {
    const maxId = Math.max(0, ...ids);
    if (value.nextItemId <= maxId) issue(issues, `${path}.nextItemId`, "must exceed every item ID");
  }
}

function normalizeItem(item: ItemInstance): ItemInstance {
  return { ...item, affixes: item.affixes.map((affix) => ({ ...affix })) };
}

function normalizeHero(hero: HeroSaveV1): HeroSaveV1 {
  return {
    ...hero,
    allocated: { ...hero.allocated },
    skillRanks: { ...hero.skillRanks },
    unlockedAbilities: [...hero.unlockedAbilities].sort(),
    loadout: { ...hero.loadout },
    passives: { ...hero.passives },
    inventory: [...hero.inventory].sort((a, b) => a.id - b.id).map(normalizeItem),
    recovery: [...hero.recovery].sort((a, b) => a.id - b.id).map(normalizeItem),
    equipment: { ...hero.equipment },
    materials: { ...hero.materials },
  };
}

function normalizeSave(save: SaveGameV1): SaveGameV1 {
  return {
    ...save,
    world: {
      ...save.world,
      unlockedDungeons: [...save.world.unlockedDungeons].sort(),
      firstClearBosses: [...save.world.firstClearBosses].sort(),
    },
    heroes: {
      hero_1: normalizeHero(save.heroes.hero_1),
      hero_2: normalizeHero(save.heroes.hero_2),
    },
    settings: { ...save.settings },
  };
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (record(value)) {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${stableStringify(value[key])}`
    )).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function encodeSave(save: SaveGameV1): string {
  return stableStringify(normalizeSave(save));
}

export function decodeSave(input: unknown): DecodeSaveResult {
  try {
    let value = input;
    if (typeof input === "string") {
      try {
        value = JSON.parse(input) as unknown;
      } catch {
        return { ok: false, issues: [{ path: "$", message: "is not valid JSON" }] };
      }
    }
    const issues: SaveIssue[] = [];
    if (!record(value)) return { ok: false, issues: [{ path: "$", message: "must be an object" }] };
    if (value.version !== 1) issue(issues, "$.version", "must equal 1");
    if (value.profileId !== "local") issue(issues, "$.profileId", "must equal local");
    if (!record(value.world)) issue(issues, "$.world", "must be an object");
    else {
      validateStringArray(value.world.unlockedDungeons, "$.world.unlockedDungeons", issues);
      validateStringArray(value.world.firstClearBosses, "$.world.firstClearBosses", issues);
      if (value.world.difficulty !== "normal" && value.world.difficulty !== "echo") {
        issue(issues, "$.world.difficulty", "must be normal or echo");
      }
    }
    if (!record(value.heroes)) issue(issues, "$.heroes", "must be an object");
    else {
      exactKeys(value.heroes, HERO_IDS, "$.heroes", issues);
      for (const hero of HERO_IDS) validateHero(value.heroes[hero], `$.heroes.${hero}`, issues);
    }
    if (!record(value.settings)) issue(issues, "$.settings", "must be an object");
    else {
      exactKeys(
        value.settings,
        ["hudScale", "reducedFlash", "screenShake", "damageNumbers"],
        "$.settings",
        issues,
      );
      if (finiteNumber(value.settings.hudScale, "$.settings.hudScale", issues, {
        min: 0.85,
        max: 1.15,
      })) {
        const steps = (value.settings.hudScale - 0.85) / 0.05;
        if (Math.abs(steps - Math.round(steps)) > 1e-8) {
          issue(issues, "$.settings.hudScale", "must use 0.05 steps");
        }
      }
      if (typeof value.settings.reducedFlash !== "boolean") {
        issue(issues, "$.settings.reducedFlash", "must be boolean");
      }
      if (![0, 0.5, 1].includes(value.settings.screenShake as number)) {
        issue(issues, "$.settings.screenShake", "must equal 0, 0.5 or 1");
      }
      if (typeof value.settings.damageNumbers !== "boolean") {
        issue(issues, "$.settings.damageNumbers", "must be boolean");
      }
    }
    finiteNumber(value.savedAt, "$.savedAt", issues, { min: 0 });
    if (issues.length > 0) return { ok: false, issues };
    return { ok: true, value: normalizeSave(value as unknown as SaveGameV1) };
  } catch (error) {
    return {
      ok: false,
      issues: [{
        path: "$",
        message: `could not be inspected: ${error instanceof Error ? error.message : "unknown error"}`,
      }],
    };
  }
}
