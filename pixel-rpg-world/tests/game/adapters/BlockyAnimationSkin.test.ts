import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";
import { describe, expect, it } from "vitest";
import {
  createHumanoidSkin,
  HUMANOID_JOINT_NAMES,
  resolveHumanoidJoints,
} from "../../../game/adapters/babylon/art/HumanoidSkin";
import { getHumanoidAppearance } from "../../../game/adapters/babylon/art/HumanoidAppearance";

describe("BlockyAnimationSkin", () => {
  it("builds segmented limbs and follows the authored joints", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const positions: Record<string, [number, number, number]> = {
      Hips: [0, 1, 0],
      Torso: [0, 1.55, 0],
      Neck: [0, 1.57, 0],
      Head: [0, 1.72, 0],
      "UpperArm.L": [-0.5, 2, 0],
      "LowerArm.L": [-1, 1.5, 0],
      "Fist.L": [-1.2, 1.1, 0],
      "UpperArm.R": [0.5, 2, 0],
      "LowerArm.R": [1, 1.5, 0],
      "Fist.R": [1.2, 1.1, 0],
      "UpperLeg.L": [-0.22, 1, 0],
      "LowerLeg.L": [-0.22, 0.52, 0],
      "Foot.L": [-0.22, 0.08, 0.08],
      "UpperLeg.R": [0.22, 1, 0],
      "LowerLeg.R": [0.22, 0.52, 0],
      "Foot.R": [0.22, 0.08, 0.08],
      "Weapon.R": [1.2, 1.05, 0],
      Warrior_Sword: [1.2, 1.05, 0],
    };
    const nodes = HUMANOID_JOINT_NAMES.map((name) => {
      const node = new TransformNode(name, scene);
      node.position.set(...positions[name]);
      return node;
    });
    const source = MeshBuilder.CreateBox("source-warrior", { size: 1 }, scene);

    const joints = resolveHumanoidJoints(nodes);
    const skin = createHumanoidSkin(
      scene,
      joints,
      [source],
      getHumanoidAppearance("appearance.hero.ember"),
    );
    skin.update();

    expect(skin.meshes.length).toBeGreaterThanOrEqual(20);
    expect(source.visibility).toBe(0);
    expect(scene.getMeshByName("humanoid-upper-arm-r")?.position.asArray()).toEqual([0.75, 1.75, 0]);
    expect(scene.getMeshByName("humanoid-chest-trim")).toBeNull();
    expect(scene.getMeshByName("humanoid-hair-back")).toBeNull();
    expect(scene.getMeshByName("humanoid-head")).toBeDefined();
    expect(scene.getMeshByName("humanoid-head")?.scaling.x).toBeCloseTo(0.48);
    const torsoScale = scene.getMeshByName("humanoid-torso")?.scaling;
    expect(torsoScale?.x).toBeCloseTo(0.52);
    expect(torsoScale?.y).toBeCloseTo(0.62);
    expect(torsoScale?.z).toBeCloseTo(0.28);
    expect(scene.getMeshByName("humanoid-upper-arm-r")?.scaling.x).toBeCloseTo(0.22);
    expect(scene.getMeshByName("humanoid-hips")?.scaling.length()).toBe(0);
    expect(skin.meshes.some((mesh) => mesh.name.includes("simple-wrists"))).toBe(true);
    expect(skin.meleeAnchor.parent).toBe(joints["Weapon.R"]);
    skin.dispose();
    engine.dispose();
  });

  it("resolves UAL joints through the stable humanoid contract", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const names = [
      "pelvis", "spine_03", "neck_01", "Head",
      "upperarm_l", "lowerarm_l", "hand_l",
      "upperarm_r", "lowerarm_r", "hand_r",
      "thigh_l", "calf_l", "foot_l",
      "thigh_r", "calf_r", "foot_r", "socket.weapon.right",
    ];
    const joints = resolveHumanoidJoints(names.map((name) => (
      new TransformNode(`actor-1-${name}`, scene)
    )));

    expect(joints.Head.name).toBe("actor-1-Head");
    expect(joints["UpperArm.R"].name).toBe("actor-1-upperarm_r");
    expect(joints["Weapon.R"].name).toBe("actor-1-socket.weapon.right");
    expect(joints.Warrior_Sword).toBe(joints["Weapon.R"]);
    engine.dispose();
  });

  it("shares one unit-box source across matching humanoid materials", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const makeNodes = (prefix: string) => HUMANOID_JOINT_NAMES.map((name) => (
      new TransformNode(`${prefix}-${name}`, scene)
    ));
    const firstNodes = makeNodes("first");
    const secondNodes = makeNodes("second");
    const firstSource = MeshBuilder.CreateBox("first-source", { size: 1 }, scene);
    const secondSource = MeshBuilder.CreateBox("second-source", { size: 1 }, scene);
    const appearance = getHumanoidAppearance("appearance.hero.ember");
    const first = createHumanoidSkin(
      scene,
      resolveHumanoidJoints(firstNodes),
      [firstSource],
      appearance,
    );
    const second = createHumanoidSkin(
      scene,
      resolveHumanoidJoints(secondNodes),
      [secondSource],
      appearance,
    );
    const firstHead = first.meshes.find((mesh) => mesh.name === "humanoid-head");
    const secondHead = second.meshes.find((mesh) => mesh.name === "humanoid-head");

    expect(firstHead).toBeInstanceOf(InstancedMesh);
    expect(secondHead).toBeInstanceOf(InstancedMesh);
    expect((firstHead as InstancedMesh).sourceMesh).toBe(
      (secondHead as InstancedMesh).sourceMesh,
    );

    first.dispose();
    second.dispose();
    scene.dispose();
    engine.dispose();
  });
});
