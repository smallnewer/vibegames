import { describe, expect, it } from "vitest";
import { ActorFactory } from "../../../game/actor/ActorFactory";
import type { ActorIdentityComponent } from "../../../game/actor/ActorIdentity";
import type { AbilityLoadoutComponent } from "../../../game/ability/AbilityComponents";
import type { AiStateComponent } from "../../../game/ai/AiComponents";
import type { BossStateComponent } from "../../../game/boss/BossComponents";
import { createCoreContent } from "../../../game/content/coreContent";
import { World } from "../../../game/core/World";

describe("ActorFactory", () => {
  it("creates a minion only from its registered script", () => {
    const world = new World();
    const actor = new ActorFactory(createCoreContent()).create(
      world,
      "enemy.ember_stalker",
      3,
      4,
    );

    expect(world.getComponent<ActorIdentityComponent>("actorIdentity", actor)).toMatchObject({
      archetype: "enemy.ember_stalker",
      role: "minion",
      visual: "visual.actor.ember_minion",
    });
    expect(world.getComponent<AiStateComponent>("aiState", actor)?.homeX).toBe(3);
    expect(world.getComponent<AbilityLoadoutComponent>("abilityLoadout", actor)?.slots.melee)
      .toBe("ability.stalker_bite");
  });

  it("adds Boss runtime state without special creation code", () => {
    const world = new World();
    const boss = new ActorFactory(createCoreContent()).create(
      world,
      "boss.ember_colossus",
      0,
      0,
    );

    expect(world.getComponent<BossStateComponent>("bossState", boss)).toEqual({
      phaseIndex: 0,
      abilityEpoch: 0,
      phaseEnterLeft: 0.8,
      enteredPhases: ["boss_phase.ember_colossus_1"],
    });
  });
});
