"use client";

import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4, Vector3 } from "@babylonjs/core/Maths/math";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";
import "@babylonjs/loaders/glTF";
import { useEffect, useRef, useState } from "react";
import { createGameEngine } from "../../game/adapters/babylon/createGameEngine";
import { createVrlabsSlash } from "./VrlabsSlash";

const SOURCE_URL = "/game-assets/action-lab/quaternius-ual1-standard.glb";
const BLOCK_URL = "/game-assets/rig-lab/ual-block-rig.glb?v=6";

function action(groups: readonly AnimationGroup[]): AnimationGroup {
  const result = groups.find((group) => group.name === "Sword_Attack");
  if (!result) throw new Error("资产缺少 Sword_Attack");
  return result;
}

// 武器只认 hand_r 的局部坐标，肩、肘、手腕仍完全由原动作驱动。
function createHandSword(scene: Scene, hand: TransformNode) {
  const steel = new StandardMaterial("rig-lab-hand-sword-steel", scene);
  steel.diffuseColor = new Color3(0.32, 0.38, 0.42);
  steel.emissiveColor = new Color3(0.03, 0.04, 0.05);
  steel.specularColor = Color3.Black();
  const bladeMaterial = new StandardMaterial("rig-lab-hand-sword-blade-material", scene);
  bladeMaterial.diffuseColor = new Color3(0.72, 0.88, 0.93);
  bladeMaterial.emissiveColor = new Color3(0.08, 0.16, 0.18);
  bladeMaterial.specularColor = Color3.Black();

  const socket = new TransformNode("rig-lab-hand-socket", scene);
  socket.parent = hand;
  const guard = MeshBuilder.CreateBox("rig-lab-hand-sword-guard", {
    width: 0.22,
    height: 0.07,
    depth: 0.065,
  }, scene);
  guard.parent = socket;
  guard.position.y = 0.035;
  guard.material = steel;
  const blade = MeshBuilder.CreateBox("rig-lab-hand-sword-blade", {
    width: 0.08,
    height: 0.68,
    depth: 0.045,
  }, scene);
  blade.parent = socket;
  blade.position.y = 0.34;
  blade.material = bladeMaterial;
  return socket;
}

