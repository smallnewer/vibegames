import { describe, expect, it } from "vitest";
import { decodeSave } from "../../../game/save/SaveCodec";
import { migrateToLatest } from "../../../game/save/Migrations";

describe("save migrations", () => {
  it("migrates v0 slots, forge material, rarity and old item defaults", () => {
    const legacyHero = (id: number) => ({
      archetype: "hero.ember_runner",
      experience: 10,
      attributes: { might: 10, finesse: 10, vitality: 10, resolve: 10 },
      ability_1: "ability.battle_focus",
      ability_2: "ability.ember_nova",
      ability_3: "ability.shadow_step",
      inventory: [{ id, definition: "item.base.sword", rarity: "legendary" }],
      recovery: [],
      equipment: { melee: id },
      emberDust: 7,
      nextItemId: id + 1,
    });
    const migrated = migrateToLatest({
      version: 0,
      heroes: { hero_1: legacyHero(1), hero_2: legacyHero(2) },
      savedAt: 99,
    });
    const decoded = decodeSave(migrated);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) throw new Error("expected migrated save");
    const hero = decoded.value.heroes.hero_1;
    expect(hero.loadout).toEqual({
      skill_up: "ability.battle_focus",
      skill_right: "ability.ember_nova",
      skill_down: "ability.shadow_step",
      skill_left: null,
    });
    expect(hero.materials["material.scrap"]).toBe(7);
    expect(hero.inventory[0]).toMatchObject({
      itemLevel: 1,
      rarity: "unique",
      affixes: [],
      favorite: false,
    });
    expect(decoded.value.settings).toEqual({
      hudScale: 1,
      reducedFlash: false,
      screenShake: 1,
      damageNumbers: false,
    });
  });

  it("fills accessibility defaults in saves created before the settings expansion", () => {
    const legacyV1 = {
      version: 1,
      settings: { hudScale: 0.9, reducedFlash: true },
      marker: "preserved",
    };
    expect(migrateToLatest(legacyV1)).toEqual({
      ...legacyV1,
      settings: {
        hudScale: 0.9,
        reducedFlash: true,
        screenShake: 1,
        damageNumbers: false,
      },
    });
  });
});
