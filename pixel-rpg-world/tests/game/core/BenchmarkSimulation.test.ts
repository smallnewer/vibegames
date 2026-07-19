import { expect, it } from "vitest";
import { GameSimulation } from "../../../game/core/GameSimulation";

function runBenchmark() {
  const simulation = new GameSimulation({ benchmark: true });
  for (let tick = 0; tick < 600; tick += 1) simulation.tick(1 / 60, []);
  return simulation.snapshot();
}

it("keeps the deterministic four-player and thirty-enemy benchmark active", () => {
  const snapshot = runBenchmark();
  const players = snapshot.actors.filter((actor) => actor.faction === "hero");
  const enemies = snapshot.actors.filter((actor) => (
    actor.faction === "enemy" && actor.action !== "dead"
  ));

  expect(snapshot.players.map((player) => player.slot)).toEqual([1, 2, 3, 4]);
  expect(players).toHaveLength(4);
  expect(enemies).toHaveLength(30);
  expect(snapshot.interactions).toHaveLength(4);
  expect(snapshot.dungeon.encounter).toBe("active");
  expect(snapshot.projectiles.length).toBeGreaterThan(0);
  expect(snapshot.projectiles.length).toBeLessThan(120);
  expect(players.every((player) => player.health > 0)).toBe(true);
  expect(players.every((player) => player.statuses.includes("status.battle_focus"))).toBe(true);

  const repeated = runBenchmark();
  expect(repeated.actors.map(({ id, x, z }) => ({ id, x, z }))).toEqual(
    snapshot.actors.map(({ id, x, z }) => ({ id, x, z })),
  );
  expect(repeated.projectiles.length).toBe(snapshot.projectiles.length);
});

it("keeps the selected dungeon while applying benchmark population", () => {
  const snapshot = new GameSimulation({ dungeonId: "dungeon.ice_room", benchmark: true }).snapshot();

  expect(snapshot.dungeon.id).toBe("dungeon.ice_room");
  expect(snapshot.players).toHaveLength(4);
  expect(snapshot.actors.filter((actor) => actor.faction === "enemy")).toHaveLength(30);
});
