"use client";

import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4, Vector3 } from "@babylonjs/core/Maths/math";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Scene } from "@babylonjs/core/scene";
import { useEffect, useMemo, useRef, useState } from "react";
import { BabylonActorLayer } from "../../game/adapters/babylon/BabylonActorLayer";
import { BabylonAssetStore } from "../../game/adapters/babylon/BabylonAssetStore";
import { createGameEngine } from "../../game/adapters/babylon/createGameEngine";
import { ActorStatusVfx } from "../../game/adapters/babylon/art/ActorStatusVfx";
import { createArtPostProcess } from "../../game/adapters/babylon/art/ArtPostProcess";
import {
  MeleeSlashVfx,
  type MeleeVfxStyle,
} from "../../game/adapters/babylon/art/MeleeSlashVfx";
import type { ItemRarity } from "../../game/content/Definitions";
import { ACTOR_VISUAL_DATA } from "../../game/content/generated/actorVisuals";
import {
  MELEE_WEAPON_CATALOG,
  type MeleeWeaponCatalogEntry,
} from "../../game/content/weapons/MeleeWeaponCatalog";
import type { ActorSnapshot, StatusVisualSnapshot } from "../../game/core/GameSnapshot";
import { STATUS_VFX_RECIPES } from "../../game/adapters/babylon/art/StatusVfxRegistry";

const RARITY_LABEL: Record<ItemRarity, string> = {
  normal: "普通",
  magic: "魔法",
  rare: "稀有",
  unique: "暗金",
};

const STATUS_LABEL: Record<string, string> = {
  "vfx.status.frozen": "冰冻减速",
  "vfx.status.poisoned": "中毒",
  "vfx.status.burning": "着火",
  "vfx.status.stunned": "眩晕",
  "vfx.status.shrunk": "缩小",
  "vfx.status.enlarged": "放大",
};

const DEFAULT_WEAPON = MELEE_WEAPON_CATALOG.find((weapon) => (
  weapon.id === "item.ember_blade"
)) ?? MELEE_WEAPON_CATALOG[0];
const ATTACK_DURATION = 0.58;
const DEFAULT_SLASH_EVENT_AT = 0.42;

const DEMO_ACTOR: ActorSnapshot = {
  id: 1,
  archetype: "actor.hero.ember",
  name: "特效试装员",
  role: "hero",
  visualId: "visual.actor.ember_hero",
  faction: "hero",
  action: "idle",
  actionDuration: 0,
  locomotion: "idle",
  x: 0,
  z: 0,
  previousX: 0,
  previousZ: 0,
  facingX: 0,
  facingZ: 1,
  health: 100,
  maxHealth: 100,
  playerSlot: 1,
  statuses: [],
  statusVisuals: [],
  equipmentVisuals: [],
};

