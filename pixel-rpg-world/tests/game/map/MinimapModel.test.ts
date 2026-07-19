import { describe, expect, it } from "vitest";
import { DungeonRegistry } from "../../../game/content/DungeonRegistry";
import { GameSimulation } from "../../../game/core/GameSimulation";
import { buildMinimap } from "../../../game/map/MinimapModel";

const registry = new DungeonRegistry();
const pack = registry.get("dungeon.production_foundation");

function fullyDiscovered() {
  const snapshot = new GameSimulation({
    dungeonId: pack.id,
    playerCount: 2,
  }, registry).snapshot();
  return {
    ...snapshot,
    mapDiscovery: { discoveredSections: pack.map.sections.map((section) => section.id) },
  };
}

describe("minimap projection", () => {
  it("projects non-linear world bounds into 176x132 with fixed aspect and padding", () => {
    const model = buildMinimap(fullyDiscovered(), pack);
    expect(model).toMatchObject({ width: 176, height: 132 });
    expect(model.sections).toHaveLength(pack.map.sections.length);
    for (const section of model.sections) {
      expect(section.x).toBeGreaterThanOrEqual(8);
      expect(section.y).toBeGreaterThanOrEqual(8);
      expect(section.x + section.width).toBeLessThanOrEqual(168.001);
      expect(section.y + section.height).toBeLessThanOrEqual(124.001);
      expect(section.width / section.height).toBeCloseTo(18 / 12);
    }
  });

  it("keeps the same world axes and geometry in the compact 144x108 projection", () => {
    const normal = buildMinimap(fullyDiscovered(), pack);
    const compact = buildMinimap(fullyDiscovered(), pack, 144, 108);
    expect(compact).toMatchObject({ width: 144, height: 108 });
    const entryNormal = normal.sections.find((section) => section.id === "section.ember_entry")!;
    const prisonNormal = normal.sections.find((section) => section.id === "section.ember_prison")!;
    const entryCompact = compact.sections.find((section) => section.id === "section.ember_entry")!;
    const prisonCompact = compact.sections.find((section) => section.id === "section.ember_prison")!;
    expect(prisonNormal.y).toBeLessThan(entryNormal.y);
    expect(prisonCompact.y).toBeLessThan(entryCompact.y);
    expect(entryCompact.width / entryCompact.height).toBeCloseTo(1.5);
  });

  it("exposes discovered rooms plus immediate adjacent outlines and clamps players", () => {
    const snapshot = new GameSimulation({ dungeonId: pack.id }, registry).snapshot();
    const model = buildMinimap(snapshot, pack);
    expect(model.sections.filter((section) => section.discovered).map((section) => section.id))
      .toEqual(["section.ember_entry"]);
    expect(model.sections.filter((section) => section.adjacent).map((section) => section.id))
      .toEqual(["section.ember_living"]);
    expect(model.players).toHaveLength(1);
    expect(model.players[0].x).toBeGreaterThanOrEqual(8);
    expect(model.players[0].x).toBeLessThanOrEqual(168);
  });

  it("places visible door and objective markers but never includes minions", () => {
    const model = buildMinimap(fullyDiscovered(), pack);
    expect(model.markers.some((marker) => marker.kind === "door" && marker.visible)).toBe(true);
    expect(model.markers.some((marker) => marker.kind === "objective" && marker.visible)).toBe(true);
    expect(model.markers.every((marker) => !marker.id.includes("minion"))).toBe(true);
  });

  it("reveals Boss after intro and exit only for reward/completed phases", () => {
    const base = fullyDiscovered();
    expect(buildMinimap(base, pack).markers.some((marker) => marker.kind === "boss")).toBe(false);
    const boss = buildMinimap({ ...base, run: { ...base.run, phase: "boss_intro" } }, pack);
    expect(boss.markers).toContainEqual(expect.objectContaining({ kind: "boss", visible: true }));
    expect(boss.markers.some((marker) => marker.kind === "exit")).toBe(false);
    const reward = buildMinimap({ ...base, run: { ...base.run, phase: "reward" } }, pack);
    expect(reward.markers).toContainEqual(expect.objectContaining({ kind: "exit", visible: true }));
  });
});
