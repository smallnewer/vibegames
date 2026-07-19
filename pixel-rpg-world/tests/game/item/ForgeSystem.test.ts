import { describe, expect, it } from "vitest";
import type { GameplayEvent } from "../../../game/core/GameplayEvent";
import { World } from "../../../game/core/World";
import { reinforcedScrapRecovery, reinforcementQuote } from "../../../game/item/ForgeQuote";
import { ForgeSystem } from "../../../game/item/ForgeSystem";
import { emptyMaterialWallet, fixedItemInstance, type EquipmentComponent, type InventoryComponent } from "../../../game/item/ItemComponents";

function richWallet() {
  const wallet = emptyMaterialWallet();
  for (const key of Object.keys(wallet) as (keyof typeof wallet)[]) wallet[key] = 999;
  return wallet;
}

describe("reinforcementQuote", () => {
  it("quotes every deterministic +0 through +5 transition", () => {
    const item = fixedItemInstance(1, "item.ember_blade", "unique");
    const wallet = richWallet();
    for (let level = 0; level < 5; level += 1) {
      item.reinforce = level as typeof item.reinforce;
      const quote = reinforcementQuote(item, wallet);
      expect(quote).toMatchObject({ allowed: true, from: level, to: level + 1 });
      expect(quote.nextBaseMultiplier).toBeGreaterThan(quote.currentBaseMultiplier);
    }
    item.reinforce = 5;
    expect(reinforcementQuote(item, wallet)).toMatchObject({
      allowed: false, reason: "max_level", from: 5, to: 5,
    });
  });

  it("rejects each missing material including wrong-theme essence", () => {
    const item = fixedItemInstance(1, "item.ember_blade", "unique");
    item.reinforce = 2;
    const noScrap = richWallet();
    noScrap["material.scrap"] = 0;
    expect(reinforcementQuote(item, noScrap).reason).toBe("missing_scrap");
    const wrongEssence = richWallet();
    wrongEssence["material.ember_essence"] = 0;
    wrongEssence["material.frost_essence"] = 999;
    expect(reinforcementQuote(item, wrongEssence).reason).toBe("missing_essence");
    const noSeal = richWallet();
    noSeal["material.seal"] = 0;
    expect(reinforcementQuote(item, noSeal).reason).toBe("missing_seal");
  });

  it("recovers exactly forty percent of reinforced scrap spend", () => {
    const item = fixedItemInstance(1, "item.ember_blade", "unique");
    item.reinforce = 4;
    expect(reinforcedScrapRecovery(item)).toBe(Math.floor((4 + 8 + 14 + 22) * 0.4));
  });
});

describe("ForgeSystem", () => {
  it("recomputes costs, charges atomically, and rejects favorite/equipped salvage", () => {
    const world = new World();
    const actor = world.createEntity();
    const first = fixedItemInstance(1, "item.ember_blade", "unique");
    const second = fixedItemInstance(2, "item.ember_blade", "unique");
    const wallet = richWallet();
    world.setComponent<InventoryComponent>("inventory", actor, {
      nextItemId: 3, items: [first, second], recovery: [], materials: wallet,
    });
    world.setComponent<EquipmentComponent>("equipment", actor, { melee: 1 });
    const events: GameplayEvent[] = [];
    const system = new ForgeSystem();
    system.update(world, [{ type: "reinforce_item", actor, item: 2 }], events);
    expect(second.reinforce).toBe(1);
    expect(wallet["material.scrap"]).toBe(995);

    system.update(world, [{ type: "toggle_favorite", actor, item: 2 }], events);
    system.update(world, [{ type: "salvage_item", actor, item: 2 }], events);
    system.update(world, [{ type: "salvage_item", actor, item: 1 }], events);
    expect(events).toContainEqual({ type: "forge_rejected", actor, item: 2, reason: "favorite" });
    expect(events).toContainEqual({ type: "forge_rejected", actor, item: 1, reason: "equipped" });
  });

  it("returns rarity scrap plus forty percent of reinforced scrap spend", () => {
    const world = new World();
    const actor = world.createEntity();
    const item = fixedItemInstance(1, "item.unique.hearns_oathblade", "unique");
    item.reinforce = 4;
    const wallet = emptyMaterialWallet();
    world.setComponent<InventoryComponent>("inventory", actor, {
      nextItemId: 2, items: [item], recovery: [], materials: wallet,
    });
    world.setComponent<EquipmentComponent>("equipment", actor, {});
    const events: GameplayEvent[] = [];

    new ForgeSystem().update(world, [{ type: "salvage_item", actor, item: 1 }], events);

    const expected = 12 + Math.floor((4 + 8 + 14 + 22) * 0.4);
    expect(wallet["material.scrap"]).toBe(expected);
    expect(events).toContainEqual({ type: "item_salvaged", actor, item: 1, scrap: expected });
  });
});
