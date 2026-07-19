import type { DamageType } from "../combat/DamagePacket";
import { BALANCE_DATA } from "../content/generated/balance";
import type {
  AbilityDef,
  EffectNode,
  StatBlock,
} from "../content/Definitions";
import type { SkillRank } from "../progression/ProgressionComponents";

export interface EvaluatedAbility extends AbilityDef {
  readonly rank: SkillRank;
  readonly cooldown: number;
  readonly charges: 1 | 2;
  readonly damageMultiplier: number;
  readonly damage?: Readonly<{ min: number; max: number; type: DamageType }>;
  readonly radius?: number;
  readonly duration?: number;
  readonly maxTargets?: number;
}

interface EvaluationBonuses {
  readonly damageMultiplier: number;
  readonly radiusAdd: number;
  readonly durationAdd: number;
  readonly targetCountAdd: number;
  readonly charges?: 2;
  readonly applyStatuses: readonly string[];
  readonly effects: readonly EffectNode[];
}

function collectBonuses(definition: AbilityDef, rank: SkillRank): EvaluationBonuses {
  const available = definition.rankBonuses.filter((bonus) => bonus.rank <= rank);
  const globalMultiplier: number = BALANCE_DATA.skillRankMultipliers[rank - 1];
  return {
    damageMultiplier: available.reduce<number>(
      (value, bonus) => value * (bonus.damageMultiplier ?? 1),
      globalMultiplier,
    ),
    radiusAdd: available.reduce((value, bonus) => value + (bonus.radiusAdd ?? 0), 0),
    durationAdd: available.reduce((value, bonus) => value + (bonus.durationAdd ?? 0), 0),
    targetCountAdd: available.reduce((value, bonus) => value + (bonus.targetCountAdd ?? 0), 0),
    charges: [...available].reverse().find((bonus) => bonus.charges)?.charges,
    applyStatuses: available.flatMap((bonus) => bonus.applyStatus ? [bonus.applyStatus] : []),
    effects: available.flatMap((bonus) => bonus.effect ? [bonus.effect] : []),
  };
}

function scaleEffect(
  node: EffectNode,
  multiplier: number,
  radiusAdd: number,
  durationAdd: number,
  targetCountAdd: number,
): EffectNode {
  if (node.type === "sequence" || node.type === "parallel") {
    return {
      ...node,
      children: node.children.map((child) => scaleEffect(
        child,
        multiplier,
        radiusAdd,
        durationAdd,
        targetCountAdd,
      )),
    };
  }
  if (node.type === "delay") {
    return {
      ...node,
      child: scaleEffect(node.child, multiplier, radiusAdd, durationAdd, targetCountAdd),
    };
  }
  if (node.type === "if_targets") {
    return {
      ...node,
      then: scaleEffect(node.then, multiplier, radiusAdd, durationAdd, targetCountAdd),
      otherwise: node.otherwise
        ? scaleEffect(node.otherwise, multiplier, radiusAdd, durationAdd, targetCountAdd)
        : undefined,
    };
  }
  if (node.type === "damage" || node.type === "spawn_projectile") {
    return {
      ...node,
      value: {
        ...node.value,
        minBase: Math.round(node.value.minBase * multiplier),
        maxBase: Math.round(node.value.maxBase * multiplier),
        coefficient: node.value.coefficient * multiplier,
      },
    };
  }
  if (node.type === "query_circle") {
    return { ...node, radius: node.radius + radiusAdd };
  }
  if (node.type === "apply_status" && durationAdd > 0) {
    return { ...node, durationAdd: (node.durationAdd ?? 0) + durationAdd };
  }
  if (node.type === "spawn_hazard") {
    return {
      ...node,
      radius: node.radius + radiusAdd,
      duration: node.duration + durationAdd,
      child: scaleEffect(node.child, multiplier, radiusAdd, 0, 0),
    };
  }
  if (node.type === "spawn_summon") return { ...node, duration: node.duration + durationAdd };
  if (node.type === "chain_targets") {
    return { ...node, maxTargets: node.maxTargets + targetCountAdd };
  }
  if (node.type === "repeat") {
    return {
      ...node,
      count: node.count + targetCountAdd,
      child: scaleEffect(node.child, multiplier, radiusAdd, 0, 0),
    };
  }
  return node;
}

