import { describe, expect, it } from "vitest";
import {
  AbilityVfxRegistry,
  CORE_ABILITY_VISUAL_IDS,
} from "../../../game/adapters/babylon/art/AbilityVfxRegistry";
import { visualRecipeForEvent } from "../../../game/adapters/babylon/art/CombatVfx";
import type { EffectNode } from "../../../game/content/Definitions";
import { ABILITY_DATA } from "../../../game/content/generated/abilities";

function emittedVisuals(node: EffectNode): string[] {
  if (node.type === "emit_visual") return [node.visual];
  if (node.type === "sequence" || node.type === "parallel") {
    return node.children.flatMap(emittedVisuals);
  }
  if (node.type === "delay" || node.type === "spawn_hazard" || node.type === "repeat") {
    return emittedVisuals(node.child);
  }
  if (node.type === "if_targets") {
    return [
      ...emittedVisuals(node.then),
      ...(node.otherwise ? emittedVisuals(node.otherwise) : []),
    ];
  }
  return [];
}

describe("AbilityVfxRegistry", () => {
  it("resolves every core ability visual to a bounded recipe", () => {
    const registry = new AbilityVfxRegistry();
    for (const id of CORE_ABILITY_VISUAL_IDS) {
      const recipe = registry.resolve(id);
      expect(recipe.count).toBeGreaterThan(0);
      expect(recipe.count).toBeLessThanOrEqual(16);
      expect(recipe.life).toBeGreaterThan(0);
      expect(recipe.life).toBeLessThanOrEqual(1.2);
    }
    expect(registry.resolve("vfx.battle_focus").kind).toBe("buff_rune");
    expect(registry.resolve("vfx.ember_nova").kind).toBe("nova_ring");
    expect(registry.resolve("vfx.shadow_step").kind).toBe("step_trail");
  });

  it("resolves every player ability visual that gameplay can emit", () => {
    const registry = new AbilityVfxRegistry();
    const visuals = new Set<string>();
    for (const ability of ABILITY_DATA) {
      visuals.add(ability.visual);
      for (const visual of emittedVisuals(ability.effect as EffectNode)) visuals.add(visual);
      for (const bonus of ability.rankBonuses ?? []) {
        if ("effect" in bonus && bonus.effect) {
          for (const visual of emittedVisuals(bonus.effect as EffectNode)) visuals.add(visual);
        }
      }
    }
    const missing = [...visuals].filter((visual) => {
      try {
        registry.resolve(visual);
        return false;
      } catch {
        return true;
      }
    });
    expect(missing).toEqual([]);
  });

  it("rejects unknown IDs and maps only gameplay visual facts", () => {
    const registry = new AbilityVfxRegistry();
    expect(() => registry.resolve("vfx.unknown")).toThrow("Unknown ability visual");
    expect(visualRecipeForEvent({
      type: "ability_impact",
      actor: 1,
      ability: "ability.ember_nova",
      visual: "vfx.ember_nova",
      aimX: 2,
      aimZ: 0,
    }, registry)).toEqual(registry.resolve("vfx.ember_nova"));
    expect(visualRecipeForEvent({
      type: "action_started",
      actor: 1,
      action: "skill",
    }, registry)).toBeUndefined();
  });
});
