import type { Command } from "../core/Command";
import type { GameplayEvent } from "../core/GameplayEvent";
import type { World } from "../core/World";
import type { GroundNavigation } from "../ports/GroundNavigation";
import type {
  ActionMotionDef,
  ActorComponent,
  TransformComponent,
} from "./ActorComponents";

const ROLL_DURATION = 0.28;
const ROLL_SPEED = 10;
export const ROLL_COOLDOWN = 0.75;
const MELEE_MOVE_SCALE = 0.4;

function normalized(x: number, z: number): [number, number] {
  const length = Math.hypot(x, z);
  return length > 0 ? [x / length, z / length] : [0, 0];
}

export function sampleActionMotionDistance(motion: ActionMotionDef, progress: number): number {
  // 返回动作当前应达到的累计位移，帧率变化不会改变总距离。
  const phase = Math.max(0, Math.min(1, (progress - motion.startAt) / (
    motion.endAt - motion.startAt
  )));
  const eased = motion.easing === "ease_out_cubic" ? 1 - (1 - phase) ** 3 : phase;
  return motion.distance * eased;
}

export class ActorSystem {
  constructor(private readonly navigation: GroundNavigation) {}

  // 固定逻辑帧内只处理地面移动、翻滚和动作计时。
  update(world: World, commands: readonly Command[], step: number, events: GameplayEvent[]): void {
    const commandsByActor = new Map<number, Command[]>();
    for (const command of commands) {
      const list = commandsByActor.get(command.actor) ?? [];
      list.push(command);
      commandsByActor.set(command.actor, list);
    }

    for (const entity of world.entitiesWith("actor", "transform")) {
      const actor = world.getComponent<ActorComponent>("actor", entity)!;
      const transform = world.getComponent<TransformComponent>("transform", entity)!;
      transform.previousX = transform.x;
      transform.previousZ = transform.z;
      actor.rollCooldownLeft = Math.max(0, actor.rollCooldownLeft - step);
      actor.invulnerableLeft = Math.max(0, actor.invulnerableLeft - step);
      actor.hitReactionCooldownLeft = Math.max(
        0,
        (actor.hitReactionCooldownLeft ?? 0) - step,
      );
      actor.actionLeft = Math.max(0, actor.actionLeft - step);
      if (actor.actionLeft < 1e-6) actor.actionLeft = 0;

      if (actor.action === "dead") continue;
      let actionPush = 0;
      // 只提交本帧新增位移，最后仍由导航层处理墙和危险区碰撞。
      if (actor.actionMotion && actor.actionDuration > 0) {
        const progress = 1 - actor.actionLeft / actor.actionDuration;
        const distance = sampleActionMotionDistance(actor.actionMotion, progress);
        actionPush = Math.max(0, distance - actor.actionMotion.appliedDistance);
        actor.actionMotion.appliedDistance = distance;
      }
      if (actor.actionLeft === 0 && ["roll", "melee", "ranged", "skill", "hit"].includes(actor.action)) {
        actor.action = "idle";
        actor.actionDuration = 0;
        actor.actionMotion = undefined;
      }

      const actorCommands = commandsByActor.get(entity) ?? [];
      const roll = actorCommands.find((command) => command.type === "roll");
      const move = actorCommands.find((command) => command.type === "move");
      if (move?.type === "move") {
        [actor.moveX, actor.moveZ] = normalized(move.x, move.z);
      } else {
        actor.moveX = 0;
        actor.moveZ = 0;
      }

      if (roll?.type === "roll" && actor.rollCooldownLeft === 0 && actor.action !== "roll") {
        const [x, z] = normalized(roll.x, roll.z);
        if (x !== 0 || z !== 0) {
          transform.facingX = x;
          transform.facingZ = z;
          actor.action = "roll";
          actor.actionMotion = undefined;
          actor.actionLeft = ROLL_DURATION;
          actor.actionDuration = ROLL_DURATION;
          actor.rollCooldownLeft = ROLL_COOLDOWN;
          actor.invulnerableLeft = ROLL_DURATION;
          events.push({ type: "action_started", actor: entity, action: "roll" });
        }
      }

      let velocityX = 0;
      let velocityZ = 0;
      if (actor.action === "roll") {
        velocityX = transform.facingX * ROLL_SPEED;
        velocityZ = transform.facingZ * ROLL_SPEED;
      } else if (actor.action === "melee") {
        // 全身挥砍保留少量输入位移，避免跑动时瞬间钉死在地面。
        velocityX = actor.moveX * actor.speed * MELEE_MOVE_SCALE;
        velocityZ = actor.moveZ * actor.speed * MELEE_MOVE_SCALE;
      } else if (!["melee", "ranged", "skill", "hit"].includes(actor.action)) {
        velocityX = actor.moveX * actor.speed;
        velocityZ = actor.moveZ * actor.speed;
        actor.action = velocityX === 0 && velocityZ === 0 ? "idle" : "run";
        if (actor.action === "run") {
          transform.facingX = actor.moveX;
          transform.facingZ = actor.moveZ;
        }
      }

      const destination = {
        x: transform.x + velocityX * step + transform.facingX * actionPush,
        z: transform.z + velocityZ * step + transform.facingZ * actionPush,
      };
      const position = this.navigation.move(transform, destination);
      transform.x = position.x;
      transform.z = position.z;
    }
  }
}
