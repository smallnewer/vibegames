import type { ActorComponent, HealthComponent } from "../actor/ActorComponents";
import type { StatsComponent } from "../actor/Stats";
import type { RunRng } from "../balance/RunRng";
import { completeStatBlock, type StatBlock } from "../content/Definitions";
import type { GameplayEvent } from "../core/GameplayEvent";
import type { World } from "../core/World";
import type { ProgressionComponent } from "../progression/ProgressionComponents";
import { armorMitigation, critChance } from "./CombatRatings";
import type { DamagePacket, DamageResult, DamageType } from "./DamagePacket";

export interface DamageContext {
  readonly attackerLevel: number;
  readonly sourceStats: StatBlock;
  readonly targetStats: StatBlock;
  readonly targetHealth: number;
  readonly rng: RunRng;
}

const RESISTANCE_STAT: Readonly<Record<Exclude<DamageType, "physical">, keyof StatBlock>> = {
  fire: "fireResist",
  ice: "iceResist",
  poison: "poisonResist",
  storm: "stormResist",
};

function validatePacket(packet: DamagePacket): void {
  for (const [label, value] of [
    ["minBase", packet.minBase],
    ["maxBase", packet.maxBase],
    ["coefficient", packet.coefficient],
    ["procCoefficient", packet.procCoefficient],
  ] as const) {
    if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
  }
  if (!Number.isInteger(packet.minBase) || !Number.isInteger(packet.maxBase)) {
    throw new Error("damage base bounds must be integers");
  }
  if (packet.minBase < 0 || packet.maxBase < packet.minBase) {
    throw new Error("damage base bounds must be nonnegative and ordered");
  }
}

export function resolveDamage(packet: DamagePacket, context: DamageContext): DamageResult {
  validatePacket(packet);
  const rng = context.rng.fork(
    `damage:${packet.source}:${packet.target}:${packet.actionSequence}`,
  );
  const rolledBase = rng.intInclusive(packet.minBase, packet.maxBase);
  const scaled = (
    rolledBase + context.sourceStats[packet.scalingStat] * packet.coefficient
  ) * (1 + context.sourceStats.damageBonus);
  const critical = packet.canCrit && rng.chance(
    critChance(context.sourceStats.critRating, context.attackerLevel),
  );
  const preMitigation = scaled * (critical ? context.sourceStats.critDamage : 1);
  const mitigation = packet.damageType === "physical"
    ? armorMitigation(context.targetStats.armor, context.attackerLevel)
    : Math.max(-0.25, Math.min(0.75, context.targetStats[RESISTANCE_STAT[packet.damageType]]));
  const applied = preMitigation <= 0
    ? 0
    : Math.max(1, Math.round(
        preMitigation
        * (1 - mitigation)
        * (1 - context.targetStats.damageReduction),
      ));
  return {
    rolledBase,
    preMitigation,
    mitigation,
    applied,
    critical,
    killed: applied >= context.targetHealth,
  };
}

export function applyDamage(
  world: World,
  packet: DamagePacket,
  rng: RunRng,
  events: GameplayEvent[],
): DamageResult | undefined {
  const actor = world.getComponent<ActorComponent>("actor", packet.target);
  const health = world.getComponent<HealthComponent>("health", packet.target);
  if (!actor || !health || actor.action === "dead" || actor.invulnerableLeft > 0) return undefined;
  const sourceStats = completeStatBlock(
    world.getComponent<StatsComponent>("stats", packet.source)?.final ?? {},
  );
  const targetStats = completeStatBlock(
    world.getComponent<StatsComponent>("stats", packet.target)?.final ?? {},
  );
  const attackerLevel = world.getComponent<ProgressionComponent>("progression", packet.source)?.level ?? 1;
  const result = resolveDamage(packet, {
    attackerLevel,
    sourceStats,
    targetStats,
    targetHealth: health.current,
    rng,
  });
  if (result.applied <= 0) return result;
  health.current = Math.max(0, health.current - result.applied);
  events.push({
    type: "damage_applied",
    source: packet.source,
    target: packet.target,
    amount: result.applied,
    damageType: packet.damageType,
    critical: result.critical,
    skillId: packet.skillId,
  });
  if (health.current === 0) {
    actor.action = "dead";
    actor.actionLeft = 0;
    actor.actionDuration = 0;
    actor.actionMotion = undefined;
    events.push({ type: "actor_died", actor: packet.target });
  } else if (
    !world.getComponent("bossState", packet.target)
    && (actor.hitReactionCooldownLeft ?? 0) === 0
  ) {
    const duration = actor.faction === "enemy" ? 0.14 : 0.12;
    actor.action = "hit";
    actor.actionLeft = duration;
    actor.actionDuration = duration;
    actor.actionMotion = undefined;
    actor.hitReactionCooldownLeft = actor.faction === "enemy" ? 0.6 : 0.3;
    if (actor.faction === "enemy") {
      events.push({
        type: "actor_staggered",
        source: packet.source,
        target: packet.target,
        duration,
      });
    }
  }
  return result;
}
