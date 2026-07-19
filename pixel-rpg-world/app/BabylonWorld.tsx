"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { GameHost, type HudSnapshot } from "../game/host/GameHost";
import { DUNGEON_PACK_DATA } from "../game/content/generated/dungeonPacks";
import {
  connectG30,
  type G30Controller,
  type G30State,
} from "../game/adapters/browser/G30WebHid";
import { GameHud } from "./game-ui/GameHud";
import { GameMenu } from "./game-ui/menu/GameMenu";
import type { UiInput } from "../game/ui/UiInput";
import {
  GameSessionController,
  type GameSessionState,
} from "../game/host/GameSessionController";
import {
  isWorldDungeonId,
  worldRouteNodes,
  type WorldNodeDef,
} from "../game/session/WorldProgress";
import { WorldRoute } from "./game-ui/WorldRoute";
import { IndexedDbSaveRepository } from "../game/adapters/browser/IndexedDbSaveRepository";
import { MemorySaveRepository } from "../game/adapters/browser/MemorySaveRepository";
import {
  applySystemSettingsAction,
  type ControllerConnectionStatus,
  type ControllerPlayer,
  type ControllerSlotContext,
} from "../game/ui/SystemPageModel";

const FORMAL_DUNGEONS = DUNGEON_PACK_DATA.filter((pack) => pack.map.mode === "production");
function g30ErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "连接 G30 失败。";
}

const INITIAL_G30_SLOTS: readonly [ControllerSlotContext, ControllerSlotContext] = [
  { player: 1, status: "idle", message: "P1 G30 未连接" },
  { player: 2, status: "idle", message: "P2 G30 未连接" },
];

