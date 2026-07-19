import { expect, it } from "vitest";
import type { AbilityLoadoutComponent } from "../../../game/ability/AbilityComponents";
import type { ActorComponent, TransformComponent } from "../../../game/actor/ActorComponents";
import { CombatSystem } from "../../../game/combat/CombatSystem";
import { World } from "../../../game/core/World";

function addActor(world: World, faction: "hero" | "enemy", x: number) {
  const actor = world.createEntity();
  world.setComponent<ActorComponent>("actor", actor, {
    faction,
    action: "idle",
    actionLeft: 0,
    actionDuration: 0,
    moveX: 0,
    moveZ: 0,
    speed: 0,
    radius: 0.5,
    rollCooldownLeft: 0,
    invulnerableLeft: 0,
  });
  world.setComponent<TransformComponent>("transform", actor, {
    x,
    z: 0,
    previousX: x,
    previousZ: 0,
    facingX: faction === "hero" ? 1 : -1,
    facingZ: 0,
  });
  world.setComponent<AbilityLoadoutComponent>("abilityLoadout", actor, {
    slots: faction === "enemy"
      ? {
          melee: undefined, ranged: "ability.crystal_shot", skill_up: undefined,
          skill_right: undefined, skill_down: undefined, skill_left: undefined,
        }
      : {
          melee: "ability.basic_melee", ranged: "ability.basic_ranged", skill_up: undefined,
          skill_right: undefined, skill_down: undefined, skill_left: undefined,
        },
    cooldowns: {
      melee: 0, ranged: 0, skill_up: 0, skill_right: 0, skill_down: 0, skill_left: 0,
    },
  });
  return actor;
}

it("emits enemy cast commands without applying combat results", () => {
  const world = new World();
  const hero = addActor(world, "hero", -3);
  const enemy = addActor(world, "enemy", 3);
  const system = new CombatSystem();

  expect(system.commands(world, [hero])).toEqual([{
    type: "cast",
    actor: enemy,
    slot: "ranged",
    aimX: -3,
    aimZ: 0,
  }]);

  world.getComponent<ActorComponent>("actor", enemy)!.action = "dead";
  expect(system.commands(world, [hero])).toEqual([]);
});

it("targets the nearest living player with entity ID as tie-breaker", () => {
  const world = new World();
  const first = addActor(world, "hero", -2);
  const second = addActor(world, "hero", 2);
  const enemy = addActor(world, "enemy", 0);
  const system = new CombatSystem();

  expect(system.commands(world, [second, first])).toEqual([{
    type: "cast",
    actor: enemy,
    slot: "ranged",
    aimX: -2,
    aimZ: 0,
  }]);

  world.getComponent<ActorComponent>("actor", first)!.action = "dead";
  expect(system.commands(world, [first, second])[0]).toMatchObject({ aimX: 2, aimZ: 0 });
});
