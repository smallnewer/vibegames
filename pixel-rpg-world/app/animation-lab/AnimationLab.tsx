"use client";

import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4, Vector3 } from "@babylonjs/core/Maths/math";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Node } from "@babylonjs/core/node";
import { Scene } from "@babylonjs/core/scene";
import "@babylonjs/loaders/glTF";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { createGameEngine } from "../../game/adapters/babylon/createGameEngine";
import {
  ACTION_LIBRARIES,
  type ActionCategory,
  type ActionLibraryId,
  type NativeActionDef,
} from "./actionCatalog";

type ActionFilter = "featured" | ActionCategory | "all";

const FILTERS: readonly { id: ActionFilter; label: string }[] = [
  { id: "featured", label: "精选" },
  { id: "melee", label: "大幅近战" },
  { id: "bow", label: "弓箭" },
  { id: "gun", label: "枪械" },
  { id: "magic", label: "远程施法" },
  { id: "all", label: "全部" },
];
const SPEEDS = [
  { value: 0.5, label: "0.5x" },
  { value: 1, label: "1x" },
] as const;

const DEFAULT_LIBRARY = ACTION_LIBRARIES[0];
const DEFAULT_ACTION = DEFAULT_LIBRARY.actions.find((action) => action.featured)!;

function actionsForFilter(actions: readonly NativeActionDef[], filter: ActionFilter) {
  if (filter === "all") return actions;
  if (filter === "featured") return actions.filter((action) => action.featured);
  return actions.filter((action) => action.category === filter);
}

