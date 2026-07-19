import { describe, expect, it } from "vitest";
import type { ItemSnapshot } from "../../../game/core/GameSnapshot";
import { GameSimulation } from "../../../game/core/GameSimulation";
import { buildInventoryPageModel } from "../../../game/ui/InventoryPageModel";

describe("InventoryPageModel", () => {
  it("always emits 30 stable main cells and 12 recovery cells", () => {
    const snapshot = new GameSimulation({ runSeed: 12 }).snapshot();
    const model = buildInventoryPageModel(snapshot, 1, {
      view: "items",
      sort: "newest",
      focusId: "inventory:item:7",
    });
    expect(model.cells).toHaveLength(30);
    expect(model.recoveryCells).toHaveLength(12);
    expect(model.cells.filter((cell) => cell.enabled)).toHaveLength(snapshot.progress.items.length);
    expect(model.cells[0].item?.id).toBe(7);
    expect(model.selected?.id).toBe(7);
  });

  it("sorts view cells without changing item identity or storage order", () => {
    const snapshot = new GameSimulation({ runSeed: 12 }).snapshot();
    const originalIds = snapshot.progress.items.map((item) => item.id);
    const bySlot = buildInventoryPageModel(snapshot, 1, {
      view: "items",
      sort: "slot",
      focusId: "",
    });
    expect(snapshot.progress.items.map((item) => item.id)).toEqual(originalIds);
    expect(new Set(bySlot.cells.flatMap((cell) => cell.item?.id ?? []))).toEqual(new Set(originalIds));
    expect(bySlot.sort).toBe("slot");
  });

  it("shows exact level requirement, base/affixes and meaningful comparison", () => {
    const snapshot = new GameSimulation({ runSeed: 12 }).snapshot();
    const template = snapshot.progress.items[0];
    const high: ItemSnapshot = {
      ...template,
      id: 88,
      definition: "item.base.longblade",
      name: "High Longblade",
      slot: "melee",
      itemLevel: snapshot.progress.level + 5,
      affixes: [{ definition: "affix.offense_crit", roll: 5_000 }],
      equipped: false,
    };
    const progress = { ...snapshot.progress, items: [...snapshot.progress.items, high] };
    const model = buildInventoryPageModel(
      { ...snapshot, players: [{ ...snapshot.players[0], progress }], progress },
      1,
      { view: "items", sort: "newest", focusId: "inventory:item:88" },
    );
    expect(model.selected).toMatchObject({
      id: 88,
      requiredLevel: snapshot.progress.level + 3,
      canEquip: false,
    });
    expect(model.selected?.affixes).toHaveLength(1);
    expect(model.selected?.comparison.deltas.length).toBeGreaterThan(0);
  });

  it("keeps item details visible while its salvage action has focus", () => {
    const snapshot = new GameSimulation({ runSeed: 12 }).snapshot();
    const item = snapshot.progress.items.find((entry) => !entry.equipped) ?? snapshot.progress.items[0];
    const model = buildInventoryPageModel(snapshot, 1, {
      view: "items",
      sort: "newest",
      focusId: `inventory:salvage:${item.id}`,
    });
    expect(model.selected?.id).toBe(item.id);
  });
});
