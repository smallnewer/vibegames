import { describe, expect, it } from "vitest";
import { createCoreContent } from "../../../game/content/coreContent";
import {
  MELEE_STATUS_DEFINITIONS,
  MELEE_WEAPON_CATALOG,
} from "../../../game/content/weapons/MeleeWeaponCatalog";

describe("MeleeWeaponCatalog", () => {
  it("locks four families across four rarity tiers", () => {
    expect(MELEE_WEAPON_CATALOG).toHaveLength(16);
    for (const family of ["blade", "sword", "axe", "hammer"]) {
      expect(MELEE_WEAPON_CATALOG.filter((weapon) => weapon.family === family)
        .map((weapon) => weapon.rarity)).toEqual(["normal", "magic", "rare", "unique"]);
    }
    expect(new Set(MELEE_WEAPON_CATALOG.map((weapon) => weapon.id)).size).toBe(16);
  });

  it("resolves every item, ability, slash, and elemental status", () => {
    const content = createCoreContent();
    for (const weapon of MELEE_WEAPON_CATALOG) {
      expect(content.item(weapon.id).visual).toBe(weapon.visual);
      expect(content.ability(weapon.ability).visual).toBe(weapon.slashVisual);
      if ("onHitStatus" in weapon) {
        expect(content.status(weapon.onHitStatus).visual).toMatch(/^vfx\.status\./);
      }
    }
    expect(MELEE_STATUS_DEFINITIONS.map((status) => status.id)).toHaveLength(6);
  });
});
