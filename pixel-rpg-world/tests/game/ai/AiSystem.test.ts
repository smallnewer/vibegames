import { describe, expect, it } from "vitest";
import type { AiStateComponent } from "../../../game/ai/AiComponents";
import { AiSystem } from "../../../game/ai/AiSystem";
import { ActorFactory } from "../../../game/actor/ActorFactory";
import type {
  ActorComponent,
  HealthComponent,
  TransformComponent,
} from "../../../game/actor/ActorComponents";
import { createCoreContent } from "../../../game/content/coreContent";
import type { GameplayEvent } from "../../../game/core/GameplayEvent";
import { World } from "../../../game/core/World";
import type { BossStateComponent } from "../../../game/boss/BossComponents";
import type { GroundNavigation } from "../../../game/ports/GroundNavigation";

const openGround: GroundNavigation = {
  move: (_start, destination) => destination,
  path: (start, destination) => [start, destination],
  dispose() {},
};

describe("AiSystem", () => {
  it("uses the actor script to chase and cast", () => {
    const content = createCoreContent();
    const factory = new ActorFactory(content);
    const world = new World();
    const hero = factory.create(world, "hero.ember_runner", 2, 0, { playerSlot: 1 });
    const stalker = factory.create(world, "enemy.ember_stalker", 0, 0);
    const ai = new AiSystem(content, openGround);

    expect(ai.commands(world, [hero], 0.2)).toContainEqual({
      type: "move",
      actor: stalker,
      x: 1,
      z: 0,
    });
    world.getComponent<TransformComponent>("transform", hero)!.x = 1;
    world.getComponent<AiStateComponent>("aiState", stalker)!.thinkLeft = 0;
    const events: GameplayEvent[] = [];
    expect(ai.commands(world, [hero], 0.2, events)).toEqual([]);
    expect(events).toContainEqual(expect.objectContaining({
      type: "ability_telegraph_started",
      source: stalker,
      ability: "ability.stalker_bite",
      duration: 0.3,
      shape: "cone",
      angle: 90,
    }));
    expect(ai.commands(world, [hero], 0.3, events)).toContainEqual({
      type: "cast",
      actor: stalker,
      slot: "melee",
      aimX: 1,
      aimZ: 0,
    });
  });

  it("keeps up to four damage sources and prioritizes threat", () => {
    const content = createCoreContent();
    const factory = new ActorFactory(content);
    const world = new World();
    const close = factory.create(world, "hero.ember_runner", 1, 0, { playerSlot: 1 });
    const danger = factory.create(world, "hero.ember_runner", 4, 0, { playerSlot: 2 });
    const stalker = factory.create(world, "enemy.ember_stalker", 0, 0);
    const ai = new AiSystem(content, openGround);

    ai.observe(world, [
      { type: "damage_applied", source: danger, target: stalker, amount: 30 },
    ]);
    ai.commands(world, [close, danger], 0.2);

    expect(world.getComponent<AiStateComponent>("aiState", stalker)?.target).toBe(danger);
  });

  it("holds the current living target for the switch cooldown", () => {
    const content = createCoreContent();
    const factory = new ActorFactory(content);
    const world = new World();
    const close = factory.create(world, "hero.ember_runner", 2, 0, { playerSlot: 1 });
    const danger = factory.create(world, "hero.ember_runner", 4, 0, { playerSlot: 2 });
    const stalker = factory.create(world, "enemy.ember_stalker", 0, 0);
    const ai = new AiSystem(content, openGround);
    const state = world.getComponent<AiStateComponent>("aiState", stalker)!;

    ai.commands(world, [close, danger], 0.2);
    expect(state.target).toBe(close);
    ai.observe(world, [
      { type: "damage_applied", source: danger, target: stalker, amount: 30 },
    ]);
    state.thinkLeft = 0;
    ai.commands(world, [close, danger], 0.2);
    expect(state.target).toBe(close);

    state.thinkLeft = 0;
    ai.commands(world, [close, danger], 0.4);
    expect(state.target).toBe(danger);
  });

  it("locks the aimed point and cancels telegraphs for invalid targets or leash reset", () => {
    const content = createCoreContent();
    const factory = new ActorFactory(content);
    const world = new World();
    const hero = factory.create(world, "hero.ember_runner", 1, 0, { playerSlot: 1 });
    const stalker = factory.create(world, "enemy.ember_stalker", 0, 0);
    const ai = new AiSystem(content, openGround);
    const events: GameplayEvent[] = [];

    expect(ai.commands(world, [hero], 0.2, events)).toEqual([]);
    world.getComponent<TransformComponent>("transform", hero)!.x = 5;
    expect(ai.commands(world, [hero], 0.3, events)).toContainEqual({
      type: "cast",
      actor: stalker,
      slot: "melee",
      aimX: 1,
      aimZ: 0,
    });

    const second = factory.create(world, "enemy.ember_stalker", 4, 0);
    world.getComponent<TransformComponent>("transform", hero)!.x = 5;
    ai.commands(world, [hero], 0.2, events);
    world.getComponent<HealthComponent>("health", hero)!.current = 0;
    ai.commands(world, [hero], 0.1, events);
    expect(events).toContainEqual({
      type: "ability_telegraph_cancelled",
      source: second,
      ability: "ability.stalker_bite",
    });

    world.getComponent<HealthComponent>("health", hero)!.current = 100;
    const third = factory.create(world, "enemy.ember_stalker", 4, 0);
    ai.commands(world, [hero], 0.2, events);
    world.getComponent<TransformComponent>("transform", third)!.x = 20;
    ai.commands(world, [hero], 0.1, events);
    expect(events).toContainEqual({
      type: "ability_telegraph_cancelled",
      source: third,
      ability: "ability.stalker_bite",
    });
  });

  it("cancels a normal enemy telegraph while it is staggered", () => {
    const content = createCoreContent();
    const factory = new ActorFactory(content);
    const world = new World();
    const hero = factory.create(world, "hero.ember_runner", 1, 0, { playerSlot: 1 });
    const stalker = factory.create(world, "enemy.ember_stalker", 0, 0);
    const ai = new AiSystem(content, openGround);
    const events: GameplayEvent[] = [];

    ai.commands(world, [hero], 0.1, events);
    world.getComponent<ActorComponent>("actor", stalker)!.action = "hit";
    expect(ai.commands(world, [hero], 0.3, events)).toEqual([]);
    expect(world.getComponent<AiStateComponent>("aiState", stalker)!.pendingCast).toBeUndefined();
    expect(events).toContainEqual({
      type: "ability_telegraph_cancelled",
      source: stalker,
      ability: "ability.stalker_bite",
    });
  });

  it("uses a phase-limited Boss action once before choosing the next action", () => {
    const content = createCoreContent();
    const factory = new ActorFactory(content);
    const world = new World();
    const hero = factory.create(world, "hero.ember_runner", 5, 0, { playerSlot: 1 });
    const boss = factory.create(world, "boss.warden_hearn", 0, 0);
    const ai = new AiSystem(content, openGround);
    const bossState = world.getComponent<BossStateComponent>(
      "bossState",
      boss,
    )!;
    bossState.phaseIndex = 1;
    bossState.abilityEpoch = 1;
    bossState.phaseEnterLeft = 0;
    const events: GameplayEvent[] = [];

    ai.commands(world, [hero], 0.2, events);
    expect(events).toContainEqual(expect.objectContaining({
      type: "ability_telegraph_started",
      ability: "ability.hearn_call_gaolers",
    }));
    expect(ai.commands(world, [hero], 1, events)).toContainEqual(expect.objectContaining({
      type: "cast",
      actor: boss,
      slot: "skill_down",
    }));

    events.length = 0;
    ai.commands(world, [hero], 0.6, events);
    expect(events).toContainEqual(expect.objectContaining({
      type: "ability_telegraph_started",
      ability: "ability.hearn_fire_ring",
    }));
    expect(events.some((event) => (
      event.type === "ability_telegraph_started"
      && event.ability === "ability.hearn_call_gaolers"
    ))).toBe(false);
  });
});
