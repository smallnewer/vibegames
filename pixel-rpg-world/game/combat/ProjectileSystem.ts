import type { ActorComponent, ProjectileComponent, TransformComponent } from "../actor/ActorComponents";
import type { GameplayEvent } from "../core/GameplayEvent";
import type { World } from "../core/World";
import { applyDamage } from "./Damage";
import { RunRng } from "../balance/RunRng";

export class ProjectileSystem {
  constructor(private readonly rng: RunRng = RunRng.fromSeed(1)) {}

  // 弹道按固定逻辑帧移动，命中后立即销毁且只伤害一个目标。
  update(world: World, step: number, events: GameplayEvent[]): void {
    for (const entity of [...world.entitiesWith("projectile")]) {
      const projectile = world.getComponent<ProjectileComponent>("projectile", entity);
      if (!projectile) continue;
      projectile.previousX = projectile.x;
      projectile.previousZ = projectile.z;
      projectile.x += projectile.velocityX * step;
      projectile.z += projectile.velocityZ * step;
      projectile.lifeLeft -= step;
      if (projectile.lifeLeft <= 0) {
        world.destroyEntity(entity);
        events.push({ type: "projectile_removed", projectile: entity });
        continue;
      }

      const target = world.entitiesWith("actor", "transform", "health").find((candidate) => {
        if (candidate === projectile.owner) return false;
        const actor = world.getComponent<ActorComponent>("actor", candidate)!;
        const transform = world.getComponent<TransformComponent>("transform", candidate)!;
        if (actor.faction === projectile.faction || actor.action === "dead") return false;
        return Math.hypot(transform.x - projectile.x, transform.z - projectile.z)
          <= actor.radius + projectile.radius;
      });
      if (!target) continue;
      applyDamage(world, {
        ...projectile.damage,
        source: projectile.owner,
        target,
        skillId: projectile.skillId,
        actionSequence: projectile.actionSequence,
      }, this.rng, events);
      world.destroyEntity(entity);
      events.push({ type: "projectile_removed", projectile: entity });
    }
  }
}