// 只验证同骨架方块绑定，不依赖正式角色、战斗和输入系统。
export default function RigLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playRef = useRef<(speed: number) => void>(() => {});
  const [backend, setBackend] = useState("启动中");
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState("");
  const [slashStatus, setSlashStatus] = useState("等待资源");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let scene: Scene | undefined;
    let engine: Awaited<ReturnType<typeof createGameEngine>>["engine"] | undefined;

    const start = async () => {
      const result = await createGameEngine(canvas);
      engine = result.engine;
      if (disposed) return engine.dispose();
      setBackend(result.backend.toUpperCase());
      scene = new Scene(engine);
      scene.clearColor = new Color4(0.045, 0.052, 0.07, 1);

      const camera = new ArcRotateCamera(
        "rig-lab-camera",
        Math.PI / 2,
        1.34,
        5.7,
        new Vector3(0, 1.05, 0),
        scene,
      );
      camera.attachControl(canvas, true);
      camera.lowerRadiusLimit = 3.6;
      camera.upperRadiusLimit = 8;

      const sky = new HemisphericLight("rig-lab-sky", new Vector3(0, 1, 0), scene);
      sky.intensity = 1.35;
      const key = new DirectionalLight("rig-lab-key", new Vector3(-0.5, -1, 0.4), scene);
      key.position = new Vector3(4, 7, -4);
      key.intensity = 2;

      const ground = MeshBuilder.CreateGround("rig-lab-ground", { width: 8, height: 5 }, scene);
      const groundMaterial = new StandardMaterial("rig-lab-ground-material", scene);
      groundMaterial.diffuseColor = new Color3(0.12, 0.11, 0.1);
      groundMaterial.specularColor = Color3.Black();
      ground.material = groundMaterial;

      const [source, block] = await Promise.all([
        LoadAssetContainerAsync(SOURCE_URL, scene),
        LoadAssetContainerAsync(BLOCK_URL, scene),
      ]);
      if (disposed) {
        source.dispose();
        block.dispose();
        return;
      }
      source.addAllToScene();
      block.addAllToScene();

      const hand = source.transformNodes.find((node) => node.name === "hand_r");
      if (!hand) throw new Error("UAL 原模型缺少 hand_r");
      const handSocket = createHandSword(scene, hand);
      // 剑身原本沿手骨 +Y；固定旋转 90° 后改为沿局部 +X。
      handSocket.rotation.set(0, 0, -Math.PI / 2);

      const sourceRoot = new TransformNode("rig-lab-source-root", scene);
      sourceRoot.position.x = -1.25;
      for (const root of source.rootNodes) root.parent = sourceRoot;
      const blockRoot = new TransformNode("rig-lab-block-root", scene);
      blockRoot.position.x = 1.25;
      for (const root of block.rootNodes) root.parent = blockRoot;

      const sourceAction = action(source.animationGroups);
      const blockAction = action(block.animationGroups);
      const vrlabsSlash = await createVrlabsSlash(
        scene,
        sourceRoot,
        sourceAction,
        (message) => {
          if (!disposed) setError(message);
        },
        (message) => {
          if (!disposed) setSlashStatus(message);
        },
      );
      scene.onBeforeRenderObservable.add(() => {
        vrlabsSlash.update(result.engine.getDeltaTime() / 1000);
      });
      const play = (nextSpeed: number) => {
        sourceAction.stop();
        blockAction.stop();
        sourceAction.reset();
        blockAction.reset();
        sourceAction.start(true, nextSpeed);
        blockAction.start(true, nextSpeed);
        setSpeed(nextSpeed);
      };
      playRef.current = play;
      play(1);

      const onResize = () => engine?.resize();
      window.addEventListener("resize", onResize);
      engine.runRenderLoop(() => scene?.render());
      scene.onDisposeObservable.addOnce(() => window.removeEventListener("resize", onResize));
    };

    start().catch((source: unknown) => {
      if (!disposed) setError(source instanceof Error ? source.message : String(source));
    });
    return () => {
      disposed = true;
      playRef.current = () => {};
      scene?.dispose();
      engine?.dispose();
    };
  }, []);

  return (
    <main className="rig-lab-shell">
      <style>{`
        .rig-lab-shell { position: fixed; inset: 0; overflow: hidden; background: #0c0e13; color: #f8ead0; font-family: ui-monospace, monospace; }
        .rig-lab-canvas { width: 100%; height: 100%; display: block; outline: none; }
        .rig-lab-head { position: absolute; top: 86px; left: 50%; transform: translateX(-50%); text-align: center; padding: 12px 18px; border: 1px solid #755032; background: rgba(15, 14, 14, .88); }
        .rig-lab-head strong, .rig-lab-head span { display: block; }
        .rig-lab-head span { margin-top: 5px; color: #e8a55e; font-size: 13px; }
        .rig-lab-labels { position: absolute; left: 15%; right: 15%; bottom: 28px; display: grid; grid-template-columns: 1fr 1fr; text-align: center; font-weight: 700; }
        .rig-lab-labels span { margin: 0 auto; padding: 8px 14px; border: 1px solid #755032; background: rgba(15, 14, 14, .88); }
        .rig-lab-controls { position: absolute; right: 22px; top: 22px; display: flex; gap: 8px; }
        .rig-lab-controls button { padding: 8px 12px; border: 1px solid #755032; color: #f8ead0; background: #282018; cursor: pointer; }
        .rig-lab-controls button[data-active="true"] { border-color: #52e8f2; }
        .rig-lab-error { position: absolute; left: 22px; top: 22px; color: #ff756d; }
      `}</style>
      <canvas
        ref={canvasRef}
        className="rig-lab-canvas"
        data-testid="rig-lab-canvas"
        tabIndex={0}
      />
      <header className="rig-lab-head">
        <strong>U41 原手腕挂剑验证</strong>
        <span>Sword_Attack · {speed}x · 固定握持 90° · Babylon {backend}</span>
        <span>原资源无独立武器挂点；右侧只挂 hand_r，不改肩肘腕动作</span>
        <span>刀光诊断 · {slashStatus}</span>
      </header>
      <div className="rig-lab-controls">
        {[0.5, 1].map((value) => (
          <button
            key={value}
            type="button"
            data-active={speed === value}
            onClick={() => playRef.current(value)}
          >
            {value}x
          </button>
        ))}
      </div>
      <div className="rig-lab-labels">
        <span>方块绑定模型 · 当前肩→手修正</span>
        <span>UAL 原模型 · 原模型 hand_r 挂剑 · VRLabs MIT · FBX Mesh + Babylon Shader</span>
      </div>
      {error && <strong className="rig-lab-error">{error}</strong>}
    </main>
  );
}