export default function BabylonWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const g30StateRefs = useRef<[G30State | null, G30State | null]>([null, null]);
  const g30ControllerRefs = useRef<[G30Controller | null, G30Controller | null]>([null, null]);
  const hostRef = useRef<GameHost | null>(null);
  const g30PresentationRef = useRef(INITIAL_G30_SLOTS);
  const sessionControllerRef = useRef(new GameSessionController());
  const mountedRef = useRef(false);
  const [backend, setBackend] = useState("启动中");
  const [debug, setDebug] = useState(false);
  const [hud, setHud] = useState<HudSnapshot>();
  const [g30Slots, setG30Slots] = useState(INITIAL_G30_SLOTS);
  const [session, setSession] = useState<GameSessionState>(sessionControllerRef.current.state);
  const [localPlayerCount, setLocalPlayerCount] = useState<1 | 2>(1);

  const updateControllerSlot = useCallback((
    player: ControllerPlayer,
    status: ControllerConnectionStatus,
    message: string,
  ) => {
    const index = player - 1;
    const next = [...g30PresentationRef.current] as [ControllerSlotContext, ControllerSlotContext];
    next[index] = { player, status, message };
    g30PresentationRef.current = next;
    setG30Slots(next);
  }, []);

  const connectController = useCallback(async (
    player: ControllerPlayer,
    request: boolean,
  ) => {
    const index = player - 1;
    if (!("hid" in navigator)) {
      updateControllerSlot(player, "unsupported", `P${player} · 当前环境不支持 WebHID`);
      return;
    }
    if (request) {
      updateControllerSlot(player, "connecting", `请选择 P${player} 的 THUNDEROBOT G30`);
    }
    try {
      g30ControllerRefs.current[index]?.disconnect();
      g30ControllerRefs.current[index] = null;
      g30StateRefs.current[index] = null;
      const controller = await connectG30({
        request,
        excludeDevices: g30ControllerRefs.current.flatMap((value, slot) => (
          slot !== index && value ? [value.device] : []
        )),
        onInput: (state) => { g30StateRefs.current[index] = state; },
      });
      if (!mountedRef.current) {
        controller.disconnect();
        return;
      }
      g30ControllerRefs.current[index] = controller;
      updateControllerSlot(player, "connected", `P${player} G30 已连接 · 左摇杆移动`);
    } catch (error) {
      if (!mountedRef.current) return;
      const message = g30ErrorMessage(error);
      if (!request && message.includes("尚未获得 WebHID 授权")) {
        updateControllerSlot(player, "idle", `P${player} G30 未连接`);
        return;
      }
      updateControllerSlot(
        player,
        message.includes("不支持 WebHID") ? "unsupported" : "error",
        message,
      );
    }
  }, [updateControllerSlot]);

  useEffect(() => {
    mountedRef.current = true;
    queueMicrotask(() => {
      if (!mountedRef.current) return;
      void connectController(1, false).then(() => {
        if (mountedRef.current) return connectController(2, false);
      });
    });
    return () => {
      mountedRef.current = false;
      for (const controller of g30ControllerRefs.current) controller?.disconnect();
      g30ControllerRefs.current = [null, null];
      g30StateRefs.current = [null, null];
    };
  }, [connectController]);

  useEffect(() => {
    let cancelled = false;
    const controller = sessionControllerRef.current;
    controller.setRepository("indexedDB" in window
      ? new IndexedDbSaveRepository(window.indexedDB)
      : new MemorySaveRepository());
    const unsubscribe = controller.subscribe((state) => {
      if (!cancelled) setSession({ ...state });
    });
    void controller.start().then(() => {
      if (cancelled) return;
      const query = new URLSearchParams(window.location.search);
      const debugMode = query.get("debug") === "1";
      setLocalPlayerCount(query.get("players") === "2" ? 2 : 1);
      setDebug(debugMode);
      const requested = query.get("dungeon");
      if (!debugMode || !requested) return;
      const dungeonId = requested === "ice" ? "dungeon.ice_room"
        : requested === "lava" ? "dungeon.lava_showcase"
          : requested === "production" ? "dungeon.production_foundation" : requested;
      if (isWorldDungeonId(dungeonId)) {
        controller.enterDungeon(dungeonId, "normal", { debugOverride: true });
      } else {
        controller.enterDebugDungeon(dungeonId);
      }
    });
    const onVisibility = () => {
      if (document.visibilityState === "hidden") void controller.flush().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || session.mode !== "dungeon" || !session.dungeonId) {
      setHud(undefined);
      return;
    }
    const query = new URLSearchParams(window.location.search);
    const debugMode = query.get("debug") === "1";
    const enginePreference = query.get("renderer") === "webgl2" ? "webgl2" : "auto";
    const requestedPlayers = Number(query.get("players") ?? 1);
    const playerCount = Number.isInteger(requestedPlayers)
      && requestedPlayers >= 1
      && requestedPlayers <= 4
      ? requestedPlayers : 1;
    let host: GameHost;
    try {
      host = new GameHost(canvas, enginePreference, setHud, {
        benchmark: query.get("benchmark") === "1",
        debug: debugMode,
        dungeonId: session.dungeonId,
        playerCount,
        heroSaves: sessionControllerRef.current.heroSaves(playerCount),
        readG30States: [
          () => g30StateRefs.current[0],
          () => g30StateRefs.current[1],
        ],
        getSystemUi: () => {
          const current = sessionControllerRef.current.state;
          return {
            settings: current.profile.settings,
            controllers: g30PresentationRef.current,
            saveStatus: current.saveStatus,
            saveError: current.saveError,
          };
        },
        onSystemAction: (action) => {
          if (action.type === "connect_g30") {
            void connectController(action.player, true);
            return;
          }
          const controller = sessionControllerRef.current;
          if (action.type === "return_to_route") {
            setSession({ ...controller.exitDungeon() });
            return;
          }
          const nextSettings = applySystemSettingsAction(controller.state.profile.settings, action);
          setSession({ ...controller.updateSettings(nextSettings) });
        },
        onProgressChanged: (snapshot, events) => {
          sessionControllerRef.current.captureSnapshot(snapshot, events);
        },
        onDungeonCompleted: (dungeonId, difficulty) => {
          if (!mountedRef.current || !isWorldDungeonId(dungeonId)) return;
          const next = sessionControllerRef.current.completeDungeon(dungeonId, difficulty);
          setSession({ ...next });
        },
        onPartyWiped: () => {
          if (!mountedRef.current) return;
          setSession({ ...sessionControllerRef.current.exitDungeon() });
        },
      });
    } catch (error) {
      queueMicrotask(() => {
        setBackend(`启动失败：${error instanceof Error ? error.message : "地下城配置错误"}`);
      });
      return;
    }
    let disposed = false;
    hostRef.current = host;
    const onResize = () => host.resize();
    void host.start().then((value) => {
      if (!disposed && value) setBackend(value.toUpperCase());
    }).catch((error: unknown) => {
      if (!disposed) setBackend(`启动失败：${error instanceof Error ? error.message : String(error)}`);
    });
    window.addEventListener("resize", onResize);
    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      host.dispose();
      if (hostRef.current === host) hostRef.current = null;
    };
  }, [connectController, session.dungeonId, session.mode]);

  const selectedDungeon = DUNGEON_PACK_DATA.find((pack) => (
    pack.id === (session.dungeonId ?? "dungeon.production_foundation")
  ));
  const artProfile = selectedDungeon?.visual.profile ?? "foundation";
  const changeDungeon = (dungeonId: string) => {
    const next = isWorldDungeonId(dungeonId)
      ? sessionControllerRef.current.enterDungeon(dungeonId, "normal", { debugOverride: true })
      : sessionControllerRef.current.enterDebugDungeon(dungeonId);
    setSession({ ...next });
  };
  const enterNode = (node: WorldNodeDef) => {
    const next = sessionControllerRef.current.enterDungeon(node.id);
    setSession({ ...next });
  };
  const changeLocalPlayerCount = (count: 1 | 2) => {
    setLocalPlayerCount(count);
    const url = new URL(window.location.href);
    if (count === 1) url.searchParams.delete("players");
    else url.searchParams.set("players", String(count));
    window.history.replaceState(null, "", url);
  };
  return (
    <main
      className="game-shell"
      data-art-profile={artProfile}
      data-hud-scale-tier={session.profile.settings.hudScale >= 1.5 ? "large" : "normal"}
      data-reduced-flash={session.profile.settings.reducedFlash ? "true" : undefined}
      style={{ "--hud-scale": session.profile.settings.hudScale } as CSSProperties}
    >
      <canvas ref={canvasRef} className="game-canvas" data-testid="game-canvas" hidden={session.mode !== "dungeon"} />
      <div className="vignette" />
      {session.mode === "loading" && <strong className="route-loading">正在读取旅程…</strong>}
      {session.mode === "route" && (
        <WorldRoute
          nodes={worldRouteNodes(session.progress)}
          echoUnlocked={session.progress.echoUnlocked}
          playerCount={localPlayerCount}
          controllers={g30Slots}
          onPlayerCountChange={changeLocalPlayerCount}
          onConnectController={(player) => { void connectController(player, true); }}
          onEnter={enterNode}
        />
      )}
      {hud && <GameHud model={hud.combat} minimap={hud.minimap} toasts={hud.toasts} />}
      {hud && (
        <GameMenu
          state={hud.ui}
          model={hud.uiModel}
          dispatch={(input: UiInput) => hostRef.current?.dispatchUiInput(input)}
        />
      )}
      {hud?.debug.assetError && (
        <strong className="asset-error">资源加载失败：{hud.debug.assetError}</strong>
      )}
      {session.saveStatus === "error" && (
        <strong className="save-error">存档失败：{session.saveError ?? "请稍后重试"}</strong>
      )}
      {debug && hud && (
        <DebugPanel
          hud={hud}
          backend={backend}
          artProfile={artProfile}
          onDungeonChange={changeDungeon}
        />
      )}
    </main>
  );
}

