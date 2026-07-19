import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { EngineInstrumentation } from "@babylonjs/core/Instrumentation/engineInstrumentation";
import { SceneInstrumentation } from "@babylonjs/core/Instrumentation/sceneInstrumentation";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import "@babylonjs/core/Meshes/instancedMesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";
import type { GameplayEvent } from "../../core/GameplayEvent";
import type { GameSnapshot } from "../../core/GameSnapshot";
import type { EntityId } from "../../core/World";
import type { ActorAction } from "../../actor/ActorComponents";
import type {
  DungeonVisualDef,
  InteractionKind,
} from "../../dungeon/DungeonDefinitions";
import {
  createGameEngine,
  type EnginePreference,
  type GameEngine,
} from "./createGameEngine";
import { estimateTextureBytes, type RenderMetrics } from "./RenderMetrics";
import { ArtMaterialLibrary } from "./art/ArtMaterialLibrary";
import { createLavaFortressRoom } from "./art/LavaFortressRoom";
import { createVoxelDungeonRoom } from "./art/VoxelDungeonRoom";
import type { RoomArt } from "./art/RoomArt";
import { visibleSectionIds } from "./art/SectionVisibility";
import { actionPhase, samplePose } from "./art/CharacterAnimator";
import { CombatVfx } from "./art/CombatVfx";
import { AmbientVfx } from "./art/AmbientVfx";
import { ActorStatusVfx } from "./art/ActorStatusVfx";
import { CombatTelegraphLayer } from "./art/CombatTelegraphLayer";
import { EncounterPresentation } from "./art/EncounterPresentation";
import { createLavaLighting, type LavaLightingRig } from "./art/LavaLighting";
import { createArtPostProcess, type ArtPostProcess } from "./art/ArtPostProcess";
import { BabylonAssetStore } from "./BabylonAssetStore";
import { BabylonActorLayer } from "./BabylonActorLayer";
import { ActorHealthBarLayer } from "./ActorHealthBarLayer";
import { meleeSlashDirection } from "./art/MeleeSlashDirection";
import { BabylonPlacementLayer } from "./BabylonPlacementLayer";
import { BabylonNavigation } from "./BabylonNavigation";
import type { DungeonPack } from "../../dungeon/DungeonDefinitions";
import { ACTOR_VISUAL_DATA } from "../../content/generated/actorVisuals";
import {
  DEFAULT_PARTY_CAMERA,
  PRODUCTION_PARTY_CAMERA,
  updatePartyCamera,
  type PartyCameraState,
} from "./PartyCameraController";
import { renderHardwareScaling } from "./RenderResolution";

interface InteractionVisual {
  root: TransformNode;
  main: Mesh;
  meshes: Mesh[];
  kind: InteractionKind;
}

interface ProjectileVisual {
  readonly mesh: InstancedMesh;
  readonly poolKey: string;
}

interface ActorActionTimer {
  readonly action: ActorAction;
  readonly startedAt: number;
  readonly slashAt: number;
  meleeVisual?: string;
}

interface PendingMeleeSlash {
  readonly visual: string;
  readonly startedAt: number;
  readonly dueAt: number;
}

export interface PresentationSettings {
  readonly reducedFlash: boolean;
  readonly screenShake: 0 | 0.5 | 1;
}

const DEFAULT_SLASH_EVENT_AT = 0.42;

export class BabylonView {
  readonly engine: GameEngine;
  readonly scene: Scene;
  readonly backend: "webgpu" | "webgl2";

  private readonly actorActionTimers = new Map<EntityId, ActorActionTimer>();
  private readonly pendingMeleeSlashes = new Map<EntityId, PendingMeleeSlash>();
  private readonly projectileVisuals = new Map<EntityId, ProjectileVisual>();
  private readonly projectilePools = new Map<string, InstancedMesh[]>();
  private readonly projectileSources = new Map<string, Mesh>();
  private readonly projectileMaterials = new Map<string, StandardMaterial>();
  private readonly hazardVisuals = new Map<EntityId, Mesh>();
  private readonly hazardMaterials = new Map<string, StandardMaterial>();
  private readonly lootVisuals = new Map<EntityId, Mesh>();
  private readonly lootMaterials = new Map<string, StandardMaterial>();
  private readonly interactionVisuals = new Map<EntityId, InteractionVisual>();
  private readonly interactionMaterials = new Map<string, StandardMaterial>();
  private readonly decorationVisuals = new Map<string, Mesh>();
  private readonly decorationMaterials = new Map<string, StandardMaterial>();
  private readonly focusAuras = new Map<EntityId, Mesh>();
  private readonly roomArts = new Map<string, RoomArt>();
  private focusAuraMaterial?: StandardMaterial;
  private artMaterials?: ArtMaterialLibrary;
  private readonly sceneInstrumentation?: SceneInstrumentation;
  private readonly engineInstrumentation?: EngineInstrumentation;
  private readonly combatVfx: CombatVfx;
  private readonly ambientVfx: AmbientVfx;
  private readonly actorStatusVfx: ActorStatusVfx;
  private readonly combatTelegraphs: CombatTelegraphLayer;
  private readonly encounterPresentation: EncounterPresentation;
  private readonly lavaLighting: LavaLightingRig;
  private readonly artPostProcess: ArtPostProcess;
  private readonly assetStore: BabylonAssetStore;
  private readonly actorLayer: BabylonActorLayer;
  private readonly actorHealthBars: ActorHealthBarLayer;
  private readonly placementLayer: BabylonPlacementLayer;
  private visualTime = 0;
  private cameraTime = 0;
  private activeDungeonId?: string;
  private assetError?: string;
  private navigation?: BabylonNavigation;
  private disposed = false;
  private enemyShadowCasters = 0;
  private encounterCameraImpulse = 0;
  private combatCameraImpulse = 0;
  private hitStopLeft = 0;
  private screenShakeScale: 0 | 0.5 | 1 = 1;
  private cameraTargetY = 0;
  private partyCamera: PartyCameraState = {
    targetX: 0,
    targetZ: 0,
    radius: 42,
    initialized: false,
  };

