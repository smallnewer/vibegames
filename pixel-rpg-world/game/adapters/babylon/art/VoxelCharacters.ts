import type { Material } from "@babylonjs/core/Materials/material";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import "@babylonjs/core/Meshes/instancedMesh";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import type { ActorFaction } from "../../../actor/ActorComponents";
import type { DungeonVisualDef } from "../../../dungeon/DungeonDefinitions";
import type { PlayerSlotId } from "../../../player/PlayerSlot";
import type { CharacterPose } from "./CharacterAnimator";
import { VoxelKit } from "./VoxelKit";

export interface VoxelCharacterVisual {
  readonly root: TransformNode;
  readonly body: TransformNode;
  readonly leftArm?: TransformNode;
  readonly rightArm?: TransformNode;
  readonly leftLeg?: TransformNode;
  readonly rightLeg?: TransformNode;
  readonly meleeAnchor: TransformNode;
  readonly rangedAnchor: TransformNode;
  readonly hitMeshes: readonly AbstractMesh[];
  applyPose(pose: CharacterPose): void;
  flashHit(amount: number): void;
  dispose(): void;
}

const materialCaches = new WeakMap<Scene, Map<string, StandardMaterial>>();
const enemyGeometryCaches = new WeakMap<Scene, Map<string, readonly Mesh[]>>();

function colorMaterial(scene: Scene, name: string, color: string, emissive = "#000000") {
  let cache = materialCaches.get(scene);
  if (!cache) {
    cache = new Map<string, StandardMaterial>();
    materialCaches.set(scene, cache);
  }
  const existing = cache.get(name);
  if (existing) return existing;
  const value = new StandardMaterial(name, scene);
  value.diffuseColor = Color3.FromHexString(color);
  value.emissiveColor = Color3.FromHexString(emissive);
  value.specularColor = Color3.Black();
  cache.set(name, value);
  return value;
}

function movingBox(
  scene: Scene,
  parent: TransformNode,
  name: string,
  size: [number, number, number],
  position: [number, number, number],
  boxMaterial: Material,
): { pivot: TransformNode; mesh: Mesh } {
  const pivot = new TransformNode(`${name}-pivot`, scene);
  pivot.parent = parent;
  pivot.position.set(...position);
  const mesh = MeshBuilder.CreateBox(
    name,
    { width: size[0], height: size[1], depth: size[2] },
    scene,
  );
  mesh.parent = pivot;
  mesh.position.y = -size[1] / 2;
  mesh.material = boxMaterial;
  return { pivot, mesh };
}

function weaponBox(
  scene: Scene,
  parent: TransformNode,
  name: string,
  size: [number, number, number],
  position: [number, number, number],
  boxMaterial: Material,
): Mesh {
  const mesh = MeshBuilder.CreateBox(
    name,
    { width: size[0], height: size[1], depth: size[2] },
    scene,
  );
  mesh.parent = parent;
  mesh.position.set(...position);
  mesh.material = boxMaterial;
  return mesh;
}

