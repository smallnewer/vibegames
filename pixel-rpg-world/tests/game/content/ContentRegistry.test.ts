import { describe, expect, it } from "vitest";
import { ContentRegistry } from "../../../game/content/ContentRegistry";
import { createCoreContent } from "../../../game/content/coreContent";
import { ITEM_BASES, UNIQUE_ITEMS } from "../../../game/item/ItemCatalog";

describe("ContentRegistry", () => {
  it("resolves every core item, ability, and status reference", () => {
    const content = createCoreContent();
    expect(content.item("item.ember_blade")).toMatchObject({
      ability: "ability.weapon.ember_blade",
      rarity: "unique",
      attackTags: ["fire"],
      onHitStatus: "status.burning",
    });
    expect(content.ability("ability.battle_focus").effect).toEqual({
      type: "sequence",
      children: [
        { type: "select_self" },
        { type: "apply_status", status: "status.battle_focus", stacks: 1 },
      ],
    });
    expect(content.status("status.battle_focus").duration).toBe(4);
    expect(content.passive("passive.ember_guard").modifiers.percent?.maxHealth).toBe(0.2);
    expect(content.item("item.ember_coat")).toMatchObject({
      slot: "chest",
      visual: "equipment.chest.ember_coat",
    });
    expect(ITEM_BASES.every((base) => content.findItem(base.id)?.slot === base.slot)).toBe(true);
    expect(UNIQUE_ITEMS.every((item) => content.findItem(item.id)?.rarity === "unique")).toBe(true);
  });

  it("rejects duplicate IDs and missing references", () => {
    const content = new ContentRegistry();
    content.registerAbility({
      id: "ability.test",
      name: "Test",
      slot: "active",
      cooldown: 1,
      action: "skill",
      actionTime: 0.2,
      visual: "vfx.test",
      effect: { type: "select_self" },
    });
    expect(() => content.registerAbility(content.ability("ability.test"))).toThrow("Duplicate");
    content.registerItem({
      id: "item.bad",
      name: "Bad",
      slot: "melee",
      visual: "equipment.weapon.bad",
      ability: "ability.missing",
      modifiers: { flat: { meleePower: 1 } },
    });
    expect(() => content.validate()).toThrow("ability.missing");
  });

  it("keeps active and passive definitions in one duplicate-ID namespace", () => {
    const content = new ContentRegistry();
    content.registerPassive({
      id: "passive.test",
      name: "Test Passive",
      modifiers: { percent: { maxHealth: 0.1 } },
    });
    expect(content.passive("passive.test").modifiers.percent?.maxHealth).toBe(0.1);
    expect(() => content.registerAbility({
      id: "passive.test",
      name: "Duplicate",
      slot: "active",
      cooldown: 1,
      action: "skill",
      actionTime: 0.2,
      visual: "vfx.test",
      effect: { type: "select_self" },
    })).toThrow("Duplicate");
  });
});
