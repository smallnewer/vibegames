import {
  createAbilityChargeState,
  earliestRecharge,
  normalizeAbilityChargeState,
  type AbilityLoadoutComponent,
} from "../ability/AbilityComponents";
import { evaluateAbilityRank } from "../ability/SkillRanks";
import type { AiStateComponent } from "../ai/AiComponents";
import { AbilitySystem } from "../ability/AbilitySystem";
import { HazardSystem } from "../ability/HazardSystem";
import type { HazardComponent } from "../ability/HazardComponents";
import { SummonSystem } from "../ability/SummonSystem";
import { PassiveTriggerSystem } from "../ability/PassiveTriggerSystem";
import { AiSystem } from "../ai/AiSystem";
import type {
  ActorComponent,
  HealthComponent,
  ProjectileComponent,
  TransformComponent,
} from "../actor/ActorComponents";
import { ActorFactory } from "../actor/ActorFactory";
import type { ActorIdentityComponent } from "../actor/ActorIdentity";
import { ActorSystem, ROLL_COOLDOWN } from "../actor/ActorSystem";
import { StatSystem } from "../actor/StatSystem";
import type { StatsComponent } from "../actor/Stats";
import type { BossStateComponent } from "../boss/BossComponents";
import { BossSystem } from "../boss/BossSystem";
import { RunRng } from "../balance/RunRng";
import { ProjectileSystem } from "../combat/ProjectileSystem";
import { DungeonRegistry } from "../content/DungeonRegistry";
import { createCoreContent } from "../content/coreContent";
import { EQUIPMENT_SLOTS, type EquipmentSlot } from "../content/Definitions";
import type {
  DungeonStateComponent,
  EncounterMemberComponent,
  InteractableComponent,
} from "../dungeon/DungeonComponents";
import { DungeonSystem } from "../dungeon/DungeonSystem";
import { CheckpointSystem } from "../dungeon/CheckpointSystem";
import { DungeonRunSystem } from "../dungeon/DungeonRunSystem";
import type { DungeonRunComponent } from "../dungeon/DungeonRunComponents";
import {
  DungeonRewardSystem,
  type DungeonRewardState,
  type ProfileProgressComponent,
} from "../dungeon/DungeonRewardSystem";
import { EncounterSystem } from "../dungeon/EncounterSystem";
import type { EncounterRuntimeComponent } from "../dungeon/EncounterComponents";
import { isRuntimeEncounter } from "../dungeon/DungeonDefinitions";
import type { DungeonPack } from "../dungeon/DungeonDefinitions";
import { InteractionSystem } from "../dungeon/InteractionSystem";
import { DropSystem } from "../item/DropSystem";
import type {
  AbilityBookComponent,
  DropTableComponent,
  EquipmentComponent,
  InventoryComponent,
  ItemInstance,
  LootComponent,
} from "../item/ItemComponents";
import { InventorySystem } from "../item/InventorySystem";
import { PickupSystem } from "../item/PickupSystem";
import { ForgeSystem } from "../item/ForgeSystem";
import { reinforcementQuote } from "../item/ForgeQuote";
import type { PlayerSlotComponent, PlayerSlotId } from "../player/PlayerSlot";
import type { DownedComponent } from "../party/DownedComponents";
import type { MapDiscoveryComponent } from "../map/MapComponents";
import { MapDiscoverySystem } from "../map/MapDiscoverySystem";
import { DownedSystem } from "../party/DownedSystem";
import { BoundsNavigation, type GroundNavigation } from "../ports/GroundNavigation";
import type { StatusComponent } from "../status/StatusComponents";
import { StatusSystem } from "../status/StatusSystem";
import { ProgressionSystem } from "../progression/ProgressionSystem";
import type { ProgressionComponent } from "../progression/ProgressionComponents";
import { xpToNext } from "../progression/Experience";
import type { Command } from "./Command";
import type { GameplayEvent } from "./GameplayEvent";
import type {
  ActorSnapshot,
  GameSnapshot,
  HeroProgressSnapshot,
  InteractionSnapshot,
  LootSnapshot,
} from "./GameSnapshot";
import { World, type EntityId } from "./World";
import type { HeroSaveV1 } from "../save/SaveSchema";
import type { SkillRank } from "../progression/ProgressionComponents";

export interface GameSimulationOptions {
  dungeonId?: string;
  turretX?: number;
  turretZ?: number;
  playerCount?: number;
  enemyCount?: number;
  benchmark?: boolean;
  runSeed?: number;
  heroSaves?: readonly HeroSaveV1[];
}