function firstNode<T extends EffectNode["type"]>(
  node: EffectNode,
  type: T,
): Extract<EffectNode, { type: T }> | undefined {
  if (node.type === type) return node as Extract<EffectNode, { type: T }>;
  if (node.type === "sequence" || node.type === "parallel") {
    for (const child of node.children) {
      const found = firstNode(child, type);
      if (found) return found;
    }
  }
  if (node.type === "delay") return firstNode(node.child, type);
  if (node.type === "spawn_hazard" || node.type === "repeat") {
    return firstNode(node.child, type);
  }
  if (node.type === "if_targets") {
    return firstNode(node.then, type)
      ?? (node.otherwise ? firstNode(node.otherwise, type) : undefined);
  }
  return undefined;
}

function appendRankStatuses(
  effect: EffectNode,
  statuses: readonly string[],
): EffectNode {
  if (statuses.length === 0) return effect;
  return {
    type: "sequence",
    children: [
      effect,
      ...statuses.map((status): EffectNode => ({
        type: "apply_status",
        status,
        stacks: 1,
      })),
    ],
  };
}

export function evaluateAbility(
  definition: AbilityDef,
  rank: SkillRank,
  stats: Readonly<StatBlock>,
): EvaluatedAbility {
  if (!Number.isInteger(rank) || rank < 1 || rank > 5) {
    throw new Error(`skill rank must be an integer from 1 to 5: ${rank}`);
  }

  const bonuses = collectBonuses(definition, rank);
  const scaledEffect = scaleEffect(
    definition.effect,
    bonuses.damageMultiplier,
    bonuses.radiusAdd,
    bonuses.durationAdd,
    bonuses.targetCountAdd,
  );
  const rankedEffect = bonuses.effects.reduce<EffectNode>((current, bonusEffect) => ({
    type: "sequence",
    children: [
      current,
      scaleEffect(
        bonusEffect,
        bonuses.damageMultiplier,
        bonuses.radiusAdd,
        bonuses.durationAdd,
        bonuses.targetCountAdd,
      ),
    ],
  }), scaledEffect);
  const effect = appendRankStatuses(rankedEffect, bonuses.applyStatuses);
  const damageNode = firstNode(effect, "damage") ?? firstNode(effect, "spawn_projectile");
  const circleNode = firstNode(effect, "query_circle");
  const hazardNode = firstNode(effect, "spawn_hazard");
  const summonNode = firstNode(effect, "spawn_summon");
  const chainNode = firstNode(effect, "chain_targets");
  const repeatNode = firstNode(effect, "repeat");
  const damage = damageNode
    ? {
        min: Math.round(
          damageNode.value.minBase
          + stats[damageNode.value.scalingStat] * damageNode.value.coefficient,
        ),
        max: Math.round(
          damageNode.value.maxBase
          + stats[damageNode.value.scalingStat] * damageNode.value.coefficient,
        ),
        type: damageNode.value.damageType,
      }
    : undefined;
  const cooldownRecovery = Math.max(0, stats.cooldownRecovery);

  return {
    ...definition,
    rank,
    cooldown: definition.cooldown / (1 + cooldownRecovery),
    charges: bonuses.charges ?? definition.charges,
    damageMultiplier: bonuses.damageMultiplier,
    damage,
    radius: circleNode?.radius,
    duration: hazardNode?.duration ?? summonNode?.duration
      ?? (bonuses.durationAdd > 0 ? bonuses.durationAdd : undefined),
    maxTargets: chainNode?.maxTargets ?? repeatNode?.count
      ?? (bonuses.targetCountAdd > 0 ? bonuses.targetCountAdd : undefined),
    effect,
  };
}
