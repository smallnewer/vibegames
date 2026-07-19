import type {
  ActorComponent,
  HealthComponent,
  TransformComponent,
} from "../actor/ActorComponents";
import type { Command } from "../core/Command";
import type { GameplayEvent } from "../core/GameplayEvent";
import type { EntityId, World } from "../core/World";
import type { DownedComponent } from "./DownedComponents";

const DOWNED_SECONDS = 10;
const REVIVE_SECONDS = 0.8;
const REVIVE_RANGE = 1.4;
const REVIVE_HEALTH_RATIO = 0.3;

export class DownedSystem {
  private wiped = false;

  update(
    world: World,
    players: readonly EntityId[],
    commands: readonly Command[],
    step: number,
    facts: readonly GameplayEvent[],
    events: GameplayEvent[],
  ): void {
    this.convertDeaths(world, players, facts, events);
    this.updateTimers(world, players, step);
    this.updateRevives(world, players, commands, step, facts, events);

    const states = players.map((player) => world.getComponent<DownedComponent>("downed", player));
    const hasLivingHero = states.some((state) => state?.state === "alive");
    if (hasLivingHero) this.wiped = false;
    if (!hasLivingHero && !this.wiped) {
      this.wiped = true;
      for (const player of players) {
        const state = world.getComponent<DownedComponent>("downed", player);
        if (state) {
          state.state = "dead";
          state.timeLeft = 0;
          state.reviveProgress = 0;
          state.revivedBy = undefined;
        }
      }
      events.push({ type: "party_wiped" });
    }
  }

  private convertDeaths(
    world: World,
    players: readonly EntityId[],
    facts: readonly GameplayEvent[],
    events: GameplayEvent[],
  ): void {
    const playerSet = new Set(players);
    for (const event of facts) {
      if (event.type !== "actor_died" || !playerSet.has(event.actor)) continue;
      const state = world.getComponent<DownedComponent>("downed", event.actor);
      if (!state || state.state !== "alive") continue;
      if (players.length === 1) {
        state.state = "dead";
        state.timeLeft = 0;
        continue;
      }
      state.state = "downed";
      state.timeLeft = DOWNED_SECONDS;
      state.reviveProgress = 0;
      state.revivedBy = undefined;
      events.push({ type: "hero_downed", actor: event.actor, duration: DOWNED_SECONDS });
    }
  }

  private updateTimers(world: World, players: readonly EntityId[], step: number): void {
    for (const player of players) {
      const state = world.getComponent<DownedComponent>("downed", player);
      if (!state || state.state !== "downed") continue;
      state.timeLeft = Math.max(0, state.timeLeft - step);
      if (state.timeLeft === 0) {
        state.state = "dead";
        state.reviveProgress = 0;
        state.revivedBy = undefined;
      }
    }
  }

  private updateRevives(
    world: World,
    players: readonly EntityId[],
    commands: readonly Command[],
    step: number,
    facts: readonly GameplayEvent[],
    events: GameplayEvent[],
  ): void {
    const interrupted = new Set<EntityId>();
    for (const command of commands) {
      if (command.type === "move" && (command.x !== 0 || command.z !== 0)) {
        interrupted.add(command.actor);
      }
    }
    for (const event of facts) {
      if (event.type === "damage_applied") interrupted.add(event.target);
    }

    const heldByTarget = new Map<EntityId, Extract<Command, { type: "revive" }>[]>();
    for (const command of commands) {
      if (command.type !== "revive" || !command.held || interrupted.has(command.actor)) continue;
      const list = heldByTarget.get(command.target) ?? [];
      list.push(command);
      heldByTarget.set(command.target, list);
    }

    for (const target of players) {
      const state = world.getComponent<DownedComponent>("downed", target);
      if (!state || state.state !== "downed") continue;
      const candidates = (heldByTarget.get(target) ?? [])
        .filter((command) => this.canRevive(world, command.actor, target))
        .sort((left, right) => left.actor - right.actor);
      const command = candidates[0];
      if (!command) {
        state.reviveProgress = 0;
        state.revivedBy = undefined;
        continue;
      }
      if (state.revivedBy !== command.actor) state.reviveProgress = 0;
      state.revivedBy = command.actor;
      state.reviveProgress = Math.min(REVIVE_SECONDS, state.reviveProgress + step);
      if (state.reviveProgress < REVIVE_SECONDS) continue;
      const health = world.getComponent<HealthComponent>("health", target)!;
      const actor = world.getComponent<ActorComponent>("actor", target)!;
      state.state = "alive";
      state.timeLeft = 0;
      state.reviveProgress = 0;
      state.revivedBy = undefined;
      health.current = Math.max(1, Math.ceil(health.max * REVIVE_HEALTH_RATIO));
      actor.action = "idle";
      actor.actionLeft = 0;
      actor.actionDuration = 0;
      actor.actionMotion = undefined;
      events.push({ type: "hero_revived", actor: target, by: command.actor, health: health.current });
    }
  }

  private canRevive(world: World, rescuer: EntityId, target: EntityId): boolean {
    const rescuerLife = world.getComponent<DownedComponent>("downed", rescuer);
    const rescuerActor = world.getComponent<ActorComponent>("actor", rescuer);
    const source = world.getComponent<TransformComponent>("transform", rescuer);
    const destination = world.getComponent<TransformComponent>("transform", target);
    return rescuerLife?.state === "alive"
      && rescuerActor?.action !== "dead"
      && source !== undefined
      && destination !== undefined
      && Math.hypot(source.x - destination.x, source.z - destination.z) <= REVIVE_RANGE;
  }
}
