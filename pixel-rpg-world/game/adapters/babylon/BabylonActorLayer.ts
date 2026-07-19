import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { Observer } from "@babylonjs/core/Misc/observable";
import type { Node } from "@babylonjs/core/node";
import type { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Quaternion } from "@babylonjs/core/Maths/math.vector";
import type { ActorAction, ActorLocomotion } from "../../actor/ActorComponents";
import type {
  ActorAnimationPlayback,
  ActorVisualDef,
} from "../../content/ActorDefinitions";
import type { ActorSnapshot, EquippedVisualSnapshot } from "../../core/GameSnapshot";
import type { AssetDef, DungeonVisualDef } from "../../dungeon/DungeonDefinitions";
import { createActorVisual, type ActorVisual } from "./BabylonActors";
import type { PlacementInstance } from "./BabylonPlacementLayer";
import type { CharacterPose } from "./art/CharacterAnimator";
import { LayeredAnimationPlayer } from "./LayeredAnimationPlayer";
import { getHumanoidAppearance } from "./art/HumanoidAppearance";
import { getEquipmentAppearance } from "./art/EquipmentAppearance";
import {
  createHumanoidSkin,
  resolveHumanoidJoints,
  type HumanoidSkin,
} from "./art/HumanoidSkin";

export interface ActorAssetPort {
  preload(definitions: readonly AssetDef[]): Promise<void>;
  instantiate(assetId: string, name: string): Promise<PlacementInstance>;
}

interface ActorRecord {
  readonly id: number;
  readonly definition: ActorVisualDef;
  readonly root: TransformNode;
  readonly fallback: ActorVisual;
  readonly visual: ActorVisual;
  readonly playerSlot?: number;
  action: ActorAction;
  actionDuration: number;
  locomotion: ActorLocomotion;
  loading: boolean;
  disposed: boolean;
  equipmentSignature: string;
  equipmentVisuals: readonly EquippedVisualSnapshot[];
  modelRoot?: TransformNode;
  instance?: PlacementInstance;
  animations?: readonly AnimationGroup[];
  animationPlayer?: LayeredAnimationPlayer;
  rig?: HumanoidRig;
  skin?: HumanoidSkin;
}

interface RigJoint {
  readonly node: TransformNode;
  readonly base: Quaternion;
}

interface HumanoidRig {
  readonly torso?: RigJoint;
  readonly leftShoulder?: RigJoint;
  readonly rightShoulder?: RigJoint;
  readonly rightElbow?: RigJoint;
}

export interface ActorLayerStatus {
  animated: number;
  fallback: number;
  pending: number;
}

export function actorSkinUpdateInterval(playerSlot: number | undefined, visible: boolean): number {
  if (playerSlot !== undefined) return 1;
  return visible ? 2 : 8;
}

