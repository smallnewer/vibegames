import { expect, it } from "vitest";
import type { ActorComponent } from "../../../game/actor/ActorComponents";
import { createCoreContent } from "../../../game/content/coreContent";
import type { GameplayEvent } from "../../../game/core/GameplayEvent";
import { World } from "../../../game/core/World";
import type { StatusComponent } from "../../../game/status/StatusComponents";
import { StatusSystem } from "../../../game/status/StatusSystem";

it("refreshes one status instance and removes it after its fixed duration", () => {
  const world = new World();
  const hero = world.createEntity();
  world.setComponent<ActorComponent>("actor", hero, {
    faction: "hero",
    action: "idle",
    actionLeft: 0,
    actionDuration: 0,
    moveX: 0,
    moveZ: 0,
    speed: 4.2,
    radius: 0.45,
    rollCooldownLeft: 0,
    invulnerableLeft: 0,
  });
  world.setComponent<StatusComponent>("statuses", hero, { values: [] });
  const events: GameplayEvent[] = [];
  const system = new StatusSystem(createCoreContent());

  expect(system.apply(world, hero, "status.battle_focus", 1, events)).toBe(true);
  system.update(world, 1, events);
  expect(system.apply(world, hero, "status.battle_focus", 1, events)).toBe(true);
  expect(world.getComponent<StatusComponent>("statuses", hero)!.values).toEqual([
    { id: "status.battle_focus", stacks: 1, duration: 4, timeLeft: 4 },
  ]);

  for (let tick = 0; tick < 241; tick += 1) system.update(world, 1 / 60, events);
  expect(world.getComponent<StatusComponent>("statuses", hero)!.values).toEqual([]);
  expect(events.some((event) => event.type === "status_removed")).toBe(true);
});

it("captures rank-scaled duration, source, and periodic magnitude at application time", () => {
  const world = new World();
  const source = world.createEntity();
  const target = world.createEntity();
  for (const entity of [source, target]) {
    world.setComponent<ActorComponent>("actor", entity, {
      faction: entity === source ? "hero" : "enemy",
      action: "idle",
      actionLeft: 0,
      actionDuration: 0,
      moveX: 0,
      moveZ: 0,
      speed: 4,
      radius: 0.5,
      rollCooldownLeft: 0,
      invulnerableLeft: 0,
    });
    world.setComponent<StatusComponent>("statuses", entity, { values: [] });
  }
  const system = new StatusSystem(createCoreContent());
  system.apply(world, target, "status.battle_focus", 1, [], {
    source,
    sourceSkillRank: 3,
    durationAdd: 2,
    periodicMagnitude: 9,
  });
  const applied = world.getComponent<StatusComponent>("statuses", target)!.values[0];
  expect(applied).toMatchObject({
    id: "status.battle_focus",
    source,
    sourceSkillRank: 3,
    duration: 6,
    timeLeft: 6,
    periodicMagnitude: 9,
  });

  system.update(world, 1, []);
  expect(applied.timeLeft).toBe(5);
  expect(applied.sourceSkillRank).toBe(3);
  expect(applied.periodicMagnitude).toBe(9);
});
