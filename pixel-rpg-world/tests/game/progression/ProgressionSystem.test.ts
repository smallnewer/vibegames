import { describe, expect, it } from "vitest";
import { ProgressionSystem } from "../../../game/progression/ProgressionSystem";
import type { ProgressionComponent } from "../../../game/progression/ProgressionComponents";
import { World } from "../../../game/core/World";
import type { AbilityBookComponent } from "../../../game/item/ItemComponents";

function setup(level = 1) {
  const world = new World();
  const actor = world.createEntity();
  const progression: ProgressionComponent = {
    level,
    experience: 0,
    unspentAttributes: 0,
    unspentSkills: 1,
    allocated: { might: 10, finesse: 10, vitality: 10, resolve: 10 },
  };
  world.setComponent("progression", actor, progression);
  return { world, actor, progression, system: new ProgressionSystem() };
}

describe("ProgressionSystem", () => {
  it("crosses three levels in one grant and awards deterministic points", () => {
    const { world, actor, progression, system } = setup();
    const events = [];
    system.grantExperience(world, actor, 100 + 290 + 550 + 12, events);
    expect(progression).toMatchObject({
      level: 4,
      experience: 12,
      unspentAttributes: 9,
      unspentSkills: 2,
    });
    expect(events).toContainEqual({ type: "progression_leveled", actor, from: 1, to: 4 });
  });

  it("clamps level 30 and rejects negative experience", () => {
    const capped = setup(29);
    capped.system.grantExperience(capped.world, capped.actor, 100_000, []);
    expect(capped.progression.level).toBe(30);
    expect(capped.progression.experience).toBe(0);
    expect(() => capped.system.grantExperience(capped.world, capped.actor, -1, [])).toThrow(/negative/i);
  });

  it("validates and applies attribute allocation commands", () => {
    const { world, actor, progression, system } = setup();
    progression.unspentAttributes = 4;
    system.update(world, [{ type: "allocate_attribute", actor, attribute: "vitality", amount: 3 }], []);
    expect(progression.allocated.vitality).toBe(13);
    expect(progression.unspentAttributes).toBe(1);
    for (const amount of [0, -1, 1.5, 2]) {
      expect(() => system.update(world, [
        { type: "allocate_attribute", actor, attribute: "might", amount },
      ], [])).toThrow(/attribute|amount|unspent/i);
    }
  });

  it("resets only points above the four starting values and only when allowed", () => {
    const { world, actor, progression, system } = setup();
    progression.allocated = { might: 12, finesse: 15, vitality: 10, resolve: 11 };
    const command = { type: "reset_attributes", actor } as const;

    system.update(world, [command], []);
    expect(progression.allocated).toEqual({ might: 12, finesse: 15, vitality: 10, resolve: 11 });

    const events = [];
    system.update(world, [command], events, { allowAttributeReset: true });
    expect(progression.allocated).toEqual({ might: 10, finesse: 10, vitality: 10, resolve: 10 });
    expect(progression.unspentAttributes).toBe(8);
    expect(events).toContainEqual({ type: "attributes_reset", actor, refunded: 8 });
  });

  it("spends one point per rank and caps active skills at five and passives at three", () => {
    const { world, actor, progression, system } = setup();
    progression.unspentSkills = 7;
    progression.skillRanks = { "ability.ember_nova": 1, "passive.iron_vitality": 1 };
    world.setComponent<AbilityBookComponent>("abilityBook", actor, {
      unlocked: ["ability.ember_nova", "passive.iron_vitality"],
    });
    const events = [];
    for (let expected = 2; expected <= 5; expected += 1) {
      system.update(world, [{ type: "rank_up_skill", actor, ability: "ability.ember_nova" }], events);
      expect(progression.skillRanks["ability.ember_nova"]).toBe(expected);
    }
    system.update(world, [{ type: "rank_up_skill", actor, ability: "ability.ember_nova" }], events);
    system.update(world, [{ type: "rank_up_skill", actor, ability: "passive.iron_vitality" }], events);
    system.update(world, [{ type: "rank_up_skill", actor, ability: "passive.iron_vitality" }], events);
    system.update(world, [{ type: "rank_up_skill", actor, ability: "passive.iron_vitality" }], events);
    expect(progression.skillRanks["ability.ember_nova"]).toBe(5);
    expect(progression.skillRanks["passive.iron_vitality"]).toBe(3);
    expect(progression.unspentSkills).toBe(1);
    expect(events.filter((event) => event.type === "skill_ranked_up")).toHaveLength(6);
  });
});
