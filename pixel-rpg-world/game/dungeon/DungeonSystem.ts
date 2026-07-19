import type { ActorComponent, TransformComponent } from "../actor/ActorComponents";
import type { GameplayEvent } from "../core/GameplayEvent";
import type { EntityId, World } from "../core/World";
import type {
  DungeonStateComponent,
  EncounterMemberComponent,
  InteractableComponent,
} from "./DungeonComponents";
import type { DungeonPack } from "./DungeonDefinitions";

export class DungeonSystem {
  constructor(private readonly definition: DungeonPack) {}

  // 遭遇生命周期独立于技能和机关动作，只关心进入与成员存活。
  update(
    world: World,
    dungeonId: EntityId,
    players: readonly EntityId[],
    events: GameplayEvent[],
  ): void {
    const dungeon = world.getComponent<DungeonStateComponent>("dungeon", dungeonId);
    if (!dungeon) return;
    const encounterDef = this.definition.interactions.find((value) => value.kind === "encounter")!;
    const encounterId = encounterDef.encounter;
    const trigger = world.entitiesWith("interactable").find((entity) => (
      world.getComponent<InteractableComponent>("interactable", entity)!.definition === encounterDef.id
    ));
    if (trigger === undefined) return;
    const interaction = world.getComponent<InteractableComponent>("interactable", trigger)!;

    if (
      dungeon.encounter === "idle"
      && players.some((player) => {
        const actor = world.getComponent<ActorComponent>("actor", player);
        const transform = world.getComponent<TransformComponent>("transform", player);
        return actor?.faction === "hero"
          && actor.action !== "dead"
          && transform !== undefined
          && Math.hypot(transform.x - encounterDef.x, transform.z - encounterDef.z)
            <= encounterDef.radius;
      })
    ) {
      dungeon.encounter = "active";
      interaction.state = "active";
      events.push({ type: "interaction_changed", target: trigger, state: "active" });
      events.push({ type: "encounter_started", encounter: encounterId });
    }

    if (dungeon.encounter !== "active") return;
    const members = world.entitiesWith("encounterMember", "actor").filter((entity) => (
      world.getComponent<EncounterMemberComponent>("encounterMember", entity)!.encounter
        === encounterId
    ));
    if (members.length === 0 || !members.every((entity) => (
      world.getComponent<ActorComponent>("actor", entity)!.action === "dead"
    ))) {
      return;
    }

    dungeon.encounter = "completed";
    interaction.state = "completed";
    events.push({ type: "interaction_changed", target: trigger, state: "completed" });
    events.push({ type: "encounter_completed", encounter: encounterId });
  }
}