function DebugPanel({
  hud,
  backend,
  artProfile,
  onDungeonChange,
}: {
  readonly hud: HudSnapshot;
  readonly backend: string;
  readonly artProfile: string;
  readonly onDungeonChange: (id: string) => void;
}) {
  const value = hud.debug;
  return (
    <aside className="debug-panel" data-testid="debug-panel">
      <strong data-testid="benchmark-mode">
        {value.benchmark ? "BENCHMARK · 4P × 30E" : "DEBUG"}
      </strong>
      <span>{hud.dungeon.name} · {artProfile} · {backend}</span>
      <select
        aria-label="切换地下城"
        value={hud.dungeon.id}
        onChange={(event) => onDungeonChange(event.target.value)}
      >
        {FORMAL_DUNGEONS.map((dungeon) => (
          <option key={dungeon.id} value={dungeon.id}>{dungeon.name}</option>
        ))}
      </select>
      <div>
        <span data-testid="party-count">玩家 {value.partyCount}</span>
        <span data-testid="enemy-count">敌人 {value.enemyCount}</span>
        <span data-testid="projectile-count">弹道 {value.projectileCount}</span>
        <span data-testid="vfx-count">VFX {value.vfxCount}</span>
        <span data-testid="frame-p95">帧 P95 {value.frameP95.toFixed(2)} ms</span>
        <span data-testid="workload-p95">工作 P95 {value.workloadP95.toFixed(2)} ms</span>
        <span data-testid="logic-ms">逻辑 {value.logicMs.toFixed(2)} ms</span>
        <span data-testid="render-ms">渲染 {value.renderMs.toFixed(2)} ms</span>
        <span data-testid="gpu-ms">GPU {value.gpuMs?.toFixed(2) ?? "N/A"} ms</span>
        <span data-testid="draw-calls">Draw {value.drawCalls}</span>
        <span data-testid="triangles">三角形 {value.triangles}</span>
        <span data-testid="asset-instances">实例 {value.assetInstances}</span>
        <span data-testid="hero-position">坐标 {value.heroX.toFixed(1)},{value.heroZ.toFixed(1)}</span>
        <span data-testid="navigation-state">导航 {value.navigationReady ? "READY" : "WAIT"}</span>
      </div>
    </aside>
  );
}