// 模型异步替换像素替身；逻辑实体和场景根节点始终不变。
export class BabylonActorLayer {
  private readonly definitions: Map<string, ActorVisualDef>;
  private readonly records = new Map<number, ActorRecord>();
  private readonly skinObserver: Observer<Scene>;
  private renderFrame = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    private readonly assets: ActorAssetPort,
    definitions: readonly ActorVisualDef[],
    private readonly onError: (message: string) => void = () => {},
  ) {
    this.definitions = new Map(definitions.map((definition) => [definition.id, definition]));
    this.skinObserver = scene.onBeforeRenderObservable.add(() => this.updateSkins());
  }

  getOrCreate(
    actor: ActorSnapshot,
    themeId: string,
    enemyPalette: DungeonVisualDef["enemy"],
  ): ActorVisual {
    const existing = this.records.get(actor.id);
    if (existing) return existing.visual;
    const definition = this.definitions.get(actor.visualId);
    if (!definition) throw new Error(`Unknown actor visual: ${actor.visualId}`);
    const root = new TransformNode(`actor-${actor.id}`, this.scene);
    const fallback = createActorVisual(
      this.scene,
      actor.faction,
      actor.playerSlot,
      themeId,
      enemyPalette,
    );
    fallback.root.parent = root;
    const record = {} as ActorRecord;
    const visual: ActorVisual = {
      root,
      body: fallback.body,
      leftArm: fallback.leftArm,
      rightArm: fallback.rightArm,
      leftLeg: fallback.leftLeg,
      rightLeg: fallback.rightLeg,
      get meleeAnchor() {
        return record.skin?.meleeAnchor ?? fallback.meleeAnchor;
      },
      get rangedAnchor() {
        return record.skin?.rangedAnchor ?? fallback.rangedAnchor;
      },
      get hitMeshes() {
        return record.skin?.meshes ?? fallback.hitMeshes;
      },
      applyPose: (pose) => {
        if (record.skin) return;
        if (!record.instance) fallback.applyPose(pose);
        else this.applyDynamicPose(record, pose);
      },
      flashHit: (amount) => {
        if (record.skin) record.skin.flashHit(amount);
        else fallback.flashHit(amount);
      },
      dispose: () => this.release(record),
    };
    Object.assign(record, {
      id: actor.id,
      definition,
      root,
      fallback,
      visual,
      playerSlot: actor.playerSlot,
      action: actor.action,
      actionDuration: actor.actionDuration,
      locomotion: actor.locomotion,
      loading: false,
      disposed: false,
      equipmentSignature: "",
      equipmentVisuals: [],
    });
    this.records.set(actor.id, record);
    if (this.canAnimate(definition)) void this.promote(record);
    return visual;
  }

  setAction(
    id: number,
    action: ActorAction,
    actionDuration = 0,
    locomotion: ActorLocomotion = "idle",
  ): ActorAnimationPlayback | undefined {
    const record = this.records.get(id);
    if (!record) return undefined;
    if (record.action === action && record.locomotion === locomotion) {
      record.actionDuration = actionDuration;
      return undefined;
    }
    record.action = action;
    record.actionDuration = actionDuration;
    record.locomotion = locomotion;
    return record.animationPlayer ? this.play(record) : undefined;
  }

  setEquipment(id: number, equipment: readonly EquippedVisualSnapshot[]): void {
    const record = this.records.get(id);
    if (!record) return;
    const signature = equipment.map((value) => `${value.slot}:${value.visual}`).join("|");
    if (record.equipmentSignature === signature) return;
    record.equipmentSignature = signature;
    record.equipmentVisuals = equipment.map((value) => ({ ...value }));
    record.skin?.setEquipment(equipment.map((value) => getEquipmentAppearance(value.visual)));
  }

  removeMissing(live: ReadonlySet<number>): void {
    for (const [id, record] of this.records) {
      if (!live.has(id)) this.release(record);
    }
  }

  get(id: number): ActorVisual | undefined {
    return this.records.get(id)?.visual;
  }

  visualHeight(id: number, archetype: string): number {
    const record = this.records.get(id);
    const meshes = record?.visual.hitMeshes ?? [];
    if (record?.skin && meshes.length > 0) {
      for (const mesh of meshes) mesh.computeWorldMatrix(true);
      const minimum = Math.min(...meshes.map((mesh) => (
        mesh.getBoundingInfo().boundingBox.minimumWorld.y
      )));
      const maximum = Math.max(...meshes.map((mesh) => (
        mesh.getBoundingInfo().boundingBox.maximumWorld.y
      )));
      const height = maximum - minimum;
      if (Number.isFinite(height) && height >= 0.6 && height <= 4) return height;
    }
    return archetype.includes("turret") ? 1.3 : 1.9;
  }

  status(): ActorLayerStatus {
    const values = [...this.records.values()];
    return {
      animated: values.filter((record) => record.instance !== undefined).length,
      fallback: values.filter((record) => record.instance === undefined).length,
      pending: values.filter((record) => record.loading).length,
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.onBeforeRenderObservable.remove(this.skinObserver);
    for (const record of [...this.records.values()]) this.release(record);
  }

  private canAnimate(definition: ActorVisualDef): boolean {
    return [...this.records.values()].filter((record) => (
      record.definition.id === definition.id && (record.loading || record.instance)
    )).length < definition.lod.maxAnimatedInstances;
  }

  private async promote(record: ActorRecord): Promise<void> {
    record.loading = true;
    try {
      await this.assets.preload([{
        id: record.definition.asset,
        kind: "model",
        url: record.definition.url,
      }]);
      const instance = await this.assets.instantiate(
        record.definition.asset,
        `actor-${record.id}`,
      );
      if (this.disposed || record.disposed) {
        instance.dispose();
        return;
      }
      const modelRoot = new TransformNode(`actor-${record.id}-model`, this.scene);
      modelRoot.parent = record.root;
      modelRoot.position.y = record.definition.yOffset;
      modelRoot.rotation.y = record.definition.rotationY;
      modelRoot.scaling.setAll(record.definition.scale);
      for (const child of instance.rootNodes) child.parent = modelRoot;
      const appearanceId = record.definition.appearance;
      if (appearanceId) {
        const nodes = this.allNodes(instance.rootNodes);
        const skin = createHumanoidSkin(
          this.scene,
          resolveHumanoidJoints(nodes.filter(
            (node): node is TransformNode => node instanceof TransformNode,
          )),
          nodes.filter((node): node is AbstractMesh => node instanceof AbstractMesh),
          getHumanoidAppearance(appearanceId),
        );
        skin.update();
        skin.setEquipment(record.equipmentVisuals.map((value) => (
          getEquipmentAppearance(value.visual)
        )));
        record.skin = skin;
      } else {
        this.bindSocket(
          record.fallback.meleeAnchor,
          record.definition.sockets.melee,
          instance.rootNodes,
          modelRoot,
        );
        this.bindSocket(
          record.fallback.rangedAnchor,
          record.definition.sockets.ranged,
          instance.rootNodes,
          modelRoot,
        );
      }
      record.modelRoot = modelRoot;
      record.instance = instance;
      record.animations = instance.animationGroups;
      record.animationPlayer = new LayeredAnimationPlayer(
        instance.animationGroups,
        record.definition,
      );
      if (!record.skin) record.rig = this.captureHumanoidRig(instance.rootNodes);
      record.fallback.root.setEnabled(false);
      this.play(record);
    } catch (source: unknown) {
      const message = source instanceof Error ? source.message : String(source);
      this.onError(`${record.definition.id}: ${message}`);
    } finally {
      record.loading = false;
    }
  }

  private play(record: ActorRecord): ActorAnimationPlayback | undefined {
    const clip = record.definition.animations[record.action]
      ?? record.definition.animations.idle;
    this.resetRig(record);
    record.fallback.meleeAnchor.rotation.set(0, 0, 0);
    if (record.action === "melee" && clip === record.definition.animations.idle) {
      record.animationPlayer?.stop();
      return undefined;
    }
    return record.animationPlayer?.play(
      record.action,
      record.actionDuration,
      record.locomotion,
    );
  }

  // 没有专用近战片段时，用标准人形骨骼做清晰的蓄力、挥砍和收招。
  private applyDynamicPose(record: ActorRecord, pose: CharacterPose): void {
    if (
      record.action !== "melee"
      || record.definition.animations.melee !== record.definition.animations.idle
    ) {
      return;
    }
    this.rotateJoint(record.rig?.torso, pose.bodyPitch, 0, pose.bodyRoll);
    this.rotateJoint(
      record.rig?.rightShoulder,
      pose.rightArmPitch * 0.58,
      pose.weaponYaw * 0.7,
      -pose.weaponYaw * 0.55,
    );
    this.rotateJoint(record.rig?.rightElbow, pose.rightArmPitch * 0.18, 0, -0.28);
    this.rotateJoint(record.rig?.leftShoulder, pose.leftArmPitch * 0.28, 0, 0.12);
    record.fallback.meleeAnchor.rotation.set(
      pose.rightArmPitch * 0.12,
      pose.weaponYaw * 0.8,
      -pose.weaponYaw * 0.75,
    );
  }

  private captureHumanoidRig(roots: readonly Node[]): HumanoidRig | undefined {
    const nodes = this.allNodes(roots);
    const joint = (name: string): RigJoint | undefined => {
      const node = nodes.find((value) => value.name === name);
      if (!(node instanceof TransformNode)) return undefined;
      return {
        node,
        base: node.rotationQuaternion?.clone()
          ?? Quaternion.FromEulerAngles(node.rotation.x, node.rotation.y, node.rotation.z),
      };
    };
    const rig = {
      torso: joint("torso_joint_1"),
      leftShoulder: joint("arm_joint_L_1"),
      rightShoulder: joint("arm_joint_R_1"),
      rightElbow: joint("arm_joint_R_2"),
    };
    return Object.values(rig).some(Boolean) ? rig : undefined;
  }

  private rotateJoint(joint: RigJoint | undefined, pitch: number, yaw: number, roll: number): void {
    if (!joint) return;
    joint.node.rotationQuaternion = joint.base.multiply(
      Quaternion.FromEulerAngles(pitch, yaw, roll),
    );
  }

  private resetRig(record: ActorRecord): void {
    for (const joint of Object.values(record.rig ?? {})) {
      if (joint) joint.node.rotationQuaternion = joint.base.clone();
    }
  }

  private bindSocket(
    anchor: TransformNode,
    socket: ActorVisualDef["sockets"]["melee"],
    roots: readonly Node[],
    modelRoot: TransformNode,
  ): void {
    const nodes = this.allNodes(roots);
    const named = socket.node
      ? nodes.find((node) => node.name === socket.node)
      : undefined;
    anchor.parent = named instanceof TransformNode ? named : modelRoot;
    anchor.position.set(
      named ? 0 : socket.fallback.x,
      named ? 0 : socket.fallback.y,
      named ? 0 : socket.fallback.z,
    );
    anchor.rotation.set(0, 0, 0);
  }

  private allNodes(roots: readonly Node[]): Node[] {
    return roots.flatMap((root) => [root, ...root.getDescendants(false)]);
  }

  private updateSkins(): void {
    this.renderFrame += 1;
    const camera = this.scene.activeCamera;
    for (const record of this.records.values()) {
      const skin = record.skin;
      if (!skin || record.disposed || !record.root.isEnabled()) continue;
      // 皮肤部件处在同一个角色包围范围内；每角色探测一个代表部件即可。
      // 对每个方块做视锥测试会在 30+ 敌人时把合批节省的 CPU 全吃回去。
      const visibilityProbe = skin.meshes.find((mesh) => (
        mesh.isEnabled()
        && mesh.isVisible
        && mesh.scaling.lengthSquared() > 0.000001
      ));
      const visible = camera === null
        || visibilityProbe === undefined
        || camera.isInFrustum(visibilityProbe);
      const interval = actorSkinUpdateInterval(record.playerSlot, visible);
      if (this.renderFrame % interval === 0) skin.update();
    }
  }

  private release(record: ActorRecord): void {
    if (record.disposed) return;
    record.disposed = true;
    this.records.delete(record.id);
    record.skin?.dispose();
    for (const child of record.instance?.rootNodes ?? []) child.parent = null;
    record.instance?.dispose();
    record.modelRoot?.dispose();
    record.fallback.dispose();
    record.root.dispose();
  }
}
