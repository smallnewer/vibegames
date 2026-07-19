import { describe, expect, it } from "vitest";
import type { AbilityLoadoutComponent } from "../../../game/ability/AbilityComponents";
import { PassiveTriggerSystem } from "../../../game/ability/PassiveTriggerSystem";
import { ActorFactory } from "../../../game/actor/ActorFactory";
import { createCoreContent } from "../../../game/content/coreContent";
import type { GameplayEvent } from "../../../game/core/GameplayEvent";
import { World } from "../../../game/core/World";
import type { StatusComponent } from "../../../game/status/StatusComponents";
import { StatusSystem } from "../../../game/status/StatusSystem";

describe("PassiveTriggerSystem", () => {
  it("applies the authored on-kill status to the lethal damage source", () => {
    const content = createCoreContent();
    const world = new World();
    const factory = new ActorFactory(content);
    const hero = factory.create(world, "hero.ember_runner", 0, 0, { playerSlot: 1 });
    const enemy = factory.create(world, "enemy.ember_stalker", 1, 0);
    world.getComponent<AbilityLoadoutComponent>("abilityLoadout", hero)!.passives.passive_1 =
      "passive.execution_rush";
    const system = new PassiveTriggerSystem(content, new StatusSystem(content));
    const facts: GameplayEvent[] = [
      {
        type: "damage_applied",
        source: hero,
        target: enemy,
        amount: 99,
        damageType: "physical",
        critical: false,
        skillId: "ability.basic_melee",
      },
      { type: "actor_died", actor: enemy },
    ];
    const events: GameplayEvent[] = [];
    system.update(world, facts, events);

    expect(world.getComponent<StatusComponent>("statuses", hero)!.values)
      .toEqual([expect.objectContaining({ id: "status.execution_rush", source: hero })]);
    expect(events.filter((event) => event.type === "status_added")).toHaveLength(1);
  });
});
