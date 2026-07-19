import { expect, it } from "vitest";
import { visibleSectionIds } from "../../../game/adapters/babylon/art/SectionVisibility";
import type { DungeonSectionDef } from "../../../game/dungeon/DungeonDefinitions";

function section(id: string, gridX: number, gridZ: number): DungeonSectionDef {
  return { id, preset: "foundation_room", gridX, gridZ, rotation: 0 };
}

it("keeps only the current screen and orthogonal neighbors visible", () => {
  const sections = [
    section("section.current", 0, 0),
    section("section.east", 1, 0),
    section("section.west", -1, 0),
    section("section.north", 0, -1),
    section("section.south", 0, 1),
    section("section.far_east", 2, 0),
    section("section.far_west", -2, 0),
    section("section.far_north", 0, -2),
    section("section.far_south", 0, 2),
    section("section.remote", 2, 2),
  ];

  const visible = visibleSectionIds(sections, 0, 0);
  expect(visible).toEqual([
    "section.current",
    "section.north",
    "section.south",
    "section.east",
    "section.west",
  ]);
  expect(visible).toHaveLength(5);
});

it("falls back to the nearest authored screen outside a section", () => {
  const sections = [section("section.a", 0, 0), section("section.b", 2, 0)];
  expect(visibleSectionIds(sections, 22, 0)[0]).toBe("section.b");
});
