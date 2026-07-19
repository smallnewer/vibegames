import { describe, expect, it } from "vitest";
import {
  getHumanoidAppearance,
  HUMANOID_APPEARANCES,
} from "../../../game/adapters/babylon/art/HumanoidAppearance";
import {
  getEquipmentAppearance,
  HUMANOID_EQUIPMENT_APPEARANCES,
} from "../../../game/adapters/babylon/art/EquipmentAppearance";

describe("HumanoidAppearance", () => {
  it("keeps body surfaces and wearable geometry in data", () => {
    const hero = getHumanoidAppearance("appearance.hero.ember");

    expect(hero.body.torso).toBe("shirt");
    expect(hero.body.upperArmL).toBe("shirt");
    expect(hero.wearables.some((wearable) => wearable.slot === "hair")).toBe(true);
    expect(hero.wearables.some((wearable) => wearable.slot === "wrists")).toBe(true);
  });

  it("provides one recipe for each current humanoid role", () => {
    expect(HUMANOID_APPEARANCES.map((appearance) => appearance.id)).toEqual([
      "appearance.boss.ember",
      "appearance.hero.ember",
      "appearance.minion.ember",
      "appearance.sentinel.ember",
    ]);
  });

  it("fails clearly for unknown appearance IDs", () => {
    expect(() => getHumanoidAppearance("appearance.missing")).toThrowError(
      "Unknown humanoid appearance: appearance.missing",
    );
  });

  it("resolves clothing and weapon recipes independently from the actor skin", () => {
    const coat = getEquipmentAppearance("equipment.chest.ember_coat");
    const blade = getEquipmentAppearance("equipment.weapon.ember_blade");

    expect(coat.slot).toBe("chest");
    expect(coat.surfaces?.torso).toBe("cloth");
    expect(blade.weapon?.anchor).toBe("melee");
    expect(blade.weapon?.pieces.length).toBeGreaterThanOrEqual(8);
    expect(new Set(HUMANOID_EQUIPMENT_APPEARANCES.map((value) => value.id)).size)
      .toBe(HUMANOID_EQUIPMENT_APPEARANCES.length);
  });
});
