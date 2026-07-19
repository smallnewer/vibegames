import { describe, expect, it } from "vitest";
import type { TransformComponent } from "../../../game/actor/ActorComponents";
import { ActorFactory } from "../../../game/actor/ActorFactory";
import { RunRng } from "../../../game/balance/RunRng";
import { DungeonRegistry } from "../../../game/content/DungeonRegistry";
import { createCoreContent } from "../../../game/content/coreContent";
import type { GameplayEvent } from "../../../game/core/GameplayEvent";
import { World } from "../../../game/core/World";
import type {
  DungeonRewardState,
  ProfileProgressComponent,
} from "../../../game/dungeon/DungeonRewardSystem";
import { DungeonRewardSystem } from "../../../game/dungeon/DungeonRewardSystem";
import type { EncounterMemberComponent, InteractableComponent } from "../../../game/dungeon/DungeonComponents";
import type { EncounterRuntimeComponent } from "../../../game/dungeon/EncounterComponents";
import type { DungeonRunComponent } from "../../../game/dungeon/DungeonRunComponents";
import { fixedItemInstance, type InventoryComponent, type LootComponent } from "../../../game/item/ItemComponents";
import { InventorySystem } from "../../../game/item/InventorySystem";

function rewardWorld(seed: number, cleared = false) {
  const definition = new DungeonRegistry().get("dungeon.production_foundation");
  const content = createCoreContent();
  const factory = new ActorFactory(content);
  const world = new World();
  const players = [
    factory.create(world, "hero.ember_runner", 72, 0, { playerSlot: 1 }),
    factory.create(world, "hero.ember_runner", 72, 0, { playerSlot: 2 }),
  ];
  const boss = factory.create(world, "boss.warden_hearn", 72, 0);
  world.setComponent<EncounterMemberComponent>("encounterMember", boss, {
    encounter: "encounter.warden_hearn",
    member: "member.warden_hearn",
  });
  const runtime = world.createEntity();
  world.setComponent<EncounterRuntimeComponent>("encounterRuntime", runtime, {
    definition: "encounter.warden_hearn",
    state: "completed",
    waveIndex: 1,
    nextWaveIn: 0,
    members: [boss],
    partySizeAtStart: 2,
    baseLevel: 4,
  });
  const dungeon = world.createEntity();
  world.setComponent<DungeonRunComponent>("dungeonRun", dungeon, {
    definition: definition.id,
    phase: "reward",
    completedEncounters: definition.encounters.map((encounter) => encounter.id),
    checkpoint: "checkpoint.warden_hearn",
    claimedRewardPlayers: [],
    runSeed: seed,
    difficulty: "normal",
  });
  world.setComponent<ProfileProgressComponent>("profileProgress", dungeon, {
    clearedDungeons: cleared ? [definition.id] : [],
    unlockedDungeons: [],
  });
  const portal = world.createEntity();
  world.setComponent<InteractableComponent>("interactable", portal, {
    definition: definition.run!.completionPortal,
    state: "disabled",
  });
  return {
    world,
    players,
    boss,
    dungeon,
    portal,
    content,
    system: new DungeonRewardSystem(definition, RunRng.fromSeed(seed)),
  };
}

const completed: GameplayEvent[] = [{
  type: "encounter_completed",
  encounter: "encounter.warden_hearn",
}];

