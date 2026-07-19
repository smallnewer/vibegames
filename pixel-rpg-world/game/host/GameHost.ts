import { LocalInput } from "../adapters/browser/LocalInput";
import type { G30StateReaders } from "../adapters/browser/G30Input";
import { BabylonView } from "../adapters/babylon/BabylonView";
import type { EnginePreference } from "../adapters/babylon/createGameEngine";
import type { GameplayEvent } from "../core/GameplayEvent";
import { GameClock } from "../core/GameClock";
import { GameSimulation } from "../core/GameSimulation";
import { PerformanceMonitor } from "./PerformanceMonitor";
import { DungeonRegistry } from "../content/DungeonRegistry";
import type { DungeonPack } from "../dungeon/DungeonDefinitions";
import type { RenderMetrics } from "../adapters/babylon/RenderMetrics";
import { PERFORMANCE_BUDGETS } from "./PerformanceBudgets";
import type { CombatHudModel } from "../ui/HudTypes";
import { buildCombatHud } from "../ui/HudViewModel";
import { buildMinimap, type MinimapSnapshot } from "../map/MinimapModel";
import { UiController, type UiControllerModel } from "../ui/UiController";
import type { UiState } from "../ui/UiState";
import type { GameSnapshot } from "../core/GameSnapshot";
import { buildGameUiModel, type GameUiModel } from "../ui/GameUiModel";
import type { UiInput } from "../ui/UiInput";
import type { HeroSaveV1 } from "../save/SaveSchema";
import { buildInventoryPageModel } from "../ui/InventoryPageModel";
import { buildSkillPageModel } from "../ui/SkillPageModel";
import { buildForgePageModel } from "../ui/ForgePageModel";
import type { SystemAction, SystemPageContext } from "../ui/SystemPageModel";
import { buildSystemPageModel } from "../ui/SystemPageModel";
import { terminalRunEvent } from "./TerminalRunEvent";
import { ToastQueue, type ToastMessage } from "../ui/ToastQueue";
import { combatFeedback } from "./CombatFeedback";

export interface GameHostOptions {
  benchmark?: boolean;
  debug?: boolean;
  dungeonId?: string;
  playerCount?: number;
  readG30States?: G30StateReaders;
  onDungeonCompleted?: (dungeonId: string, difficulty: "normal" | "echo") => void;
  onPartyWiped?: () => void;
  heroSaves?: readonly HeroSaveV1[];
  onProgressChanged?: (snapshot: GameSnapshot, events: readonly GameplayEvent[]) => void;
  getSystemUi?: () => SystemPageContext;
  onSystemAction?: (action: SystemAction) => void;
}

export interface DebugHudSnapshot {
  benchmark: boolean;
  partyCount: number;
  enemyCount: number;
  projectileCount: number;
  frameP95: number;
  frameP99: number;
  workloadP95: number;
  workloadP99: number;
  logicMs: number;
  logicP95: number;
  visualSyncMs: number;
  visualSyncP95: number;
  sceneRenderMs: number;
  sceneRenderP95: number;
  renderMs: number;
  renderP95: number;
  diagnosticsMs: number;
  gpuMs?: number;
  gpuP95?: number;
  gpuMainPassMs?: number;
  gpuMainPassP95?: number;
  overBudgetRate: number;
  renderWidth: number;
  renderHeight: number;
  drawCalls: number;
  triangles: number;
  textureBytes: number;
  particleCount: number;
  vfxCount: number;
  navigationReady: boolean;
  activeSectionIds: readonly string[];
  assetTemplates: number;
  assetInstances: number;
  assetPending: number;
  assetFailed: number;
  assetError?: string;
  animatedActors: number;
  fallbackActors: number;
  pendingActors: number;
  heroX: number;
  heroZ: number;
  heapGrowthBytes?: number;
}

export interface HudSnapshot {
  readonly combat: CombatHudModel;
  readonly dungeon: {
    readonly id: string;
    readonly name: string;
  };
  readonly minimap: MinimapSnapshot;
  readonly ui: UiState;
  readonly uiModel: GameUiModel;
  readonly toasts: readonly ToastMessage[];
  readonly debug: DebugHudSnapshot;
}