export class GameSimulation {
  readonly hero: EntityId;
  readonly players: readonly EntityId[];
  readonly dungeon: EntityId;
  readonly runRng: RunRng;

  private readonly world = new World();
  private readonly content = createCoreContent();
  private readonly actorFactory = new ActorFactory(this.content);
  private readonly dungeonDefinition: DungeonPack;
  private readonly actorSystem: ActorSystem;
  private readonly aiSystem: AiSystem;
  private readonly bossSystem = new BossSystem(this.content);
  private readonly projectileSystem: ProjectileSystem;
  private readonly statusSystem = new StatusSystem(this.content);
  private readonly inventorySystem = new InventorySystem(this.content);
  private readonly pickupSystem = new PickupSystem();
  private readonly statSystem = new StatSystem(this.content);
  private readonly progressionSystem = new ProgressionSystem();
  private readonly forgeSystem = new ForgeSystem();
  private readonly abilitySystem: AbilitySystem;
  private readonly hazardSystem: HazardSystem;
  private readonly summonSystem: SummonSystem;
  private readonly passiveTriggerSystem: PassiveTriggerSystem;
  private readonly dropSystem: DropSystem;
  private readonly dungeonSystem: DungeonSystem;
  private readonly dungeonRunSystem?: DungeonRunSystem;
  private readonly encounterSystem?: EncounterSystem;
  private readonly checkpointSystem?: CheckpointSystem;
  private readonly dungeonRewardSystem?: DungeonRewardSystem;
  private readonly interactionSystem: InteractionSystem;
  private readonly downedSystem = new DownedSystem();
  private readonly mapDiscoverySystem = new MapDiscoverySystem();
  private readonly events: GameplayEvent[] = [];
  private readonly lastDamagedTicks = new Map<EntityId, number>();
  private tickNumber = 0;

