import type { TransformComponent } from "../actor/ActorComponents";
import { RunRng } from "../balance/RunRng";
import type { GameplayEvent } from "../core/GameplayEvent";
import type { EntityId, World } from "../core/World";
import type { InventoryComponent, LootComponent, LootGrant } from "../item/ItemComponents";
import { lootTable, rollLoot } from "../item/LootTables";
import type { PlayerSlotComponent, PlayerSlotId } from "../player/PlayerSlot";
import type { EncounterMemberComponent, InteractableComponent } from "./DungeonComponents";
import type { EncounterRuntimeComponent } from "./EncounterComponents";
import { isRuntimeEncounter, type DungeonPack } from "./DungeonDefinitions";
import type { DungeonRunComponent } from "./DungeonRunComponents";

const SLOT_OFFSETS = [-1.5, -0.5, 0.5, 1.5] as const;

export interface DungeonRewardState {
  pendingPlayers: PlayerSlotId[];
  settledPlayers: PlayerSlotId[];
  firstClear: boolean;
  unlockDungeon?: string;
  guaranteeLoot: Partial<Record<PlayerSlotId, EntityId>>;
  settled: boolean;
}

export interface ProfileProgressComponent {
  clearedDungeons: string[];
  unlockedDungeons: string[];
}

export class DungeonRewardSystem {
  constructor(
    private readonly definition: DungeonPack,
    private readonly rng: RunRng = RunRng.fromSeed(1),
  ) {}

  update(
    world: World,
    dungeon: EntityId,
    players: readonly EntityId[],
    facts: readonly GameplayEvent[],
    events: GameplayEvent[],
  ): void {
    const run = world.getComponent<DungeonRunComponent>("dungeonRun", dungeon);
    if (!run || !this.definition.run) return;
    let reward = world.getComponent<DungeonRewardState>("dungeonReward", dungeon);
    if (!reward && run.phase === "reward" && facts.some((event) => (
      event.type === "encounter_completed" && event.encounter === this.definition.run!.bossEncounter
    ))) {
      reward = this.spawnRewards(world, dungeon, players, events);
    }
    if (!reward || reward.settled) return;

    for (const player of [...reward.pendingPlayers]) {
      const loot = reward.guaranteeLoot[player];
      const picked = loot !== undefined && facts.some((event) => (
        event.type === "loot_picked_up" && event.loot === loot
      ));
      if (!picked) continue;
      reward.pendingPlayers = reward.pendingPlayers.filter((slot) => slot !== player);
      reward.settledPlayers.push(player);
      reward.settledPlayers.sort((left, right) => left - right);
      events.push({ type: "dungeon_reward_claimed", player });
    }
    if (reward.pendingPlayers.length > 0) return;
    reward.settled = true;
    const portal = world.entitiesWith("interactable").find((entity) => (
      world.getComponent<InteractableComponent>("interactable", entity)!.definition
        === this.definition.run!.completionPortal
    ));
    if (portal !== undefined) {
      world.getComponent<InteractableComponent>("interactable", portal)!.state = "active";
      events.push({ type: "interaction_changed", target: portal, state: "active" });
    }
    events.push({ type: "dungeon_reward_settled" });
  }

  private spawnRewards(
    world: World,
    dungeon: EntityId,
    players: readonly EntityId[],
    events: GameplayEvent[],
  ): DungeonRewardState {
    const profile = world.getComponent<ProfileProgressComponent>("profileProgress", dungeon);
    const firstClear = !profile?.clearedDungeons.includes(this.definition.id);
    const reward: DungeonRewardState = {
      pendingPlayers: [],
      settledPlayers: [],
      firstClear,
      unlockDungeon: firstClear ? this.definition.run?.firstClearUnlock : undefined,
      guaranteeLoot: {},
      settled: false,
    };
    world.setComponent<DungeonRewardState>("dungeonReward", dungeon, reward);

    const source = this.bossSource(world);
    const bossEncounter = this.definition.encounterById.get(this.definition.run!.bossEncounter);
    if (!bossEncounter || !isRuntimeEncounter(bossEncounter)) {
      throw new Error(`Missing runtime Boss encounter: ${this.definition.run!.bossEncounter}`);
    }
    const anchor = source === undefined
      ? bossEncounter.trigger
      : world.getComponent<TransformComponent>("transform", source)!;
    const orderedPlayers = players.map((actor) => ({
      actor,
      slot: world.getComponent<PlayerSlotComponent>("playerSlot", actor)!.slot,
    })).sort((left, right) => left.slot - right.slot);
    for (const [index, player] of orderedPlayers.entries()) {
      const grants = rollLoot(lootTable("boss"), {
        owner: player.slot,
        source: source ?? dungeon,
        itemLevel: this.definition.run!.levelBand.normal[1] + 2,
        theme: "ember",
        sequence: 1,
        rng: this.rng,
      });
      const equipment = grants.find((grant) => grant.type === "item");
      if (!equipment || equipment.type !== "item") {
        throw new Error(`Boss reward table did not produce player ${player.slot} guarantee`);
      }
      const loot = this.spawnLoot(
        world,
        source ?? dungeon,
        player.slot,
        equipment,
        anchor.x + SLOT_OFFSETS[index],
        anchor.z,
        events,
      );
      reward.pendingPlayers.push(player.slot);
      reward.guaranteeLoot[player.slot] = loot;
      const inventory = world.getComponent<InventoryComponent>("inventory", player.actor)!;
      for (const grant of grants) {
        if (grant.type !== "material") continue;
        inventory.materials[grant.material] += grant.amount;
      }
      if (firstClear) inventory.materials["material.seal"] += 1;
    }
    events.push({
      type: "profile_progress_requested",
      clearedDungeon: this.definition.id,
      unlockDungeon: reward.unlockDungeon,
    });
    return reward;
  }

  private spawnLoot(
    world: World,
    source: EntityId,
    owner: PlayerSlotId,
    grant: LootGrant,
    x: number,
    z: number,
    events: GameplayEvent[],
  ): EntityId {
    const loot = world.createEntity();
    world.setComponent<LootComponent>("loot", loot, { owner, grant, source, x, z });
    events.push({ type: "loot_spawned", loot, kind: grant.type, owner });
    return loot;
  }

  private bossSource(world: World): EntityId | undefined {
    const runtime = world.entitiesWith("encounterRuntime").find((entity) => (
      world.getComponent<EncounterRuntimeComponent>("encounterRuntime", entity)!.definition
        === this.definition.run!.bossEncounter
    ));
    if (runtime === undefined) return undefined;
    return world.getComponent<EncounterRuntimeComponent>("encounterRuntime", runtime)!.members.find(
      (entity) => world.getComponent<EncounterMemberComponent>("encounterMember", entity)?.member
        !== undefined,
    );
  }
}