export class GameHost {
  private readonly clock = new GameClock();
  private simulation?: GameSimulation;
  private readonly dungeons = new DungeonRegistry();
  private readonly dungeonPack: DungeonPack;
  private readonly performanceMonitor = new PerformanceMonitor();
  private view?: BabylonView;
  private input?: LocalInput;
  private disposed = false;
  private combatHudElapsed = 0;
  private diagnosticsElapsed = 0;
  private minimapElapsed = 0;
  private combatHud?: CombatHudModel;
  private minimap?: MinimapSnapshot;
  private minimapSignature = "";
  private terminalReported = false;
  private readonly uiController = new UiController();
  private readonly queuedUiInputs: UiInput[] = [];
  private readonly toastQueue = new ToastQueue();
  private hitStopLeft = 0;
  private debugHud: DebugHudSnapshot = {
    benchmark: false,
    partyCount: 0,
    enemyCount: 0,
    projectileCount: 0,
    frameP95: 0,
    frameP99: 0,
    workloadP95: 0,
    workloadP99: 0,
    logicMs: 0,
    logicP95: 0,
    visualSyncMs: 0,
    visualSyncP95: 0,
    sceneRenderMs: 0,
    sceneRenderP95: 0,
    renderMs: 0,
    renderP95: 0,
    diagnosticsMs: 0,
    overBudgetRate: 0,
    renderWidth: 0,
    renderHeight: 0,
    drawCalls: 0,
    triangles: 0,
    textureBytes: 0,
    particleCount: 0,
    vfxCount: 0,
    navigationReady: false,
    activeSectionIds: [],
    assetTemplates: 0,
    assetInstances: 0,
    assetPending: 0,
    assetFailed: 0,
    animatedActors: 0,
    fallbackActors: 0,
    pendingActors: 0,
    heroX: 0,
    heroZ: 0,
  };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly enginePreference: EnginePreference = "auto",
    private readonly onHud?: (snapshot: HudSnapshot) => void,
    private readonly options: GameHostOptions = {},
  ) {
    this.dungeonPack = this.dungeons.get(options.dungeonId ?? "dungeon.training_ground");
  }

  // 输入、纯逻辑和 Babylon 表现只在宿主里按固定顺序编排。
  async start(): Promise<"webgpu" | "webgl2" | undefined> {
    const view = await BabylonView.create(
      this.canvas,
      this.enginePreference,
      this.options.debug,
      this.options.debug === true || this.options.benchmark === true,
    );
    if (this.disposed) {
      view.dispose();
      return undefined;
    }
    this.view = view;
    const navigation = await view.prepareNavigation(this.dungeonPack);
    if (this.disposed) return undefined;
    const simulation = new GameSimulation(
      {
        benchmark: this.options.benchmark,
        dungeonId: this.dungeonPack.id,
        playerCount: this.options.playerCount,
        runSeed: crypto.getRandomValues(new Uint32Array(1))[0],
        heroSaves: this.options.heroSaves,
      },
      this.dungeons,
      navigation,
    );
    this.simulation = simulation;
    this.input = new LocalInput(
      window,
      () => navigator.getGamepads(),
      this.options.readG30States,
    );
    let renderMetrics: RenderMetrics = view.metrics();
    const diagnosticsInterval = 1 / PERFORMANCE_BUDGETS.diagnosticsHz;
    const combatHudInterval = 1 / 20;

    view.engine.runRenderLoop(() => {
      const frameIntervalMs = Math.min(view.engine.getDeltaTime(), 100);
      const delta = frameIntervalMs / 1000;
      const frameEvents: GameplayEvent[] = [];
      const logicStarted = performance.now();
      let pausedDuringAdvance = false;
      let alpha = 0;
      if (this.uiController.state.open) {
        const before = simulation.snapshot();
        this.input!.sample(before);
        this.handleUiInputs(before, simulation, frameEvents);
        this.clock.reset();
      } else if (this.hitStopLeft > 0) {
        this.hitStopLeft = Math.max(0, this.hitStopLeft - delta);
        this.input!.sample(simulation.snapshot());
        this.clock.reset();
      } else {
        alpha = this.clock.advance(delta, (step) => {
          const before = simulation.snapshot();
          const commands = this.input!.sample(before);
          this.handleUiInputs(before, simulation, frameEvents);
          if (this.uiController.state.open) {
            pausedDuringAdvance = true;
            return;
          }
          frameEvents.push(...simulation.tick(step, commands));
        });
        if (pausedDuringAdvance) {
          this.clock.reset();
          alpha = 0;
        }
      }
      const logicMs = performance.now() - logicStarted;
      const snapshot = simulation.snapshot();
      this.toastQueue.advance(delta);
      this.toastQueue.observe(frameEvents);
      if (frameEvents.length > 0) this.options.onProgressChanged?.(snapshot, frameEvents);
      if (!this.terminalReported) {
        const terminal = terminalRunEvent(frameEvents);
        if (terminal?.type === "completed") {
          this.options.onDungeonCompleted?.(terminal.dungeon, terminal.difficulty);
          this.terminalReported = true;
        } else if (terminal?.type === "wiped") {
          this.options.onPartyWiped?.();
          this.terminalReported = true;
        }
      }
      const visualSyncStarted = performance.now();
      const systemContext = this.options.getSystemUi?.();
      view.sync(snapshot, frameEvents, alpha, systemContext?.settings);
      const feedback = combatFeedback(
        frameEvents,
        snapshot.players.map((player) => player.actor),
      );
      if (feedback.hitStopSeconds > 0) {
        this.hitStopLeft = Math.max(this.hitStopLeft, feedback.hitStopSeconds);
        view.triggerHitStop(feedback.hitStopSeconds);
      }
      if (feedback.cameraImpulse > 0) view.pushCameraImpulse(feedback.cameraImpulse);
      const visualSyncMs = performance.now() - visualSyncStarted;
      const sceneRenderStarted = performance.now();
      view.render();
      const sceneRenderMs = performance.now() - sceneRenderStarted;
      const renderMs = visualSyncMs + sceneRenderMs;
      const gpuMs = view.gpuFrameMs();
      const gpuMainPassMs = view.gpuMainPassMs();
      this.combatHudElapsed += delta;
      this.diagnosticsElapsed += delta;
      this.minimapElapsed += delta;
      const combatHudDue = this.combatHudElapsed >= combatHudInterval;
      const diagnosticsDue = this.diagnosticsElapsed >= diagnosticsInterval;
      let diagnosticsMs = 0;
      if (diagnosticsDue) {
        this.diagnosticsElapsed %= diagnosticsInterval;
        const diagnosticsStarted = performance.now();
        renderMetrics = view.metrics();
        diagnosticsMs = performance.now() - diagnosticsStarted;
      }
      const heapBytes = (
        performance as Performance & { memory?: { usedJSHeapSize: number } }
      ).memory?.usedJSHeapSize;
      this.performanceMonitor.add({
        frameIntervalMs,
        workloadMs: Math.max(
          logicMs + renderMs + diagnosticsMs,
          gpuMs ?? 0,
          gpuMainPassMs ?? 0,
        ),
        logicMs,
        visualSyncMs,
        sceneRenderMs,
        renderMs,
        diagnosticsMs,
        gpuMs,
        gpuMainPassMs,
        heapBytes,
      });
      if (diagnosticsDue) {
        const hero = snapshot.actors.find((actor) => actor.id === snapshot.hero)!;
        const performanceSummary = this.performanceMonitor.summary();
        this.debugHud = {
          benchmark: this.options.benchmark === true,
          partyCount: snapshot.players.length,
          enemyCount: snapshot.actors.filter((actor) => (
            actor.faction === "enemy" && actor.action !== "dead"
          )).length,
          projectileCount: snapshot.projectiles.length,
          frameP95: performanceSummary.frameP95,
          frameP99: performanceSummary.frameP99,
          workloadP95: performanceSummary.workloadP95,
          workloadP99: performanceSummary.workloadP99,
          logicMs: performanceSummary.logicMs,
          logicP95: performanceSummary.logicP95,
          visualSyncMs: performanceSummary.visualSyncMs,
          visualSyncP95: performanceSummary.visualSyncP95,
          sceneRenderMs: performanceSummary.sceneRenderMs,
          sceneRenderP95: performanceSummary.sceneRenderP95,
          renderMs: performanceSummary.renderMs,
          renderP95: performanceSummary.renderP95,
          diagnosticsMs: performanceSummary.diagnosticsMs,
          gpuMs: performanceSummary.gpuMs,
          gpuP95: performanceSummary.gpuP95,
          gpuMainPassMs: performanceSummary.gpuMainPassMs,
          gpuMainPassP95: performanceSummary.gpuMainPassP95,
          overBudgetRate: performanceSummary.overBudgetRate,
          renderWidth: renderMetrics.renderWidth,
          renderHeight: renderMetrics.renderHeight,
          drawCalls: renderMetrics.drawCalls,
          triangles: renderMetrics.triangles,
          textureBytes: renderMetrics.textureBytes,
          particleCount: renderMetrics.particles,
          vfxCount: renderMetrics.liveVfx,
          navigationReady: renderMetrics.navigationReady,
          activeSectionIds: renderMetrics.activeSectionIds,
          assetTemplates: renderMetrics.assetTemplates,
          assetInstances: renderMetrics.assetInstances,
          assetPending: renderMetrics.assetPending,
          assetFailed: renderMetrics.assetFailed,
          assetError: renderMetrics.assetError,
          animatedActors: renderMetrics.animatedActors,
          fallbackActors: renderMetrics.fallbackActors,
          pendingActors: renderMetrics.pendingActors,
          heroX: hero.x,
          heroZ: hero.z,
          heapGrowthBytes: performanceSummary.heapGrowthBytes,
        };
      }
      const minimapSignature = [
        snapshot.mapDiscovery.discoveredSections.join(","),
        snapshot.run.phase,
        snapshot.run.activeEncounter,
        snapshot.run.objective?.id,
        snapshot.run.objective?.current,
      ].join("|");
      const minimapChanged = minimapSignature !== this.minimapSignature;
      if (minimapChanged || this.minimapElapsed >= 0.1 || !this.minimap) {
        this.minimapElapsed %= 0.1;
        this.minimapSignature = minimapSignature;
        this.minimap = buildMinimap(snapshot, this.dungeonPack);
      }
      if (combatHudDue || minimapChanged) {
        if (combatHudDue) this.combatHudElapsed %= combatHudInterval;
        this.combatHud = buildCombatHud(snapshot, this.combatHud);
        this.onHud?.({
          combat: this.combatHud,
          dungeon: {
            id: snapshot.dungeon.id,
            name: snapshot.dungeon.name,
          },
          minimap: this.minimap,
          ui: this.uiController.state,
          uiModel: buildGameUiModel(snapshot, this.uiController.state, {
            inDungeon: true,
            system: this.options.getSystemUi?.(),
          }),
          toasts: this.toastQueue.messages,
          debug: this.debugHud,
        });
      }
    });
    return view.backend;
  }

  resize(): void {
    this.view?.resize();
  }

  dispatchUiInput(input: UiInput): void {
    this.queuedUiInputs.push(input);
  }

  private handleUiInputs(
    snapshot: GameSnapshot,
    simulation: GameSimulation,
    events: GameplayEvent[],
  ): void {
    const inputs = [
      ...(this.input?.takeUiInputs() ?? []),
      ...this.queuedUiInputs.splice(0),
    ];
    for (const input of inputs) {
      const transition = this.uiController.handle(input, this.uiModel(snapshot));
      this.input?.setContext(transition.state.open ? "menu" : "gameplay");
      for (const action of transition.externalActions ?? []) {
        this.options.onSystemAction?.(action);
      }
      if (transition.commands.length > 0) {
        const commandEvents = simulation.applyUiCommands(transition.commands);
        this.uiController.observeGameplayEvents(commandEvents);
        events.push(...commandEvents);
      }
    }
  }

  private uiModel(snapshot: GameSnapshot): UiControllerModel {
    const selected = snapshot.players.find((player) => (
      player.slot === this.uiController.state.hero
    )) ?? snapshot.players[0];
    const progress = selected.progress;
    const inventoryPage = buildInventoryPageModel(snapshot, selected.slot, {
      view: this.uiController.state.inventoryView ?? "items",
      sort: this.uiController.state.inventorySort ?? "newest",
      focusId: this.uiController.state.focusId,
      compareItemId: this.uiController.state.inventoryCompareId,
    });
    const inventoryCells = inventoryPage.view === "items"
      ? inventoryPage.cells
      : inventoryPage.recoveryCells;
    const inventoryFocus = [
      ...(["items", "recovery"] as const).map((view, index) => ({
        id: `inventory:view:${view}`,
        row: 0,
        column: index,
        enabled: true,
        group: "inventory-views",
      })),
      ...(["newest", "slot", "rarity", "item_level"] as const).map((sort, index) => ({
        id: `inventory:sort:${sort}`,
        row: 1,
        column: index,
        enabled: true,
        group: "inventory-sorts",
      })),
      ...inventoryCells.map((cell) => ({
        id: cell.focusId,
        row: 2 + Math.floor(cell.index / 6),
        column: cell.index % 6,
        enabled: cell.enabled,
        group: inventoryPage.view,
      })),
      ...(inventoryPage.selected && !inventoryPage.selected.inRecovery ? [{
        id: `inventory:salvage:${inventoryPage.selected.id}`,
        row: 7,
        column: (inventoryCells.find((cell) => cell.item?.id === inventoryPage.selected?.id)
          ?.index ?? 0) % 6,
        enabled: inventoryPage.selected.canSalvage,
        group: "inventory-actions",
      }] : []),
    ];
    const inventoryActions = Object.fromEntries([
      ...(["items", "recovery"] as const).map((view) => [
        `inventory:view:${view}`,
        { confirmLocal: { type: "set_inventory_view" as const, view } },
      ] as const),
      ...(["newest", "slot", "rarity", "item_level"] as const).map((sort) => [
        `inventory:sort:${sort}`,
        { confirmLocal: { type: "set_inventory_sort" as const, sort } },
      ] as const),
      ...progress.items.map((item) => {
        const requiredLevel = Math.max(1, item.itemLevel - 2);
        const canEquip = !item.equipped && progress.level >= requiredLevel;
        return [`inventory:item:${item.id}`, {
          confirm: canEquip ? [{
            type: "equip_item" as const,
            actor: selected.actor,
            item: item.id,
            slot: item.slot,
          }] : undefined,
          secondaryLocal: { type: "toggle_inventory_compare" as const, item: item.id },
          favorite: [{ type: "toggle_favorite" as const, actor: selected.actor, item: item.id }],
        }] as const;
      }),
      ...progress.recovery.map((item) => [`recovery:item:${item.id}`, {
        confirm: progress.items.length < 30 ? [{
          type: "recover_item" as const,
          actor: selected.actor,
          item: item.id,
        }] : undefined,
        secondaryLocal: { type: "toggle_inventory_compare" as const, item: item.id },
      }] as const),
      ...(inventoryPage.selected?.canSalvage ? [[
        `inventory:salvage:${inventoryPage.selected.id}`,
        {
          dialog: "salvage" as const,
          dialogCommands: [{
            type: "salvage_item" as const,
            actor: selected.actor,
            item: inventoryPage.selected.id,
          }],
        },
      ] as const] : []),
    ]);
    const characterActions = Object.fromEntries(([
      "might",
      "finesse",
      "vitality",
      "resolve",
    ] as const).map((attribute) => [
      `character:${attribute}`,
      {
        confirm: [{
          type: "allocate_attribute" as const,
          actor: selected.actor,
          attribute,
          amount: 1,
        }],
        secondary: [{
          type: "allocate_attribute" as const,
          actor: selected.actor,
          attribute,
          amount: Math.min(5, progress.unspentAttributes),
        }],
      },
    ]));
    const skillPage = buildSkillPageModel(snapshot, selected.slot);
    const skillFocus = [
      ...skillPage.entries.map((entry, index) => ({
        id: entry.focusId,
        row: Math.floor(index / 3),
        column: index % 3,
        enabled: entry.unlocked,
        group: "skill-library",
      })),
      ...skillPage.passives.map((entry, index) => ({
        id: entry.focusId,
        row: Math.floor(index / 2),
        column: index % 2,
        enabled: entry.unlocked,
        group: "passive-library",
      })),
      ...skillPage.slots.map((slot) => {
        const position = {
          skill_up: { row: 4, column: 1 },
          skill_right: { row: 5, column: 2 },
          skill_down: { row: 6, column: 1 },
          skill_left: { row: 5, column: 0 },
        }[slot.slot];
        return {
          id: slot.focusId,
          ...position,
          enabled: skillPage.entries.some((entry) => (
            entry.id === this.uiController.state.skillSelection
          )),
          group: "skill-loadout",
        };
      }),
      ...skillPage.passiveSlots.map((slot, index) => ({
        id: slot.focusId,
        row: 0,
        column: index,
        enabled: skillPage.passives.some((entry) => (
          entry.id === this.uiController.state.skillSelection
        )),
        group: "passive-loadout",
      })),
    ];
    const skillActions = Object.fromEntries([
      ...skillPage.entries.filter((entry) => entry.unlocked).map((entry) => [
        entry.focusId,
        {
          confirmLocal: { type: "select_skill" as const, ability: entry.id },
          secondaryDialog: entry.next && progress.unspentSkills > 0
            ? "rank_skill" as const
            : undefined,
          secondaryDialogCommands: entry.next && progress.unspentSkills > 0 ? [{
            type: "rank_up_skill" as const,
            actor: selected.actor,
            ability: entry.id,
          }] : undefined,
          secondaryDialogMessage: entry.next
            ? `${entry.name}：${Math.round(entry.current.damageMultiplier * 100)}% → ${Math.round(entry.next.damageMultiplier * 100)}%，消耗 1 技能点`
            : undefined,
        },
      ] as const),
      ...skillPage.passives.filter((entry) => entry.unlocked).map((entry) => [
        entry.focusId,
        {
          confirmLocal: { type: "select_skill" as const, ability: entry.id },
          secondaryDialog: entry.next && progress.unspentSkills > 0
            ? "rank_skill" as const
            : undefined,
          secondaryDialogCommands: entry.next && progress.unspentSkills > 0 ? [{
            type: "rank_up_skill" as const,
            actor: selected.actor,
            ability: entry.id,
          }] : undefined,
          secondaryDialogMessage: entry.next
            ? `${entry.name}：Rank ${entry.rank} → ${entry.rank + 1}，消耗 1 技能点`
            : undefined,
        },
      ] as const),
      ...skillPage.slots.map((slot) => [
        slot.focusId,
        {
          confirm: skillPage.entries.some((entry) => (
            entry.id === this.uiController.state.skillSelection
          )) ? [{
            type: "equip_ability" as const,
            actor: selected.actor,
            ability: this.uiController.state.skillSelection!,
            slot: slot.slot,
          }] : undefined,
          confirmLocal: skillPage.entries.some((entry) => (
            entry.id === this.uiController.state.skillSelection
          ))
            ? { type: "clear_skill_selection" as const }
            : undefined,
        },
      ] as const),
      ...skillPage.passiveSlots.map((slot) => [
        slot.focusId,
        {
          confirm: skillPage.passives.some((entry) => (
            entry.id === this.uiController.state.skillSelection
          )) ? [{
            type: "equip_passive" as const,
            actor: selected.actor,
            passive: this.uiController.state.skillSelection!,
            slot: slot.slot,
          }] : undefined,
          confirmLocal: skillPage.passives.some((entry) => (
            entry.id === this.uiController.state.skillSelection
          ))
            ? { type: "clear_skill_selection" as const }
            : undefined,
        },
      ] as const),
    ]);
    const forgePage = buildForgePageModel(snapshot, selected.slot, {
      focusId: this.uiController.state.focusId,
      pendingItemId: this.uiController.state.forgePendingItem,
    });
    const forgeActions = Object.fromEntries(forgePage.entries.map((entry) => [
      entry.focusId,
      {
        confirm: entry.canReinforce ? [{
          type: "reinforce_item" as const,
          actor: selected.actor,
          item: entry.id,
        }] : undefined,
        confirmLocal: entry.canReinforce
          ? { type: "mark_forge_pending" as const, item: entry.id }
          : undefined,
      },
    ]));
    const systemPage = buildSystemPageModel(this.options.getSystemUi?.() ?? {
      settings: {
        hudScale: 1,
        reducedFlash: false,
        screenShake: 1,
        damageNumbers: false,
      },
      controllers: [
        { player: 1, status: "idle", message: "P1 G30 未连接" },
        { player: 2, status: "idle", message: "P2 G30 未连接" },
      ],
      saveStatus: "idle",
    });
    const systemFocus = [
      ...systemPage.controllers.map((controller, index) => ({
        id: controller.focusId,
        row: index,
        column: 0,
        enabled: controller.canConnect,
        group: "controller",
      })),
      ...systemPage.rows.map((row, index) => ({
        id: row.focusId,
        row: index + systemPage.controllers.length,
        column: 0,
        enabled: true,
        group: "accessibility",
      })),
      {
        id: systemPage.returnFocusId,
        row: systemPage.rows.length + systemPage.controllers.length,
        column: 0,
        enabled: true,
        group: "route",
      },
    ];
    const systemActions = {
      ...Object.fromEntries(systemPage.controllers.map((controller) => [
        controller.focusId,
        {
          confirmExternal: controller.canConnect
            ? { type: "connect_g30" as const, player: controller.player }
            : undefined,
        },
      ])),
      "system:hud_scale": {
        confirmExternal: { type: "adjust_hud_scale" as const, direction: 1 as const },
        secondaryExternal: { type: "adjust_hud_scale" as const, direction: -1 as const },
      },
      "system:reduced_flash": {
        confirmExternal: { type: "toggle_reduced_flash" as const },
      },
      "system:screen_shake": {
        confirmExternal: { type: "adjust_screen_shake" as const, direction: 1 as const },
        secondaryExternal: { type: "adjust_screen_shake" as const, direction: -1 as const },
      },
      "system:damage_numbers": {
        confirmExternal: { type: "toggle_damage_numbers" as const },
      },
      [systemPage.returnFocusId]: {
        confirmExternal: { type: "return_to_route" as const },
      },
    };
    return {
      heroes: snapshot.players.map((player) => player.slot),
      focus: {
        inventory: inventoryFocus,
        skills: skillFocus,
        character: [
          ...(["might", "finesse", "vitality", "resolve"] as const).map((attribute, index) => ({
            id: `character:${attribute}`,
            row: index,
            column: 0,
            enabled: progress.unspentAttributes > 0,
            group: "attributes",
          })),
          {
            id: "character:reset",
            row: 4,
            column: 0,
            enabled: false,
            group: "attributes",
          },
        ],
        forge: forgePage.entries.map(
          (entry, index) => ({
            id: entry.focusId,
            row: index,
            column: 0,
            enabled: true,
            group: "forge",
          }),
        ),
        system: systemFocus,
      },
      actions: {
        ...inventoryActions,
        ...characterActions,
        ...skillActions,
        ...forgeActions,
        ...systemActions,
      },
    };
  }

  dispose(): void {
    this.disposed = true;
    this.input?.dispose();
    this.input = undefined;
    this.view?.engine.stopRenderLoop();
    this.view?.dispose();
    this.view = undefined;
    this.simulation = undefined;
    this.clock.reset();
  }
}
