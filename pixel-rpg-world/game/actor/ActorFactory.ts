import {
  createAbilityChargeStates,
  normalizeAbilitySlots,
  type AbilityLoadoutComponent,
} from "../ability/AbilityComponents";
import type { AiStateComponent } from "../ai/AiComponents";
import type { BossStateComponent } from "../boss/BossComponents";
import type { ContentRegistry } from "../content/ContentRegistry";
import type { World, EntityId } from "../core/World";
import type {
  AbilityBookComponent,
  DropTableComponent,
  EquipmentComponent,
  InventoryComponent,
} from "../item/ItemComponents";
import { emptyMaterialWallet, fixedItemInstance } from "../item/ItemComponents";
import type { PlayerSlotComponent, PlayerSlotId } from "../player/PlayerSlot";
import type { DownedComponent } from "../party/DownedComponents";
import type { StatusComponent } from "../status/StatusComponents";
import type { ActorComponent, HealthComponent, TransformComponent } from "./ActorComponents";
import type { ActorIdentityComponent } from "./ActorIdentity";
import { createStatBreakdown, type StatsComponent } from "./Stats";
import { completeStatBlock } from "../content/Definitions";
import type { ProgressionComponent } from "../progression/ProgressionComponents";
import { PLAYER_ABILITY_IDS } from "../content/generated/abilities";

export interface ActorCreateOptions {
  playerSlot?: PlayerSlotId;
}

export class ActorFactory {
  constructor(private readonly content: ContentRegistry) {}

  // 所有英雄、小怪和 Boss 都从同一份原型脚本生成组件。
  create(
    world: World,
    archetypeId: string,
    x: number,
    z: number,
    options: ActorCreateOptions = {},
  ): EntityId {
    const definition = this.content.actor(archetypeId);
    const baseStats = completeStatBlock(definition.stats);
    const entity = world.createEntity();
    const faction = definition.role === "hero" ? "hero" : "enemy";
    world.setComponent<ActorIdentityComponent>("actorIdentity", entity, {
      archetype: definition.id,
      name: definition.name,
      role: definition.role,
      visual: definition.visual,
    });
    world.setComponent<TransformComponent>("transform", entity, {
      x,
      z,
      previousX: x,
      previousZ: z,
      facingX: faction === "hero" ? 1 : -1,
      facingZ: 0,
    });
    world.setComponent<ActorComponent>("actor", entity, {
      faction,
      action: "idle",
      actionLeft: 0,
      actionDuration: 0,
      moveX: 0,
      moveZ: 0,
      speed: baseStats.moveSpeed,
      radius: definition.radius,
      rollCooldownLeft: 0,
      invulnerableLeft: 0,
      hitReactionCooldownLeft: 0,
    });
    world.setComponent<HealthComponent>("health", entity, {
      current: baseStats.maxHealth,
      max: baseStats.maxHealth,
    });
    world.setComponent<StatsComponent>("stats", entity, {
      base: baseStats,
      final: { ...baseStats },
      breakdown: createStatBreakdown(baseStats),
    });
    world.setComponent<StatusComponent>("statuses", entity, { values: [] });
    const loadout: AbilityLoadoutComponent = {
      slots: normalizeAbilitySlots(definition.loadout.slots),
      cooldowns: createAbilityChargeStates(),
      passives: { ...definition.loadout.passives },
      actionSequence: 0,
    };
    for (const action of definition.ai?.actions ?? []) {
      const warmup = definition.ai?.warmupSeconds ?? 0;
      if (warmup > 0) loadout.cooldowns[action.slot] = { charges: 0, recharge: [warmup] };
    }
    world.setComponent<AbilityLoadoutComponent>("abilityLoadout", entity, loadout);

    if (definition.ai) {
      world.setComponent<AiStateComponent>("aiState", entity, {
        homeX: x,
        homeZ: z,
        thinkLeft: 0,
        targetSwitchLeft: 0,
        recoveryLeft: 0,
        moveX: 0,
        moveZ: 0,
        threat: new Map(),
        phaseActionUses: new Map(),
      });
    }
    if (definition.boss) {
      const firstPhase = definition.boss.phases[0];
      world.setComponent<BossStateComponent>("bossState", entity, {
        phaseIndex: 0,
        abilityEpoch: 0,
        phaseEnterLeft: firstPhase.enterDuration,
        enteredPhases: [firstPhase.id],
      });
      world.getComponent<ActorComponent>("actor", entity)!.invulnerableLeft = firstPhase.enterDuration;
    }
    if (definition.role !== "hero") {
      world.setComponent<DropTableComponent>("dropTable", entity, {
        sourceType: definition.role === "boss" ? "boss" : "minion",
        theme: "ember",
        level: 1,
        dropped: false,
      });
    }
    if (definition.role === "hero") this.addHeroProgress(world, entity, options.playerSlot);
    return entity;
  }

  private addHeroProgress(world: World, hero: EntityId, slot?: PlayerSlotId): void {
    if (!slot) throw new Error("Hero creation requires a player slot");
    world.setComponent<PlayerSlotComponent>("playerSlot", hero, { slot });
    world.setComponent<DownedComponent>("downed", hero, {
      state: "alive",
      timeLeft: 0,
      reviveProgress: 0,
    });
    world.setComponent<ProgressionComponent>("progression", hero, {
      level: 1,
      experience: 0,
      unspentAttributes: 0,
      unspentSkills: 1,
      allocated: { might: 10, finesse: 10, vitality: 10, resolve: 10 },
      skillRanks: {
        "ability.battle_focus": 1,
        "ability.ember_nova": 1,
        "ability.shadow_step": 1,
        "ability.molten_guard": 1,
        "passive.iron_vitality": 1,
      },
    });
    world.setComponent<InventoryComponent>("inventory", hero, {
      nextItemId: 8,
      recovery: [],
      materials: emptyMaterialWallet(),
      items: [
        fixedItemInstance(1, "item.rust_blade"),
        fixedItemInstance(2, "item.hunter_bow"),
        fixedItemInstance(3, "item.traveler_cap"),
        fixedItemInstance(4, "item.traveler_tunic"),
        fixedItemInstance(5, "item.traveler_bracers"),
        fixedItemInstance(6, "item.traveler_pants"),
        fixedItemInstance(7, "item.traveler_boots"),
      ],
    });
    world.setComponent<EquipmentComponent>("equipment", hero, {
      head: 3,
      chest: 4,
      wrists: 5,
      legs: 6,
      feet: 7,
      melee: 1,
      ranged: 2,
    });
    world.setComponent<AbilityBookComponent>("abilityBook", hero, {
      unlocked: [
        ...PLAYER_ABILITY_IDS,
        "passive.execution_rush",
        "passive.hawkeye",
        "passive.iron_vitality",
        "passive.runic_ward",
      ].sort(),
    });
  }
}
