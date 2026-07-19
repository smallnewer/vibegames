import { describe, expect, it } from "vitest";
import type { ActorArchetypeDef } from "../../../game/content/ActorDefinitions";
import { createCoreContent } from "../../../game/content/coreContent";

describe("actor content scripts", () => {
  it("registers the reusable prison roles and both three-phase Boss scripts", () => {
    const content = createCoreContent();
    expect(content.actorDefinitions().map((actor) => actor.id)).toEqual([
      "boss.ember_colossus",
      "boss.warden_hearn",
      "elite.ember_champion",
      "enemy.crystal_turret",
      "enemy.ember_gaoler",
      "enemy.ember_stalker",
      "enemy.furnace_slinger",
      "hero.ember_runner",
      "summon.warding_totem",
    ]);
    expect(content.actor("enemy.ember_stalker")).toMatchObject({
      role: "minion",
      visual: "visual.actor.ember_minion",
      ai: { aggroRange: 9, leashRange: 14 },
    });
    expect(content.actor("boss.ember_colossus").boss?.phases.map((phase) => (
      phase.startsAtHealthRatio
    ))).toEqual([1, 0.65, 0.3]);
    expect(content.actor("enemy.furnace_slinger").ai?.actions[0]).toMatchObject({
      minRange: 4,
      maxRange: 8,
    });
    expect(content.actor("boss.warden_hearn").boss?.phases).toMatchObject([
      { id: "phase.iron_oath" },
      {
        id: "phase.burning_edict",
        actions: expect.arrayContaining([expect.objectContaining({
          slot: "skill_down",
          maxUsesPerPhase: 1,
        })]),
      },
      { id: "phase.last_lock" },
    ]);
  });

  it("rejects an invalid boss script without runtime special cases", () => {
    const content = createCoreContent();
    const source = content.actor("boss.ember_colossus");
    const broken = {
      ...source,
      id: "boss.invalid",
      boss: {
        phases: source.boss!.phases.map((phase, index) => ({
          ...phase,
          startsAtHealthRatio: index === 1 ? 1 : phase.startsAtHealthRatio,
        })),
      },
    } satisfies ActorArchetypeDef;
    content.registerActor(broken);
    expect(() => content.validate()).toThrow("strictly descending");
  });

  it("rejects active/passive mismatches and missing actor visual references", () => {
    const content = createCoreContent();
    const source = content.actor("enemy.ember_stalker");
    content.registerActor({
      ...source,
      id: "enemy.invalid_visual",
      visual: "visual.missing",
    });
    expect(() => content.validate()).toThrow("Unknown actor visual");
  });
});
