import { expect, it } from "vitest";
import type { ActorComponent, TransformComponent } from "../../../game/actor/ActorComponents";
import type { GameplayEvent } from "../../../game/core/GameplayEvent";
import { World } from "../../../game/core/World";
import type {
  DungeonStateComponent,
  EncounterMemberComponent,
  InteractableComponent,
} from "../../../game/dungeon/DungeonComponents";
import { DungeonSystem } from "../../../game/dungeon/DungeonSystem";
import { createTrainingDungeonDef } from "../../../game/dungeon/trainingDungeon";

it("starts on enter and completes after every encounter member dies", () => {
  const definition = createTrainingDungeonDef();
  const world = new World();
  const hero = world.createEntity();
  world.setComponent<TransformComponent>("transform", hero, {
    x: -3,
    z: 0,
    previousX: -3,
    previousZ: 0,
    facingX: 1,
    facingZ: 0,
  });
  world.setComponent<ActorComponent>("actor", hero, {
    faction: "hero",
    action: "idle",
    actionLeft: 0,
    actionDuration: 0,
    moveX: 0,
    moveZ: 0,
    speed: 0,
    radius: 0.45,
    rollCooldownLeft: 0,
    invulnerableLeft: 0,
  });
  const dungeon = world.createEntity();
  world.setComponent<DungeonStateComponent>("dungeon", dungeon, {
    definition: definition.id,
    resources: { [definition.manifest.resource.id]: 0 },
    encounter: "idle",
    door: "locked",
    portalUses: 0,
  });
  const trigger = world.createEntity();
  world.setComponent<InteractableComponent>("interactable", trigger, {
    definition: definition.interactions.find((value) => value.kind === "encounter")!.id,
    state: "idle",
  });
  const enemy = world.createEntity();
  world.setComponent<ActorComponent>("actor", enemy, {
    faction: "enemy",
    action: "idle",
    actionLeft: 0,
    actionDuration: 0,
    moveX: 0,
    moveZ: 0,
    speed: 0,
    radius: 0.6,
    rollCooldownLeft: 0,
    invulnerableLeft: 0,
  });
  world.setComponent<EncounterMemberComponent>("encounterMember", enemy, {
    encounter: definition.encounters[0].id,
  });
  const events: GameplayEvent[] = [];
  const system = new DungeonSystem(definition);

  system.update(world, dungeon, [hero], events);
  expect(world.getComponent<DungeonStateComponent>("dungeon", dungeon)!.encounter).toBe("idle");

  const companion = world.createEntity();
  world.setComponent<TransformComponent>("transform", companion, {
    x: 0,
    z: 0,
    previousX: 0,
    previousZ: 0,
    facingX: 1,
    facingZ: 0,
  });
  world.setComponent<ActorComponent>("actor", companion, {
    faction: "hero",
    action: "idle",
    actionLeft: 0,
    actionDuration: 0,
    moveX: 0,
    moveZ: 0,
    speed: 0,
    radius: 0.45,
    rollCooldownLeft: 0,
    invulnerableLeft: 0,
  });
  system.update(world, dungeon, [hero, companion], events);
  expect(world.getComponent<DungeonStateComponent>("dungeon", dungeon)!.encounter).toBe("active");
  expect(events.filter((event) => event.type === "encounter_started")).toHaveLength(1);

  system.update(world, dungeon, [hero, companion], events);
  world.getComponent<ActorComponent>("actor", enemy)!.action = "dead";
  system.update(world, dungeon, [hero, companion], events);
  system.update(world, dungeon, [hero, companion], events);
  expect(world.getComponent<DungeonStateComponent>("dungeon", dungeon)!.encounter)
    .toBe("completed");
  expect(world.getComponent<InteractableComponent>("interactable", trigger)!.state)
    .toBe("completed");
  expect(events.filter((event) => event.type === "encounter_completed")).toHaveLength(1);
});
