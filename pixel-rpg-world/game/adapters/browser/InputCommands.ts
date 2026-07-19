import type { Command } from "../../core/Command";
import type { GameSnapshot } from "../../core/GameSnapshot";
import type { EntityId } from "../../core/World";

const REVIVE_RANGE = 1.4;

// B / E 在可复活队友旁持续产生 revive；否则只在按下沿产生一次交互。
export function contextActionCommands(
  snapshot: GameSnapshot,
  actorId: EntityId,
  pressed: boolean,
  held: boolean,
): Command[] {
  const revive = held ? reviveCommand(snapshot, actorId) : undefined;
  if (revive) return [revive];
  const interaction = pressed ? interactionCommand(snapshot, actorId) : undefined;
  return interaction ? [interaction] : [];
}

function reviveCommand(
  snapshot: GameSnapshot,
  actorId: EntityId,
): Extract<Command, { type: "revive" }> | undefined {
  const actor = snapshot.actors.find((candidate) => candidate.id === actorId);
  if (!actor || actor.lifeState === "downed" || actor.lifeState === "dead") return undefined;
  const target = (snapshot.players ?? [])
    .filter((player) => player.actor !== actorId)
    .map((player) => snapshot.actors.find((candidate) => candidate.id === player.actor))
    .filter((candidate) => candidate?.lifeState === "downed")
    .map((candidate) => ({
      actor: candidate!,
      distance: Math.hypot(candidate!.x - actor.x, candidate!.z - actor.z),
    }))
    .filter((candidate) => candidate.distance <= REVIVE_RANGE)
    .sort((left, right) => left.distance - right.distance || left.actor.id - right.actor.id)[0];
  return target
    ? { type: "revive", actor: actorId, target: target.actor.id, held: true }
    : undefined;
}

// 掉落由碰撞系统自动拾取；E 只负责明确的地下城机关交互。
export function interactionCommand(
  snapshot: GameSnapshot,
  actorId: EntityId,
): Command | undefined {
  const actor = snapshot.actors.find((candidate) => candidate.id === actorId);
  if (!actor) return undefined;

  const nearestInteraction = snapshot.interactions
    .map((target) => ({
      target,
      distance: Math.hypot(target.x - actor.x, target.z - actor.z),
    }))
    .filter((entry) => (
      entry.target.trigger === "interact"
      && !["completed", "disabled"].includes(entry.target.state)
      && entry.distance <= entry.target.radius
    ))
    .sort((left, right) => (
      left.distance - right.distance || left.target.id - right.target.id
    ))[0];
  return nearestInteraction
    ? { type: "interact", actor: actorId, target: nearestInteraction.target.id }
    : undefined;
}