const styles: Record<string, CSSProperties> = {
  shell: {
    position: "fixed",
    inset: 0,
    overflow: "hidden",
    background: "#101115",
    color: "#f8ead0",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  canvas: { width: "100%", height: "100%", display: "block", outline: "none" },
  panel: {
    position: "absolute",
    left: 24,
    top: 24,
    width: 460,
    maxHeight: "calc(100vh - 48px)",
    overflowY: "auto",
    padding: 18,
    border: "1px solid #9b6437",
    background: "rgba(18, 16, 15, 0.92)",
    boxShadow: "0 14px 40px rgba(0, 0, 0, 0.45)",
    zIndex: 2,
  },
  title: { display: "block", marginBottom: 8, fontSize: 20 },
  status: { display: "block", marginBottom: 12, color: "#e8a55e" },
  row: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  actions: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  button: {
    padding: "8px 10px",
    border: "1px solid #70472c",
    background: "#2a211b",
    color: "#f8ead0",
    cursor: "pointer",
  },
  actionButton: {
    minHeight: 58,
    padding: "8px 10px",
    border: "1px solid #70472c",
    background: "#2a211b",
    color: "#f8ead0",
    cursor: "pointer",
    textAlign: "left",
  },
  actionName: { display: "block", marginTop: 4, color: "#a99f91", fontSize: 11 },
  hint: { display: "block", marginTop: 12, color: "#a99f91" },
  error: { display: "block", marginTop: 12, color: "#ff756d" },
};

interface LoadedLibrary {
  readonly roots: readonly Node[];
  readonly groups: ReadonlyMap<string, AnimationGroup>;
}

// 原生 Demo 骨架只负责选片，确认后再单独验证正式模型重定向。
export default function AnimationLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playRef = useRef<(library: ActionLibraryId, name: string, speed: number) => void>(() => {});
  const [backend, setBackend] = useState("启动中");
  const [libraryId, setLibraryId] = useState<ActionLibraryId>(DEFAULT_LIBRARY.id);
  const [filter, setFilter] = useState<ActionFilter>("featured");
  const [speed, setSpeed] = useState(1);
  const [active, setActive] = useState(DEFAULT_ACTION.name);
  const [error, setError] = useState("");

  const library = ACTION_LIBRARIES.find((item) => item.id === libraryId)!;
  const visibleActions = useMemo(
    () => actionsForFilter(library.actions, filter),
    [library, filter],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let scene: Scene | undefined;
    let engine: Awaited<ReturnType<typeof createGameEngine>>["engine"] | undefined;
    let removeResize = () => {};

    const start = async () => {
      const result = await createGameEngine(canvas);
      engine = result.engine;
      if (disposed) {
        engine.dispose();
        return;
      }
      setBackend(result.backend.toUpperCase());
      scene = new Scene(engine);
      scene.clearColor = new Color4(0.055, 0.06, 0.075, 1);

      const camera = new ArcRotateCamera(
        "animation-lab-camera",
        Math.PI / 2,
        1.18,
        6.2,
        new Vector3(1.15, 1.1, 0),
        scene,
      );
      camera.lowerRadiusLimit = 3.2;
      camera.upperRadiusLimit = 9;
      camera.attachControl(canvas, true);

      const skyLight = new HemisphericLight("animation-lab-sky", new Vector3(0, 1, 0), scene);
      skyLight.intensity = 1.25;
      const keyLight = new DirectionalLight(
        "animation-lab-key",
        new Vector3(-0.5, -1, 0.35),
        scene,
      );
      keyLight.position = new Vector3(4, 7, -4);
      keyLight.intensity = 2.2;

      const ground = MeshBuilder.CreateGround("animation-lab-ground", { width: 12, height: 12 }, scene);
      const groundMaterial = new StandardMaterial("animation-lab-ground-material", scene);
      groundMaterial.diffuseColor = new Color3(0.13, 0.11, 0.1);
      groundMaterial.specularColor = Color3.Black();
      ground.material = groundMaterial;
      ground.receiveShadows = true;

      // 两套资源各自保留原生模型与骨架，不做任何重定向。
      const containers = await Promise.all(
        ACTION_LIBRARIES.map((item) => LoadAssetContainerAsync(item.url, scene!)),
      );
      if (disposed) {
        for (const container of containers) container.dispose();
        return;
      }

      const shadows = new ShadowGenerator(1024, keyLight);
      const loaded = new Map<ActionLibraryId, LoadedLibrary>();
      ACTION_LIBRARIES.forEach((item, index) => {
        const container = containers[index];
        container.addAllToScene();
        for (const mesh of container.meshes) shadows.addShadowCaster(mesh);
        for (const root of container.rootNodes) root.setEnabled(false);
        loaded.set(item.id, {
          roots: container.rootNodes,
          groups: new Map(container.animationGroups.map((group) => [group.name, group])),
        });
      });

      const allGroups = [...loaded.values()].flatMap((item) => [...item.groups.values()]);
      const play = (wantedLibrary: ActionLibraryId, name: string, wantedSpeed: number) => {
        const selected = loaded.get(wantedLibrary);
        const wanted = selected?.groups.get(name);
        if (!selected || !wanted) {
          setError(`资产缺少动作：${wantedLibrary}/${name}`);
          return;
        }
        for (const [id, item] of loaded) {
          for (const root of item.roots) root.setEnabled(id === wantedLibrary);
        }
        for (const group of allGroups) group.stop();
        setError("");
        setActive(name);
        wanted.reset();
        wanted.start(true, wantedSpeed);
      };
      playRef.current = play;
      play(DEFAULT_LIBRARY.id, DEFAULT_ACTION.name, 1);

      const onResize = () => engine?.resize();
      window.addEventListener("resize", onResize);
      removeResize = () => window.removeEventListener("resize", onResize);
      engine.runRenderLoop(() => scene?.render());
    };

    start().catch((source: unknown) => {
      if (!disposed) setError(source instanceof Error ? source.message : String(source));
    });

    return () => {
      disposed = true;
      playRef.current = () => {};
      removeResize();
      scene?.dispose();
      engine?.dispose();
    };
  }, []);

  const chooseLibrary = (nextId: ActionLibraryId) => {
    const nextLibrary = ACTION_LIBRARIES.find((item) => item.id === nextId)!;
    const nextFilter = actionsForFilter(nextLibrary.actions, filter).length > 0 ? filter : "featured";
    const nextAction = actionsForFilter(nextLibrary.actions, nextFilter)[0];
    setLibraryId(nextId);
    setFilter(nextFilter);
    setActive(nextAction.name);
    playRef.current(nextId, nextAction.name, speed);
  };

  const chooseFilter = (nextFilter: ActionFilter) => {
    const nextActions = actionsForFilter(library.actions, nextFilter);
    if (nextActions.length === 0) return;
    setFilter(nextFilter);
    if (!nextActions.some((action) => action.name === active)) {
      setActive(nextActions[0].name);
      playRef.current(libraryId, nextActions[0].name, speed);
    }
  };

  const chooseSpeed = (nextSpeed: number) => {
    setSpeed(nextSpeed);
    playRef.current(libraryId, active, nextSpeed);
  };

  return (
    <main style={styles.shell}>
      <style>{`
        @media (max-width: 760px) {
          .native-action-panel {
            left: 12px !important;
            top: 12px !important;
            width: 300px !important;
            max-height: calc(100vh - 24px) !important;
          }
          .native-action-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      <canvas ref={canvasRef} style={styles.canvas} data-testid="animation-lab-canvas" tabIndex={0} />
      <section className="native-action-panel" style={styles.panel} aria-label="原生动作选片">
        <strong style={styles.title}>全部 75 个原生动作</strong>
        <span style={styles.status} data-testid="animation-lab-status">
          Babylon {backend} · 当前：{active} · {speed}x
        </span>

        <div style={styles.row}>
          {ACTION_LIBRARIES.map((item) => (
            <button
              key={item.id}
              type="button"
              style={{ ...styles.button, borderColor: libraryId === item.id ? "#52e8f2" : "#70472c" }}
              data-testid={`library-${item.id}`}
              onClick={() => chooseLibrary(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div style={styles.row}>
          {FILTERS.map((item) => {
            const count = actionsForFilter(library.actions, item.id).length;
            return (
              <button
                key={item.id}
                type="button"
                disabled={count === 0}
                style={{
                  ...styles.button,
                  borderColor: filter === item.id ? "#52e8f2" : "#70472c",
                  opacity: count === 0 ? 0.4 : 1,
                  cursor: count === 0 ? "not-allowed" : "pointer",
                }}
                data-testid={`filter-${item.id}`}
                onClick={() => chooseFilter(item.id)}
              >
                {item.label} {count}
              </button>
            );
          })}
        </div>

        <div style={styles.row}>
          {SPEEDS.map((item) => (
            <button
              key={item.value}
              type="button"
              style={{
                ...styles.button,
                borderColor: speed === item.value ? "#52e8f2" : "#70472c",
              }}
              data-testid={`speed-${item.value}`}
              onClick={() => chooseSpeed(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="native-action-grid" style={styles.actions}>
          {visibleActions.map((action) => (
            <button
              key={action.id}
              type="button"
              style={{
                ...styles.actionButton,
                borderColor: active === action.name ? "#52e8f2" : "#70472c",
              }}
              data-testid={`action-${action.id}`}
              onClick={() => playRef.current(libraryId, action.name, speed)}
            >
              <strong>{action.id} · {action.label}</strong>
              <small style={styles.actionName}>{action.name}</small>
            </button>
          ))}
        </div>

        <small style={styles.hint}>
          当前使用 {library.source} 原生 Demo 骨架；点击循环播放，选好后直接告诉我编号。
        </small>
        {error && <strong style={styles.error} data-testid="animation-lab-error">{error}</strong>}
      </section>
    </main>
  );
}
