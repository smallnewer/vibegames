import { expect, it } from "vitest";
import type { Command } from "../../../game/core/Command";
import type { GameplayEvent } from "../../../game/core/GameplayEvent";
import { GameSimulation } from "../../../game/core/GameSimulation";

function run(
  simulation: GameSimulation,
  ticks: number,
  command: Command | undefined,
  events: GameplayEvent[],
): void {
  for (let tick = 0; tick < ticks; tick += 1) {
    events.push(...simulation.tick(1 / 60, command ? [command] : []));
  }
}

it("runs the ice pack through the same complete dungeon route", () => {
  const simulation = new GameSimulation({ dungeonId: "dungeon.ice_room" });
  const events: GameplayEvent[] = [];
  const initial = simulation.snapshot();
  const hero = initial.actors.find((actor) => actor.id === simulation.hero)!;
  const enemy = initial.actors.find((actor) => actor.faction === "enemy")!;

  expect(initial.dungeon).toMatchObject({ id: "dungeon.ice_room", name: "霜镜密室" });
  expect(initial.dungeon.visual).toMatchObject({
    clearColor: "#06101c",
    groundColor: "#17354d",
    groundSize: 14,
  });
  expect(initial.dungeon.decorations).toHaveLength(7);
  expect(hero).toMatchObject({ x: -4, z: -2 });
  expect(enemy).toMatchObject({ x: 2.5, z: 0 });

  const interaction = (kind: "harvest" | "door" | "portal") => (
    simulation.snapshot().interactions.find((value) => value.kind === kind)!
  );
  run(simulation, 1, {
    type: "interact",
    actor: simulation.hero,
    target: interaction("harvest").id,
  }, events);
  expect(simulation.snapshot().dungeon.resources).toContainEqual({
    id: "frost_shard",
    name: "霜晶碎片",
    amount: 1,
  });

  run(simulation, 52, { type: "move", actor: simulation.hero, x: 1, z: 0.57 }, events);
  expect(simulation.snapshot().dungeon.encounter).toBe("active");

  for (let attack = 0; attack < 3; attack += 1) {
    run(simulation, 1, {
      type: "cast",
      actor: simulation.hero,
      slot: "ranged",
      aimX: 2.5,
      aimZ: 0,
    }, events);
    run(simulation, 40, undefined, events);
  }
  expect(simulation.snapshot().dungeon.encounter).toBe("completed");

  run(simulation, 20, { type: "move", actor: simulation.hero, x: 1, z: 0 }, events);
  run(simulation, 1, {
    type: "interact",
    actor: simulation.hero,
    target: interaction("door").id,
  }, events);
  expect(simulation.snapshot().dungeon.door).toBe("open");

  run(simulation, 32, { type: "move", actor: simulation.hero, x: 1, z: 0 }, events);
  run(simulation, 1, {
    type: "interact",
    actor: simulation.hero,
    target: interaction("portal").id,
  }, events);
  expect(simulation.snapshot().actors.find((actor) => actor.id === simulation.hero))
    .toMatchObject({ x: -4, z: 2.5 });
  expect(events).toContainEqual({ type: "encounter_started", encounter: "encounter.frost_gate" });
  expect(events).toContainEqual({ type: "encounter_completed", encounter: "encounter.frost_gate" });
});
