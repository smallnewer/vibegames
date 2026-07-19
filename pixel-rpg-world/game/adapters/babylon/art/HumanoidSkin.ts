import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color3, Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import "@babylonjs/core/Meshes/instancedMesh";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import type {
  HumanoidAppearanceDef,
  HumanoidMaterialDef,
  HumanoidSurfaceName,
  HumanoidWearPieceDef,
} from "./HumanoidAppearance";
import type { HumanoidEquipmentAppearanceDef } from "./EquipmentAppearance";

export const HUMANOID_JOINT_NAMES = [
  "Hips",
  "Torso",
  "Neck",
  "Head",
  "UpperArm.L",
  "LowerArm.L",
  "Fist.L",
  "UpperArm.R",
  "LowerArm.R",
  "Fist.R",
  "UpperLeg.L",
  "LowerLeg.L",
  "Foot.L",
  "UpperLeg.R",
  "LowerLeg.R",
  "Foot.R",
  "Weapon.R",
  "Warrior_Sword",
] as const;

type HumanoidJointName = typeof HUMANOID_JOINT_NAMES[number];
export type HumanoidJoints = Record<HumanoidJointName, TransformNode>;
export type HumanoidSkinMode = "blocky" | "original";

const JOINT_ALIASES: Readonly<Record<HumanoidJointName, readonly string[]>> = {
  Hips: ["pelvis", "Hips"],
  Torso: ["spine_03", "Torso"],
  Neck: ["neck_01", "Neck"],
  Head: ["Head"],
  "UpperArm.L": ["upperarm_l", "UpperArm.L"],
  "LowerArm.L": ["lowerarm_l", "LowerArm.L"],
  "Fist.L": ["hand_l", "Fist.L"],
  "UpperArm.R": ["upperarm_r", "UpperArm.R"],
  "LowerArm.R": ["lowerarm_r", "LowerArm.R"],
  "Fist.R": ["hand_r", "Fist.R"],
  "UpperLeg.L": ["thigh_l", "UpperLeg.L"],
  "LowerLeg.L": ["calf_l", "LowerLeg.L"],
  "Foot.L": ["foot_l", "Foot.L"],
  "UpperLeg.R": ["thigh_r", "UpperLeg.R"],
  "LowerLeg.R": ["calf_r", "LowerLeg.R"],
  "Foot.R": ["foot_r", "Foot.R"],
  "Weapon.R": ["socket.weapon.right", "Weapon.R"],
  Warrior_Sword: ["socket.weapon.right", "Warrior_Sword"],
};

export interface HumanoidSkin {
  readonly meshes: readonly AbstractMesh[];
  readonly meleeAnchor: TransformNode;
  readonly rangedAnchor: TransformNode;
  update(): void;
  flashHit(amount: number): void;
  setEquipment(equipment: readonly HumanoidEquipmentAppearanceDef[]): void;
  setMode(mode: HumanoidSkinMode): void;
  dispose(): void;
}

interface Segment {
  readonly surface: HumanoidSurfaceName;
  readonly start: TransformNode;
  readonly end: TransformNode;
  readonly width: number;
  readonly depth: number;
}

interface WearPiece {
  readonly mesh: AbstractMesh;
  readonly recipe: HumanoidWearPieceDef;
}

const materialCaches = new WeakMap<Scene, Map<string, StandardMaterial>>();
const unitBoxSourceCaches = new WeakMap<Scene, Map<StandardMaterial, Mesh>>();

interface MaterialSource {
  readonly id: string;
  readonly materials: Readonly<Record<string, HumanoidMaterialDef>>;
}

interface PoseScratch {
  readonly scaling: Vector3;
  readonly rotation: Quaternion;
  readonly position: Vector3;
  readonly direction: Vector3;
  readonly localOffset: Vector3;
  readonly worldOffset: Vector3;
  readonly rotationMatrix: Matrix;
}