function createHero(
  scene: Scene,
  playerSlot: PlayerSlotId,
): VoxelCharacterVisual {
  const root = new TransformNode(`hero-${playerSlot}`, scene);
  root.scaling.setAll(0.8);
  const body = new TransformNode(`hero-${playerSlot}-body`, scene);
  body.parent = root;
  const trims: Record<PlayerSlotId, [string, string]> = {
    1: ["#52e8f2", "#087484"],
    2: ["#ffae45", "#a94a16"],
    3: ["#79df75", "#287d31"],
    4: ["#ca8cff", "#7132a9"],
  };
  const coat = colorMaterial(scene, "hero-coat", "#17394b");
  const coatDark = colorMaterial(scene, "hero-coat-dark", "#0a1d29");
  const trim = colorMaterial(scene, `hero-trim-${playerSlot}`, ...trims[playerSlot]);
  const skin = colorMaterial(scene, "hero-skin", "#d8a27f");
  const hair = colorMaterial(scene, "hero-hair", "#17202c");
  const eye = colorMaterial(scene, "hero-eye", "#78f4ff", "#184d58");
  const leather = colorMaterial(scene, "hero-leather", "#5b3023");
  const metal = colorMaterial(scene, "hero-steel", "#c5d1d6");
  const blade = colorMaterial(scene, "hero-blade", "#dfecef", "#18333a");
  const kit = new VoxelKit(scene);

  // 静态细节按材质合批：脸、分层头发、胸甲、腰带、披风、箭袋。
  kit.box({ name: "torso", x: 0, y: 1.52, z: 0, width: 0.82, height: 1.02, depth: 0.52, material: coat });
  kit.box({ name: "chest", x: 0, y: 1.63, z: 0.29, width: 0.7, height: 0.5, depth: 0.1, material: metal });
  kit.box({ name: "chest-trim", x: 0, y: 1.73, z: 0.355, width: 0.52, height: 0.12, depth: 0.05, material: trim });
  kit.box({ name: "belt", x: 0, y: 1.12, z: 0, width: 0.9, height: 0.14, depth: 0.58, material: leather });
  kit.box({ name: "buckle", x: 0, y: 1.12, z: 0.315, width: 0.16, height: 0.16, depth: 0.06, material: trim });
  kit.box({ name: "cape", x: 0, y: 1.46, z: -0.35, width: 0.68, height: 0.92, depth: 0.1, material: coatDark });
  kit.box({ name: "cape-trim", x: 0, y: 1.02, z: -0.37, width: 0.7, height: 0.12, depth: 0.12, material: trim });
  kit.box({ name: "head", x: 0, y: 2.34, z: 0, width: 0.7, height: 0.7, depth: 0.68, material: skin });
  kit.box({ name: "hair-top", x: 0, y: 2.73, z: -0.02, width: 0.76, height: 0.18, depth: 0.74, material: hair });
  kit.box({ name: "hair-back", x: 0, y: 2.43, z: -0.38, width: 0.74, height: 0.52, depth: 0.12, material: hair });
  kit.box({ name: "hair-left", x: -0.31, y: 2.55, z: 0.31, width: 0.16, height: 0.28, depth: 0.1, material: hair });
  kit.box({ name: "hair-right", x: 0.31, y: 2.61, z: 0.31, width: 0.16, height: 0.2, depth: 0.1, material: hair });
  kit.box({ name: "eye-left", x: -0.17, y: 2.39, z: 0.352, width: 0.1, height: 0.1, depth: 0.04, material: eye });
  kit.box({ name: "eye-right", x: 0.17, y: 2.39, z: 0.352, width: 0.1, height: 0.1, depth: 0.04, material: eye });
  kit.box({ name: "nose", x: 0, y: 2.25, z: 0.37, width: 0.1, height: 0.1, depth: 0.08, material: skin });
  kit.box({ name: "quiver", x: -0.32, y: 1.62, z: -0.43, width: 0.25, height: 0.85, depth: 0.24, rotationY: -0.22, material: leather });
  kit.box({ name: "arrow", x: -0.37, y: 2.08, z: -0.45, width: 0.07, height: 0.8, depth: 0.07, rotationY: -0.22, material: metal });
  const staticMeshes = kit.finish(`hero-${playerSlot}-static`);
  for (const mesh of staticMeshes) mesh.parent = body;

  const leftArmPart = movingBox(scene, body, "hero-left-arm", [0.3, 0.9, 0.32], [-0.58, 2.02, 0], coat);
  const rightArmPart = movingBox(scene, body, "hero-right-arm", [0.3, 0.9, 0.32], [0.58, 2.02, 0], coat);
  weaponBox(scene, leftArmPart.pivot, "left-glove", [0.34, 0.26, 0.36], [0, -0.78, 0], leather);
  weaponBox(scene, rightArmPart.pivot, "right-glove", [0.34, 0.26, 0.36], [0, -0.78, 0], leather);
  weaponBox(scene, body, "left-shoulder", [0.44, 0.22, 0.5], [-0.55, 1.95, 0], metal);
  weaponBox(scene, body, "right-shoulder", [0.44, 0.22, 0.5], [0.55, 1.95, 0], trim);
  const leftLegPart = movingBox(scene, root, "hero-left-leg", [0.32, 0.92, 0.38], [-0.23, 1.02, 0], coatDark);
  const rightLegPart = movingBox(scene, root, "hero-right-leg", [0.32, 0.92, 0.38], [0.23, 1.02, 0], coatDark);
  weaponBox(scene, leftLegPart.pivot, "left-boot", [0.36, 0.3, 0.52], [0, -0.83, 0.08], leather);
  weaponBox(scene, rightLegPart.pivot, "right-boot", [0.36, 0.3, 0.52], [0, -0.83, 0.08], leather);

  const meleeAnchor = new TransformNode("hero-melee-anchor", scene);
  meleeAnchor.parent = rightArmPart.pivot;
  meleeAnchor.position.set(0, -0.9, 0.02);
  weaponBox(scene, meleeAnchor, "sword-grip", [0.12, 0.36, 0.12], [0, -0.16, 0], leather);
  weaponBox(scene, meleeAnchor, "sword-guard", [0.5, 0.1, 0.14], [0, -0.4, 0], trim);
  weaponBox(scene, meleeAnchor, "sword-blade", [0.16, 1.05, 0.1], [0, -0.95, 0], blade);

  const rangedAnchor = new TransformNode("hero-ranged-anchor", scene);
  rangedAnchor.parent = leftArmPart.pivot;
  rangedAnchor.position.set(0, -0.52, 0.08);
  weaponBox(scene, rangedAnchor, "bow-top", [0.1, 0.62, 0.12], [0, 0.28, 0], leather).rotation.z = -0.22;
  weaponBox(scene, rangedAnchor, "bow-bottom", [0.1, 0.62, 0.12], [0, -0.28, 0], leather).rotation.z = 0.22;
  weaponBox(scene, rangedAnchor, "bow-string", [0.035, 1.1, 0.035], [0.12, 0, 0], metal);

  const movingMeshes = [
    leftArmPart.mesh,
    rightArmPart.mesh,
    leftLegPart.mesh,
    rightLegPart.mesh,
    ...root.getChildMeshes(false),
  ];
  return {
    root,
    body,
    leftArm: leftArmPart.pivot,
    rightArm: rightArmPart.pivot,
    leftLeg: leftLegPart.pivot,
    rightLeg: rightLegPart.pivot,
    meleeAnchor,
    rangedAnchor,
    hitMeshes: [...new Set(movingMeshes)],
    applyPose(pose) {
      root.rotation.z = pose.bodyRoll;
      body.position.y = pose.bodyLift;
      body.rotation.x = pose.bodyPitch * 0.22;
      body.scaling.y = pose.squash;
      leftArmPart.pivot.rotation.x = pose.leftArmPitch;
      rightArmPart.pivot.rotation.x = pose.rightArmPitch;
      leftLegPart.pivot.rotation.x = pose.leftLegPitch;
      rightLegPart.pivot.rotation.x = pose.rightLegPitch;
      meleeAnchor.rotation.y = pose.weaponYaw;
    },
    flashHit(amount) {
      body.scaling.x = 1 + Math.min(amount, 1) * 0.08;
      body.scaling.z = body.scaling.x;
    },
    dispose: () => root.dispose(false, false),
  };
}

