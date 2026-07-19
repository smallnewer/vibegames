import type { ActorComponent } from "../actor/ActorComponents";
import type { ContentRegistry } from "../content/ContentRegistry";
import type { GameplayEvent } from "../core/GameplayEvent";
import type { EntityId, World } from "../core/World";
import type { StatusApplication, StatusComponent, StatusInstance } from "./StatusComponents";

export class StatusSystem {
  constructor(private readonly content: ContentRegistry) {}

  // 所有 Buff/Debuff 都从这里进入，保证叠层规则一致。
  apply(
    world: World,
    target: EntityId,
    statusId: string,
    stacks: number,
    events: GameplayEvent[],
    application: StatusApplication = {},
  ): boolean {
    const actor = world.getComponent<ActorComponent>("actor", target);
    const statuses = world.getComponent<StatusComponent>("statuses", target);
    if (!actor || !statuses || actor.action === "dead") return false;

    const definition = this.content.status(statusId);
    const duration = definition.duration + Math.max(0, application.durationAdd ?? 0);
    const safeStacks = Math.max(1, Math.min(definition.maxStacks, stacks));
    const existing = statuses.values.find((status) => status.id === statusId);
    if (!existing) {
      const status: StatusInstance = {
        id: statusId,
        stacks: safeStacks,
        duration,
        timeLeft: duration,
      };
      if (application.source !== undefined) status.source = application.source;
      if (application.sourceSkillRank !== undefined) {
        status.sourceSkillRank = application.sourceSkillRank;
      }
      if (application.periodicMagnitude !== undefined) {
        status.periodicMagnitude = application.periodicMagnitude;
      }
      statuses.values.push(status);
      statuses.values.sort((left, right) => left.id.localeCompare(right.id));
    } else if (definition.stacking === "stack") {
      existing.stacks = Math.min(definition.maxStacks, existing.stacks + safeStacks);
      this.capture(existing, duration, application);
    } else if (definition.stacking === "replace") {
      existing.stacks = safeStacks;
      this.capture(existing, duration, application);
    } else {
      existing.stacks = Math.min(definition.maxStacks, Math.max(existing.stacks, safeStacks));
      this.capture(existing, duration, application);
    }
    events.push({ type: "status_added", target, status: statusId, stacks: safeStacks });
    return true;
  }

  private capture(
    status: StatusInstance,
    duration: number,
    application: StatusApplication,
  ): void {
    status.duration = duration;
    status.timeLeft = duration;
    if (application.source === undefined) delete status.source;
    else status.source = application.source;
    if (application.sourceSkillRank === undefined) delete status.sourceSkillRank;
    else status.sourceSkillRank = application.sourceSkillRank;
    if (application.periodicMagnitude === undefined) delete status.periodicMagnitude;
    else status.periodicMagnitude = application.periodicMagnitude;
  }

  remove(
    world: World,
    target: EntityId,
    statusId: string,
    events: GameplayEvent[],
  ): boolean {
    const statuses = world.getComponent<StatusComponent>("statuses", target);
    if (!statuses) return false;
    const before = statuses.values.length;
    statuses.values = statuses.values.filter((status) => status.id !== statusId);
    if (statuses.values.length === before) return false;
    events.push({ type: "status_removed", target, status: statusId });
    return true;
  }

  // 先收集过期项再删除，确保每个移除事件只发一次。
  update(world: World, step: number, events: GameplayEvent[]): void {
    for (const entity of world.entitiesWith("actor", "statuses")) {
      const statuses = world.getComponent<StatusComponent>("statuses", entity)!;
      for (const status of statuses.values) status.timeLeft -= step;
      const expired = statuses.values.filter((status) => status.timeLeft <= 0);
      statuses.values = statuses.values.filter((status) => status.timeLeft > 0);
      for (const status of expired) {
        events.push({ type: "status_removed", target: entity, status: status.id });
      }
    }
  }
}
