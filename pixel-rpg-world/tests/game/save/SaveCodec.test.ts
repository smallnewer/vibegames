import { describe, expect, it } from "vitest";
import { decodeSave, encodeSave } from "../../../game/save/SaveCodec";
import type { HeroSaveV1, SaveGameV1 } from "../../../game/save/SaveSchema";
import { emptyMaterialWallet, fixedItemInstance } from "../../../game/item/ItemComponents";

function hero(seed: number): HeroSaveV1 {
  const first = fixedItemInstance(seed, "item.base.sword", "rare");
  first.affixes = [{ definition: "affix.offense_crit", roll: 3210 }];
  return {
    archetype: "hero.ember_runner",
    level: seed,
    experience: seed * 10,
    allocated: { might: 10 + seed, finesse: 10, vitality: 10, resolve: 10 },
    unspentAttributes: 0,
    unspentSkills: 1,
    skillRanks: { "ability.ember_nova": seed === 1 ? 2 : 3 },
    unlockedAbilities: ["ability.ember_nova", "passive.ember_guard"],
    loadout: {
      skill_up: "ability.battle_focus",
      skill_right: "ability.ember_nova",
      skill_down: null,
      skill_left: null,
    },
    passives: { passive_1: "passive.ember_guard", passive_2: null },
    inventory: [first],
    recovery: [fixedItemInstance(seed + 10, "item.base.head")],
    equipment: { melee: seed },
    materials: { ...emptyMaterialWallet(), "material.scrap": seed * 4 },
    nextItemId: seed + 20,
  };
}

function save(): SaveGameV1 {
  return {
    version: 1,
    profileId: "local",
    world: {
      unlockedDungeons: ["dungeon.production_foundation"],
      firstClearBosses: [],
      difficulty: "normal",
    },
    heroes: { hero_1: hero(1), hero_2: hero(2) },
    settings: {
      hudScale: 1,
      reducedFlash: false,
      screenShake: 1,
      damageNumbers: false,
    },
    savedAt: 123456,
  };
}

function child(value: Record<string, unknown>, key: string): Record<string, unknown> {
  return value[key] as Record<string, unknown>;
}

describe("SaveCodec", () => {
  it("round-trips two distinct heroes and deterministically sorts instance arrays", () => {
    const source = save();
    source.heroes.hero_1.inventory = [
      fixedItemInstance(9, "item.base.head"),
      ...source.heroes.hero_1.inventory,
    ];
    const encoded = encodeSave(source);
    const result = decodeSave(encoded);
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) throw new Error("expected valid save");
    expect(result.value.heroes.hero_1.inventory.map((item) => item.id)).toEqual([1, 9]);
    expect(result.value.heroes.hero_2.skillRanks).toEqual({ "ability.ember_nova": 3 });
    expect(encodeSave(result.value)).toBe(encoded);
  });

  it.each([
    ["version", (value: Record<string, unknown>) => { delete value.version; }, "version"],
    ["NaN", (value: Record<string, unknown>) => { value.savedAt = Number.NaN; }, "savedAt"],
    ["negative material", (value: Record<string, unknown>) => {
      child(child(child(value, "heroes"), "hero_1"), "materials")["material.scrap"] = -1;
    }, "materials.material.scrap"],
    ["duplicate item", (value: Record<string, unknown>) => {
      const recovery = child(child(value, "heroes"), "hero_1").recovery as Record<string, unknown>[];
      recovery[0].id = 1;
    }, "duplicate"],
    ["dangling equipment", (value: Record<string, unknown>) => {
      child(child(child(value, "heroes"), "hero_1"), "equipment").melee = 999;
    }, "equipment.melee"],
    ["unknown slot", (value: Record<string, unknown>) => {
      child(child(child(value, "heroes"), "hero_1"), "loadout").skill_diagonal = "ability.ember_nova";
    }, "skill_diagonal"],
    ["level cap", (value: Record<string, unknown>) => {
      child(child(value, "heroes"), "hero_1").level = 31;
    }, "level"],
    ["HUD scale step", (value: Record<string, unknown>) => {
      child(value, "settings").hudScale = 1.02;
    }, "hudScale"],
    ["screen shake step", (value: Record<string, unknown>) => {
      child(value, "settings").screenShake = 0.25;
    }, "screenShake"],
    ["unknown setting", (value: Record<string, unknown>) => {
      child(value, "settings").bloom = true;
    }, "bloom"],
  ])("rejects %s with path-specific issues", (_name, mutate, path) => {
    const value = structuredClone(save()) as unknown as Record<string, unknown>;
    mutate(value);
    const result = decodeSave(value);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected invalid save");
    expect(result.issues.some((issue) => `${issue.path} ${issue.message}`.includes(path)))
      .toBe(true);
  });
});
