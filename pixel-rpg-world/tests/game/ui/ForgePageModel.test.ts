import { describe, expect, it } from "vitest";
import { GameSimulation } from "../../../game/core/GameSimulation";
import type { GameSnapshot } from "../../../game/core/GameSnapshot";
import type { ReinforcementQuote } from "../../../game/item/ForgeQuote";
import { buildForgePageModel } from "../../../game/ui/ForgePageModel";

function withQuote(
  snapshot: GameSnapshot,
  itemId: number,
  quote: ReinforcementQuote,
): GameSnapshot {
  const progress = {
    ...snapshot.progress,
    forgeQuotes: { ...snapshot.progress.forgeQuotes, [itemId]: quote },
  };
  return { ...snapshot, players: [{ ...snapshot.players[0], progress }], progress };
}

describe("ForgePageModel", () => {
  it("lists only owned main-inventory equipment and disables +5 items", () => {
    const source = new GameSimulation({ runSeed: 5 }).snapshot();
    const item = source.progress.items[0];
    const maxed: ReinforcementQuote = {
      ...source.progress.forgeQuotes[item.id],
      allowed: false,
      reason: "max_level",
      from: 5,
      to: 5,
      cost: Object.fromEntries(Object.keys(source.progress.materials).map((id) => [id, 0])) as ReinforcementQuote["cost"],
    };
    const model = buildForgePageModel(withQuote(source, item.id, maxed), 1, {
      focusId: `forge:item:${item.id}`,
    });
    expect(model.entries).toHaveLength(source.progress.items.length);
    expect(model.entries.some((entry) => source.progress.recovery.some((item) => item.id === entry.id)))
      .toBe(false);
    expect(model.selected).toMatchObject({ level: 5, canReinforce: false, reason: "已达 +5" });
  });

  it("shows exact costs, missing amounts, theme essence label and core base quote", () => {
    const source = new GameSimulation({ runSeed: 5 }).snapshot();
    const item = source.progress.items[0];
    const cost = { ...source.progress.materials, "material.scrap": 8, "material.ember_essence": 2 };
    const quote: ReinforcementQuote = {
      ...source.progress.forgeQuotes[item.id],
      allowed: false,
      reason: "missing_scrap",
      from: 1,
      to: 2,
      cost,
      baseStat: { stat: "meleePower", current: 40, next: 46.8 },
      statDelta: { meleePower: 6.8 },
    };
    const model = buildForgePageModel(withQuote(source, item.id, quote), 1, {
      focusId: `forge:item:${item.id}`,
    });
    expect(model.selected?.materials).toEqual([
      expect.objectContaining({ id: "material.scrap", need: 8, have: 0, missing: 8 }),
      expect.objectContaining({
        id: "material.ember_essence",
        label: "余烬精华",
        color: "#d76a35",
        need: 2,
        missing: 2,
      }),
    ]);
    expect(model.selected?.base).toEqual({ stat: "meleePower", current: 40, next: 46.8 });
    expect(model.selected?.affixesUnchanged).toBe(true);
  });
});