  private constructor(
    engine: GameEngine,
    scene: Scene,
    backend: "webgpu" | "webgl2",
    private readonly camera: ArcRotateCamera,
    private readonly ground: Mesh,
    private readonly groundMaterial: StandardMaterial,
    private readonly debugCamera: boolean,
    private readonly diagnosticsEnabled: boolean,
  ) {
    this.engine = engine;
    this.scene = scene;
    this.backend = backend;
    this.combatVfx = new CombatVfx(scene);
    this.combatVfx.setMeleeStyle("v2");
    this.ambientVfx = new AmbientVfx(scene);
    this.actorStatusVfx = new ActorStatusVfx(scene);
    this.combatTelegraphs = new CombatTelegraphLayer(scene);
    this.encounterPresentation = new EncounterPresentation((cue) => {
      this.encounterCameraImpulse = Math.max(this.encounterCameraImpulse, cue.cameraImpulse);
    });
    this.actorStatusVfx.setStyle("v2");
    this.ambientVfx.setEnabled(false);
    this.lavaLighting = createLavaLighting(scene);
    this.lavaLighting.setEnabled(false);
    this.artPostProcess = createArtPostProcess(scene, camera);
    this.assetStore = new BabylonAssetStore(scene);
    this.actorLayer = new BabylonActorLayer(
      scene,
      this.assetStore,
      ACTOR_VISUAL_DATA,
      (message) => { this.assetError = message; },
    );
    this.actorHealthBars = new ActorHealthBarLayer(scene);
    this.placementLayer = new BabylonPlacementLayer(scene, this.assetStore);
    if (diagnosticsEnabled) this.sceneInstrumentation = new SceneInstrumentation(scene);
    if (diagnosticsEnabled && backend === "webgpu") {
      this.engineInstrumentation = new EngineInstrumentation(engine);
      this.engineInstrumentation.captureGPUFrameTime = true;
    }
  }

  // 创建最小场景，用来验证引擎启动和渲染循环。
  static async create(
    canvas: HTMLCanvasElement,
    preference: EnginePreference = "auto",
    debugCamera = false,
    diagnosticsEnabled = debugCamera,
  ): Promise<BabylonView> {
    const { engine, backend } = await createGameEngine(
      canvas,
      preference,
      diagnosticsEnabled,
    );
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.025, 0.02, 0.03, 1);

    const camera = new ArcRotateCamera(
      "main-camera",
      -3 * Math.PI / 4,
      0.82,
      42,
      Vector3.Zero(),
      scene,
    );
    if (debugCamera) camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 12;
    camera.upperRadiusLimit = 55;
    camera.fov = 0.34;

    const ground = MeshBuilder.CreateGround(
      "foundation-ground",
      { width: 1, height: 1 },
      scene,
    );
    const material = new StandardMaterial("foundation-ground-material", scene);
    material.diffuseColor = new Color3(0.16, 0.1, 0.08);
    material.specularColor = Color3.Black();
    ground.material = material;

