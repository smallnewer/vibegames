import { beforeEach, describe, expect, it } from "vitest";
import { DungeonRegistry } from "../../../game/content/DungeonRegistry";
import type { GameplayEvent } from "../../../game/core/GameplayEvent";
import { World } from "../../../game/core/World";
import type { DungeonRunComponent } from "../../../game/dungeon/DungeonRunComponents";
import { DungeonRunSystem } from "../../../game/dungeon/DungeonRunSystem";

describe("DungeonRunSystem", () => {
  const definition = new DungeonRegistry().get("dungeon.production_foundation");
  let world: World;
  let dungeon: number;
  let run: DungeonRunComponent;
  let system: DungeonRunSystem;

  beforeEach(() => {
    world = new World();
    dungeon = world.createEntity();
    run = {
      definition: definition.id,
      phase: "entering",
      completedEncounters: [],
      claimedRewardPlayers: [],
      runSeed: 123,
      difficulty: "normal",
    };
    world.setComponent<DungeonRunComponent>("dungeonRun", dungeon, run);
    system = new DungeonRunSystem(definition);
  });

  const update = (facts: GameplayEvent[] = [], players = [1, 2] as const) => {
    system.update(world, dungeon, facts, players);
    return facts;
  };

  it("follows the legal normal, elite, Boss, reward, and completion route", () => {
    expect(update()).toContainEqual({
      type: "dungeon_phase_changed", from: "entering", to: "exploring",
    });
    update([{ type: "encounter_started", encounter: "encounter.refuge_gate" }]);
    expect(run.phase).toBe("encounter");
    update([{ type: "encounter_completed", encounter: "encounter.refuge_gate" }]);
    expect(run.phase).toBe("exploring");

    update([{ type: "encounter_started", encounter: "encounter.ember_champion" }]);
    update([{ type: "encounter_completed", encounter: "encounter.ember_champion" }]);
    expect(run.phase).toBe("elite_reward");
    update([{ type: "elite_reward_claimed", encounter: "encounter.ember_champion" }]);
    expect(run.phase).toBe("exploring");

    const intro = update([{ type: "encounter_started", encounter: "encounter.warden_hearn" }]);
    expect(run.phase).toBe("boss_intro");
    expect(run.checkpoint).toBe("checkpoint.warden_hearn");
    expect(intro).toContainEqual({ type: "checkpoint_activated", checkpoint: "checkpoint.warden_hearn" });
    update([{ type: "boss_intro_completed", encounter: "encounter.warden_hearn" }]);
    expect(run.phase).toBe("boss_combat");
    update([{ type: "encounter_completed", encounter: "encounter.warden_hearn" }]);
    expect(run.phase).toBe("reward");

    update([{ type: "dungeon_reward_claimed", player: 1 }]);
    update([{ type: "dungeon_reward_settled" }]);
    expect(run.phase).toBe("reward");
    update([{ type: "dungeon_reward_claimed", player: 2 }]);
    const completed = update([{ type: "dungeon_reward_settled" }]);
    expect(run.phase).toBe("completed");
    expect(completed.filter((event) => event.type === "dungeon_completed")).toHaveLength(1);
    const repeated = update([{ type: "dungeon_reward_settled" }]);
    expect(repeated.filter((event) => event.type === "dungeon_completed")).toHaveLength(0);
  });

  it("rejects skipped Boss completion, early settlement, and encounter reactivation", () => {
    update();
    update([{ type: "encounter_completed", encounter: "encounter.warden_hearn" }]);
    update([{ type: "dungeon_reward_claimed", player: 1 }, { type: "dungeon_reward_settled" }]);
    expect(run.phase).toBe("exploring");

    update([{ type: "encounter_started", encounter: "encounter.refuge_gate" }]);
    update([{ type: "encounter_completed", encounter: "encounter.refuge_gate" }]);
    expect(run.completedEncounters).toEqual(["encounter.refuge_gate"]);
    update([{ type: "encounter_started", encounter: "encounter.refuge_gate" }]);
    expect(run.phase).toBe("exploring");
  });

  it("enters party wipe and exposes content-derived objectives", () => {
    update();
    update([{ type: "encounter_started", encounter: "encounter.armory_crossing" }]);
    expect(system.objective(run)).toMatchObject({
      id: "objective.encounter", current: 0, total: 5,
    });
    update([{ type: "party_wiped" }]);
    expect(run.phase).toBe("party_wipe");
    expect(system.objective(run).text).toContain("检查点");
  });
});
