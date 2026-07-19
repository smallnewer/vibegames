import { describe, expect, it } from "vitest";
import { evaluateAffixRoll } from "../../../game/item/ItemEvaluation";
import {
  ITEM_AFFIXES,
  ITEM_BASES,
  UNIQUE_ITEMS,
  itemAffix,
  itemBase,
} from "../../../game/item/ItemCatalog";

const AFFIX_GROUPS = [
  "power.melee", "power.ranged", "power.skill",
  "attribute.might", "attribute.finesse", "attribute.vitality", "attribute.resolve",
  "defense.health", "defense.armor",
  "resist.fire", "resist.ice", "resist.poison", "resist.storm",
  "offense.crit", "offense.crit_damage", "offense.attack_speed",
  "utility.cooldown_recovery", "utility.move_speed",
] as const;

const UNIQUE_IDS = [
  "item.unique.hearns_oathblade", "item.unique.prisoners_mantle",
  "item.unique.frost_bell_hammer", "item.unique.blind_overseer_helm",
  "item.unique.last_index_bow", "item.unique.copper_archive_bracers",
  "item.unique.sporecrown_focus", "item.unique.rootbound_greaves",
  "item.unique.regents_coil_blade", "item.unique.thunder_crown",
] as const;

describe("item catalog contract", () => {
  it("freezes exactly eighteen useful affix groups", () => {
    expect(ITEM_AFFIXES.map((affix) => affix.group).toSorted()).toEqual([...AFFIX_GROUPS].toSorted());
    expect(new Set(ITEM_AFFIXES.map((affix) => affix.group)).size).toBe(18);
    expect(ITEM_AFFIXES.some((affix) => affix.group.includes("pickup"))).toBe(false);
  });

  it("keeps eleven reusable weapon and armor bases with compatible affixes", () => {
    expect(ITEM_BASES).toHaveLength(11);
    expect(new Set(ITEM_BASES.map((base) => base.iconFamily)).size).toBeLessThanOrEqual(11);
    for (const unique of UNIQUE_ITEMS) {
      const base = itemBase(unique.base);
      expect(unique.affixes).toHaveLength(4);
      for (const affixId of unique.affixes) {
        expect(itemAffix(affixId).slots).toContain(base.slot);
      }
    }
  });

  it("freezes ten fixed dark-gold items and the two-item ember pool", () => {
    expect(UNIQUE_ITEMS.map((item) => item.id).toSorted()).toEqual([...UNIQUE_IDS].toSorted());
    expect(UNIQUE_ITEMS.filter((item) => item.dungeon === "dungeon.production_foundation")
      .map((item) => item.id)).toEqual([
      "item.unique.hearns_oathblade",
      "item.unique.prisoners_mantle",
    ]);
  });

  it("keeps fixed level-thirty unique percentage rolls under the build caps", () => {
    const caps = {
      attackSpeed: 0.25,
      cooldownRecovery: 0.2,
      moveSpeed: 0.15,
      fireResist: 0.2,
      iceResist: 0.2,
      poisonResist: 0.2,
      stormResist: 0.2,
    } as const;
    for (const unique of UNIQUE_ITEMS) {
      for (const affixId of unique.affixes) {
        const affix = itemAffix(affixId);
        const cap = caps[affix.stat as keyof typeof caps];
        if (cap === undefined) continue;
        expect(evaluateAffixRoll(affix.tiers[0], 7_500, 30, affix.stat)).toBeLessThanOrEqual(cap);
      }
    }
  });
});
