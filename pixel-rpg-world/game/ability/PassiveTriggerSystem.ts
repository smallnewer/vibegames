import type { AbilityLoadoutComponent } from "./AbilityComponents";
import type { ContentRegistry } from "../content/ContentRegistry";
import type { GameplayEvent } from "../core/GameplayEvent";
import type { World } from "../core/World";
import type { StatusSystem } from "../status/StatusSystem";

export class PassiveTriggerSystem {
  constructor(
    private readonly content: ContentRegistry,
    private readonly statuses: StatusSystem,
  ) {}

  update(
    world: World,
    facts: readonly GameplayEvent[],
    events: GameplayEvent[],
  ): void {
    for (const death of facts.filter((event) => event.type === "actor_died")) {
      const lethal = [...facts].reverse().find((event) => (
        event.type === "damage_applied" && event.target === death.actor
      ));
      if (!lethal || lethal.type !== "damage_applied") continue;
      const loadout = world.getComponent<AbilityLoadoutComponent>(
        "abilityLoadout",
        lethal.source,
      );
      if (!loadout) continue;
      for (const passiveId of new Set(Object.values(loadout.passives).filter(Boolean))) {
        const status = this.content.passive(passiveId!).onKillStatus;
        if (!status) continue;
        this.statuses.apply(world, lethal.source, status, 1, events, {
          source: lethal.source,
        });
      }
    }
  }
}