  constructor(
    options: GameSimulationOptions = {},
    dungeons: DungeonRegistry = new DungeonRegistry(),
    navigation?: GroundNavigation,
  ) {
    this.runRng = RunRng.fromSeed(options.runSeed ?? 1);
    this.dungeonDefinition = dungeons.get(
      options.dungeonId ?? "dungeon.training_ground",
    );
    const groundNavigation = navigation ?? new BoundsNavigation(this.dungeonDefinition.map.bounds);
    this.actorSystem = new ActorSystem(groundNavigation);
    this.aiSystem = new AiSystem(this.content, groundNavigation);
    this.summonSystem = new SummonSystem(this.actorFactory);
    this.passiveTriggerSystem = new PassiveTriggerSystem(this.content, this.statusSystem);
    this.hazardSystem = new HazardSystem({
      execute: (world, source, x, z, node, events, targets, execution) => {
        this.abilitySystem.executeEffect(
          world,
          source,
          x,
          z,
          node,
          events,
          targets,
          execution,
        );
      },
    });
    this.abilitySystem = new AbilitySystem(
      this.content,
      this.statusSystem,
      groundNavigation,
      this.runRng,
      {
        spawnActor: (world, source, archetype, x, z, events) => {
          const liveEnemies = world.entitiesWith("actor").filter((entity) => {
            const actor = world.getComponent<ActorComponent>("actor", entity)!;
            return actor.faction === "enemy" && actor.action !== "dead";
          }).length;
          if (liveEnemies >= 30) return undefined;
          const actor = this.actorFactory.create(world, archetype, x, z);
          const sourceMember = world.getComponent<EncounterMemberComponent>(
            "encounterMember",
            source,
          );
          if (sourceMember) {
            world.setComponent<EncounterMemberComponent>("encounterMember", actor, {
              encounter: sourceMember.encounter,
              member: `summon.${source}.${actor}`,
            });
            const runtimeEntity = world.entitiesWith("encounterRuntime").find((entity) => (
              world.getComponent<EncounterRuntimeComponent>("encounterRuntime", entity)!.definition
                === sourceMember.encounter
            ));
            if (runtimeEntity !== undefined) {
              world.getComponent<EncounterRuntimeComponent>("encounterRuntime", runtimeEntity)!
                .members.push(actor);
            }
          }
          const drop = world.getComponent<DropTableComponent>("dropTable", actor);
          if (drop) drop.dropped = true;
          events.push({ type: "actor_spawned", actor, faction: "enemy" });
          return actor;
        },
        spawnHazard: (world, request, events) => (
          this.hazardSystem.spawn(world, request, events)
        ),
        spawnSummon: (world, request, events) => (
          this.summonSystem.spawn(world, request, events)
        ),
      },
    );
    this.projectileSystem = new ProjectileSystem(this.runRng);
    this.dropSystem = new DropSystem(this.runRng);
    this.dungeonSystem = new DungeonSystem(this.dungeonDefinition);
    this.dungeonRunSystem = this.dungeonDefinition.run
      ? new DungeonRunSystem(this.dungeonDefinition)
      : undefined;
    this.encounterSystem = this.dungeonDefinition.run
      ? new EncounterSystem(this.dungeonDefinition, {
          spawnActor: (archetype, _level, x, z) => (
            this.actorFactory.create(this.world, archetype, x, z)
          ),
        })
      : undefined;
    this.checkpointSystem = this.dungeonDefinition.run
      ? new CheckpointSystem(this.dungeonDefinition)
      : undefined;
    this.dungeonRewardSystem = this.dungeonDefinition.run
      ? new DungeonRewardSystem(this.dungeonDefinition, this.runRng)
      : undefined;
    this.interactionSystem = new InteractionSystem(this.dungeonDefinition);
    const playerCount = options.benchmark ? 4 : options.playerCount ?? options.heroSaves?.length ?? 1;
    const enemyCount = options.benchmark
      ? 30
      : options.enemyCount ?? (this.dungeonDefinition.run ? 0 : this.dungeonDefinition.enemies.length);
    if (!Number.isInteger(playerCount) || playerCount < 1 || playerCount > 4) {
      throw new Error(`playerCount must be an integer from 1 to 4: ${playerCount}`);
    }
    if (
      !Number.isInteger(enemyCount)
      || enemyCount < (this.dungeonDefinition.run ? 0 : 1)
      || enemyCount > 30
    ) {
      throw new Error(`enemyCount is outside the supported range: ${enemyCount}`);
    }
    if (this.dungeonDefinition.run && enemyCount !== 0) {
      throw new Error("gameplayVersion 1 enemies are spawned only by encounters");
    }
    if (this.dungeonDefinition.spawnPoints.length < playerCount) {
      throw new Error(`${this.dungeonDefinition.id} has only ${this.dungeonDefinition.spawnPoints.length} spawns`);
    }

    this.players = this.dungeonDefinition.spawnPoints.slice(0, playerCount).map((start, index) => {
      const saved = options.heroSaves?.[index];
      const hero = this.actorFactory.create(
        this.world,
        saved?.archetype ?? "hero.ember_runner",
        start.x,
        start.z,
        { playerSlot: (index + 1) as PlayerSlotId },
      );
      if (saved) this.hydrateHero(hero, saved);
      return hero;
    });
    this.hero = this.players[0];

    for (let index = 0; index < enemyCount; index += 1) {
      const benchmarkPosition = this.benchmarkEnemyPosition(index);
      const placement = this.dungeonDefinition.enemies[index % this.dungeonDefinition.enemies.length];
      const enemy = this.actorFactory.create(
        this.world,
        options.benchmark
          ? index === 0 ? "enemy.crystal_turret" : "enemy.ember_stalker"
          : placement.kind,
        options.benchmark
          ? benchmarkPosition.x
          : index === 0 ? options.turretX ?? placement.x : placement.x,
        options.benchmark
          ? benchmarkPosition.z
          : index === 0 ? options.turretZ ?? placement.z : placement.z,
      );
      this.world.setComponent<EncounterMemberComponent>("encounterMember", enemy, {
        encounter: placement.encounter,
      });
    }
    this.dungeon = this.createDungeon();
    this.mapDiscoverySystem.update(
      this.world,
      this.dungeon,
      this.players,
      this.dungeonDefinition.map,
    );
    if (options.benchmark) this.activateBenchmark();
    this.statSystem.update(this.world);
    for (const player of this.players) {
      const health = this.world.getComponent<HealthComponent>("health", player)!;
      health.current = health.max;
    }
  }

