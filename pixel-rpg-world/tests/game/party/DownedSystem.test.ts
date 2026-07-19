import { describe, expect, it } from "vitest";
import type { ActorComponent, HealthComponent } from "../../../game/actor/ActorComponents";
import { ActorFactory } from "../../../game/actor/ActorFactory";
import { createCoreContent } from "../../../game/content/coreContent";
import type { GameplayEvent } from "../../../game/core/GameplayEvent";
import { World } from "../../../game/core/World";
import type { DownedComponent } from "../../../game/party/DownedComponents";
import { DownedSystem } from "../../../game/party/DownedSystem";

function party(size: 1 | 2) {
  const world = new World();
  const factory = new ActorFactory(createCoreContent());
  const players = Array.from({ length: size }, (_, index) => (
    factory.create(world, "hero.ember_runner", index, 0, { playerSlot: (index + 1) as 1 | 2 })
  ));
  return { world, players, system: new DownedSystem() };
}

function kill(world: World, actor: number): GameplayEvent {
  world.getComponent<HealthComponent>("health", actor)!.current = 0;
  world.getComponent<ActorComponent>("actor", actor)!.action = "dead";
  return { type: "actor_died", actor };
}

describe("DownedSystem", () => {
  it("turns a solo death into an immediate party wipe", () => {
    const { world, players, system } = party(1);
    const events: GameplayEvent[] = [];
    system.update(world, players, [], 0, [kill(world, players[0])], events);

    expect(world.getComponent<DownedComponent>("downed", players[0])?.state).toBe("dead");
    expect(events).toContainEqual({ type: "party_wiped" });
  });

  it("allows a 0.8 second nearby revive at 30% health and cancels interrupted progress", () => {
    const { world, players, system } = party(2);
    const [downed, rescuer] = players;
    const events: GameplayEvent[] = [];
    system.update(world, players, [], 0, [kill(world, downed)], events);
    const state = world.getComponent<DownedComponent>("downed", downed)!;
    expect(state).toMatchObject({ state: "downed", timeLeft: 10, reviveProgress: 0 });

    system.update(world, players, [
      { type: "revive", actor: rescuer, target: downed, held: true },
    ], 0.4, [], events);
    expect(state.reviveProgress).toBe(0.4);
    system.update(world, players, [
      { type: "move", actor: rescuer, x: 1, z: 0 },
      { type: "revive", actor: rescuer, target: downed, held: true },
    ], 0.1, [], events);
    expect(state.reviveProgress).toBe(0);

    system.update(world, players, [
      { type: "revive", actor: rescuer, target: downed, held: true },
    ], 0.4, [], events);
    system.update(world, players, [
      { type: "revive", actor: rescuer, target: downed, held: true },
    ], 0.1, [{
      type: "damage_applied",
      source: downed,
      target: rescuer,
      amount: 1,
      damageType: "physical",
      critical: false,
      skillId: "test",
    }], events);
    expect(state.reviveProgress).toBe(0);

    for (let index = 0; index < 4; index += 1) {
      system.update(world, players, [
        { type: "revive", actor: rescuer, target: downed, held: true },
      ], 0.2, [], events);
    }
    const health = world.getComponent<HealthComponent>("health", downed)!;
    expect(state.state).toBe("alive");
    expect(health.current).toBe(Math.ceil(health.max * 0.3));
    expect(world.getComponent<ActorComponent>("actor", downed)?.action).toBe("idle");
    expect(events).toContainEqual({
      type: "hero_revived",
      actor: downed,
      by: rescuer,
      health: health.current,
    });
  });

  it("wipes when every local hero is downed", () => {
    const { world, players, system } = party(2);
    const events: GameplayEvent[] = [];
    system.update(
      world,
      players,
      [],
      0,
      players.map((player) => kill(world, player)),
      events,
    );

    expect(players.map((player) => (
      world.getComponent<DownedComponent>("downed", player)?.state
    ))).toEqual(["dead", "dead"]);
    expect(events.filter((event) => event.type === "party_wiped")).toHaveLength(1);
  });
});
