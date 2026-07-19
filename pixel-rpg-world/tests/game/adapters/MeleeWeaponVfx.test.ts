import { describe, expect, it } from "vitest";
import { MELEE_WEAPON_APPEARANCES } from "../../../game/adapters/babylon/art/MeleeWeaponAppearance";
import {
  MELEE_SLASH_RECIPES,
  U41_SLASH_V2_RECIPE,
} from "../../../game/adapters/babylon/art/MeleeSlashVfx";
import { STATUS_VFX_RECIPES } from "../../../game/adapters/babylon/art/StatusVfxRegistry";

describe("melee and status VFX contracts", () => {
  it("provides one distinct appearance and slash recipe per weapon", () => {
    expect(MELEE_WEAPON_APPEARANCES).toHaveLength(16);
    expect(Object.keys(MELEE_SLASH_RECIPES)).toHaveLength(16);
    expect(MELEE_SLASH_RECIPES["vfx.melee.rust_blade"].layers).toBe(1);
    expect(MELEE_SLASH_RECIPES["vfx.melee.ember_blade"].layers).toBe(3);
    expect(MELEE_SLASH_RECIPES["vfx.melee.ember_blade"].angle)
      .toBeGreaterThan(MELEE_SLASH_RECIPES["vfx.melee.rust_blade"].angle);
  });

  it("defines the textured U41 slash in a shallow action-local plane", () => {
    expect(U41_SLASH_V2_RECIPE.planeTiltDegrees).toBe(20);
    expect(U41_SLASH_V2_RECIPE.forward).toBeGreaterThan(0);
    expect(U41_SLASH_V2_RECIPE.height).toBeGreaterThan(0.6);
    expect(U41_SLASH_V2_RECIPE.maskTexture).toMatch(/slash-line\.png$/);
    expect(U41_SLASH_V2_RECIPE.noiseTexture).toMatch(/fractal-noise\.png$/);
  });

  it("keeps all six persistent status visuals bounded and data driven", () => {
    expect(Object.keys(STATUS_VFX_RECIPES)).toEqual([
      "vfx.status.frozen",
      "vfx.status.poisoned",
      "vfx.status.burning",
      "vfx.status.stunned",
      "vfx.status.shrunk",
      "vfx.status.enlarged",
    ]);
    expect(STATUS_VFX_RECIPES["vfx.status.shrunk"].actorScale).toBeLessThan(1);
    expect(STATUS_VFX_RECIPES["vfx.status.enlarged"].actorScale).toBeGreaterThan(1);
  });
});