  // 顺序固定：状态、属性、AI、移动、自动拾取、机关、技能、弹道、区域、召唤寿命、死亡/掉落。
  tick(step: number, commands: readonly Command[]): readonly GameplayEvent[] {
    this.tickNumber += 1;
    this.events.length = 0;
    this.statusSystem.update(this.world, step, this.events);
    this.progressionSystem.update(this.world, commands, this.events);
    this.inventorySystem.update(this.world, commands, this.events);
    this.forgeSystem.update(this.world, commands, this.events);
    this.statSystem.update(this.world);
    this.bossSystem.update(this.world, this.events, step);
    const dungeon = this.world.getComponent<DungeonStateComponent>("dungeon", this.dungeon)!;
    const dungeonRun = this.world.getComponent<DungeonRunComponent>("dungeonRun", this.dungeon);
    const combatActive = dungeonRun
      ? dungeonRun.phase === "encounter" || dungeonRun.phase === "boss_combat"
      : dungeon.encounter === "active";
    const enemyCommands = combatActive
      ? this.aiSystem.commands(this.world, this.players, step, this.events)
      : [];
    this.actorSystem.update(this.world, [...commands, ...enemyCommands], step, this.events);
    const pickupCommands = this.pickupSystem.commands(this.world, this.players);
    if (pickupCommands.length > 0) {
      this.inventorySystem.update(this.world, pickupCommands, this.events);
      // 拾取可立即穿戴，后续技能和本帧快照必须读取同一份新属性。
      this.statSystem.update(this.world);
    }
    if (!this.dungeonDefinition.run) {
      this.dungeonSystem.update(this.world, this.dungeon, this.players, this.events);
    }
    this.encounterSystem?.update(
      this.world,
      this.dungeon,
      this.players,
      step,
      this.events,
    );
    this.interactionSystem.update(this.world, this.dungeon, commands, this.events);
    this.abilitySystem.update(
      this.world,
      [...commands, ...enemyCommands],
      step,
      this.events,
      (entity) => {
        const actor = this.world.getComponent<ActorComponent>("actor", entity);
        return actor?.faction !== "enemy" || combatActive;
      },
    );
    this.projectileSystem.update(this.world, step, this.events);
    this.hazardSystem.update(this.world, step, this.events);
    this.summonSystem.update(this.world, step, this.events);
    this.passiveTriggerSystem.update(this.world, [...this.events], this.events);
    this.bossSystem.update(this.world, this.events);
    this.downedSystem.update(
      this.world,
      this.players,
      commands,
      step,
      [...this.events],
      this.events,
    );
    const playerSlots = this.players.map((player) => (
      this.world.getComponent<PlayerSlotComponent>("playerSlot", player)!.slot
    ));
    this.dungeonRunSystem?.update(this.world, this.dungeon, this.events, playerSlots);
    const checkpointEvents: GameplayEvent[] = [];
    this.checkpointSystem?.update(
      this.world,
      this.dungeon,
      this.players,
      step,
      [...this.events],
      checkpointEvents,
    );
    if (checkpointEvents.length > 0) {
      if (checkpointEvents.some((event) => event.type === "checkpoint_reset")) {
        this.hazardSystem.clear(this.world, checkpointEvents);
        this.summonSystem.clear(this.world, checkpointEvents);
      }
      this.dungeonRunSystem?.update(this.world, this.dungeon, checkpointEvents, playerSlots);
      this.events.push(...checkpointEvents);
    }
    const rewardEvents: GameplayEvent[] = [];
    this.dungeonRewardSystem?.update(
      this.world,
      this.dungeon,
      this.players,
      [...this.events],
      rewardEvents,
    );
    if (rewardEvents.length > 0) {
      this.dungeonRunSystem?.update(this.world, this.dungeon, rewardEvents, playerSlots);
      this.events.push(...rewardEvents);
    }
    this.dropSystem.update(this.world, this.events);
    this.aiSystem.observe(this.world, this.events);
    for (const event of this.events) {
      if (event.type === "damage_applied") {
        this.lastDamagedTicks.set(event.target, this.tickNumber);
      }
    }
    this.mapDiscoverySystem.update(
      this.world,
      this.dungeon,
      this.players,
      this.dungeonDefinition.map,
    );
    return [...this.events];
  }

  // 菜单开启时不推进战斗时间，但属性/背包/打造命令仍由核心系统校验。
  applyUiCommands(commands: readonly Command[]): readonly GameplayEvent[] {
    this.events.length = 0;
    this.progressionSystem.update(this.world, commands, this.events);
    const dungeon = this.world.getComponent<DungeonStateComponent>("dungeon", this.dungeon)!;
    const run = this.world.getComponent<DungeonRunComponent>("dungeonRun", this.dungeon);
    const combatActive = run
      ? run.phase === "encounter" || run.phase === "boss_combat"
      : dungeon.encounter === "active";
    this.inventorySystem.update(this.world, commands, this.events, {
      allowLoadoutChanges: !combatActive,
    });
    this.forgeSystem.update(this.world, commands, this.events);
    this.statSystem.update(this.world);
    return [...this.events];
  }

