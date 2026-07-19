import type { ActiveSkillSlot } from "../content/Definitions";
import type { GameSnapshot, PlayerSlotSnapshot } from "../core/GameSnapshot";
import type {
  CombatHudModel,
  PlayerHudModel,
  SkillHudModel,
  WeaponHudModel,
} from "./HudTypes";
import { itemBaseForDefinition } from "../item/ItemCatalog";
import { createCoreContent } from "../content/coreContent";

const CONTENT = createCoreContent();

const SKILL_DIRECTIONS = {
  skill_up: "up",
  skill_right: "right",
  skill_down: "down",
  skill_left: "left",
} as const satisfies Record<ActiveSkillSlot, SkillHudModel["direction"]>;

function cooldownRatio(left: number, duration: number): number {
  return duration > 0 ? Math.max(0, Math.min(1, left / duration)) : 0;
}

function playerModel(snapshot: GameSnapshot, player: PlayerSlotSnapshot): PlayerHudModel {
  const actor = snapshot.actors.find((candidate) => candidate.id === player.actor);
  if (!actor) throw new Error(`Missing HUD actor for player ${player.slot}`);
  const weapon = (slot: "melee" | "ranged", button: "X" | "Y"): WeaponHudModel => {
    const value = player.progress.weapons[slot];
    const itemId = player.progress.equipment.slots[slot];
    const item = player.progress.items.find((candidate) => candidate.id === itemId);
    return {
      id: value.id,
      icon: itemBaseForDefinition(item?.definition ?? "")?.iconFamily
        ?? (slot === "melee" ? "icon.weapon.sword" : "icon.weapon.bow"),
      name: value.name,
      cooldownLeft: value.cooldownLeft,
      cooldownRatio: cooldownRatio(value.cooldownLeft, value.cooldownDuration),
      charges: value.charges,
      maxCharges: value.maxCharges,
      button,
    };
  };
  const skill = (slot: ActiveSkillSlot): SkillHudModel => {
    const value = player.progress.abilities[slot];
    return {
      id: value.id,
      icon: value.id ? CONTENT.ability(value.id).icon : undefined,
      name: value.name,
      cooldownLeft: value.cooldownLeft,
      cooldownRatio: cooldownRatio(value.cooldownLeft, value.cooldownDuration),
      charges: value.charges,
      maxCharges: value.maxCharges,
      direction: SKILL_DIRECTIONS[slot],
    };
  };
  return {
    slot: player.slot,
    actor: player.actor,
    name: actor.name,
    level: player.progress.level,
    health: actor.health,
    maxHealth: actor.maxHealth,
    lifeState: actor.lifeState ?? (actor.action === "dead" ? "dead" : "alive"),
    downedTimeLeft: actor.downedTimeLeft,
    statuses: player.progress.statuses.slice(0, 4).map((status) => ({
      id: status.id,
      icon: status.icon,
      stacks: status.stacks,
      timeLeft: status.timeLeft,
    })),
    melee: weapon("melee", "X"),
    ranged: weapon("ranged", "Y"),
    rollCooldownRatio: actor.rollCooldownRatio,
    skills: {
      skill_up: skill("skill_up"),
      skill_right: skill("skill_right"),
      skill_down: skill("skill_down"),
      skill_left: skill("skill_left"),
    },
  };
}

export function buildCombatHud(
  snapshot: GameSnapshot,
  previous?: CombatHudModel,
): CombatHudModel {
  const players = [...snapshot.players]
    .sort((left, right) => left.slot - right.slot)
    .map((player) => playerModel(snapshot, player));
  const bossActor = snapshot.actors.find((actor) => (
    actor.role === "boss" && actor.action !== "dead"
  ));
  const bossVisible = snapshot.run.phase
    ? snapshot.run.phase === "boss_combat"
    : snapshot.dungeon.encounter === "active";
  const objectiveSource = snapshot.run.objective ?? {
    id: "objective.explore",
    text: "探索地下城",
    current: 0,
    total: 1,
  };
  const objectiveChanged = previous?.objective.id !== objectiveSource.id
    || previous.objective.text !== objectiveSource.text
    || previous.objective.current !== objectiveSource.current
    || previous.objective.total !== objectiveSource.total;
  return {
    players,
    boss: bossVisible && bossActor
      ? {
          name: bossActor.name,
          phaseName: bossActor.bossPhase?.name ?? "",
          healthRatio: bossActor.maxHealth > 0
            ? Math.max(0, Math.min(1, bossActor.health / bossActor.maxHealth))
            : 0,
        }
      : undefined,
    objective: {
      id: objectiveSource.id,
      text: objectiveSource.text,
      current: objectiveSource.current,
      total: objectiveSource.total,
      changedAtTick: objectiveChanged || !previous
        ? snapshot.tick
        : previous.objective.changedAtTick,
    },
    prompt: revivePrompt(snapshot, players) ?? interactionPrompt(snapshot, players),
  };
}

function revivePrompt(
  snapshot: GameSnapshot,
  players: readonly PlayerHudModel[],
): CombatHudModel["prompt"] {
  for (const rescuer of players) {
    if (rescuer.lifeState !== "alive") continue;
    const source = snapshot.actors.find((actor) => actor.id === rescuer.actor)!;
    for (const target of players) {
      if (target.lifeState !== "downed" || target.actor === rescuer.actor) continue;
      const destination = snapshot.actors.find((actor) => actor.id === target.actor)!;
      if (Math.hypot(source.x - destination.x, source.z - destination.z) > 1.4) continue;
      return {
        action: "revive",
        text: `扶起 ${target.name}`,
        player: rescuer.slot,
        progress: Math.max(0, Math.min(1, (destination.reviveProgress ?? 0) / 0.8)),
      };
    }
  }
  return undefined;
}

function interactionPrompt(
  snapshot: GameSnapshot,
  players: readonly PlayerHudModel[],
): CombatHudModel["prompt"] {
  const candidates = players.flatMap((player) => {
    if (player.lifeState !== "alive") return [];
    const actor = snapshot.actors.find((candidate) => candidate.id === player.actor)!;
    return snapshot.interactions.flatMap((interaction) => {
      if (
        interaction.trigger !== "interact"
        || interaction.state === "completed"
        || interaction.state === "disabled"
      ) return [];
      const distance = Math.hypot(interaction.x - actor.x, interaction.z - actor.z);
      return distance <= interaction.radius ? [{ player, interaction, distance }] : [];
    });
  }).sort((left, right) => (
    left.distance - right.distance
    || left.player.slot - right.player.slot
    || left.interaction.id - right.interaction.id
  ));
  const candidate = candidates[0];
  return candidate
    ? {
        action: "interact",
        text: candidate.interaction.prompt,
        player: candidate.player.slot,
      }
    : undefined;
}
