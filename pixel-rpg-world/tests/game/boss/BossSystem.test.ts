import { describe, expect, it } from "vitest";
import type { AiStateComponent } from "../../../game/ai/AiComponents";
import { AiSystem } from "../../../game/ai/AiSystem";
import { ActorFactory } from "../../../game/actor/ActorFactory";
import type { ActorComponent, HealthComponent } from "../../../game/actor/ActorComponents";
import type { BossStateComponent } from "../../../game/boss/BossComponents";
import { BossSystem } from "../../../game/boss/BossSystem";
import { createCoreContent } from "../../../game/content/coreContent";
import type { GameplayEvent } from "../../../game/core/GameplayEvent";
import { World } from "../../../game/core/World";
import type { GroundNavigation } from "../../../game/ports/GroundNavigation";

const openGround: GroundNavigation = {
  move: (_start, destination) => destination,
  path: (start, destination) => [start, destination],
  dispose() {},
};

describe("BossSystem", () => {
  it("advances at 65% and 30% exactly once without regressing after healing", () => {
    const content = createCoreContent();
    const world = new World();
    const boss = new ActorFactory(content).create(world, "boss.ember_colossus", 0, 0);
    const events: GameplayEvent[] = [];
    const health = world.getComponent<HealthComponent>("health", boss)!;
    const actor = world.getComponent<ActorComponent>("actor", boss)!;
    const state = world.getComponent<BossStateComponent>("bossState", boss)!;
    const system = new BossSystem(content);

    health.current = health.max * 0.66;
    system.update(world, events);
    expect(state.phaseIndex).toBe(0);
    expect(events).toEqual([]);

    health.current = health.max * 0.65;
    system.update(world, events);
    expect(state).toMatchObject({
      phaseIndex: 1,
      abilityEpoch: 1,
      phaseEnterLeft: 0.8,
      enteredPhases: ["boss_phase.ember_colossus_1", "boss_phase.ember_colossus_2"],
    });
    expect(actor.invulnerableLeft).toBe(0.8);
    expect(events).toEqual([
      expect.objectContaining({
        type: "boss_phase_started",
        actor: boss,
        phaseId: "boss_phase.ember_colossus_2",
        duration: 0.8,
      }),
    ]);

    events.length = 0;
    system.update(world, events, 0.8);
    health.current = health.max * 0.9;
    system.update(world, events);
    expect(state.phaseIndex).toBe(1);
    expect(state.phaseEnterLeft).toBe(0);
    expect(events).toEqual([]);

    health.current = health.max * 0.3;
    system.update(world, events);

    expect(state.phaseIndex).toBe(2);
    expect(state.abilityEpoch).toBe(2);
    expect(state.enteredPhases).toEqual([
      "boss_phase.ember_colossus_1",
      "boss_phase.ember_colossus_2",
      "boss_phase.ember_colossus_3",
    ]);
    expect(events).toHaveLength(1);
    expect(actor.speed).toBeCloseTo(2.3 * 1.35);
  });

  it("uses only the current phase actions and pauses AI during phase entry", () => {
    const content = createCoreContent();
    const world = new World();
    const factory = new ActorFactory(content);
    const boss = factory.create(world, "boss.ember_colossus", 0, 0);
    const hero = factory.create(world, "hero.ember_runner", 1, 0, { playerSlot: 1 });
    const state = world.getComponent<BossStateComponent>("bossState", boss)!;
    const aiState = world.getComponent<AiStateComponent>("aiState", boss)!;
    const ai = new AiSystem(content, openGround);
    const phases = new BossSystem(content);
    const events: GameplayEvent[] = [];
    state.phaseEnterLeft = 0;

    ai.commands(world, [hero], 0.2, events);
    expect(events).toContainEqual(expect.objectContaining({
      type: "ability_telegraph_started",
      ability: "ability.colossus_slam",
    }));

    events.length = 0;
    const health = world.getComponent<HealthComponent>("health", boss)!;
    health.current = health.max * 0.65;
    phases.update(world, events);
    expect(ai.commands(world, [hero], 0.2, events)).toEqual([]);
    expect(events.some((event) => event.type === "ability_telegraph_started")).toBe(false);

    state.phaseEnterLeft = 0;
    aiState.thinkLeft = 0;
    ai.commands(world, [hero], 0.2, events);
    expect(events).toContainEqual(expect.objectContaining({
      type: "ability_telegraph_started",
      ability: "ability.colossus_nova",
    }));
  });
});