  // 表现层只能读取拷贝后的快照，不能持有核心组件引用。
  snapshot(): GameSnapshot {
    const actors = this.world.entitiesWith("actor", "transform", "health").map((id): ActorSnapshot => {
      const actor = this.world.getComponent<ActorComponent>("actor", id)!;
      const transform = this.world.getComponent<TransformComponent>("transform", id)!;
      const health = this.world.getComponent<HealthComponent>("health", id)!;
      const identity = this.world.getComponent<ActorIdentityComponent>("actorIdentity", id)!;
      const boss = this.world.getComponent<BossStateComponent>("bossState", id);
      const definition = this.content.actor(identity.archetype);
      const player = this.world.getComponent<PlayerSlotComponent>("playerSlot", id);
      const downed = this.world.getComponent<DownedComponent>("downed", id);
      const aiState = this.world.getComponent<AiStateComponent>("aiState", id);
      const statuses = this.world.getComponent<StatusComponent>("statuses", id)!;
      return {
        id,
        archetype: identity.archetype,
        name: identity.name,
        role: identity.role,
        visualId: identity.visual,
        bossPhase: boss === undefined
          ? undefined
          : {
              index: boss.phaseIndex,
              id: definition.boss!.phases[boss.phaseIndex].id,
              name: definition.boss!.phases[boss.phaseIndex].name,
            },
        faction: actor.faction,
        action: actor.action,
        actionDuration: actor.actionDuration,
        locomotion: actor.moveX === 0 && actor.moveZ === 0 ? "idle" : "run",
        x: transform.x,
        z: transform.z,
        previousX: transform.previousX,
        previousZ: transform.previousZ,
        facingX: transform.facingX,
        facingZ: transform.facingZ,
        health: health.current,
        maxHealth: health.max,
        lifeState: downed?.state,
        downedTimeLeft: downed?.state === "downed" ? downed.timeLeft : undefined,
        reviveProgress: downed?.state === "downed" ? downed.reviveProgress : undefined,
        rollCooldownLeft: actor.rollCooldownLeft,
        rollCooldownRatio: Math.max(0, Math.min(1, actor.rollCooldownLeft / ROLL_COOLDOWN)),
        healthBar: identity.role !== "minion"
          ? "none"
          : identity.archetype.startsWith("elite.") ? "elite" : "minion",
        engaged: aiState?.target !== undefined || aiState?.pendingCast !== undefined,
        lastDamagedTick: this.lastDamagedTicks.get(id),
        playerSlot: player?.slot,
        statuses: statuses.values.map((status) => status.id),
        statusVisuals: statuses.values.flatMap((status) => {
          const visual = this.content.status(status.id).visual;
          return visual ? [{ id: status.id, visual }] : [];
        }),
        equipmentVisuals: this.makeEquipmentVisuals(id),
      };
    });
    const projectiles = this.world.entitiesWith("projectile").map((id) => {
      const projectile = this.world.getComponent<ProjectileComponent>("projectile", id)!;
      return {
        id,
        faction: projectile.faction,
        x: projectile.x,
        z: projectile.z,
        previousX: projectile.previousX,
        previousZ: projectile.previousZ,
      };
    });
    const hazards = this.world.entitiesWith("hazard").map((id) => {
      const hazard = this.world.getComponent<HazardComponent>("hazard", id)!;
      return {
        id,
        visual: hazard.visual,
        x: hazard.x,
        z: hazard.z,
        radius: hazard.radius,
        timeLeft: hazard.timeLeft,
      };
    });
    const loot = this.world.entitiesWith("loot").map((id) => this.makeLootSnapshot(id));
    const dungeon = this.world.getComponent<DungeonStateComponent>("dungeon", this.dungeon)!;
    const players = this.players.map((actor) => ({
      slot: this.world.getComponent<PlayerSlotComponent>("playerSlot", actor)!.slot,
      actor,
      progress: this.makeProgressSnapshot(actor),
    }));
    const run = this.world.getComponent<DungeonRunComponent>("dungeonRun", this.dungeon);
    const reward = this.world.getComponent<DungeonRewardState>("dungeonReward", this.dungeon);
    const mapDiscovery = this.world.getComponent<MapDiscoveryComponent>(
      "mapDiscovery",
      this.dungeon,
    )!;
    return {
      tick: this.tickNumber,
      mapDiscovery: {
        discoveredSections: [...mapDiscovery.discoveredSections],
      },
      run: run && this.dungeonRunSystem
        ? {
            seed: this.runRng.rootSeed,
            phase: run.phase,
            activeEncounter: run.activeEncounter,
            completedEncounters: [...run.completedEncounters],
            checkpoint: run.checkpoint,
            objective: this.dungeonRunSystem.objective(run),
            reward: reward
              ? {
                  pendingPlayers: [...reward.pendingPlayers],
                  firstClear: reward.firstClear,
                  unlockDungeon: reward.unlockDungeon,
                }
              : undefined,
          }
        : { seed: this.runRng.rootSeed },
      hero: this.hero,
      players,
      actors,
      projectiles,
      hazards,
      loot,
      progress: players[0].progress,
      dungeon: {
        id: dungeon.definition,
        name: this.dungeonDefinition.name,
        themeId: this.dungeonDefinition.manifest.themeId,
        visual: this.dungeonDefinition.visual,
        assets: this.dungeonDefinition.assets,
        placements: this.dungeonDefinition.placements,
        decorations: this.dungeonDefinition.decorations,
        map: this.dungeonDefinition.map,
        resources: Object.entries(dungeon.resources)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([id, amount]) => ({
            id,
            name: id === this.dungeonDefinition.manifest.resource.id
              ? this.dungeonDefinition.manifest.resource.name
              : id,
            amount,
          })),
        encounter: dungeon.encounter,
        door: dungeon.door,
        portalUses: dungeon.portalUses,
      },
      interactions: this.makeInteractionSnapshots(),
    };
  }

  private createDungeon(): EntityId {
    const dungeon = this.world.createEntity();
    this.world.setComponent<DungeonStateComponent>("dungeon", dungeon, {
      definition: this.dungeonDefinition.id,
      resources: { [this.dungeonDefinition.manifest.resource.id]: 0 },
      encounter: "idle",
      door: "locked",
      portalUses: 0,
    });
    this.world.setComponent<MapDiscoveryComponent>("mapDiscovery", dungeon, {
      discoveredSections: [],
    });
    if (this.dungeonDefinition.run) {
      this.world.setComponent<DungeonRunComponent>("dungeonRun", dungeon, {
        definition: this.dungeonDefinition.id,
        phase: "entering",
        completedEncounters: [],
        claimedRewardPlayers: [],
        runSeed: this.runRng.rootSeed,
        difficulty: "normal",
      });
      this.world.setComponent<ProfileProgressComponent>("profileProgress", dungeon, {
        clearedDungeons: [],
        unlockedDungeons: [],
      });
    }
    for (const definition of this.dungeonDefinition.interactions) {
      const interaction = this.world.createEntity();
      this.world.setComponent<InteractableComponent>("interactable", interaction, {
        definition: definition.id,
        state: this.dungeonDefinition.run
          && definition.id === this.dungeonDefinition.run.completionPortal
          ? "disabled"
          : "idle",
      });
    }
    if (this.dungeonDefinition.run) {
      for (const definition of this.dungeonDefinition.encounters.filter(isRuntimeEncounter)) {
        const encounter = this.world.createEntity();
        this.world.setComponent<EncounterRuntimeComponent>("encounterRuntime", encounter, {
          definition: definition.id,
          state: "idle",
          waveIndex: 0,
          nextWaveIn: 0,
          members: [],
          partySizeAtStart: 1,
          baseLevel: this.dungeonDefinition.run.levelBand.normal[0],
        });
      }
    }
    return dungeon;
  }

  // 压测敌人分两圈摆放，既保持数量固定，也避免模型完全重叠。
  private benchmarkEnemyPosition(index: number): { x: number; z: number } {
    const innerCount = 12;
    const inner = index < innerCount;
    const count = inner ? innerCount : 18;
    const ringIndex = inner ? index : index - innerCount;
    const angle = ringIndex / count * Math.PI * 2;
    const radius = inner ? 3.2 : 4.7;
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
  }

  // 基准模式只固定测试负载，不改变普通地下城的伤害或触发规则。
  private activateBenchmark(): void {
    const dungeon = this.world.getComponent<DungeonStateComponent>("dungeon", this.dungeon)!;
    dungeon.encounter = "active";
    for (const interaction of this.world.entitiesWith("interactable")) {
      const runtime = this.world.getComponent<InteractableComponent>("interactable", interaction)!;
      const definition = this.dungeonDefinition.interactions.find((value) => (
        value.id === runtime.definition
      ));
      if (definition?.kind === "encounter") runtime.state = "active";
    }
    for (const player of this.players) {
      this.world.getComponent<ActorComponent>("actor", player)!.invulnerableLeft = Infinity;
      this.world.getComponent<StatusComponent>("statuses", player)!.values = [{
        id: "status.battle_focus",
        stacks: 1,
        duration: Infinity,
        timeLeft: Infinity,
      }];
    }
  }

  private makeLootSnapshot(id: EntityId): LootSnapshot {
    const loot = this.world.getComponent<LootComponent>("loot", id)!;
    const name = loot.grant.type === "item"
      ? (this.content.findItem(loot.grant.item.definition)?.name ?? loot.grant.item.definition)
      : loot.grant.type === "ability"
        ? (this.content.findAbility(loot.grant.ability)
          ?? this.content.passive(loot.grant.ability)).name
        : `${loot.grant.material} ×${loot.grant.amount}`;
    return { id, kind: loot.grant.type, name, owner: loot.owner, x: loot.x, z: loot.z };
  }

  private makeProgressSnapshot(hero: EntityId): HeroProgressSnapshot {
    const inventory = this.world.getComponent<InventoryComponent>("inventory", hero)!;
    const equipment = this.world.getComponent<EquipmentComponent>("equipment", hero)!;
    const book = this.world.getComponent<AbilityBookComponent>("abilityBook", hero)!;
    const loadout = this.world.getComponent<AbilityLoadoutComponent>("abilityLoadout", hero)!;
    const statuses = this.world.getComponent<StatusComponent>("statuses", hero)!;
    const stats = this.world.getComponent<StatsComponent>("stats", hero)!;
    const progression = this.world.getComponent<ProgressionComponent>("progression", hero)!;
    const itemName = (item: ItemInstance | undefined) => {
      if (!item) return "未装备";
      const name = this.content.item(item.definition).name;
      return item.reinforce > 0 ? `${name} +${item.reinforce}` : name;
    };
    const abilitySnapshot = (slot: "skill_up" | "skill_right" | "skill_down" | "skill_left") => {
      const ability = loadout.slots[slot];
      const state = normalizeAbilityChargeState(loadout.cooldowns[slot]);
      loadout.cooldowns[slot] = state;
      const definition = ability ? this.content.ability(ability) : undefined;
      const rank = ability ? progression.skillRanks[ability] ?? 1 : 1;
      const evaluated = definition ? evaluateAbilityRank(definition, rank) : undefined;
      return {
        id: ability,
        name: definition?.name ?? "未装配",
        cooldownLeft: earliestRecharge(state),
        cooldownDuration: definition?.cooldown ?? 0,
        charges: state.charges,
        maxCharges: evaluated?.charges ?? 1,
        recharge: [...state.recharge],
      };
    };
    const weaponSnapshot = (slot: "melee" | "ranged") => {
      const ability = loadout.slots[slot];
      const state = normalizeAbilityChargeState(loadout.cooldowns[slot]);
      loadout.cooldowns[slot] = state;
      const definition = ability ? this.content.ability(ability) : undefined;
      return {
        id: ability,
        name: definition?.name ?? "未装备",
        cooldownLeft: earliestRecharge(state),
        cooldownDuration: definition?.cooldown ?? 0,
        charges: state.charges,
        maxCharges: 1,
        recharge: [...state.recharge],
      };
    };
    const passiveSnapshot = (slot: "passive_1" | "passive_2") => {
      const passive = loadout.passives[slot];
      return {
        id: passive,
        name: passive ? this.content.passive(passive).name : "未装配",
      };
    };
    const itemSnapshot = (item: ItemInstance, equipped: boolean) => {
      const definition = this.content.item(item.definition);
      return {
        id: item.id,
        definition: item.definition,
        name: itemName(item),
        slot: definition.slot,
        itemLevel: item.itemLevel,
        baseRoll: item.baseRoll,
        theme: item.theme,
        rarity: item.rarity,
        affixes: item.affixes.map((affix) => ({ ...affix })),
        reinforce: item.reinforce,
        favorite: item.favorite,
        equipped,
        reinforcementQuote: reinforcementQuote(item, inventory.materials),
      };
    };
    const items = inventory.items.map((item) => {
      const definition = this.content.item(item.definition);
      return itemSnapshot(item, equipment[definition.slot] === item.id);
    });

    return {
      level: progression.level,
      experience: progression.experience,
      xpToNext: xpToNext(progression.level),
      unspentAttributes: progression.unspentAttributes,
      unspentSkills: progression.unspentSkills,
      skillRanks: { ...progression.skillRanks },
      nextItemId: inventory.nextItemId,
      allocated: { ...progression.allocated },
      items,
      recovery: inventory.recovery.map((item) => itemSnapshot(item, false)),
      forgeQuotes: Object.fromEntries(items.map((item) => [item.id, item.reinforcementQuote])),
      equipment: {
        slots: { ...equipment },
        names: Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [
          slot,
          itemName(inventory.items.find((item) => item.id === equipment[slot])),
        ])) as Record<EquipmentSlot, string>,
        visuals: Object.fromEntries(EQUIPMENT_SLOTS.flatMap((slot) => {
          const item = inventory.items.find((value) => value.id === equipment[slot]);
          return item ? [[slot, this.content.item(item.definition).visual]] : [];
        })) as Partial<Record<EquipmentSlot, string>>,
      },
      materials: { ...inventory.materials },
      unlockedAbilities: [...book.unlocked],
      abilities: {
        skill_up: abilitySnapshot("skill_up"),
        skill_right: abilitySnapshot("skill_right"),
        skill_down: abilitySnapshot("skill_down"),
        skill_left: abilitySnapshot("skill_left"),
      },
      weapons: {
        melee: weaponSnapshot("melee"),
        ranged: weaponSnapshot("ranged"),
      },
      passives: {
        passive_1: passiveSnapshot("passive_1"),
        passive_2: passiveSnapshot("passive_2"),
      },
      statuses: statuses.values.map((status) => ({
        id: status.id,
        name: this.content.status(status.id).name,
        icon: this.content.status(status.id).visual ?? `icon.${status.id}`,
        stacks: status.stacks,
        timeLeft: status.timeLeft,
      })),
      stats: { ...stats.final },
      statBreakdown: Object.fromEntries(Object.entries(stats.breakdown).map(([name, value]) => (
        [name, { ...value }]
      ))) as typeof stats.breakdown,
    };
  }

  private makeEquipmentVisuals(actor: EntityId) {
    const inventory = this.world.getComponent<InventoryComponent>("inventory", actor);
    const equipment = this.world.getComponent<EquipmentComponent>("equipment", actor);
    if (!inventory || !equipment) return [];
    return EQUIPMENT_SLOTS.flatMap((slot) => {
      const instance = inventory.items.find((item) => item.id === equipment[slot]);
      return instance
        ? [{ slot, visual: this.content.item(instance.definition).visual }]
        : [];
    });
  }

  private makeInteractionSnapshots(): InteractionSnapshot[] {
    return this.world.entitiesWith("interactable").map((id) => {
      const runtime = this.world.getComponent<InteractableComponent>("interactable", id)!;
      const definition = this.dungeonDefinition.interactions.find((value) => (
        value.id === runtime.definition
      ))!;
      const prompt = runtime.state === "completed"
        ? "已完成"
        : definition.kind === "harvest"
          ? `采集${definition.name}`
          : definition.kind === "encounter"
            ? runtime.state === "active" ? `${definition.name}战斗中` : `进入${definition.name}`
            : definition.kind === "door"
              ? `打开${definition.name}`
              : `使用${definition.name}`;
      return {
        id,
        definition: definition.id,
        name: definition.name,
        kind: definition.kind,
        trigger: definition.trigger,
        state: runtime.state,
        x: definition.x,
        z: definition.z,
        radius: definition.radius,
        prompt,
      };
    });
  }

  private hydrateHero(hero: EntityId, saved: HeroSaveV1): void {
    const progression = this.world.getComponent<ProgressionComponent>("progression", hero)!;
    progression.level = saved.level;
    progression.experience = saved.experience;
    progression.unspentAttributes = saved.unspentAttributes;
    progression.unspentSkills = saved.unspentSkills;
    progression.allocated = { ...saved.allocated };
    progression.skillRanks = { ...saved.skillRanks } as Record<string, SkillRank>;

    const inventory = this.world.getComponent<InventoryComponent>("inventory", hero)!;
    inventory.nextItemId = saved.nextItemId;
    inventory.items = saved.inventory.map((item) => ({
      ...item,
      affixes: item.affixes.map((affix) => ({ ...affix })),
    }));
    inventory.recovery = saved.recovery.map((item) => ({
      ...item,
      affixes: item.affixes.map((affix) => ({ ...affix })),
    }));
    inventory.materials = { ...saved.materials };

    const equipment = this.world.getComponent<EquipmentComponent>("equipment", hero)!;
    for (const slot of EQUIPMENT_SLOTS) delete equipment[slot];
    Object.assign(equipment, saved.equipment);

    const book = this.world.getComponent<AbilityBookComponent>("abilityBook", hero)!;
    book.unlocked = [...saved.unlockedAbilities].sort();
    const loadout = this.world.getComponent<AbilityLoadoutComponent>("abilityLoadout", hero)!;
    for (const slot of ["skill_up", "skill_right", "skill_down", "skill_left"] as const) {
      loadout.slots[slot] = saved.loadout[slot] ?? undefined;
      loadout.cooldowns[slot] = createAbilityChargeState();
    }
    for (const slot of ["passive_1", "passive_2"] as const) {
      loadout.passives[slot] = saved.passives[slot] ?? undefined;
    }
    for (const slot of ["melee", "ranged"] as const) {
      const item = inventory.items.find((candidate) => candidate.id === equipment[slot]);
      loadout.slots[slot] = item ? this.content.item(item.definition).ability : undefined;
      loadout.cooldowns[slot] = createAbilityChargeState();
    }
  }
}
