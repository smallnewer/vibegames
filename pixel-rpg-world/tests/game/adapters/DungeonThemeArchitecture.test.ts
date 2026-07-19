import { expect, it } from "vitest";
import {
  THEME_ARCHITECTURE_KEYS,
  themeArchitectureKey,
} from "../../../game/adapters/babylon/art/DungeonThemeArchitecture";

it("assigns every formal dungeon a distinct architecture language", () => {
  const themes = [
    "theme.ember_bastion",
    "theme.frost_mine",
    "theme.sunken_archive",
    "theme.moss_sanctum",
    "theme.storm_throne",
  ];
  const resolved = themes.map(themeArchitectureKey);

  expect(new Set(resolved).size).toBe(themes.length);
  expect(resolved).toEqual(THEME_ARCHITECTURE_KEYS);
  expect(themeArchitectureKey("theme.unknown")).toBeUndefined();
});
