import { describe, expect, it } from "vitest";
import { GameSimulation } from "../../../game/core/GameSimulation";
import type { GameSnapshot, StatusSnapshot } from "../../../game/core/GameSnapshot";
import { buildCombatHud } from "../../../game/ui/HudViewModel";

describe("HudViewModel", () => {
  it("orders one to four players and exposes the four directional slots", () => {
    const snapshot = new GameSimulation({ playerCount: 2 }).snapshot();
    snapshot.players[0].progress.abilities.skill_up.cooldownLeft = 3;
    snapshot.players[0].progress.abilities.skill_up.cooldownDuration = 6;
    snapshot.players[0].progress.weapons.melee.cooldownLeft = 0.2;
    snapshot.players[0].progress.weapons.melee.cooldownDuration = 0.4;
    const statuses = Array.from({ length: 5 }, (_, index): StatusSnapshot => ({
      id: `status.${index}`,
      name: `Status ${index}`,
      icon: `icon.status.${index}`,
      stacks: index + 1,
      timeLeft: 5 - index,
    }));
    snapshot.players[0].progress.statuses = statuses;

    const model = buildCombatHud(snapshot);

    expect(model.players.map((player) => player.slot)).toEqual([1, 2]);
    expect(Object.keys(model.players[0].skills)).toEqual([
      "skill_up",
      "skill_right",
      "skill_down",
      "skill_left",
    ]);
    expect(model.players[0].skills.skill_up).toMatchObject({
      direction: "up",
      cooldownRatio: 0.5,
    });
    expect(model.players[0].melee).toMatchObject({ button: "X", cooldownRatio: 0.5 });
    expect(model.players[0].ranged.button).toBe("Y");
    expect(model.players[0].statuses).toHaveLength(4);
  });

  it("prioritizes a nearby revive over interactions and exposes life state", () => {
    const snapshot = new GameSimulation({ playerCount: 2 }).snapshot();
    const [first, second] = snapshot.players;
    const firstActor = snapshot.actors.find((actor) => actor.id === first.actor)!;
    const secondActor = snapshot.actors.find((actor) => actor.id === second.actor)!;
    Object.assign(firstActor, { x: 0, z: 0, lifeState: "alive" });
    Object.assign(secondActor, {
      x: 1,
      z: 0,
      lifeState: "downed",
      downedTimeLeft: 8,
      reviveProgress: 0.4,
    });
    const interaction = snapshot.interactions[0];
    Object.assign(interaction, { x: 0, z: 0, state: "idle" });

    const model = buildCombatHud(snapshot);

    expect(model.players[1]).toMatchObject({ lifeState: "downed", downedTimeLeft: 8 });
    expect(model.prompt).toEqual({
      action: "revive",
      text: `扶起 ${secondActor.name}`,
      player: 1,
      progress: 0.5,
    });

    secondActor.lifeState = "dead";
    expect(buildCombatHud(snapshot).prompt).toMatchObject({ action: "interact", player: 1 });
  });

  it("hides Boss data outside combat and preserves objective change ticks", () => {
    const simulation = new GameSimulation({ dungeonId: "dungeon.lava_showcase" });
    const snapshot = simulation.snapshot();
    expect(buildCombatHud(snapshot).boss).toBeUndefined();

    snapshot.dungeon.encounter = "active";
    const active = buildCombatHud(snapshot);
    expect(active.boss).toMatchObject({ name: "熔心巨像", phaseName: "熔岩苏醒" });
    expect(active.objective.changedAtTick).toBe(snapshot.tick);

    const next = { ...snapshot, tick: snapshot.tick + 20 } as GameSnapshot;
    expect(buildCombatHud(next, active).objective.changedAtTick).toBe(snapshot.tick);
    next.run.objective = {
      id: "objective.changed",
      text: "新目标",
      current: 1,
      total: 2,
    };
    expect(buildCombatHud(next, active).objective).toMatchObject({
      text: "新目标",
      current: 1,
      total: 2,
      changedAtTick: next.tick,
    });
  });
});
