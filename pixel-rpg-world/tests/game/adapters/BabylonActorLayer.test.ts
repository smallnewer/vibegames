import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Quaternion } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { describe, expect, it, vi } from "vitest";
import {
  actorSkinUpdateInterval,
  BabylonActorLayer,
  type ActorAssetPort,
} from "../../../game/adapters/babylon/BabylonActorLayer";
import type { ActorVisualDef } from "../../../game/content/ActorDefinitions";
import type { ActorSnapshot } from "../../../game/core/GameSnapshot";
import { samplePose } from "../../../game/adapters/babylon/art/CharacterAnimator";
import { HUMANOID_JOINT_NAMES } from "../../../game/adapters/babylon/art/HumanoidSkin";

const visual: ActorVisualDef = {
  id: "visual.test",
  asset: "asset.test",
  url: "/game-assets/test.glb",
  scale: 1,
  yOffset: 0,
  rotationY: 0,
  animations: { idle: "#0" },
  animationDurations: { idle: 1 },
  clipDurations: { "#0": 1 },
  playback: { idle: { layer: "full", exitAt: 1, blendSpeed: 0.08 } },
  sockets: {
    melee: { fallback: { x: 0, y: 1, z: 0 } },
    ranged: { fallback: { x: 0, y: 1, z: 0 } },
  },
  budget: {
    maxBytes: 1,
    maxTriangles: 1,
    maxBones: 1,
    maxTextures: 1,
    maxAnimations: 1,
  },
  lod: { maxAnimatedInstances: 1, fallback: "voxel" },
};

function actor(id: number): ActorSnapshot {
  return {
    id,
    archetype: "enemy.test",
    name: "Test",
    role: "minion",
    visualId: visual.id,
    faction: "enemy",
    action: "idle",
    actionDuration: 0,
    locomotion: "idle",
    x: 0,
    z: 0,
    previousX: 0,
    previousZ: 0,
    facingX: -1,
    facingZ: 0,
    health: 1,
    maxHealth: 1,
    statuses: [],
  };
}