// 玩法只认稳定语义名；资产层允许 UAL 和旧资源使用各自的骨骼名。
export function resolveHumanoidJoints(nodes: readonly TransformNode[]): HumanoidJoints {
  const entries = HUMANOID_JOINT_NAMES.map((name) => {
    const node = nodes.find((value) => JOINT_ALIASES[name].some((alias) => (
      value.name === alias || value.name.endsWith(`-${alias}`)
    )));
    if (!node) throw new Error(`人形皮肤缺少关节：${name}`);
    return [name, node] as const;
  });
  return Object.fromEntries(entries) as HumanoidJoints;
}

function materialFor(scene: Scene, source: MaterialSource, id: string) {
  const recipe = source.materials[id];
  if (!recipe) throw new Error(`${source.id} 缺少材质：${id}`);
  let cache = materialCaches.get(scene);
  if (!cache) {
    cache = new Map<string, StandardMaterial>();
    materialCaches.set(scene, cache);
  }
  const key = `${source.id}:${id}`;
  const existing = cache.get(key);
  if (existing) return existing;
  const material = new StandardMaterial(`humanoid-${key}`, scene);
  material.diffuseColor = Color3.FromHexString(recipe.color);
  material.emissiveColor = Color3.FromHexString(recipe.emissive ?? "#000000");
  material.specularColor = Color3.Black();
  material.alpha = recipe.alpha ?? 1;
  material.disableDepthWrite = material.alpha < 1;
  if (recipe.texture) {
    material.diffuseTexture = new Texture(
      recipe.texture,
      scene,
      false,
      false,
      Texture.NEAREST_SAMPLINGMODE,
    );
  }
  cache.set(key, material);
  return material;
}

function unitBoxSource(scene: Scene, material: StandardMaterial): Mesh {
  let cache = unitBoxSourceCaches.get(scene);
  if (!cache) {
    cache = new Map<StandardMaterial, Mesh>();
    unitBoxSourceCaches.set(scene, cache);
  }
  const existing = cache.get(material);
  if (existing) return existing;
  const source = MeshBuilder.CreateBox(`humanoid-box-source-${cache.size}`, { size: 1 }, scene);
  source.material = material;
  source.isVisible = false;
  source.isPickable = false;
  cache.set(material, source);
  return source;
}

function unitBox(
  scene: Scene,
  meshes: AbstractMesh[],
  name: string,
  material: StandardMaterial,
): InstancedMesh {
  const mesh = unitBoxSource(scene, material).createInstance(name);
  mesh.isVisible = true;
  mesh.isPickable = false;
  mesh.rotationQuaternion = Quaternion.Identity();
  meshes.push(mesh);
  return mesh;
}

function weaponBox(
  scene: Scene,
  meshes: AbstractMesh[],
  parent: TransformNode,
  name: string,
  size: readonly [number, number, number],
  position: readonly [number, number, number],
  material: StandardMaterial,
) : InstancedMesh {
  const mesh = unitBoxSource(scene, material).createInstance(name);
  mesh.parent = parent;
  mesh.position.set(...position);
  mesh.scaling.set(...size);
  mesh.isVisible = true;
  mesh.isPickable = false;
  meshes.push(mesh);
  return mesh;
}

function copyNodePose(
  node: TransformNode,
  mesh: AbstractMesh,
  scratch: PoseScratch,
  offset?: Vector3,
) {
  // 动画系统会标记脏矩阵；不强制重复计算同一条骨骼链。
  node.computeWorldMatrix().decompose(scratch.scaling, scratch.rotation, scratch.position);
  mesh.rotationQuaternion ??= Quaternion.Identity();
  mesh.rotationQuaternion.copyFrom(scratch.rotation);
  mesh.position.copyFrom(scratch.position);
  if (!offset) return;
  scratch.rotation.toRotationMatrix(scratch.rotationMatrix);
  Vector3.TransformNormalToRef(offset, scratch.rotationMatrix, scratch.worldOffset);
  mesh.position.addInPlace(scratch.worldOffset);
}

