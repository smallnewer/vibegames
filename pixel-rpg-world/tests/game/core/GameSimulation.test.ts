import { expect, it } from "vitest";
import { GameSimulation } from "../../../game/core/GameSimulation";

it("exposes the normalized deterministic run seed", () => {
  expect(new GameSimulation({ runSeed: 0x12345678 }).snapshot().run.seed).toBe(0x12345678);
  expect(new GameSimulation({ runSeed: 0 }).snapshot().run.seed).not.toBe(0);
});

it("replays identical damage and loot event sequences from the same seed", () => {
  const run = () => {
    const simulation = new GameSimulation({ turretX: -1.5, runSeed: 24 });
    const events = [] as ReturnType<GameSimulation["tick"]>[number][];
    for (let attack = 0; attack < 2; attack += 1) {
      events.push(...simulation.tick(1 / 60, [{
        type: "cast",
        actor: simulation.hero,
        slot: "melee",
        aimX: -1.5,
        aimZ: 0,
      }]));
      for (let tick = 0; tick < (attack === 0 ? 28 : 10); tick += 1) {
        events.push(...simulation.tick(1 / 60, []));
      }
    }
    return events.filter((event) => event.type === "damage_applied" || event.type === "loot_spawned");
  };
  const first = run();
  expect(first.some((event) => event.type === "damage_applied")).toBe(true);
  expect(first.some((event) => event.type === "loot_spawned")).toBe(true);
  expect(run()).toEqual(first);
});

it("exposes only the four canonical directional skill slots", () => {
  const abilities = new GameSimulation().snapshot().progress.abilities;
  expect(Object.keys(abilities)).toEqual([
    "skill_up",
    "skill_right",
    "skill_down",
    "skill_left",
  ]);
  expect(abilities).not.toHaveProperty("ability_1");
  expect(abilities).not.toHaveProperty("ability_2");
  expect(abilities).not.toHaveProperty("ability_3");
});

it("creates four stable local player slots with independent progression views", () => {
  const simulation = new GameSimulation({ playerCount: 4, enemyCount: 1 });
  const snapshot = simulation.snapshot();

  expect(snapshot.players.map((player) => player.slot)).toEqual([1, 2, 3, 4]);
  expect(new Set(snapshot.players.map((player) => player.actor)).size).toBe(4);
  expect(snapshot.players.every((player) => (
    snapshot.actors.find((actor) => actor.id === player.actor)?.faction === "hero"
  ))).toBe(true);
  expect(snapshot.hero).toBe(snapshot.players[0].actor);
  expect(snapshot.progress).toEqual(snapshot.players[0].progress);
  expect(snapshot.players.map((player) => player.progress.items.length)).toEqual([7, 7, 7, 7]);
  expect(snapshot.players[0].progress.items).not.toBe(snapshot.players[1].progress.items);
  expect(snapshot.players[0].progress.items[0].reinforcementQuote).toMatchObject({
    allowed: false,
    reason: "missing_scrap",
    from: 0,
    to: 1,
  });
  const hero = snapshot.actors.find((actor) => actor.id === snapshot.hero)!;
  expect(hero.equipmentVisuals).toHaveLength(7);
  expect(hero.equipmentVisuals).toContainEqual({
    slot: "melee",
    visual: "equipment.weapon.rust_blade",
  });
});

it("waits for the first player action before the turret engages", () => {
  const simulation = new GameSimulation();
  for (let tick = 0; tick < 600; tick += 1) simulation.tick(1 / 60, []);
  const hero = simulation.snapshot().actors.find((actor) => actor.id === simulation.hero)!;
  expect(hero.health).toBe(123);

  simulation.tick(1 / 60, [{ type: "move", actor: simulation.hero, x: 1, z: 0 }]);
  for (let tick = 0; tick < 50; tick += 1) simulation.tick(1 / 60, []);
  expect(simulation.snapshot().projectiles.some((shot) => shot.faction === "enemy")).toBe(false);
});

it("covers run, roll, melee, ranged, incoming damage, and death", () => {
  const simulation = new GameSimulation();
  const start = simulation.snapshot().actors.find((actor) => actor.id === simulation.hero)!;
  simulation.tick(1 / 60, [{ type: "move", actor: simulation.hero, x: 1, z: 0 }]);
  const running = simulation.snapshot().actors.find((actor) => actor.id === simulation.hero)!;
  expect(running.x).toBeGreaterThan(start.x);
  expect(running.action).toBe("run");

  simulation.tick(1 / 60, [{ type: "roll", actor: simulation.hero, x: 1, z: 0 }]);
  expect(simulation.snapshot().actors.find((actor) => actor.id === simulation.hero)!.action).toBe("roll");

  const melee = new GameSimulation({ turretX: -1.5 });
  melee.tick(1 / 60, [
    { type: "cast", actor: melee.hero, slot: "melee", aimX: -1.5, aimZ: 0 },
  ]);
  for (let tick = 0; tick < 10; tick += 1) melee.tick(1 / 60, []);
  expect(melee.snapshot().actors.find((actor) => actor.faction === "enemy")!.health).toBe(32);

  const ranged = new GameSimulation();
  ranged.tick(1 / 60, [
    { type: "cast", actor: ranged.hero, slot: "ranged", aimX: 3, aimZ: 0 },
  ]);
  expect(ranged.snapshot().projectiles.some((projectile) => projectile.faction === "hero")).toBe(true);

  for (let tick = 0; tick < 1000; tick += 1) simulation.tick(1 / 60, []);
  const dead = simulation.snapshot().actors.find((actor) => actor.id === simulation.hero)!;
  expect(dead.health).toBe(0);
  expect(dead.action).toBe("dead");
});