describe("BabylonActorLayer", () => {
  it("updates heroes, visible enemies, and offscreen enemies at bounded cadences", () => {
    expect(actorSkinUpdateInterval(1, true)).toBe(1);
    expect(actorSkinUpdateInterval(undefined, true)).toBe(2);
    expect(actorSkinUpdateInterval(undefined, false)).toBe(8);
  });

  it("promotes within the animation budget and keeps excess actors on fallback", async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const assets: ActorAssetPort = {
      async preload() {},
      async instantiate(_assetId, name) {
        const root = new TransformNode(name, scene);
        return { rootNodes: [root], animationGroups: [], dispose: () => root.dispose() };
      },
    };
    const layer = new BabylonActorLayer(scene, assets, [visual]);
    const palette = {
      stone: "#000000",
      bone: "#ffffff",
      crystal: "#ff0000",
      emissive: "#ff0000",
      projectile: "#ff0000",
    };

    layer.getOrCreate(actor(1), "test", palette);
    layer.getOrCreate(actor(2), "test", palette);
    await vi.waitFor(() => expect(layer.status().animated).toBe(1));

    expect(layer.status()).toEqual({ animated: 1, fallback: 1, pending: 0 });
    layer.dispose();
    engine.dispose();
  });

  it("drives the humanoid shoulder and keeps the sword on the wrist during melee", async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const shoulder = new TransformNode("arm_joint_R_1", scene);
    const elbow = new TransformNode("arm_joint_R_2", scene);
    const wrist = new TransformNode("arm_joint_R_3", scene);
    elbow.parent = shoulder;
    wrist.parent = elbow;
    const assets: ActorAssetPort = {
      async preload() {},
      async instantiate() {
        return {
          rootNodes: [shoulder],
          animationGroups: [],
          dispose: () => shoulder.dispose(),
        };
      },
    };
    const humanoid = {
      ...visual,
      animations: { ...visual.animations, melee: visual.animations.idle },
      sockets: {
        ...visual.sockets,
        melee: { ...visual.sockets.melee, node: wrist.name },
      },
    } satisfies ActorVisualDef;
    const layer = new BabylonActorLayer(scene, assets, [humanoid]);
    const hero = {
      ...actor(1),
      role: "hero",
      faction: "hero",
      playerSlot: 1,
    } satisfies ActorSnapshot;
    const palette = {
      stone: "#000000",
      bone: "#ffffff",
      crystal: "#ff0000",
      emissive: "#ff0000",
      projectile: "#ff0000",
    };

    const actorVisual = layer.getOrCreate(hero, "test", palette);
    await vi.waitFor(() => expect(layer.status().animated).toBe(1));
    const shoulderBefore = shoulder.rotationQuaternion?.clone() ?? Quaternion.Identity();
    layer.setAction(hero.id, "melee");
    actorVisual.applyPose(samplePose("melee", 0.4));

    expect(actorVisual.meleeAnchor.parent).toBe(wrist);
    expect(actorVisual.meleeAnchor.getChildMeshes(false).length).toBeGreaterThan(0);
    expect(shoulder.rotationQuaternion).toBeDefined();
    expect(Math.abs(Quaternion.Dot(shoulder.rotationQuaternion!, shoulderBefore))).toBeLessThan(0.99);
    layer.dispose();
    engine.dispose();
  });

  it("promotes a standard rig into the visible block skin and plays authored actions", async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const nodes = HUMANOID_JOINT_NAMES.map((name) => new TransformNode(`actor-1-${name}`, scene));
    const weapon = nodes.find((node) => node.name.endsWith("-Weapon.R"))!;
    const sword = nodes.find((node) => node.name.endsWith("-Warrior_Sword"))!;
    sword.parent = weapon;
    const source = MeshBuilder.CreateBox("source-warrior", { size: 1 }, scene);
    const target = nodes.find((node) => node.name.endsWith("-Torso"))!;
    const idleAnimation = { enableBlending: false, blendingSpeed: 0 };
    const attackAnimation = { enableBlending: false, blendingSpeed: 0 };
    const idle = {
      name: "Idle",
      stop: vi.fn(),
      start: vi.fn(),
      from: 0,
      to: 30,
      mask: null,
      enableBlending: null,
      blendingSpeed: null,
      targetedAnimations: [{ animation: idleAnimation, target }],
    };
    const attack = {
      name: "Sword_Attack",
      stop: vi.fn(),
      start: vi.fn(),
      from: 0,
      to: 30,
      mask: null,
      enableBlending: null,
      blendingSpeed: null,
      targetedAnimations: [{ animation: attackAnimation, target }],
    };
    const assets: ActorAssetPort = {
      async preload() {},
      async instantiate() {
        return {
          rootNodes: [...nodes.filter((node) => node.parent === null), source],
          animationGroups: [idle, attack] as never,
          dispose() {
            for (const node of nodes) node.dispose();
            source.dispose();
          },
        };
      },
    };
    const humanoid = {
      ...visual,
      id: "visual.humanoid",
      appearance: "appearance.hero.ember",
      animations: { idle: "Idle", melee: "Sword_Attack" },
      animationDurations: { idle: 3.125, melee: 5 / 6 },
      clipDurations: { Idle: 3.125, Sword_Attack: 5 / 6 },
      playback: {
        idle: { layer: "full", exitAt: 1, blendSpeed: 0.08 },
        melee: { layer: "upper", exitAt: 0.78, blendSpeed: 0.1 },
      },
    } satisfies ActorVisualDef;
    const layer = new BabylonActorLayer(scene, assets, [humanoid]);
    const hero = {
      ...actor(1),
      visualId: humanoid.id,
      role: "hero",
      faction: "hero",
      playerSlot: 1,
    } satisfies ActorSnapshot;
    const palette = {
      stone: "#000000",
      bone: "#ffffff",
      crystal: "#ff0000",
      emissive: "#ff0000",
      projectile: "#ff0000",
    };

    const actorVisual = layer.getOrCreate(hero, "test", palette);
    await vi.waitFor(() => expect(layer.status().animated).toBe(1));

    expect(actorVisual.hitMeshes.some((mesh) => mesh.name === "humanoid-head")).toBe(true);
    expect(actorVisual.meleeAnchor.name).toBe("humanoid-melee-anchor");
    layer.setAction(hero.id, "melee", 0.55, "idle");
    expect(attack.start.mock.calls[0][0]).toBe(false);
    expect(attack.start.mock.calls[0][1]).toBeCloseTo((5 / 6) * 0.78 / 0.55);
    expect(attack.start.mock.calls[0][2]).toBe(0);
    expect(attack.start.mock.calls[0][3]).toBeCloseTo(23.4);
    expect(attack.enableBlending).toBe(true);
    expect(attack.blendingSpeed).toBe(0.1);
    layer.dispose();
    engine.dispose();
  });
});
