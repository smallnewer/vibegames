import { describe, expect, it } from "vitest";
import { RunRng } from "../../../game/balance/RunRng";
import { applyDamage, resolveDamage } from "../../../game/combat/Damage";
import type { DamagePacket } from "../../../game/combat/DamagePacket";
import { DEFAULT_STAT_BLOCK } from "../../../game/content/Definitions";
import { createCoreContent } from "../../../game/content/coreContent";
import { ActorFactory } from "../../../game/actor/ActorFactory";
import type { ActorComponent, HealthComponent } from "../../../game/actor/ActorComponents";
import { World } from "../../../game/core/World";

const packet: DamagePacket = {
  source: 4,
  target: 7,
  skillId: "ability.test",
  damageType: "physical",
  minBase: 40,
  maxBase: 40,
  scalingStat: "meleePower",
  coefficient: 0,
  canCrit: false,
  procCoefficient: 1,
  actionSequence: 12,
};

describe("resolveDamage", () => {
  it("applies physical armor with fixed min=max damage", () => {
    const result = resolveDamage(packet, {
      attackerLevel: 10,
      sourceStats: DEFAULT_STAT_BLOCK,
      targetStats: { ...DEFAULT_STAT_BLOCK, armor: 100 },
      targetHealth: 100,
      rng: RunRng.fromSeed(1),
    });
    expect(result).toMatchObject({
      rolledBase: 40,
      preMitigation: 40,
      mitigation: 100 / 370,
      applied: 29,
      critical: false,
      killed: false,
    });
  });

  it("supports negative and capped elemental resistance", () => {
    const fire = { ...packet, damageType: "fire" as const, minBase: 50, maxBase: 50 };
    const run = (fireResist: number) => resolveDamage(fire, {
      attackerLevel: 10,
      sourceStats: DEFAULT_STAT_BLOCK,
      targetStats: { ...DEFAULT_STAT_BLOCK, fireResist },
      targetHealth: 100,
      rng: RunRng.fromSeed(2),
    }).applied;
    expect(run(-0.25)).toBe(63);
    expect(run(0)).toBe(50);
    expect(run(0.75)).toBe(13);
  });

  it("uses seeded base and critical rolls", () => {
    const variable = { ...packet, minBase: 10, maxBase: 20, canCrit: true };
    const context = {
      attackerLevel: 10,
      sourceStats: { ...DEFAULT_STAT_BLOCK, critRating: 200, critDamage: 2 },
      targetStats: DEFAULT_STAT_BLOCK,
      targetHealth: 15,
      rng: RunRng.fromSeed(0x12345678),
    };
    const first = resolveDamage(variable, context);
    const second = resolveDamage(variable, { ...context, rng: RunRng.fromSeed(0x12345678) });
    expect(first).toEqual(second);
    expect(first.rolledBase).toBeGreaterThanOrEqual(10);
    expect(first.rolledBase).toBeLessThanOrEqual(20);
    expect(first.killed).toBe(first.applied >= 15);
  });
});

describe("applyDamage hit reactions", () => {
  function setup(targetArchetype = "enemy.ember_stalker") {
    const world = new World();
    const factory = new ActorFactory(createCoreContent());
    const source = factory.create(world, "hero.ember_runner", 0, 0, { playerSlot: 1 });
    const target = factory.create(world, targetArchetype, 1, 0);
    const damage: DamagePacket = { ...packet, source, target, minBase: 1, maxBase: 1 };
    return { world, source, target, damage };
  }

  it("staggers a normal enemy once per 0.6 second reaction budget", () => {
    const { world, source, target, damage } = setup();
    const events: import("../../../game/core/GameplayEvent").GameplayEvent[] = [];
    applyDamage(world, damage, RunRng.fromSeed(1), events);
    const actor = world.getComponent<ActorComponent>("actor", target)!;
    expect(actor).toMatchObject({
      action: "hit",
      actionLeft: 0.14,
      actionDuration: 0.14,
      hitReactionCooldownLeft: 0.6,
    });
    expect(events).toContainEqual({
      type: "actor_staggered",
      source,
      target,
      duration: 0.14,
    });

    actor.actionLeft = 0.04;
    applyDamage(world, damage, RunRng.fromSeed(2), events);
    expect(actor.actionLeft).toBe(0.04);
    expect(events.filter((event) => event.type === "damage_applied")).toHaveLength(2);
    expect(events.filter((event) => event.type === "actor_staggered")).toHaveLength(1);
  });

  it("keeps bosses immune, throttles hero reactions, and prioritizes death", () => {
    const bossSetup = setup("boss.ember_colossus");
    const bossActor = bossSetup.world.getComponent<ActorComponent>("actor", bossSetup.target)!;
    bossActor.invulnerableLeft = 0;
    applyDamage(bossSetup.world, bossSetup.damage, RunRng.fromSeed(3), []);
    expect(bossActor.action).toBe("idle");
    expect(bossActor.hitReactionCooldownLeft).toBe(0);

    const heroWorld = new World();
    const factory = new ActorFactory(createCoreContent());
    const enemy = factory.create(heroWorld, "enemy.ember_stalker", 0, 0);
    const hero = factory.create(heroWorld, "hero.ember_runner", 1, 0, { playerSlot: 1 });
    const heroDamage = { ...packet, source: enemy, target: hero, minBase: 1, maxBase: 1 };
    applyDamage(heroWorld, heroDamage, RunRng.fromSeed(4), []);
    const heroActor = heroWorld.getComponent<ActorComponent>("actor", hero)!;
    expect(heroActor).toMatchObject({
      action: "hit",
      actionLeft: 0.12,
      hitReactionCooldownLeft: 0.3,
    });

    heroWorld.getComponent<HealthComponent>("health", hero)!.current = 1;
    applyDamage(heroWorld, heroDamage, RunRng.fromSeed(5), []);
    expect(heroActor.action).toBe("dead");
  });
});