export default function EffectsLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const weaponRef = useRef<MeleeWeaponCatalogEntry>(DEFAULT_WEAPON);
  const statusRef = useRef<StatusVisualSnapshot[]>([]);
  const styleRef = useRef<MeleeVfxStyle>("v2");
  const [weaponId, setWeaponId] = useState<string>(DEFAULT_WEAPON.id);
  const [statusVisual, setStatusVisual] = useState("");
  const [vfxStyle, setVfxStyle] = useState<MeleeVfxStyle>("v2");
  const [backend, setBackend] = useState("启动中");
  const [error, setError] = useState("");
  const selectedWeapon = useMemo(
    () => MELEE_WEAPON_CATALOG.find((weapon) => weapon.id === weaponId)!,
    [weaponId],
  );

  useEffect(() => {
    weaponRef.current = selectedWeapon;
  }, [selectedWeapon]);

  useEffect(() => {
    statusRef.current = statusVisual ? [{ id: statusVisual, visual: statusVisual }] : [];
  }, [statusVisual]);

  useEffect(() => {
    styleRef.current = vfxStyle;
  }, [vfxStyle]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let scene: Scene | undefined;
    let engine: Awaited<ReturnType<typeof createGameEngine>>["engine"] | undefined;
    let assetStore: BabylonAssetStore | undefined;
    let actorLayer: BabylonActorLayer | undefined;
    let slashVfx: MeleeSlashVfx | undefined;
    let statusVfx: ActorStatusVfx | undefined;
    let postProcess: ReturnType<typeof createArtPostProcess> | undefined;

    const start = async () => {
      const preference = new URLSearchParams(window.location.search).get("renderer") === "webgl2"
        ? "webgl2"
        : "auto";
      const result = await createGameEngine(canvas, preference);
      engine = result.engine;
      if (disposed) return engine.dispose();
      setBackend(result.backend.toUpperCase());
      scene = new Scene(engine);
      scene.clearColor = new Color4(0.025, 0.024, 0.035, 1);

      const camera = new ArcRotateCamera(
        "effects-lab-camera",
        Math.PI / 2,
        1.1,
        5.8,
        new Vector3(0, 1.05, 0),
        scene,
      );
      camera.attachControl(canvas, true);
      camera.lowerRadiusLimit = 3.8;
      camera.upperRadiusLimit = 8;
      const sky = new HemisphericLight("effects-lab-sky", new Vector3(0, 1, 0), scene);
      sky.intensity = 1.25;
      const key = new DirectionalLight("effects-lab-key", new Vector3(-0.5, -1, 0.45), scene);
      key.position.set(4, 7, -5);
      key.intensity = 2.4;

      const ground = MeshBuilder.CreateGround("effects-lab-ground", { width: 12, height: 12 }, scene);
      const groundMaterial = new StandardMaterial("effects-lab-ground-material", scene);
      groundMaterial.diffuseColor = new Color3(0.1, 0.085, 0.09);
      groundMaterial.specularColor = Color3.Black();
      ground.material = groundMaterial;

      postProcess = createArtPostProcess(scene, camera);
      postProcess.setEnabled(true);
      assetStore = new BabylonAssetStore(scene);
      actorLayer = new BabylonActorLayer(scene, assetStore, ACTOR_VISUAL_DATA, setError);
      slashVfx = new MeleeSlashVfx(scene);
      statusVfx = new ActorStatusVfx(scene);
      const actor = actorLayer.getOrCreate(DEMO_ACTOR, "ember", {
        stone: "#5a2a21",
        bone: "#d0a779",
        crystal: "#ff8b38",
        emissive: "#71230e",
        projectile: "#ffb14c",
      });
      actor.root.position.set(0, 0, 0);

      let elapsed = 0;
      let attacking = false;
      let attackElapsed = 0;
      let slashEventAt = DEFAULT_SLASH_EVENT_AT;
      let slashPlayed = false;
      let equipped = "";
      let appliedStyle: MeleeVfxStyle = "v2";
      statusVfx.setStyle(appliedStyle);
      const onResize = () => engine?.resize();
      window.addEventListener("resize", onResize);
      engine.runRenderLoop(() => {
        if (!scene || !actorLayer || !slashVfx || !statusVfx) return;
        const delta = Math.min(engine!.getDeltaTime() / 1000, 0.05);
        elapsed += delta;
        if (appliedStyle !== styleRef.current) {
          appliedStyle = styleRef.current;
          statusVfx.setStyle(appliedStyle);
        }
        const weapon = weaponRef.current;
        if (equipped !== weapon.visual) {
          actorLayer.setEquipment(1, [{ slot: "melee", visual: weapon.visual }]);
          equipped = weapon.visual;
        }
        const attackWindow = elapsed % 1.8 < ATTACK_DURATION;
        if (attackWindow && !attacking) {
          const playback = actorLayer.setAction(1, "melee", ATTACK_DURATION, "idle");
          slashEventAt = playback?.events.find((event) => event.id === "slash")?.at
            ?? DEFAULT_SLASH_EVENT_AT;
          attackElapsed = 0;
          slashPlayed = false;
        } else if (!attackWindow && attacking) {
          actorLayer.setAction(1, "idle", 0, "idle");
        }
        if (attackWindow) {
          attackElapsed += delta;
          if (!slashPlayed && attackElapsed / ATTACK_DURATION >= slashEventAt) {
            slashVfx.play(weapon.slashVisual, 0, 0, 0, 1, appliedStyle);
            slashPlayed = true;
          }
        }
        attacking = attackWindow;
        statusVfx.sync([{
          actorId: 1,
          root: actor.root,
          meshes: actor.hitMeshes,
          statuses: statusRef.current,
        }]);
        slashVfx.update(delta);
        statusVfx.update(delta);
        scene.render();
      });
      return () => window.removeEventListener("resize", onResize);
    };

    let removeResize = () => {};
    start().then((remove) => { if (remove) removeResize = remove; }).catch((source: unknown) => {
      if (!disposed) setError(source instanceof Error ? source.message : String(source));
    });
    return () => {
      disposed = true;
      removeResize();
      statusVfx?.dispose();
      slashVfx?.dispose();
      actorLayer?.dispose();
      assetStore?.dispose();
      postProcess?.dispose();
      scene?.dispose();
      engine?.dispose();
    };
  }, []);

  return (
    <main className="effects-lab-shell">
      <canvas ref={canvasRef} className="effects-lab-canvas" data-testid="effects-lab-canvas" />
      <section className="effects-lab-panel">
        <div className="effects-lab-heading">
          <div>
            <strong>近战武器与状态特效验收台</strong>
            <small>正式模型 · 正式挂点 · 正式 VFX 模块</small>
          </div>
          <span>{backend}</span>
        </div>
        <div className="effects-lab-mode" aria-label="特效版本">
          <button
            type="button"
            data-active={vfxStyle === "legacy"}
            onClick={() => setVfxStyle("legacy")}
          >旧版占位</button>
          <button
            type="button"
            data-active={vfxStyle === "v2"}
            onClick={() => setVfxStyle("v2")}
          >V2 返工</button>
          <small>动作事件点：U41 42% · U42 44% · 冰/火/毒材质特效</small>
        </div>
        <div className="effects-lab-selected">
          <b>{selectedWeapon.name}</b>
          <span className={`rarity-${selectedWeapon.rarity}`}>{RARITY_LABEL[selectedWeapon.rarity]}</span>
          <em>{selectedWeapon.family} · {selectedWeapon.attackTag}</em>
        </div>
        <div className="effects-lab-weapons">
          {(["blade", "sword", "axe", "hammer"] as const).map((family) => (
            <div key={family}>
              <label>{family}</label>
              {MELEE_WEAPON_CATALOG.filter((weapon) => weapon.family === family).map((weapon) => (
                <button
                  key={weapon.id}
                  type="button"
                  data-active={weapon.id === weaponId}
                  data-rarity={weapon.rarity}
                  onClick={() => setWeaponId(weapon.id)}
                >
                  <span>{weapon.name}</span>
                  <small>{RARITY_LABEL[weapon.rarity]} · {weapon.attackTag}</small>
                </button>
              ))}
            </div>
          ))}
        </div>
        <label className="effects-lab-status-title">受击状态</label>
        <div className="effects-lab-statuses">
          <button type="button" data-active={!statusVisual} onClick={() => setStatusVisual("")}>无状态</button>
          {Object.keys(STATUS_VFX_RECIPES).map((visual) => (
            <button
              key={visual}
              type="button"
              data-active={visual === statusVisual}
              onClick={() => setStatusVisual(visual)}
            >{STATUS_LABEL[visual]}</button>
          ))}
        </div>
        {error && <p className="effects-lab-error">{error}</p>}
      </section>
      <style>{`
        .effects-lab-shell{position:fixed;inset:0;overflow:hidden;background:#08080d;color:#f5ead7;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.effects-lab-canvas{width:100%;height:100%;display:block;outline:none}.effects-lab-panel{position:absolute;left:20px;top:20px;width:min(520px,calc(100vw - 40px));max-height:calc(100vh - 40px);overflow:auto;padding:16px;border:1px solid #5e526e;background:rgba(15,14,21,.92);box-shadow:0 18px 55px #0009}.effects-lab-heading{display:flex;justify-content:space-between;gap:12px}.effects-lab-heading strong{display:block;font-size:18px}.effects-lab-heading small{display:block;color:#968fa1;margin-top:5px}.effects-lab-heading>span{color:#7de8ff}.effects-lab-mode{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:12px}.effects-lab-mode button{border:1px solid #443c50;background:#24202b;color:#eee2d1;padding:8px;cursor:pointer}.effects-lab-mode button[data-active=true]{border-color:#64eaff;background:#17353d;box-shadow:inset 0 0 16px #27dcff30}.effects-lab-mode small{grid-column:1/-1;color:#b8a8c1;text-align:center}.effects-lab-selected{display:flex;align-items:center;gap:9px;margin:14px 0;padding:10px;border:1px solid #3b3645;background:#211e29}.effects-lab-selected em{margin-left:auto;color:#9890a4;font-size:11px;font-style:normal}.effects-lab-selected span{font-size:11px}.rarity-normal{color:#d6dde0}.rarity-magic{color:#65dfff}.rarity-rare{color:#c57bff}.rarity-unique{color:#ffad42}.effects-lab-weapons{display:grid;grid-template-columns:1fr 1fr;gap:10px}.effects-lab-weapons>div{display:grid;grid-template-columns:1fr 1fr;gap:6px}.effects-lab-weapons label{grid-column:1/-1;color:#8f859b;font-size:11px;text-transform:uppercase}.effects-lab-weapons button,.effects-lab-statuses button{border:1px solid #443c50;background:#24202b;color:#eee2d1;padding:7px;text-align:left;cursor:pointer}.effects-lab-weapons button[data-active=true],.effects-lab-statuses button[data-active=true]{border-color:#ffd26d;background:#3a2d28;box-shadow:inset 0 0 12px #ffac3330}.effects-lab-weapons button[data-rarity=magic]{border-left:3px solid #55dfff}.effects-lab-weapons button[data-rarity=rare]{border-left:3px solid #bd62ff}.effects-lab-weapons button[data-rarity=unique]{border-left:3px solid #ff9f32}.effects-lab-weapons button span,.effects-lab-weapons button small{display:block}.effects-lab-weapons button small{margin-top:3px;color:#8f8898;font-size:9px}.effects-lab-status-title{display:block;margin:15px 0 7px;color:#a79cad;font-size:11px}.effects-lab-statuses{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.effects-lab-statuses button{text-align:center}.effects-lab-error{color:#ff766f;font-size:12px}@media(max-width:760px){.effects-lab-panel{width:360px}.effects-lab-weapons{grid-template-columns:1fr}.effects-lab-statuses{grid-template-columns:repeat(2,1fr)}}
      `}</style>
    </main>
  );
}
