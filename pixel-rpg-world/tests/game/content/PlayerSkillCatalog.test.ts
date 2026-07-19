import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { evaluateAbilityRank } from "../../../game/ability/SkillRanks";
import { evaluatePassive } from "../../../game/ability/PassiveEvaluation";
import { createCoreContent } from "../../../game/content/coreContent";
import type { EffectNode } from "../../../game/content/Definitions";
import { PLAYER_ABILITY_IDS } from "../../../game/content/generated/abilities";

const ACTIVE_IDS = [
  "ability.battle_focus",
  "ability.ember_nova",
  "ability.frost_lance",
  "ability.gale_dash",
  "ability.hunter_volley",
  "ability.ice_ring",
  "ability.molten_guard",
  "ability.poison_trap",
  "ability.root_snare",
  "ability.shadow_step",
  "ability.storm_chain",
  "ability.warding_totem",
] as const;

const PASSIVE_IDS = [
  "passive.execution_rush",
  "passive.hawkeye",
  "passive.iron_vitality",
  "passive.runic_ward",
] as const;

function firstNode<T extends EffectNode["type"]>(
  node: EffectNode,
  type: T,
): Extract<EffectNode, { type: T }> | undefined {
  if (node.type === type) return node as Extract<EffectNode, { type: T }>;
  if (node.type === "sequence" || node.type === "parallel") {
    return node.children.map((child) => firstNode(child, type)).find(Boolean);
  }
  if (node.type === "delay" || node.type === "spawn_hazard" || node.type === "repeat") {
    return firstNode(node.child, type);
  }
  if (node.type === "if_targets") {
    return firstNode(node.then, type)
      ?? (node.otherwise ? firstNode(node.otherwise, type) : undefined);
  }
  return undefined;
}

describe("player skill catalog", () => {
  it("freezes exactly twelve actives with bounded cooldowns and reusable icon families", () => {
    const content = createCoreContent();
    expect([...PLAYER_ABILITY_IDS]).toEqual(ACTIVE_IDS);
    const abilities = ACTIVE_IDS.map((id) => content.ability(id));
    expect(new Set(abilities.map((ability) => ability.name)).size).toBe(12);
    expect(new Set(abilities.map((ability) => ability.icon)).size).toBeLessThanOrEqual(8);
    expect(abilities.every((ability) => ability.cooldown >= 4 && ability.cooldown <= 12)).toBe(true);
    expect(abilities.some((ability) => ability.tags.includes("movement"))).toBe(true);
    expect(abilities.some((ability) => ability.tags.includes("defense"))).toBe(true);
    expect(abilities.some((ability) => ability.tags.includes("area"))).toBe(true);
    expect(abilities.some((ability) => ability.tags.includes("summon"))).toBe(true);
    for (const ability of abilities) {
      for (const rank of [1, 2, 3, 4, 5] as const) {
        expect(() => evaluateAbilityRank(ability, rank)).not.toThrow();
      }
    }
  });

  it("matches the MVP base numbers and structural mechanics", () => {
    const content = createCoreContent();
    const expected = {
      "ability.ember_nova": { cooldown: 5, coefficient: 1.05, radius: 3 },
      "ability.shadow_step": { cooldown: 4, coefficient: 0.85 },
      "ability.frost_lance": { cooldown: 4, coefficient: 1.1, maxTargets: 1 },
      "ability.ice_ring": { cooldown: 7, coefficient: 0.65, radius: 2.8 },
      "ability.storm_chain": { cooldown: 5.5, coefficient: 0.75, maxTargets: 3 },
      "ability.gale_dash": { cooldown: 4.5, coefficient: 0.55 },
      "ability.poison_trap": { cooldown: 6, coefficient: 0.3, radius: 2.2, duration: 8 },
      "ability.root_snare": { cooldown: 8, coefficient: 0.2, radius: 2.4, duration: 2 },
      "ability.warding_totem": { cooldown: 12, duration: 6 },
      "ability.hunter_volley": { cooldown: 5, coefficient: 0.35, count: 5 },
    } as const;
    for (const [id, values] of Object.entries(expected)) {
      const ability = content.ability(id);
      expect(ability.cooldown).toBe(values.cooldown);
      const damage = firstNode(ability.effect, "damage")
        ?? firstNode(ability.effect, "spawn_projectile");
      if ("coefficient" in values) expect(damage?.value.coefficient).toBe(values.coefficient);
      const circle = firstNode(ability.effect, "query_circle");
      const hazard = firstNode(ability.effect, "spawn_hazard");
      if ("radius" in values) expect(hazard?.radius ?? circle?.radius).toBe(values.radius);
      if ("duration" in values) {
        expect(hazard?.duration ?? firstNode(ability.effect, "spawn_summon")?.duration)
          .toBe(values.duration);
      }
      if ("maxTargets" in values) {
        expect(firstNode(ability.effect, "chain_targets")?.maxTargets).toBe(values.maxTargets);
      }
      if ("count" in values) expect(firstNode(ability.effect, "repeat")?.count).toBe(values.count);
    }
    expect(evaluateAbilityRank(content.ability("ability.gale_dash"), 5).charges).toBe(2);
  });

  it("provides four explicit three-rank passives", () => {
    const content = createCoreContent();
    for (const id of PASSIVE_IDS) {
      const definition = content.passive(id);
      const ranks = ([1, 2, 3] as const).map((rank) => evaluatePassive(definition, rank));
      expect(ranks).toHaveLength(3);
      expect(ranks[1]).not.toEqual(ranks[0]);
      expect(ranks[2]).not.toEqual(ranks[1]);
    }
    expect(content.passive("passive.execution_rush").onKillStatus)
      .toBe("status.execution_rush");
  });

  it("contains no runtime skill-ID branches", async () => {
    const sources = await Promise.all([
      "game/ability/AbilitySystem.ts",
      "game/ability/EffectRunner.ts",
      "game/ability/HazardSystem.ts",
      "game/status/StatusSystem.ts",
    ].map((filename) => readFile(filename, "utf8")));
    expect(sources.join("\n")).not.toMatch(/(?:===|!==)\s*["']ability\.[a-z0-9_]+/);
  });
});