it("completes deterministic drop, pickup, equip, forge rejection, ability, and Buff progression", () => {
  const simulation = new GameSimulation({ turretX: -1.5, runSeed: 24 });
  simulation.tick(1 / 60, [
    { type: "cast", actor: simulation.hero, slot: "melee", aimX: -1.5, aimZ: 0 },
  ]);
  for (let tick = 0; tick < 28; tick += 1) simulation.tick(1 / 60, []);
  simulation.tick(1 / 60, [
    { type: "cast", actor: simulation.hero, slot: "melee", aimX: -1.5, aimZ: 0 },
  ]);
  for (let tick = 0; tick < 10; tick += 1) simulation.tick(1 / 60, []);

  expect(simulation.snapshot().loot).toMatchObject([
    { kind: "item", name: "Head", owner: 1 },
  ]);
  for (let tick = 0; tick < 24; tick += 1) {
    simulation.tick(1 / 60, [{ type: "move", actor: simulation.hero, x: 1, z: 0 }]);
  }
  for (let tick = 0; tick < 4; tick += 1) simulation.tick(1 / 60, []);
  expect(simulation.snapshot().loot).toHaveLength(0);
  const head = simulation.snapshot().progress.items.find((item) => (
    item.definition === "item.base.head"
  ))!;
  simulation.tick(1 / 60, [
    { type: "equip_item", actor: simulation.hero, item: head.id, slot: "head" },
    {
      type: "equip_ability",
      actor: simulation.hero,
      ability: "ability.battle_focus",
      slot: "skill_up",
    },
    { type: "reinforce_item", actor: simulation.hero, item: head.id },
    { type: "cast", actor: simulation.hero, slot: "skill_up", aimX: 0, aimZ: 0 },
  ]);
  simulation.tick(1 / 60, []);

  const progress = simulation.snapshot().progress;
  expect(progress.equipment.names.head).toBe("Head");
  expect(progress.items.find((item) => item.id === head.id)?.reinforce).toBe(0);
  expect(progress.materials["material.scrap"]).toBe(0);
  expect(progress.abilities.skill_up.name).toBe("Battle Focus");
  expect(progress.statuses[0]).toMatchObject({ name: "Battle Focus", stacks: 1 });
  expect(simulation.snapshot().loot).toHaveLength(0);
});

it("completes harvest, encounter, door, and portal route", () => {
  const simulation = new GameSimulation();
  const interaction = (kind: "harvest" | "door" | "portal") => (
    simulation.snapshot().interactions.find((value) => value.kind === kind)!
  );

  simulation.tick(1 / 60, [{
    type: "interact",
    actor: simulation.hero,
    target: interaction("harvest").id,
  }]);
  expect(simulation.snapshot().dungeon.resources).toContainEqual({
    id: "ember_ore",
    name: "余烬矿",
    amount: 1,
  });

  simulation.tick(1 / 60, [{ type: "roll", actor: simulation.hero, x: 1, z: 0 }]);
  for (let tick = 0; tick < 20; tick += 1) simulation.tick(1 / 60, []);
  expect(simulation.snapshot().dungeon.encounter).toBe("active");
  for (let tick = 0; tick < 20; tick += 1) simulation.tick(1 / 60, []);
  expect(simulation.snapshot().actors.find((actor) => actor.id === simulation.hero)!.health).toBe(123);

  for (let attack = 0; attack < 3; attack += 1) {
    simulation.tick(1 / 60, [{
      type: "cast",
      actor: simulation.hero,
      slot: "ranged",
      aimX: 3,
      aimZ: 0,
    }]);
    for (let tick = 0; tick < 40; tick += 1) simulation.tick(1 / 60, []);
  }
  expect(simulation.snapshot().dungeon.encounter).toBe("completed");

  simulation.tick(1 / 60, [{ type: "roll", actor: simulation.hero, x: 1, z: 0 }]);
  for (let tick = 0; tick < 20; tick += 1) simulation.tick(1 / 60, []);
  simulation.tick(1 / 60, [{
    type: "interact",
    actor: simulation.hero,
    target: interaction("door").id,
  }]);
  expect(simulation.snapshot().dungeon.door).toBe("open");

  simulation.tick(1 / 60, [{
    type: "interact",
    actor: simulation.hero,
    target: interaction("portal").id,
  }]);
  const hero = simulation.snapshot().actors.find((actor) => actor.id === simulation.hero)!;
  expect(hero).toMatchObject({ x: -4, z: -3 });
  expect(simulation.snapshot().dungeon.portalUses).toBe(1);
});