    const view = new BabylonView(
      engine,
      scene,
      backend,
      camera,
      ground,
      material,
      debugCamera,
      diagnosticsEnabled,
    );
    view.resize();
    return view;
  }

  // 只读快照负责位置，玩法事件只触发短暂表现。
  sync(
    snapshot: GameSnapshot,
    events: readonly GameplayEvent[],
    alpha: number,
    presentation: PresentationSettings = { reducedFlash: false, screenShake: 1 },
  ): void {
    this.screenShakeScale = presentation.screenShake;
    if (presentation.screenShake === 0) {
      this.encounterCameraImpulse = 0;
      this.combatCameraImpulse = 0;
    }
    this.applyDungeonVisual(snapshot);
    this.syncRoomVisibility(snapshot);
    const liveActors = new Set(snapshot.actors.map((actor) => actor.id));
    this.actorLayer.removeMissing(liveActors);
    for (const id of this.actorActionTimers.keys()) {
      if (liveActors.has(id)) continue;
      this.actorActionTimers.delete(id);
      this.pendingMeleeSlashes.delete(id);
    }
    for (const actor of snapshot.actors) {
      const isNew = this.actorLayer.get(actor.id) === undefined;
      const visual = this.actorLayer.getOrCreate(
          actor,
          snapshot.dungeon.themeId,
          snapshot.dungeon.visual.enemy,
        );
      if (isNew) {
        const canCastShadow = actor.faction === "hero" || this.enemyShadowCasters < 4;
        const mainCaster = visual.hitMeshes[0];
        if (mainCaster && canCastShadow) this.lavaLighting.addShadowCaster(mainCaster);
        if (actor.faction === "enemy" && canCastShadow) this.enemyShadowCasters += 1;
      }
      const x = actor.previousX + (actor.x - actor.previousX) * alpha;
      const z = actor.previousZ + (actor.z - actor.previousZ) * alpha;
      visual.root.position.set(x, 0, z);
      visual.root.rotation.y = Math.atan2(actor.facingX, actor.facingZ);
      this.actorLayer.setEquipment(actor.id, actor.equipmentVisuals);
      const playback = this.actorLayer.setAction(
        actor.id,
        actor.action,
        actor.actionDuration,
        actor.locomotion,
      );
      const previousTimer = this.actorActionTimers.get(actor.id);
      const timer = previousTimer?.action === actor.action
        ? previousTimer
        : {
            action: actor.action,
            startedAt: this.visualTime,
            slashAt: playback?.events.find((event) => event.id === "slash")?.at
              ?? DEFAULT_SLASH_EVENT_AT,
          };
      if (timer !== previousTimer && actor.action !== "melee") {
        this.pendingMeleeSlashes.delete(actor.id);
      }
      this.actorActionTimers.set(actor.id, timer);
      visual.applyPose(samplePose(
        actor.action,
        actionPhase(actor.action, this.visualTime - timer.startedAt),
      ));
    }

    this.actorHealthBars.sync(
      snapshot.actors,
      snapshot.tick,
      (actor) => {
        const visual = this.actorLayer.get(actor.id);
        const frustumPlanes = this.scene.frustumPlanes;
        return visual !== undefined
          && visual.root.isEnabled()
          && (
            !frustumPlanes
            || visual.hitMeshes.some((mesh) => mesh.isInFrustum(frustumPlanes))
          );
      },
      (actor) => this.actorLayer.visualHeight(actor.id, actor.archetype),
    );

    const liveProjectiles = new Set(snapshot.projectiles.map((projectile) => projectile.id));
    for (const [id, visual] of this.projectileVisuals) {
      if (!liveProjectiles.has(id)) {
        visual.mesh.setEnabled(false);
        const pool = this.projectilePools.get(visual.poolKey) ?? [];
        pool.push(visual.mesh);
        this.projectilePools.set(visual.poolKey, pool);
        this.projectileVisuals.delete(id);
      }
    }
    for (const projectile of snapshot.projectiles) {
      let visual = this.projectileVisuals.get(projectile.id);
      if (!visual) {
        const poolKey = `${snapshot.dungeon.themeId}-${projectile.faction}`;
        const pool = this.projectilePools.get(poolKey) ?? [];
        const mesh = pool.pop()
          ?? this.getProjectileSource(
            poolKey,
            projectile.faction,
            snapshot.dungeon.themeId,
            snapshot.dungeon.visual.enemy.projectile,
          ).createInstance("projectile");
        this.projectilePools.set(poolKey, pool);
        mesh.setEnabled(true);
        visual = { mesh, poolKey };
        this.projectileVisuals.set(projectile.id, visual);
      }
      visual.mesh.position.set(
        projectile.previousX + (projectile.x - projectile.previousX) * alpha,
        0.65,
        projectile.previousZ + (projectile.z - projectile.previousZ) * alpha,
      );
    }

    const liveHazards = new Set(snapshot.hazards.map((hazard) => hazard.id));
    for (const [id, mesh] of this.hazardVisuals) {
      if (liveHazards.has(id)) continue;
      mesh.dispose(false, false);
      this.hazardVisuals.delete(id);
    }
    for (const hazard of snapshot.hazards) {
      let mesh = this.hazardVisuals.get(hazard.id);
      if (!mesh) {
        mesh = MeshBuilder.CreateDisc(
          `hazard-${hazard.id}`,
          { radius: 1, tessellation: 32 },
          this.scene,
        );
        mesh.rotation.x = Math.PI / 2;
        mesh.material = this.getHazardMaterial(hazard.visual);
        this.hazardVisuals.set(hazard.id, mesh);
      }
      const pulse = 0.96 + Math.sin(this.visualTime * 5 + hazard.id) * 0.04;
      mesh.position.set(hazard.x, 0.035, hazard.z);
      mesh.scaling.set(hazard.radius * pulse, hazard.radius * pulse, 1);
    }

    const liveLoot = new Set(snapshot.loot.map((loot) => loot.id));
    for (const [id, mesh] of this.lootVisuals) {
      if (!liveLoot.has(id)) {
        mesh.dispose(false, false);
        this.lootVisuals.delete(id);
      }
    }
    for (const loot of snapshot.loot) {
      let mesh = this.lootVisuals.get(loot.id);
      if (!mesh) {
        mesh = MeshBuilder.CreateBox(`loot-${loot.id}`, { size: 0.38 }, this.scene);
        mesh.material = this.getLootMaterial(loot.kind);
        this.lootVisuals.set(loot.id, mesh);
      }
      mesh.position.set(loot.x, 0.4 + Math.sin(this.visualTime * 4 + loot.id) * 0.08, loot.z);
      mesh.rotation.y = this.visualTime * 1.8 + loot.id;
    }

    const liveInteractions = new Set(snapshot.interactions.map((interaction) => interaction.id));
    for (const [id, visual] of this.interactionVisuals) {
      if (!liveInteractions.has(id)) {
        for (const mesh of visual.meshes) mesh.dispose(false, false);
        visual.root.dispose();
        this.interactionVisuals.delete(id);
      }
    }
    for (const interaction of snapshot.interactions) {
      let visual = this.interactionVisuals.get(interaction.id);
      if (!visual) {
        visual = this.createInteractionVisual(
          interaction.kind,
          snapshot.dungeon.themeId,
          snapshot.dungeon.visual,
        );
        this.interactionVisuals.set(interaction.id, visual);
        this.lavaLighting.addShadowCaster(visual.main);
      }
      visual.root.position.set(interaction.x, 0, interaction.z);
      if (interaction.kind === "harvest") {
        visual.root.setEnabled(interaction.state !== "completed");
        visual.main.position.y = 0.55 + Math.sin(this.visualTime * 3) * 0.08;
        visual.main.rotation.y = this.visualTime;
      }
      if (interaction.kind === "encounter") {
        visual.root.setEnabled(interaction.state !== "completed");
        visual.root.scaling.setAll(interaction.state === "active" ? 1.12 : 1);
      }
      if (interaction.kind === "door") {
        visual.main.position.y = interaction.state === "completed" ? 3.25 : 1.15;
      }
      if (interaction.kind === "portal") {
        const material = visual.main.material as StandardMaterial;
        const active = snapshot.dungeon.door === "open";
        material.emissiveColor = Color3.FromHexString(active
          ? snapshot.dungeon.visual.interactions.portalActive
          : snapshot.dungeon.visual.interactions.portal.emissive);
        visual.main.rotation.z = this.visualTime * (active ? 0.8 : 0.2);
      }
    }

    this.syncFocusAuras(snapshot, liveActors);
    this.actorStatusVfx.sync(snapshot.actors.flatMap((actor) => {
      const visual = this.actorLayer.get(actor.id);
      return visual ? [{
        actorId: actor.id,
        root: visual.root,
        meshes: visual.hitMeshes,
        statuses: actor.statusVisuals,
      }] : [];
    }));
    this.encounterPresentation.sync(events);
    this.syncPartyCamera(snapshot, alpha);

    for (const event of events) {
      if (event.type === "damage_applied") {
        this.actorLayer.get(event.target)?.flashHit(presentation.reducedFlash ? 0.25 : 1);
      }
    }
    this.combatVfx.sync(snapshot, this.routeCombatEvents(snapshot, events));
    this.combatTelegraphs.sync(snapshot, events);
  }

  render(): void {
    const realDelta = Math.min(this.engine.getDeltaTime() / 1000, 0.05);
    const frozen = this.hitStopLeft > 0;
    this.hitStopLeft = Math.max(0, this.hitStopLeft - realDelta);
    const delta = frozen ? 0 : realDelta;
    this.cameraTime += realDelta;
    this.visualTime += delta;
    this.playDueMeleeSlashes();
    this.artMaterials?.update(delta);
    this.combatVfx.update(delta);
    this.combatTelegraphs.update(delta);
    this.encounterCameraImpulse = Math.max(0, this.encounterCameraImpulse - realDelta * 0.8);
    this.combatCameraImpulse *= Math.exp(-12 * realDelta);
    const combatImpulse = this.combatCameraImpulse * this.screenShakeScale;
    this.camera.target.x += Math.sin(this.cameraTime * 43) * combatImpulse;
    this.camera.target.y = this.cameraTargetY
      + Math.sin(this.cameraTime * 38) * this.encounterCameraImpulse * this.screenShakeScale
      + Math.cos(this.cameraTime * 51) * combatImpulse * 0.7;
    this.camera.target.z += Math.sin(this.cameraTime * 47 + 0.8) * combatImpulse * 0.6;
    this.actorStatusVfx.update(delta);
    this.ambientVfx.update(delta);
    this.lavaLighting.update(this.visualTime);
    for (const room of this.roomArts.values()) {
      if (room.root.isEnabled()) room.update(delta);
    }
    this.scene.animationTimeScale = frozen ? 0 : 1;
    this.scene.render();
  }

  // 宿主必须等导航烘焙完成再启动逻辑，避免先移动后补碰撞。
  async prepareNavigation(pack: DungeonPack): Promise<BabylonNavigation> {
    const navigation = await BabylonNavigation.create(this.scene, pack.map.navigation);
    if (this.disposed) {
      navigation.dispose();
      throw new Error("View disposed while preparing navigation");
    }
    this.navigation?.dispose();
    this.navigation = navigation;
    return navigation;
  }

  // GPU 计时读取不扫描场景，可在诊断渲染循环中逐帧采样。
  gpuFrameMs(): number | undefined {
    if (!this.diagnosticsEnabled) return undefined;
    const gpuNanoseconds = this.engineInstrumentation?.gpuFrameTimeCounter.current ?? 0;
    return gpuNanoseconds > 0 ? gpuNanoseconds / 1_000_000 : undefined;
  }

  // WebGPU 主渲染通道与整帧 GPU 时间分开记录，避免把后处理/等待混进场景绘制判断。
  gpuMainPassMs(): number | undefined {
    if (!this.diagnosticsEnabled) return undefined;
    const directGpu = (this.engine as GameEngine & {
      gpuTimeInFrameForMainPass?: { counter: { current: number } };
    }).gpuTimeInFrameForMainPass?.counter.current;
    return directGpu !== undefined && directGpu > 0
      ? directGpu / 1_000_000
      : undefined;
  }

  // 重指标只允许宿主低频调用；普通模式只保留资源错误和导航状态。
  metrics(): RenderMetrics {
    const assetStatus = this.assetStore.status();
    if (!this.diagnosticsEnabled) {
      return {
        renderWidth: this.engine.getRenderWidth(),
        renderHeight: this.engine.getRenderHeight(),
        drawCalls: 0,
        triangles: 0,
        textureBytes: 0,
        particles: 0,
        liveVfx: 0,
        liveProjectiles: this.projectileVisuals.size,
        activeSections: 0,
        activeSectionIds: [],
        assetTemplates: assetStatus.loaded,
        assetInstances: assetStatus.instances,
        assetPending: assetStatus.pending,
        assetFailed: assetStatus.failed,
        assetError: this.assetError,
        animatedActors: 0,
        fallbackActors: 0,
        pendingActors: 0,
        navigationReady: this.navigation !== undefined,
      };
    }
    const actorStatus = this.actorLayer.status();
    const activeSectionIds = [...this.roomArts.entries()]
      .filter(([, room]) => room.root.isEnabled())
      .map(([id]) => id);
    return {
      renderWidth: this.engine.getRenderWidth(),
      renderHeight: this.engine.getRenderHeight(),
      drawCalls: this.sceneInstrumentation?.drawCallsCounter.current ?? 0,
      triangles: Math.round(this.scene.getActiveIndices() / 3),
      textureBytes: estimateTextureBytes(this.scene),
      particles: this.scene.particleSystems.reduce((total, system) => (
        total + system.getActiveCount()
      ), 0),
      liveVfx: this.combatVfx.activeCount
        + this.combatTelegraphs.activeCount
        + this.ambientVfx.activeCount
        + this.actorStatusVfx.activeCount
        + [...this.focusAuras.values()].filter((aura) => (
        aura.isEnabled()
      )).length,
      liveProjectiles: this.projectileVisuals.size,
      activeSections: activeSectionIds.length,
      activeSectionIds,
      assetTemplates: assetStatus.loaded,
      assetInstances: assetStatus.instances,
      assetPending: assetStatus.pending,
      assetFailed: assetStatus.failed,
      assetError: this.assetError,
      animatedActors: actorStatus.animated,
      fallbackActors: actorStatus.fallback,
      pendingActors: actorStatus.pending,
      navigationReady: this.navigation !== undefined,
      gpuMs: this.gpuFrameMs(),
      gpuMainPassMs: this.gpuMainPassMs(),
    };
  }

  // 地图换皮只在内容包变化时执行，不占用每帧预算。
  private applyDungeonVisual(snapshot: GameSnapshot): void {
    if (this.activeDungeonId === snapshot.dungeon.id) return;
    this.activeDungeonId = snapshot.dungeon.id;
    this.assetError = undefined;
    void this.placementLayer.load(snapshot.dungeon).catch((source: unknown) => {
      if (this.activeDungeonId !== snapshot.dungeon.id) return;
      this.assetError = source instanceof Error ? source.message : String(source);
    });
    const authoredProfile = snapshot.dungeon.visual.profile !== "foundation";
    this.ambientVfx.setEnabled(snapshot.dungeon.visual.profile === "lava_fortress");
    this.lavaLighting.setEnabled(authoredProfile);
    this.artPostProcess.setEnabled(authoredProfile);
    if (snapshot.dungeon.visual.palette) {
      this.lavaLighting.setPalette(snapshot.dungeon.visual.palette);
    }

    for (const room of this.roomArts.values()) room.dispose();
    this.roomArts.clear();
    this.artMaterials?.dispose();
    this.artMaterials = undefined;

    const clear = Color3.FromHexString(snapshot.dungeon.visual.clearColor);
    this.scene.clearColor = new Color4(clear.r, clear.g, clear.b, 1);
    this.ground.setEnabled(!authoredProfile);
    this.ground.scaling.set(
      snapshot.dungeon.visual.groundSize,
      1,
      snapshot.dungeon.visual.groundSize,
    );
    this.groundMaterial.diffuseColor = Color3.FromHexString(
      snapshot.dungeon.visual.groundColor,
    );

    for (const mesh of this.decorationVisuals.values()) mesh.dispose(false, false);
    this.decorationVisuals.clear();
    if (authoredProfile) {
      this.artMaterials = new ArtMaterialLibrary(
        this.scene,
        snapshot.dungeon.visual.palette,
        snapshot.dungeon.themeId,
      );
      for (const section of snapshot.dungeon.map.sections) {
        const room = snapshot.dungeon.visual.profile === "lava_fortress"
          ? createLavaFortressRoom(this.scene, this.artMaterials, section)
          : createVoxelDungeonRoom(
            this.scene,
            this.artMaterials,
            section,
            snapshot.dungeon.map.sections,
            snapshot.dungeon.themeId,
          );
        for (const mesh of room.shadowCasters) this.lavaLighting.addShadowCaster(mesh);
        this.roomArts.set(section.id, room);
      }
      return;
    }
    for (const decoration of snapshot.dungeon.decorations) {
      const mesh = MeshBuilder.CreateBox(
        decoration.id,
        {
          width: decoration.width,
          height: decoration.height,
          depth: decoration.depth,
        },
        this.scene,
      );
      mesh.position.set(decoration.x, decoration.y, decoration.z);
      mesh.material = this.getDecorationMaterial(
        snapshot.dungeon.themeId,
        decoration.color,
        decoration.emissive ?? "#000000",
      );
      this.decorationVisuals.set(decoration.id, mesh);
    }
  }

  // 每名本地玩家都保留当前房间和四向邻居，镜头拉远时不会看到空地图。
  private syncRoomVisibility(snapshot: GameSnapshot): void {
    const players = snapshot.actors.filter((actor) => (
      actor.playerSlot !== undefined && actor.action !== "dead"
    ));
    if (players.length === 0) return;
    const visible = new Set(players.flatMap((player) => visibleSectionIds(
      snapshot.dungeon.map.sections,
      player.x,
      player.z,
    )));
    for (const [id, room] of this.roomArts) room.root.setEnabled(visible.has(id));
    this.placementLayer.setVisibleSections(visible);
  }

  private getDecorationMaterial(
    themeId: string,
    color: string,
    emissive: string,
  ): StandardMaterial {
    const key = `${themeId}-${color}-${emissive}`;
    const existing = this.decorationMaterials.get(key);
    if (existing) return existing;
    const value = new StandardMaterial(`decoration-${key}-material`, this.scene);
    value.diffuseColor = Color3.FromHexString(color);
    value.emissiveColor = Color3.FromHexString(emissive);
    value.specularColor = Color3.Black();
    this.decorationMaterials.set(key, value);
    return value;
  }

  private syncFocusAuras(snapshot: GameSnapshot, liveActors: ReadonlySet<EntityId>): void {
    for (const [id, aura] of this.focusAuras) {
      if (!liveActors.has(id)) {
        aura.dispose(false, false);
        this.focusAuras.delete(id);
      } else {
        aura.setEnabled(false);
      }
    }

    for (const actor of snapshot.actors) {
      if (!actor.playerSlot || !actor.statuses.includes("status.battle_focus")) continue;
      const visual = this.actorLayer.get(actor.id);
      if (!visual) continue;
      let aura = this.focusAuras.get(actor.id);
      if (!aura) {
        aura = MeshBuilder.CreateTorus(
          "battle-focus-aura",
          { diameter: 1.4, thickness: 0.08, tessellation: 24 },
          this.scene,
        );
        aura.material = this.getFocusAuraMaterial();
        aura.position.set(0, 0.12, 0);
        this.focusAuras.set(actor.id, aura);
      }
      aura.parent = visual.root;
      aura.setEnabled(true);
    }
  }

  private syncPartyCamera(snapshot: GameSnapshot, alpha: number): void {
    const players = snapshot.actors.filter((actor) => (
      actor.playerSlot !== undefined && actor.action !== "dead"
    ));
    if (players.length === 0) return;
    const lavaProfile = snapshot.dungeon.visual.profile !== "foundation";
    const delta = Math.min(this.engine.getDeltaTime() / 1000, 0.05);
    this.partyCamera = updatePartyCamera(
      this.partyCamera,
      players.map((actor) => ({
        x: actor.previousX + (actor.x - actor.previousX) * alpha,
        z: actor.previousZ + (actor.z - actor.previousZ) * alpha,
        previousX: actor.previousX,
        previousZ: actor.previousZ,
      })),
      delta,
      lavaProfile ? PRODUCTION_PARTY_CAMERA : DEFAULT_PARTY_CAMERA,
    );
    this.camera.target.set(
      this.partyCamera.targetX,
      lavaProfile ? 0.55 : 0,
      this.partyCamera.targetZ,
    );
    this.cameraTargetY = lavaProfile ? 0.55 : 0;
    this.camera.radius = this.partyCamera.radius;
    if (!this.debugCamera) {
      const blend = 1 - Math.exp(-7 * delta);
      this.camera.alpha += (-3 * Math.PI / 4 - this.camera.alpha) * blend;
      this.camera.beta += (0.82 - this.camera.beta) * blend;
    }
  }

  // 近战表现跟随骨骼事件点；伤害仍按技能时间轴独立结算。
  private routeCombatEvents(
    snapshot: GameSnapshot,
    events: readonly GameplayEvent[],
  ): GameplayEvent[] {
    const immediate: GameplayEvent[] = [];
    for (const event of events) {
      if (event.type === "ability_cast" && this.combatVfx.hasMeleeVisual(event.visual)) {
        const actor = snapshot.actors.find((value) => value.id === event.actor);
        const timer = this.actorActionTimers.get(event.actor);
        if (actor && timer?.action === "melee") {
          timer.meleeVisual = event.visual;
          this.pendingMeleeSlashes.set(event.actor, {
            visual: event.visual,
            startedAt: timer.startedAt,
            dueAt: timer.startedAt + actor.actionDuration * timer.slashAt,
          });
        }
      }
      if (event.type === "ability_impact" && this.combatVfx.hasMeleeVisual(event.visual)) {
        const timer = this.actorActionTimers.get(event.actor);
        if (timer?.action === "melee" && timer.meleeVisual === event.visual) continue;
      }
      immediate.push(event);
    }
    return immediate;
  }

  private playDueMeleeSlashes(): void {
    for (const [actorId, pending] of this.pendingMeleeSlashes) {
      const timer = this.actorActionTimers.get(actorId);
      if (timer?.action !== "melee" || timer.startedAt !== pending.startedAt) {
        this.pendingMeleeSlashes.delete(actorId);
        continue;
      }
      if (this.visualTime < pending.dueAt) continue;
      const visual = this.actorLayer.get(actorId);
      if (visual) {
        const weaponAnchor = visual.meleeAnchor.getAbsolutePosition();
        const direction = meleeSlashDirection(
          { x: visual.root.position.x, z: visual.root.position.z },
          { x: weaponAnchor.x, z: weaponAnchor.z },
          {
            x: Math.sin(visual.root.rotation.y),
            z: Math.cos(visual.root.rotation.y),
          },
        );
        this.combatVfx.playMelee(
          pending.visual,
          visual.root.position.x,
          visual.root.position.z,
          direction.x,
          direction.z,
        );
      }
      this.pendingMeleeSlashes.delete(actorId);
    }
  }

  // 同阵营投射物共用一个源网格，避免箭雨按数量增加绘制批次。
  private getProjectileSource(
    poolKey: string,
    faction: "hero" | "enemy",
    themeId: string,
    enemyColor: string,
  ): Mesh {
    const existing = this.projectileSources.get(poolKey);
    if (existing) return existing;
    const source = MeshBuilder.CreateBox(
      `projectile-source-${poolKey}`,
      { size: 0.24 },
      this.scene,
    );
    source.material = this.getProjectileMaterial(faction, themeId, enemyColor);
    source.position.y = -1000;
    source.isPickable = false;
    this.projectileSources.set(poolKey, source);
    return source;
  }

  private getProjectileMaterial(
    faction: "hero" | "enemy",
    themeId: string,
    enemyColor: string,
  ): StandardMaterial {
    const key = `${themeId}-${faction}`;
    const existing = this.projectileMaterials.get(key);
    if (existing) return existing;
    const color = faction === "hero" ? "#5ee8ff" : enemyColor;
    const value = new StandardMaterial(`projectile-${faction}-material`, this.scene);
    value.diffuseColor = Color3.FromHexString(color);
    value.emissiveColor = Color3.FromHexString(color);
    value.specularColor = Color3.Black();
    this.projectileMaterials.set(key, value);
    return value;
  }

  private getFocusAuraMaterial(): StandardMaterial {
    if (this.focusAuraMaterial) return this.focusAuraMaterial;
    const value = new StandardMaterial("battle-focus-aura-material", this.scene);
    value.diffuseColor = Color3.FromHexString("#5ee8ff");
    value.emissiveColor = Color3.FromHexString("#38cfe8");
    value.specularColor = Color3.Black();
    value.alpha = 0.72;
    this.focusAuraMaterial = value;
    return value;
  }

  private getHazardMaterial(visual: string): StandardMaterial {
    const existing = this.hazardMaterials.get(visual);
    if (existing) return existing;
    const color = visual.includes("poison")
      ? "#70dc55"
      : visual.includes("ice")
        ? "#61dfff"
        : visual.includes("storm")
          ? "#a584ff"
          : visual.includes("fire") || visual.includes("ember")
            ? "#ff6b34"
            : "#61dfff";
    const material = new StandardMaterial(`hazard-${visual}-material`, this.scene);
    material.diffuseColor = Color3.FromHexString(color);
    material.emissiveColor = Color3.FromHexString(color).scale(0.75);
    material.specularColor = Color3.Black();
    material.alpha = 0.34;
    material.backFaceCulling = false;
    this.hazardMaterials.set(visual, material);
    return material;
  }

  private getLootMaterial(kind: "item" | "ability" | "material"): StandardMaterial {
    const existing = this.lootMaterials.get(kind);
    if (existing) return existing;
    const colors = { item: "#ff7b39", ability: "#56e7ff", material: "#f4c75b" };
    const value = new StandardMaterial(`loot-${kind}-material`, this.scene);
    value.diffuseColor = Color3.FromHexString(colors[kind]);
    value.emissiveColor = Color3.FromHexString(colors[kind]);
    value.specularColor = Color3.Black();
    this.lootMaterials.set(kind, value);
    return value;
  }

  private createInteractionVisual(
    kind: InteractionKind,
    themeId: string,
    visual: DungeonVisualDef,
  ): InteractionVisual {
    const root = new TransformNode(`interaction-${kind}`, this.scene);
    const meshes: Mesh[] = [];
    const add = (mesh: Mesh, material: StandardMaterial) => {
      mesh.parent = root;
      mesh.material = material;
      meshes.push(mesh);
      return mesh;
    };

    if (kind === "harvest") {
      const main = add(
        MeshBuilder.CreateBox("harvest-crystal", { size: 0.48 }, this.scene),
        this.getInteractionMaterial(
          `${themeId}-harvest`,
          visual.interactions.harvest.color,
          visual.interactions.harvest.emissive,
        ),
      );
      main.position.y = 0.55;
      main.rotation.z = Math.PI / 4;
      return { root, main, meshes, kind };
    }
    if (kind === "encounter") {
      const main = add(
        MeshBuilder.CreateTorus(
          "encounter-ring",
          { diameter: 1.8, thickness: 0.08, tessellation: 24 },
          this.scene,
        ),
        this.getInteractionMaterial(
          `${themeId}-encounter`,
          visual.interactions.encounter.color,
          visual.interactions.encounter.emissive,
        ),
      );
      main.position.y = 0.05;
      return { root, main, meshes, kind };
    }
    if (kind === "door") {
      const stone = this.getInteractionMaterial(
        `${themeId}-door-stone`,
        visual.interactions.doorStone.color,
        visual.interactions.doorStone.emissive,
      );
      const gate = this.getInteractionMaterial(
        `${themeId}-door-gate`,
        visual.interactions.doorGate.color,
        visual.interactions.doorGate.emissive,
      );
      if (visual.profile !== "foundation") {
        const left = add(
          MeshBuilder.CreateBox("door-left", { width: 0.5, height: 3, depth: 0.72 }, this.scene),
          stone,
        );
        left.position.set(-1.05, 1.5, 0);
        const right = add(
          MeshBuilder.CreateBox("door-right", { width: 0.5, height: 3, depth: 0.72 }, this.scene),
          stone,
        );
        right.position.set(1.05, 1.5, 0);
        const crown = add(
          MeshBuilder.CreateBox("door-crown", { width: 2.6, height: 0.42, depth: 0.8 }, this.scene),
          stone,
        );
        crown.position.y = 2.82;
        const bars: Mesh[] = [];
        for (let index = -2; index <= 2; index += 1) {
          const bar = MeshBuilder.CreateBox(
            "door-bar",
            { width: 0.13, height: 2.35, depth: 0.18 },
            this.scene,
          );
          bar.position.x = index * 0.38;
          bar.material = gate;
          bars.push(bar);
          const tooth = MeshBuilder.CreateCylinder(
            "door-tooth",
            { height: 0.35, diameterTop: 0, diameterBottom: 0.2, tessellation: 4 },
            this.scene,
          );
          tooth.position.set(index * 0.38, -1.32, 0);
          tooth.material = gate;
          bars.push(tooth);
        }
        const main = Mesh.MergeMeshes(bars, true, true);
        if (!main) throw new Error("Failed to merge lava gate bars");
        main.name = "door-gate";
        main.material = gate;
        main.parent = root;
        main.position.y = 1.28;
        meshes.push(main);
        return { root, main, meshes, kind };
      }
      const left = add(
        MeshBuilder.CreateBox("door-left", { width: 0.45, height: 2.8, depth: 0.7 }, this.scene),
        stone,
      );
      left.position.set(-0.9, 1.4, 0);
      const right = add(
        MeshBuilder.CreateBox("door-right", { width: 0.45, height: 2.8, depth: 0.7 }, this.scene),
        stone,
      );
      right.position.set(0.9, 1.4, 0);
      const main = add(
        MeshBuilder.CreateBox("door-slab", { width: 1.45, height: 2.2, depth: 0.28 }, this.scene),
        gate,
      );
      main.position.y = 1.15;
      return { root, main, meshes, kind };
    }
    const main = add(
      MeshBuilder.CreateTorus(
        "return-portal",
        { diameter: 1.5, thickness: 0.12, tessellation: 24 },
        this.scene,
      ),
      this.getInteractionMaterial(
        `${themeId}-portal`,
        visual.interactions.portal.color,
        visual.interactions.portal.emissive,
      ),
    );
    main.position.y = 1;
    main.rotation.x = Math.PI / 2;
    if (visual.profile !== "foundation") {
      const inner = add(
        MeshBuilder.CreateTorus(
          "return-portal-inner",
          { diameter: 1.12, thickness: 0.055, tessellation: 20 },
          this.scene,
        ),
        this.getInteractionMaterial(
          `${themeId}-portal-inner`,
          visual.interactions.portalActive,
          visual.interactions.portal.emissive,
        ),
      );
      inner.position.y = 1;
      inner.rotation.set(Math.PI / 2, 0, Math.PI / 4);
      for (let index = 0; index < 6; index += 1) {
        const angle = index / 6 * Math.PI * 2;
        const shard = add(
          MeshBuilder.CreateBox("portal-rune", { width: 0.09, height: 0.26, depth: 0.09 }, this.scene),
          this.getInteractionMaterial(
            `${themeId}-portal-rune`,
            visual.interactions.portalActive,
            visual.interactions.portal.emissive,
          ),
        );
        shard.position.set(Math.cos(angle) * 0.95, 1 + Math.sin(angle) * 0.95, 0);
        shard.rotation.z = -angle;
      }
    }
    return { root, main, meshes, kind };
  }

  private getInteractionMaterial(
    key: string,
    color: string,
    emissive: string,
  ): StandardMaterial {
    const existing = this.interactionMaterials.get(key);
    if (existing) return existing;
    const value = new StandardMaterial(`interaction-${key}-material`, this.scene);
    value.diffuseColor = Color3.FromHexString(color);
    value.emissiveColor = Color3.FromHexString(emissive);
    value.specularColor = Color3.Black();
    this.interactionMaterials.set(key, value);
    return value;
  }

  resize(): void {
    const canvas = this.engine.getRenderingCanvas();
    if (canvas) {
      this.engine.setHardwareScalingLevel(renderHardwareScaling(
        canvas.clientWidth,
        canvas.clientHeight,
      ));
    }
    this.engine.resize();
  }

  triggerHitStop(seconds: number): void {
    this.hitStopLeft = Math.max(this.hitStopLeft, Math.min(0.055, Math.max(0, seconds)));
  }

  pushCameraImpulse(value: number): void {
    if (this.screenShakeScale === 0) return;
    this.combatCameraImpulse = Math.max(
      this.combatCameraImpulse,
      Math.min(0.1, Math.max(0, value)),
    );
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.navigation?.dispose();
    this.navigation = undefined;
    this.placementLayer.dispose();
    this.actorHealthBars.dispose();
    this.actorLayer.dispose();
    this.assetStore.dispose();
    for (const room of this.roomArts.values()) room.dispose();
    this.artMaterials?.dispose();
    this.combatVfx.dispose();
    this.combatTelegraphs.dispose();
    this.actorStatusVfx.dispose();
    this.ambientVfx.dispose();
    this.lavaLighting.dispose();
    this.artPostProcess.dispose();
    this.sceneInstrumentation?.dispose();
    this.engineInstrumentation?.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }
}