describe("DungeonRewardSystem", () => {
  it("spawns one owned magic-or-better guarantee at stable offsets", () => {
    const first = rewardWorld(17);
    const events: GameplayEvent[] = [];
    first.system.update(first.world, first.dungeon, first.players, completed, events);
    const reward = first.world.getComponent<DungeonRewardState>(
      "dungeonReward",
      first.dungeon,
    )!;
    const loot = first.world.entitiesWith("loot").map((entity) => (
      first.world.getComponent<LootComponent>("loot", entity)!
    ));

    expect(reward).toMatchObject({
      pendingPlayers: [1, 2],
      firstClear: true,
      unlockDungeon: "dungeon.frost_mine",
      settled: false,
    });
    expect(loot.map((entry) => [entry.owner, entry.x, entry.z])).toEqual([
      [1, 70.5, 0],
      [2, 71.5, 0],
    ]);
    expect(loot.every((entry) => (
      entry.grant.type === "item"
      && ["magic", "rare", "unique"].includes(entry.grant.item.rarity)
    ))).toBe(true);
    expect(events).toContainEqual({
      type: "profile_progress_requested",
      clearedDungeon: "dungeon.production_foundation",
      unlockDungeon: "dungeon.frost_mine",
    });
    first.system.update(first.world, first.dungeon, first.players, completed, []);
    expect(first.world.entitiesWith("loot")).toHaveLength(2);

    const repeat = rewardWorld(17, true);
    repeat.system.update(repeat.world, repeat.dungeon, repeat.players, completed, []);
    for (let index = 0; index < 2; index += 1) {
      const firstInventory = first.world.getComponent<InventoryComponent>(
        "inventory",
        first.players[index],
      )!;
      const repeatInventory = repeat.world.getComponent<InventoryComponent>(
        "inventory",
        repeat.players[index],
      )!;
      expect(firstInventory.materials["material.seal"])
        .toBe(repeatInventory.materials["material.seal"] + 1);
    }
    expect(repeat.world.getComponent<DungeonRewardState>("dungeonReward", repeat.dungeon))
      .toMatchObject({ firstClear: false, unlockDungeon: undefined });
  });

  it("waits for pickup or recovery before unlocking the portal and settling", () => {
    const fixture = rewardWorld(29);
    fixture.system.update(fixture.world, fixture.dungeon, fixture.players, completed, []);
    const inventory = fixture.world.getComponent<InventoryComponent>(
      "inventory",
      fixture.players[0],
    )!;
    inventory.items = Array.from({ length: 30 }, (_, index) => (
      fixedItemInstance(index + 1, "item.base.head")
    ));
    inventory.nextItemId = 31;
    const lootIds = fixture.world.entitiesWith("loot");
    const pickups = new InventorySystem(fixture.content);

    const firstLoot = fixture.world.getComponent<LootComponent>("loot", lootIds[0])!;
    Object.assign(
      fixture.world.getComponent<TransformComponent>("transform", fixture.players[0])!,
      { x: firstLoot.x, z: firstLoot.z },
    );
    const firstEvents: GameplayEvent[] = [];
    pickups.update(fixture.world, [{
      type: "pickup",
      actor: fixture.players[0],
      loot: lootIds[0],
    }], firstEvents);
    fixture.system.update(
      fixture.world,
      fixture.dungeon,
      fixture.players,
      firstEvents,
      firstEvents,
    );
    expect(inventory.recovery).toHaveLength(1);
    expect(fixture.world.getComponent<InteractableComponent>("interactable", fixture.portal)?.state)
      .toBe("disabled");

    const secondLoot = fixture.world.getComponent<LootComponent>("loot", lootIds[1])!;
    Object.assign(
      fixture.world.getComponent<TransformComponent>("transform", fixture.players[1])!,
      { x: secondLoot.x, z: secondLoot.z },
    );
    const secondEvents: GameplayEvent[] = [];
    pickups.update(fixture.world, [{
      type: "pickup",
      actor: fixture.players[1],
      loot: lootIds[1],
    }], secondEvents);
    fixture.system.update(
      fixture.world,
      fixture.dungeon,
      fixture.players,
      secondEvents,
      secondEvents,
    );

    expect(secondEvents).toEqual(expect.arrayContaining([
      { type: "dungeon_reward_claimed", player: 2 },
      { type: "dungeon_reward_settled" },
    ]));
    expect(fixture.world.getComponent<DungeonRewardState>("dungeonReward", fixture.dungeon))
      .toMatchObject({ pendingPlayers: [], settledPlayers: [1, 2], settled: true });
    expect(fixture.world.getComponent<InteractableComponent>("interactable", fixture.portal)?.state)
      .toBe("active");
  });
});