// 可见方块只跟随成熟骨骼；衣物换装不复制动画，也不修改玩法实体。
export function createHumanoidSkin(
  scene: Scene,
  joints: HumanoidJoints,
  sourceMeshes: readonly AbstractMesh[],
  appearance: HumanoidAppearanceDef,
): HumanoidSkin {
  const meshes: AbstractMesh[] = [];
  const scratch: PoseScratch = {
    scaling: Vector3.One(),
    rotation: Quaternion.Identity(),
    position: Vector3.Zero(),
    direction: Vector3.Zero(),
    localOffset: Vector3.Zero(),
    worldOffset: Vector3.Zero(),
    rotationMatrix: Matrix.Identity(),
  };
  const footOffset = Vector3.Zero();
  const headOffset = Vector3.Zero();
  const surfaces = {} as Record<HumanoidSurfaceName, AbstractMesh>;
  const createSurface = (surface: HumanoidSurfaceName, name: string) => {
    const mesh = unitBox(
      scene,
      meshes,
      `humanoid-${name}`,
      materialFor(scene, appearance, appearance.body[surface]),
    );
    surfaces[surface] = mesh;
    return mesh;
  };

  createSurface("head", "head");
  createSurface("torso", "torso");
  createSurface("hips", "hips");
  createSurface("upperArmL", "upper-arm-l");
  createSurface("lowerArmL", "lower-arm-l");
  createSurface("handL", "hand-l");
  createSurface("upperArmR", "upper-arm-r");
  createSurface("lowerArmR", "lower-arm-r");
  createSurface("handR", "hand-r");
  createSurface("upperLegL", "upper-leg-l");
  createSurface("lowerLegL", "lower-leg-l");
  createSurface("footL", "foot-l");
  createSurface("upperLegR", "upper-leg-r");
  createSurface("lowerLegR", "lower-leg-r");
  createSurface("footR", "foot-r");

  const segments: readonly Segment[] = [
    { surface: "upperArmL", start: joints["UpperArm.L"], end: joints["LowerArm.L"], width: 0.22, depth: 0.22 },
    { surface: "lowerArmL", start: joints["LowerArm.L"], end: joints["Fist.L"], width: 0.22, depth: 0.22 },
    { surface: "upperArmR", start: joints["UpperArm.R"], end: joints["LowerArm.R"], width: 0.22, depth: 0.22 },
    { surface: "lowerArmR", start: joints["LowerArm.R"], end: joints["Fist.R"], width: 0.22, depth: 0.22 },
    { surface: "upperLegL", start: joints["UpperLeg.L"], end: joints["LowerLeg.L"], width: 0.22, depth: 0.22 },
    { surface: "lowerLegL", start: joints["LowerLeg.L"], end: joints["Foot.L"], width: 0.22, depth: 0.22 },
    { surface: "upperLegR", start: joints["UpperLeg.R"], end: joints["LowerLeg.R"], width: 0.22, depth: 0.22 },
    { surface: "lowerLegR", start: joints["LowerLeg.R"], end: joints["Foot.R"], width: 0.22, depth: 0.22 },
  ];

  const wearPieces: WearPiece[] = [];
  for (const wearable of appearance.wearables) {
    wearable.pieces.forEach((recipe, index) => {
      wearPieces.push({
        mesh: unitBox(
          scene,
          meshes,
          `humanoid-wear-${wearable.id}-${index}`,
          materialFor(scene, appearance, recipe.material),
        ),
        recipe,
      });
    });
  }

  const equipmentMeshes: AbstractMesh[] = [];
  let equipmentWearPieces: WearPiece[] = [];
  let mode: HumanoidSkinMode = "blocky";
  const meleeAnchor = new TransformNode("humanoid-melee-anchor", scene);
  meleeAnchor.parent = joints["Weapon.R"];
  meleeAnchor.rotationQuaternion = Quaternion.Identity();

  const rangedAnchor = new TransformNode("humanoid-ranged-anchor", scene);
  rangedAnchor.parent = joints["Fist.L"];
  rangedAnchor.position.set(0, 0.05, 0.08);

  let hitPulse = 0;
  const updateSegment = (segment: Segment, unitScale: number) => {
    const start = segment.start.getAbsolutePosition();
    const end = segment.end.getAbsolutePosition();
    end.subtractToRef(start, scratch.direction);
    const mesh = surfaces[segment.surface];
    mesh.position.copyFrom(start).addInPlace(end).scaleInPlace(0.5);
    const segmentLength = scratch.direction.length();
    mesh.scaling.set(
      segment.width * unitScale,
      segmentLength + 0.03 * unitScale,
      segment.depth * unitScale,
    );
    mesh.rotationQuaternion ??= Quaternion.Identity();
    if (segmentLength > 0.000001) {
      scratch.direction.scaleInPlace(1 / segmentLength);
      Quaternion.FromUnitVectorsToRef(Vector3.UpReadOnly, scratch.direction, mesh.rotationQuaternion);
    }
  };

  const updateWearPiece = ({ mesh, recipe }: WearPiece) => {
    const target = surfaces[recipe.surface];
    mesh.rotationQuaternion ??= Quaternion.Identity();
    mesh.rotationQuaternion.copyFrom(target.rotationQuaternion ?? Quaternion.Identity());
    mesh.scaling.set(
      target.scaling.x * recipe.scale[0],
      target.scaling.y * recipe.scale[1],
      target.scaling.z * recipe.scale[2],
    );
    const offset = recipe.offset ?? [0, 0, 0];
    scratch.localOffset.set(
      offset[0] * target.scaling.x,
      offset[1] * target.scaling.y,
      offset[2] * target.scaling.z,
    );
    mesh.rotationQuaternion.toRotationMatrix(scratch.rotationMatrix);
    Vector3.TransformNormalToRef(
      scratch.localOffset,
      scratch.rotationMatrix,
      scratch.worldOffset,
    );
    mesh.position.copyFrom(target.position).addInPlace(scratch.worldOffset);
  };

  const update = () => {
    joints.Hips.getAbsolutePosition().subtractToRef(
      joints.Neck.getAbsolutePosition(),
      scratch.direction,
    );
    const torsoLength = scratch.direction.length();
    const unitScale = Math.max(0.1, torsoLength / 0.57);
    for (const segment of segments) updateSegment(segment, unitScale);

    headOffset.set(0, 0.15 * unitScale, 0);
    copyNodePose(joints.Head, surfaces.head, scratch, headOffset);
    surfaces.head.scaling.setAll(0.48 * unitScale);
    copyNodePose(joints.Torso, surfaces.torso, scratch);
    surfaces.torso.position.copyFrom(joints.Hips.getAbsolutePosition())
      .addInPlace(joints.Neck.getAbsolutePosition())
      .scaleInPlace(0.5);
    surfaces.torso.scaling.set(
      0.52 * unitScale * (1 + hitPulse * 0.06),
      0.62 * unitScale,
      0.28 * unitScale * (1 + hitPulse * 0.06),
    );
    copyNodePose(joints.Hips, surfaces.hips, scratch);
    surfaces.hips.scaling.setAll(0);
    copyNodePose(joints["Fist.L"], surfaces.handL, scratch);
    surfaces.handL.scaling.setAll(0);
    copyNodePose(joints["Fist.R"], surfaces.handR, scratch);
    surfaces.handR.scaling.setAll(0);
    footOffset.set(0, -0.015 * unitScale, 0.07 * unitScale);
    copyNodePose(joints["Foot.L"], surfaces.footL, scratch, footOffset);
    surfaces.footL.scaling.set(0.22 * unitScale, 0.16 * unitScale, 0.28 * unitScale);
    copyNodePose(joints["Foot.R"], surfaces.footR, scratch, footOffset);
    surfaces.footR.scaling.set(0.22 * unitScale, 0.16 * unitScale, 0.28 * unitScale);
    for (const piece of [...wearPieces, ...equipmentWearPieces]) updateWearPiece(piece);
    hitPulse *= 0.78;
  };

  const setSurfaceMaterial = (surface: HumanoidSurfaceName, material: StandardMaterial) => {
    const current = surfaces[surface];
    if (current.material === material) return;
    const replacement = unitBox(scene, meshes, current.name, material);
    replacement.parent = current.parent;
    replacement.position.copyFrom(current.position);
    replacement.rotation.copyFrom(current.rotation);
    replacement.scaling.copyFrom(current.scaling);
    replacement.isVisible = current.isVisible;
    if (current.rotationQuaternion) {
      replacement.rotationQuaternion ??= Quaternion.Identity();
      replacement.rotationQuaternion.copyFrom(current.rotationQuaternion);
    }
    surfaces[surface] = replacement;
    const index = meshes.indexOf(current);
    if (index >= 0) meshes.splice(index, 1);
    current.dispose(false, false);
  };

  const clearEquipment = () => {
    for (const mesh of equipmentMeshes.splice(0)) {
      const index = meshes.indexOf(mesh);
      if (index >= 0) meshes.splice(index, 1);
      mesh.dispose(false, false);
    }
    equipmentWearPieces = [];
    for (const surface of Object.keys(surfaces) as HumanoidSurfaceName[]) {
      setSurfaceMaterial(surface, materialFor(scene, appearance, appearance.body[surface]));
    }
  };

  // 换装频率远低于渲染帧率，只在签名变化时重建少量衣物和武器方块。
  const setEquipment = (equipment: readonly HumanoidEquipmentAppearanceDef[]) => {
    clearEquipment();
    for (const definition of equipment) {
      for (const [surface, material] of Object.entries(definition.surfaces ?? {})) {
        setSurfaceMaterial(
          surface as HumanoidSurfaceName,
          materialFor(scene, definition, material),
        );
      }
      for (const [index, recipe] of (definition.pieces ?? []).entries()) {
        const mesh = unitBox(
          scene,
          meshes,
          `humanoid-equipment-${definition.id}-${index}`,
          materialFor(scene, definition, recipe.material),
        );
        equipmentMeshes.push(mesh);
        equipmentWearPieces.push({ mesh, recipe });
      }
      if (definition.weapon) {
        const anchor = definition.weapon.anchor === "melee" ? meleeAnchor : rangedAnchor;
        definition.weapon.pieces.forEach((recipe, index) => {
          const mesh = weaponBox(
            scene,
            meshes,
            anchor,
            `humanoid-equipment-${definition.id}-weapon-${index}`,
            recipe.size,
            recipe.position,
            materialFor(scene, definition, recipe.material),
          );
          mesh.rotation.set(...(recipe.rotation ?? [0, 0, 0]));
          equipmentMeshes.push(mesh);
        });
      }
    }
    for (const mesh of equipmentMeshes) mesh.setEnabled(mode === "blocky");
    update();
  };

  const setMode = (next: HumanoidSkinMode) => {
    mode = next;
    for (const mesh of sourceMeshes) mesh.visibility = mode === "original" ? 1 : 0;
    for (const mesh of meshes) mesh.setEnabled(mode === "blocky");
  };
  setMode(mode);

  return {
    meshes,
    meleeAnchor,
    rangedAnchor,
    update,
    flashHit(amount) {
      hitPulse = Math.max(hitPulse, Math.min(1, amount));
    },
    setEquipment,
    setMode,
    dispose() {
      for (const mesh of meshes) mesh.dispose(false, false);
      meleeAnchor.dispose(false, false);
      rangedAnchor.dispose(false, false);
    },
  };
}
