import { describe, expect, it } from "vitest";
import { DungeonRegistry } from "../../../game/content/DungeonRegistry";
import {
  discoverPlayerSections,
  sectionContaining,
} from "../../../game/map/MapDiscoverySystem";

const pack = new DungeonRegistry().get("dungeon.production_foundation");

describe("map discovery", () => {
  it("discovers authored containment once and shares it across local players", () => {
    const state = { discoveredSections: [] as string[] };
    expect(discoverPlayerSections(state, pack.map, [
      { x: 0, z: 12, lifeState: "alive" },
      { x: 18, z: 24, lifeState: "downed" },
    ])).toBe(true);
    expect(state.discoveredSections).toEqual([
      "section.ember_entry",
      "section.ember_prison",
    ]);
    expect(discoverPlayerSections(state, pack.map, [{ x: 0, z: 12 }])).toBe(false);
  });

  it("ignores dead players and positions outside authored sections", () => {
    const state = { discoveredSections: [] as string[] };
    expect(discoverPlayerSections(state, pack.map, [
      { x: 18, z: 12, lifeState: "dead" },
      { x: -200, z: -200, lifeState: "alive" },
    ])).toBe(false);
    expect(state.discoveredSections).toEqual([]);
  });

  it("resolves shared section edges deterministically", () => {
    expect(sectionContaining(pack.map, 27, 0)?.id).toBe("section.ember_corridor");
  });
});