function createEnemy(
  scene: Scene,
  themeId: string,
  palette: DungeonVisualDef["enemy"],
): VoxelCharacterVisual {
  const root = new TransformNode("ember-warden", scene);
  root.scaling.setAll(0.8);
  const body = new TransformNode("ember-warden-body", scene);
  body.parent = root;
  const stone = colorMaterial(scene, `${themeId}-warden-stone`, palette.stone);
  const bone = colorMaterial(scene, `${themeId}-warden-bone`, palette.bone);
  const core = colorMaterial(scene, `${themeId}-warden-core`, palette.crystal, palette.emissive);
  let sceneCache = enemyGeometryCaches.get(scene);
  if (!sceneCache) {
    sceneCache = new Map<string, readonly Mesh[]>();
    enemyGeometryCaches.set(scene, sceneCache);
  }
  const geometryKey = `${themeId}:${palette.stone}:${palette.bone}:${palette.crystal}`;
  let sources = sceneCache.get(geometryKey);
  if (!sources) {
    const kit = new VoxelKit(scene);
    kit.box({ name: "warden-body", x: 0, y: 1.25, z: 0, width: 1.05, height: 1.35, depth: 0.76, material: stone });
    kit.box({ name: "warden-waist", x: 0, y: 0.55, z: 0, width: 0.7, height: 0.32, depth: 0.62, material: stone });
    kit.box({ name: "warden-head", x: 0.08, y: 2.2, z: 0, width: 0.76, height: 0.65, depth: 0.7, material: bone });
    kit.box({ name: "warden-helm", x: 0.05, y: 2.55, z: -0.02, width: 0.92, height: 0.22, depth: 0.78, material: stone });
    kit.box({ name: "warden-face", x: 0.08, y: 2.17, z: 0.37, width: 0.48, height: 0.22, depth: 0.08, material: stone });
    kit.box({ name: "warden-eye", x: 0.18, y: 2.19, z: 0.425, width: 0.18, height: 0.1, depth: 0.04, material: core });
    kit.box({ name: "warden-back-eye", x: -0.04, y: 2.18, z: -0.425, width: 0.22, height: 0.1, depth: 0.04, material: core });
    kit.box({ name: "warden-core", x: 0, y: 1.35, z: 0.43, width: 0.42, height: 0.52, depth: 0.16, material: core });
    kit.box({ name: "warden-back-core", x: 0, y: 1.35, z: -0.43, width: 0.36, height: 0.48, depth: 0.16, material: core });
    kit.box({ name: "warden-core-rim", x: 0, y: 1.35, z: 0.39, width: 0.68, height: 0.76, depth: 0.12, material: stone });
    kit.box({ name: "warden-left-shoulder", x: -0.76, y: 1.78, z: 0, width: 0.65, height: 0.62, depth: 0.72, material: stone });
    kit.box({ name: "warden-right-shoulder", x: 0.82, y: 1.88, z: 0, width: 0.78, height: 0.8, depth: 0.78, material: stone });
    kit.box({ name: "warden-left-foot", x: -0.32, y: 0.2, z: 0.08, width: 0.5, height: 0.4, depth: 0.75, material: stone });
    kit.box({ name: "warden-right-foot", x: 0.38, y: 0.2, z: 0.02, width: 0.56, height: 0.4, depth: 0.68, material: stone });
    kit.box({ name: "warden-back-chunk", x: -0.42, y: 1.52, z: -0.5, width: 0.4, height: 0.62, depth: 0.4, rotationY: 0.24, material: stone });
    kit.box({ name: "warden-crystal-spine", x: 0.3, y: 2.05, z: -0.52, width: 0.3, height: 0.74, depth: 0.3, rotationY: Math.PI / 4, material: core });
    kit.box({ name: "warden-right-arm", x: 0.9, y: 1.2, z: 0, width: 0.44, height: 1.08, depth: 0.46, material: stone });
    kit.box({ name: "warden-left-arm", x: -0.78, y: 1.16, z: 0, width: 0.4, height: 0.92, depth: 0.42, material: stone });
    kit.box({ name: "warden-weapon", x: 0.9, y: 0.28, z: 0, width: 0.38, height: 1.08, depth: 0.38, rotationY: Math.PI / 4, material: core });
    sources = kit.finish("ember-warden-source");
    for (const source of sources) {
      source.isVisible = false;
      source.isPickable = false;
    }
    sceneCache.set(geometryKey, sources);
  }
  const staticMeshes = sources.map((source, index) => {
    const mesh = source.createInstance(`ember-warden-static-${index}`);
    mesh.parent = body;
    mesh.isVisible = true;
    return mesh;
  });

  const meleeAnchor = new TransformNode("warden-melee-anchor", scene);
  meleeAnchor.parent = body;
  meleeAnchor.position.set(0.9, 0.28, 0);
  const rangedAnchor = new TransformNode("warden-ranged-anchor", scene);
  rangedAnchor.parent = body;
  rangedAnchor.position.set(0, 1.35, 0.5);

  return {
    root,
    body,
    meleeAnchor,
    rangedAnchor,
    hitMeshes: staticMeshes,
    applyPose(pose) {
      root.rotation.z = pose.bodyRoll * 0.5;
      body.position.y = pose.bodyLift * 0.5;
      body.rotation.x = pose.bodyPitch * 0.12;
      body.scaling.y = pose.squash;
      meleeAnchor.rotation.y = pose.weaponYaw;
    },
    flashHit(amount) {
      body.scaling.x = 1 + Math.min(amount, 1) * 0.12;
      body.scaling.z = body.scaling.x;
    },
    dispose: () => root.dispose(false, false),
  };
}

export function createVoxelCharacter(
  scene: Scene,
  faction: ActorFaction,
  playerSlot?: PlayerSlotId,
  themeId = "global",
  enemyPalette?: DungeonVisualDef["enemy"],
): VoxelCharacterVisual {
  if (faction === "hero") return createHero(scene, playerSlot ?? 1);
  if (!enemyPalette) throw new Error("Enemy palette is required");
  return createEnemy(scene, themeId, enemyPalette);
}
