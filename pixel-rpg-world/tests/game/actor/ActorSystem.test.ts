import { describe, expect, it } from "vitest";
import { ActorSystem } from "../../../game/actor/ActorSystem";
import type { ActorComponent, TransformComponent } from "../../../game/actor/ActorComponents";
import type { GameplayEvent } from "../../../game/core/GameplayEvent";
import { World } from "../../../game/core/World";
import {
  BoundsNavigation,
  type GroundNavigation,
} from "../../../game/ports/GroundNavigation";

function makeHero() {
  const world = new World();
  const hero = world.createEntity();
  world.setComponent<TransformComponent>("transform", hero, {
    x: 0,
    z: 0,
    previousX: 0,
    previousZ: 0,
    facingX: 0,
    facingZ: -1,
  });
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
    hitReactionCooldownLeft: 0.6,
  });
  return { world, hero };
}

describe("ActorSystem", () => {
  it("moves at the fixed ground speed and clamps to compiled bounds", () => {
    const { world, hero } = makeHero();
    const system = new ActorSystem(new BoundsNavigation({ minX: -10, maxX: 10, minZ: -6, maxZ: 6 }));
    for (let tick = 0; tick < 180; tick += 1) {
      system.update(world, [{ type: "move", actor: hero, x: 1, z: 0 }], 1 / 60, []);
    }
    const transform = world.getComponent<TransformComponent>("transform", hero)!;
    expect(transform.x).toBe(10);
    expect(transform.z).toBe(0);
  });

  it("advances the hit-reaction cooldown budget on fixed ticks", () => {
    const { world, hero } = makeHero();
    const system = new ActorSystem(new BoundsNavigation({ minX: -10, maxX: 10, minZ: -6, maxZ: 6 }));
    system.update(world, [], 0.2, []);
    expect(world.getComponent<ActorComponent>("actor", hero)!.hitReactionCooldownLeft)
      .toBeCloseTo(0.4);
  });

  it("rolls faster, grants temporary invulnerability, and respects cooldown", () => {
    const { world, hero } = makeHero();
    const system = new ActorSystem(new BoundsNavigation({ minX: -10, maxX: 10, minZ: -6, maxZ: 6 }));
    const events: GameplayEvent[] = [];
    system.update(world, [{ type: "roll", actor: hero, x: 1, z: 0 }], 1 / 60, events);
    for (let tick = 0; tick < 10; tick += 1) system.update(world, [], 1 / 60, events);

    const transform = world.getComponent<TransformComponent>("transform", hero)!;
    const actor = world.getComponent<ActorComponent>("actor", hero)!;
    expect(transform.x).toBeGreaterThan(1.5);
    expect(actor.invulnerableLeft).toBeGreaterThan(0);

    system.update(world, [{ type: "roll", actor: hero, x: -1, z: 0 }], 1 / 60, events);
    expect(world.getComponent<ActorComponent>("actor", hero)!.action).toBe("roll");
    expect(world.getComponent<TransformComponent>("transform", hero)!.facingX).toBe(1);
  });

  it("uses the ground-navigation result for running and rolling", () => {
    const { world, hero } = makeHero();
    const destinations: Array<{ x: number; z: number }> = [];
    const navigation: GroundNavigation = {
      move(_start, destination) {
        destinations.push(destination);
        return { x: Math.min(destination.x, 0.25), z: destination.z };
      },
      path(start, destination) {
        return [start, destination];
      },
      dispose() {},
    };
    const system = new ActorSystem(navigation);

    system.update(world, [{ type: "move", actor: hero, x: 1, z: 0 }], 1, []);
    expect(world.getComponent<TransformComponent>("transform", hero)!.x).toBe(0.25);

    system.update(world, [{ type: "roll", actor: hero, x: 1, z: 0 }], 1 / 60, []);
    expect(destinations).toHaveLength(2);
    expect(destinations[1].x).toBeGreaterThan(0.25);
    expect(world.getComponent<TransformComponent>("transform", hero)!.x).toBe(0.25);
  });

  it("keeps reduced movement during melee instead of freezing a running actor", () => {
    const { world, hero } = makeHero();
    const system = new ActorSystem(new BoundsNavigation({ minX: -10, maxX: 10, minZ: -6, maxZ: 6 }));
    const actor = world.getComponent<ActorComponent>("actor", hero)!;
    actor.action = "melee";
    actor.actionLeft = 0.5;
    actor.actionDuration = 0.5;

    system.update(world, [{ type: "move", actor: hero, x: 1, z: 0 }], 0.1, []);

    expect(world.getComponent<TransformComponent>("transform", hero)!.x).toBeGreaterThan(0);
    expect(actor.action).toBe("melee");
  });

  it("applies the authored forward curve through ground navigation", () => {
    const { world, hero } = makeHero();
    const destinations: Array<{ x: number; z: number }> = [];
    const navigation: GroundNavigation = {
      move(_start, destination) {
        destinations.push(destination);
        return { x: Math.min(destination.x, 0.5), z: destination.z };
      },
      path(start, destination) {
        return [start, destination];
      },
      dispose() {},
    };
    const system = new ActorSystem(navigation);
    const actor = world.getComponent<ActorComponent>("actor", hero)!;
    const transform = world.getComponent<TransformComponent>("transform", hero)!;
    transform.facingX = 1;
    transform.facingZ = 0;
    actor.action = "melee";
    actor.actionLeft = 0.5;
    actor.actionDuration = 0.5;
    actor.actionMotion = {
      distance: 0.55,
      startAt: 0.12,
      endAt: 0.46,
      easing: "ease_out_cubic",
      appliedDistance: 0,
    };

    for (let tick = 0; tick < 5; tick += 1) system.update(world, [], 0.1, []);

    expect(Math.max(...destinations.map((value) => value.x))).toBeGreaterThan(0.54);
    expect(transform.x).toBe(0.5);
    expect(actor.actionMotion).toBeUndefined();
  });
});
