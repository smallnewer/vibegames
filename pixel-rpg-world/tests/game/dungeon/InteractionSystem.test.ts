import { expect, it } from "vitest";
import type { TransformComponent } from "../../../game/actor/ActorComponents";
import type { GameplayEvent } from "../../../game/core/GameplayEvent";
import { World } from "../../../game/core/World";
import { DungeonRegistry } from "../../../game/content/DungeonRegistry";
import type {
  DungeonStateComponent,
  InteractableComponent,
} from "../../../game/dungeon/DungeonComponents";
import { InteractionSystem } from "../../../game/dungeon/InteractionSystem";

function makeInteractionWorld(dungeonId = "dungeon.training_ground") {
  const definition = new DungeonRegistry().get(dungeonId);
  const harvest = definition.interactions.find((value) => value.kind === "harvest")!;
  const world = new World();
  const hero = world.createEntity();
  world.setComponent<TransformComponent>("transform", hero, {
    x: harvest.x,
    z: harvest.z,
    previousX: harvest.x,
    previousZ: harvest.z,
    facingX: 1,
    facingZ: 0,
  });
  const dungeon = world.createEntity();
  world.setComponent<DungeonStateComponent>("dungeon", dungeon, {
    definition: definition.id,
    resources: { [definition.manifest.resource.id]: 0 },
    encounter: "idle",
    door: "locked",
    portalUses: 0,
  });
  const targets = new Map<string, number>();
  for (const interaction of definition.interactions) {
    const target = world.createEntity();
    world.setComponent<InteractableComponent>("interactable", target, {
      definition: interaction.id,
      state: "idle",
    });
    targets.set(interaction.kind, target);
  }
  return {
    world,
    hero,
    dungeon,
    targets,
    system: new InteractionSystem(definition),
  };
}

it.each([
  ["dungeon.training_ground", "ember_ore", 1],
  ["dungeon.ice_room", "frost_shard", 1],
])("grants the configured resource once for %s", (dungeonId, resource, amount) => {
  const { world, hero, dungeon, targets, system } = makeInteractionWorld(dungeonId);
  const events: GameplayEvent[] = [];
  const harvest = targets.get("harvest")!;

  system.update(world, dungeon, [{ type: "interact", actor: hero, target: harvest }], events);
  system.update(world, dungeon, [{ type: "interact", actor: hero, target: harvest }], events);

  expect(world.getComponent<DungeonStateComponent>("dungeon", dungeon)!.resources[resource])
    .toBe(amount);
  expect(events.filter((event) => event.type === "resource_collected")).toEqual([{
    type: "resource_collected",
    actor: hero,
    resource,
    amount,
  }]);
});

it("harvests once, opens only an unlocked door, and teleports through it", () => {
  const { world, hero, dungeon, targets, system } = makeInteractionWorld();
  const events: GameplayEvent[] = [];
  const harvest = targets.get("harvest")!;
  const door = targets.get("door")!;
  const portal = targets.get("portal")!;

  system.update(world, dungeon, [{ type: "interact", actor: hero, target: harvest }], events);
  system.update(world, dungeon, [{ type: "interact", actor: hero, target: harvest }], events);
  expect(world.getComponent<DungeonStateComponent>("dungeon", dungeon)!.resources.ember_ore).toBe(1);
  expect(events.filter((event) => event.type === "resource_collected")).toHaveLength(1);

  world.getComponent<TransformComponent>("transform", hero)!.x = 2;
  system.update(world, dungeon, [{ type: "interact", actor: hero, target: door }], events);
  expect(world.getComponent<DungeonStateComponent>("dungeon", dungeon)!.door).toBe("locked");

  world.getComponent<DungeonStateComponent>("dungeon", dungeon)!.encounter = "completed";
  system.update(world, dungeon, [{ type: "interact", actor: hero, target: door }], events);
  expect(world.getComponent<DungeonStateComponent>("dungeon", dungeon)!.door).toBe("open");

  const transform = world.getComponent<TransformComponent>("transform", hero)!;
  transform.x = 4;
  transform.z = 0;
  system.update(world, dungeon, [{ type: "interact", actor: hero, target: portal }], events);
  expect(transform).toMatchObject({ x: -4, z: -3, previousX: -4, previousZ: -3 });
  expect(world.getComponent<DungeonStateComponent>("dungeon", dungeon)!.portalUses).toBe(1);
});

it("rejects targets outside their configured radius", () => {
  const { world, hero, dungeon, targets, system } = makeInteractionWorld();
  world.getComponent<TransformComponent>("transform", hero)!.x = 0;
  system.update(
    world,
    dungeon,
    [{ type: "interact", actor: hero, target: targets.get("harvest")! }],
    [],
  );
  expect(world.getComponent<DungeonStateComponent>("dungeon", dungeon)!.resources.ember_ore).toBe(0);
});
