import { describe, expect, it } from "vitest";
import { GameSimulation } from "../../../game/core/GameSimulation";
import type { GameSnapshot, PlayerSlotSnapshot } from "../../../game/core/GameSnapshot";
import {
  buildCharacterPageModel,
  type CharacterPageModel,
} from "../../../game/ui/CharacterPageModel";

function page(inDungeon = true): CharacterPageModel {
  const snapshot = new GameSimulation({ runSeed: 19 }).snapshot();
  return buildCharacterPageModel(snapshot, 1, { inDungeon });
}

function withFireResistance(snapshot: GameSnapshot, value: number): GameSnapshot {
  const original = snapshot.players[0];
  const progress = {
    ...original.progress,
    stats: { ...original.progress.stats, fireResist: value },
    statBreakdown: {
      ...original.progress.statBreakdown,
      fireResist: {
        ...original.progress.statBreakdown.fireResist,
        value,
      },
    },
  };
  const player: PlayerSlotSnapshot = { ...original, progress };
  return { ...snapshot, players: [player], progress };
}

describe("CharacterPageModel", () => {
  it("keeps primary attributes and stat sections in a fixed readable order", () => {
    const model = page();
    expect(model.attributes.map((attribute) => attribute.id)).toEqual([
      "might",
      "finesse",
      "vitality",
      "resolve",
    ]);
    expect(model.sections.map((section) => section.id)).toEqual([
      "offense",
      "defense",
      "utility",
    ]);
    expect(model.sections[0].rows.map((row) => row.id)).toEqual([
      "meleePower",
      "rangedPower",
      "skillPower",
      "critChance",
      "critDamage",
      "attackSpeed",
      "cooldownRecovery",
      "damageBonus",
    ]);
    expect(model.sections[1].rows.map((row) => row.id)).toEqual([
      "maxHealth",
      "armor",
      "fireResist",
      "iceResist",
      "poisonResist",
      "stormResist",
      "damageReduction",
    ]);
  });

  it("shows unspent points, source breakdowns, armor mitigation and route-only reset", () => {
    const dungeon = page(true);
    expect(dungeon.unspentAttributes).toBe(0);
    expect(dungeon.sections.flatMap((section) => section.rows).every((row) => (
      Number.isFinite(row.source.value)
    ))).toBe(true);
    expect(dungeon.sections[1].rows.find((row) => row.id === "armor")?.detail)
      .toMatch(/减伤/);
    expect(dungeon.reset.enabled).toBe(false);
    expect(dungeon.reset.reason).toMatch(/地下城/);

    const route = page(false);
    expect(route.reset.reason).toMatch(/没有已分配/);
  });

  it("formats percent values at the resistance cap", () => {
    const snapshot = withFireResistance(new GameSimulation({ runSeed: 7 }).snapshot(), 0.75);
    const model = buildCharacterPageModel(snapshot, 1, { inDungeon: false });
    const fire = model.sections[1].rows.find((row) => row.id === "fireResist")!;
    expect(fire.formatted).toBe("75.0%");
    expect(fire.source.value).toBe(0.75);
  });
});
