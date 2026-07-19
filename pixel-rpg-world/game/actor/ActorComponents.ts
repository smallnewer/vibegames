import type { EntityId } from "../core/World";
import type { DamageSpec } from "../combat/DamagePacket";

export type ActorFaction = "hero" | "enemy";
export type ActorAction = "idle" | "run" | "roll" | "melee" | "ranged" | "skill" | "hit" | "dead";
export type ActorLocomotion = "idle" | "run";

export interface ActionMotionDef {
  readonly distance: number;
  readonly startAt: number;
  readonly endAt: number;
  readonly easing: "ease_out_cubic";
}

export interface ActionMotionState extends ActionMotionDef {
  appliedDistance: number;
}

export interface TransformComponent {
  x: number;
  z: number;
  previousX: number;
  previousZ: number;
  facingX: number;
  facingZ: number;
}

export interface ActorComponent {
  faction: ActorFaction;
  action: ActorAction;
  actionLeft: number;
  actionDuration: number;
  moveX: number;
  moveZ: number;
  speed: number;
  radius: number;
  rollCooldownLeft: number;
  invulnerableLeft: number;
  hitReactionCooldownLeft?: number;
  actionMotion?: ActionMotionState;
}

export interface HealthComponent {
  current: number;
  max: number;
}

export interface ProjectileComponent {
  owner: EntityId;
  faction: ActorFaction;
  x: number;
  z: number;
  previousX: number;
  previousZ: number;
  velocityX: number;
  velocityZ: number;
  radius: number;
  damage: DamageSpec;
  skillId: string;
  actionSequence: number;
  lifeLeft: number;
}
