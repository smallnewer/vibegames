import type { TransformComponent } from "../actor/ActorComponents";
import { RunRng } from "../balance/RunRng";
import type { GameplayEvent } from "../core/GameplayEvent";
import type { EntityId, World } from "../core/World";
import type { PlayerSlotComponent, PlayerSlotId } from "../player/PlayerSlot";
import type { EncounterMemberComponent } from "../dungeon/DungeonComponents";
import type { DropTableComponent, LootComponent, LootGrant } from "./ItemComponents";
import { lootTable, rollLoot } from "./LootTables";

const OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-0.45, 0], [0.45, 0], [0, 0.45], [0, -0.45],
];

export class DropSystem {
  private sequence = 0;

  constructor(private readonly rng: RunRng = RunRng.fromSeed(1)) {}

  update(world: World, events: GameplayEvent[]): void {
    const players = world.entitiesWith("playerSlot")
      .map((actor) => ({
        actor,
        slot: world.getComponent<PlayerSlotComponent>("playerSlot", actor)!.slot,
      }))
      .sort((left, right) => left.slot - right.slot);
    const deaths = events.filter((event) => event.type === "actor_died");
    for (const death of deaths) {
      const table = world.getComponent<DropTableComponent>("dropTable", death.actor);
      const transform = world.getComponent<TransformComponent>("transform", death.actor);
      if (!table || !transform || table.dropped || players.length === 0) continue;
      const encounterMember = world.getComponent<EncounterMemberComponent>(
        "encounterMember",
        death.actor,
      );
      if (table.sourceType === "boss" && encounterMember?.member !== undefined) continue;
      table.dropped = true;
      this.sequence += 1;
      const equipmentOwner = players[(this.sequence - 1) % players.length].slot;
      for (const player of players) {
        const grants = rollLoot(lootTable(table.sourceType), {
          owner: player.slot,
          source: death.actor,
          itemLevel: table.level + (table.sourceType === "elite" ? 1 : table.sourceType === "boss" ? 2 : 0),
          theme: table.theme,
          sequence: this.sequence,
          rng: this.rng,
        });
        for (const grant of grants) {
          if (grant.type === "item" && table.sourceType !== "boss" && player.slot !== equipmentOwner) {
            continue;
          }
          this.spawn(world, events, death.actor, player.slot, grant, transform, events.length);
        }
      }
    }
  }

  private spawn(
    world: World,
    events: GameplayEvent[],
    source: EntityId,
    owner: PlayerSlotId,
    grant: LootGrant,
    transform: TransformComponent,
    index: number,
  ): void {
    const offset = OFFSETS[index % OFFSETS.length];
    const loot = world.createEntity();
    world.setComponent<LootComponent>("loot", loot, {
      owner,
      grant,
      source,
      x: transform.x + offset[0],
      z: transform.z + offset[1],
    });
    events.push({ type: "loot_spawned", loot, kind: grant.type, owner });
  }
}
