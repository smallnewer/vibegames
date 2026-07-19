import type { Material } from "@babylonjs/core/Materials/material";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import "@babylonjs/core/Meshes/instancedMesh";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import type { Scene } from "@babylonjs/core/scene";
import type { StatusVisualSnapshot } from "../../../core/GameSnapshot";
import { getStatusVfxRecipe, type StatusVfxRecipe } from "./StatusVfxRegistry";

export type StatusVfxStyle = "legacy" | "v2";

export interface ActorStatusTarget {
  readonly actorId: number;
  readonly root: TransformNode;
  readonly meshes: readonly AbstractMesh[];
  readonly statuses: readonly StatusVisualSnapshot[];
}

interface ActiveStatusVfx {
  readonly key: string;
  readonly actorId: number;
  readonly recipe: StatusVfxRecipe;
  readonly root: TransformNode;
  readonly meshes: readonly InstancedMesh[];
  readonly particles: readonly ParticleSystem[];
  phase: number;
}

interface BodyMaterialBinding {
  readonly original: Material;
  readonly overlay: StandardMaterial;
  readonly baseDiffuse: Color3;
  readonly baseEmissive: Color3;
}

interface BodyTintState {
  readonly actorId: number;
  readonly recipe: StatusVfxRecipe;
  readonly bindings: Map<AbstractMesh, BodyMaterialBinding>;
  phase: number;
}

const MAX_STATUS_PER_ACTOR = 2;
const MAX_STATUS_OVERLAYS = 24;

const STATUS_TEXTURES = {
  flame: "/game-assets/vfx-v2/flame.png",
  spark: "/game-assets/vfx-v2/slash-line.png",
  poison: "/game-assets/vfx-v2/poison-smoke.png",
} as const;

export class ActorStatusVfx {
  private readonly active = new Map<string, ActiveStatusVfx>();
  private readonly sources = new Map<string, Mesh>();
  private readonly materials = new Map<string, StandardMaterial>();
  private readonly bodyTints = new Map<number, BodyTintState>();
  private style: StatusVfxStyle = "legacy";

  constructor(private readonly scene: Scene) {}

  setStyle(style: StatusVfxStyle): void {
    if (style === this.style) return;
    for (const effect of this.active.values()) this.disposeEffect(effect);
    for (const state of this.bodyTints.values()) this.restoreBodyTint(state);
    this.active.clear();
    this.bodyTints.clear();
    this.style = style;
  }

  // 同屏超量时按快照顺序稳定截断，避免大量小怪把特效预算冲垮。
  sync(targets: readonly ActorStatusTarget[]): void {
    const desired = new Map<string, { target: ActorStatusTarget; recipe: StatusVfxRecipe }>();
    const desiredTints = new Map<number, { target: ActorStatusTarget; recipe: StatusVfxRecipe }>();
    for (const target of targets) {
      target.root.scaling.setAll(1);
      for (const status of target.statuses.slice(0, MAX_STATUS_PER_ACTOR)) {
        if (desired.size >= MAX_STATUS_OVERLAYS) break;
        const recipe = getStatusVfxRecipe(status.visual);
        desired.set(`${target.actorId}:${status.visual}`, { target, recipe });
        if (
          this.style === "v2"
          && !desiredTints.has(target.actorId)
          && (
            recipe.kind === "burning"
            || recipe.kind === "poisoned"
            || recipe.kind === "frozen"
          )
        ) {
          desiredTints.set(target.actorId, { target, recipe });
        }
      }
      const scaleRecipe = target.statuses
        .map((status) => getStatusVfxRecipe(status.visual))
        .find((recipe) => recipe.actorScale !== 1);
      if (scaleRecipe) target.root.scaling.setAll(scaleRecipe.actorScale);
    }

    for (const [key, effect] of this.active) {
      if (desired.has(key)) continue;
      this.disposeEffect(effect);
      this.active.delete(key);
    }
    for (const [key, value] of desired) {
      if (this.active.has(key)) continue;
      this.active.set(key, this.create(key, value.target, value.recipe));
    }
    this.syncBodyTints(desiredTints);
  }

  update(delta: number): void {
    for (const state of this.bodyTints.values()) {
      state.phase += delta;
      this.updateBodyTint(state);
    }
    for (const effect of this.active.values()) {
      effect.phase += delta;
      const pulse = 1 + Math.sin(effect.phase * 5) * 0.06;
      effect.root.rotation.y += delta * (effect.recipe.kind === "stunned" ? 2.8 : 0.8);
      for (let index = 0; index < effect.meshes.length; index += 1) {
        const mesh = effect.meshes[index];
        if (effect.recipe.kind === "poisoned") {
          mesh.position.y = 0.25 + ((effect.phase * 0.55 + index * 0.31) % 1.7);
        } else if (effect.recipe.kind === "burning") {
          mesh.scaling.y = pulse + index * 0.035;
          mesh.position.y = 0.35 + Math.sin(effect.phase * 7 + index) * 0.08;
        } else if (effect.recipe.kind === "frozen") {
          mesh.scaling.setAll(0.96 + Math.sin(effect.phase * 3 + index) * 0.04);
        } else {
          mesh.scaling.setAll(pulse);
        }
      }
    }
  }

  get activeCount(): number {
    return this.active.size;
  }

  get bodyTintCount(): number {
    return this.bodyTints.size;
  }

  get activeParticleSystemCount(): number {
    return [...this.active.values()].reduce(
      (total, effect) => total + effect.particles.length,
      0,
    );
  }

  dispose(): void {
    for (const effect of this.active.values()) this.disposeEffect(effect);
    for (const state of this.bodyTints.values()) this.restoreBodyTint(state);
    for (const source of this.sources.values()) source.dispose(false, false);
    for (const material of this.materials.values()) material.dispose();
    this.active.clear();
    this.bodyTints.clear();
    this.sources.clear();
  }

  private create(
    key: string,
    target: ActorStatusTarget,
    recipe: StatusVfxRecipe,
  ): ActiveStatusVfx {
    const root = new TransformNode(`status-${key}`, this.scene);
    root.parent = target.root;
    const useV2Particles = this.style === "v2"
      && (
        recipe.kind === "burning"
        || recipe.kind === "poisoned"
        || recipe.kind === "frozen"
      );
    const meshes = useV2Particles ? [] : this.makeInstances(recipe, key);
    for (const mesh of meshes) mesh.parent = root;
    const particles = useV2Particles ? this.makeV2Particles(recipe, key, root) : [];
    return { key, actorId: target.actorId, recipe, root, meshes, particles, phase: 0 };
  }

  private syncBodyTints(
    desired: ReadonlyMap<number, { target: ActorStatusTarget; recipe: StatusVfxRecipe }>,
  ): void {
    for (const [actorId, state] of this.bodyTints) {
      const next = desired.get(actorId);
      if (next?.recipe.kind === state.recipe.kind) continue;
      this.restoreBodyTint(state);
      this.bodyTints.delete(actorId);
    }
    for (const [actorId, value] of desired) {
      let state = this.bodyTints.get(actorId);
      if (!state) {
        state = {
          actorId,
          recipe: value.recipe,
          bindings: new Map(),
          phase: 0,
        };
        this.bodyTints.set(actorId, state);
      }
      this.refreshBodyBindings(state, value.target.meshes);
      this.updateBodyTint(state);
    }
  }

  // 每个角色克隆自己的材质，状态着色绝不能污染共享皮肤和其他角色。
  private refreshBodyBindings(
    state: BodyTintState,
    meshes: readonly AbstractMesh[],
  ): void {
    const desired = new Set(meshes.filter((mesh) => !mesh.isDisposed()));
    for (const [mesh, binding] of state.bindings) {
      if (desired.has(mesh) && mesh.material === binding.overlay) continue;
      if (!mesh.isDisposed() && mesh.material === binding.overlay) mesh.material = binding.original;
      binding.overlay.dispose(false, false);
      state.bindings.delete(mesh);
    }
    for (const mesh of desired) {
      if (state.bindings.has(mesh)) continue;
      // 方块人实例跨角色共享源材质；实例不能持有独立状态材质。
      if (mesh instanceof InstancedMesh) continue;
      const original = mesh.material;
      if (!(original instanceof StandardMaterial)) continue;
      const overlay = original.clone(`status-v2-body-${state.actorId}-${mesh.name}`);
      overlay.specularColor = Color3.Black();
      mesh.material = overlay;
      state.bindings.set(mesh, {
        original,
        overlay,
        baseDiffuse: original.diffuseColor.clone(),
        baseEmissive: original.emissiveColor.clone(),
      });
    }
  }

  private updateBodyTint(state: BodyTintState): void {
    const speed = state.recipe.kind === "burning" ? 8 : state.recipe.kind === "frozen" ? 2.2 : 3.4;
    const wave = (Math.sin(state.phase * speed) + 1) / 2;
    const effectColor = state.recipe.kind === "burning"
      ? Color3.Lerp(Color3.FromHexString("#9f1f0c"), Color3.FromHexString("#f06a16"), wave)
      : state.recipe.kind === "frozen"
        ? Color3.Lerp(Color3.FromHexString("#48aedd"), Color3.FromHexString("#d8faff"), wave * 0.76)
        : Color3.Lerp(Color3.FromHexString("#55d82c"), Color3.FromHexString("#8d45c7"), wave * 0.72);
    const weight = state.recipe.kind === "burning"
      ? 0.32 + wave * 0.1
      : state.recipe.kind === "frozen"
        ? 0.48 + wave * 0.1
        : 0.38 + wave * 0.08;
    const emission = state.recipe.kind === "burning"
      ? 0.08 + wave * 0.09
      : state.recipe.kind === "frozen"
        ? 0.11 + wave * 0.08
        : 0.15 + wave * 0.1;
    for (const binding of state.bindings.values()) {
      binding.overlay.diffuseColor.copyFrom(
        Color3.Lerp(binding.baseDiffuse, effectColor, weight),
      );
      binding.overlay.emissiveColor.copyFrom(
        binding.baseEmissive.add(effectColor.scale(emission)),
      );
    }
  }

  private restoreBodyTint(state: BodyTintState): void {
    for (const [mesh, binding] of state.bindings) {
      if (!mesh.isDisposed() && mesh.material === binding.overlay) mesh.material = binding.original;
      binding.overlay.dispose(false, false);
    }
    state.bindings.clear();
  }

  private makeV2Particles(
    recipe: StatusVfxRecipe,
    key: string,
    root: TransformNode,
  ): ParticleSystem[] {
    if (recipe.kind === "burning") {
      const flames = this.particleSystem(
        `${key}-flames`,
        36,
        root,
        STATUS_TEXTURES.flame,
        true,
      );
      flames.blendMode = ParticleSystem.BLENDMODE_ADD;
      flames.emitRate = 18;
      flames.minLifeTime = 0.48;
      flames.maxLifeTime = 0.86;
      flames.minSize = 0.34;
      flames.maxSize = 0.62;
      flames.minEmitBox = new Vector3(-0.34, 0.08, -0.24);
      flames.maxEmitBox = new Vector3(0.34, 1.42, 0.24);
      flames.direction1 = new Vector3(-0.12, 0.8, -0.08);
      flames.direction2 = new Vector3(0.12, 1.2, 0.08);
      flames.color1 = new Color4(1, 1, 1, 0.94);
      flames.color2 = new Color4(1, 0.72, 0.48, 0.82);
      flames.colorDead = new Color4(0.32, 0.04, 0.01, 0);
      flames.start();

      const sparks = this.particleSystem(`${key}-sparks`, 18, root, STATUS_TEXTURES.spark);
      sparks.blendMode = ParticleSystem.BLENDMODE_ADD;
      sparks.emitRate = 8;
      sparks.minLifeTime = 0.42;
      sparks.maxLifeTime = 0.9;
      sparks.minSize = 0.035;
      sparks.maxSize = 0.09;
      sparks.minEmitBox = new Vector3(-0.38, 0.18, -0.28);
      sparks.maxEmitBox = new Vector3(0.38, 1.5, 0.28);
      sparks.direction1 = new Vector3(-0.35, 0.9, -0.35);
      sparks.direction2 = new Vector3(0.35, 1.55, 0.35);
      sparks.color1 = new Color4(1, 0.88, 0.28, 1);
      sparks.color2 = new Color4(1, 0.25, 0.04, 0.8);
      sparks.colorDead = new Color4(0.5, 0.03, 0, 0);
      sparks.start();
      return [flames, sparks];
    }

    if (recipe.kind === "frozen") {
      const mist = this.particleSystem(`${key}-ice-mist`, 26, root, STATUS_TEXTURES.poison);
      mist.blendMode = ParticleSystem.BLENDMODE_STANDARD;
      mist.emitRate = 12;
      mist.minLifeTime = 0.9;
      mist.maxLifeTime = 1.55;
      mist.minSize = 0.28;
      mist.maxSize = 0.62;
      mist.minEmitBox = new Vector3(-0.38, 0.08, -0.28);
      mist.maxEmitBox = new Vector3(0.38, 1.4, 0.28);
      mist.direction1 = new Vector3(-0.1, 0.05, -0.08);
      mist.direction2 = new Vector3(0.1, 0.22, 0.08);
      mist.color1 = new Color4(0.55, 0.9, 1, 0.34);
      mist.color2 = new Color4(0.88, 0.98, 1, 0.24);
      mist.colorDead = new Color4(0.38, 0.72, 0.9, 0);
      mist.start();

      const frost = this.particleSystem(`${key}-frost`, 20, root, STATUS_TEXTURES.spark);
      frost.blendMode = ParticleSystem.BLENDMODE_ADD;
      frost.emitRate = 7;
      frost.minLifeTime = 0.45;
      frost.maxLifeTime = 0.9;
      frost.minSize = 0.06;
      frost.maxSize = 0.14;
      frost.minScaleX = 0.22;
      frost.maxScaleX = 0.46;
      frost.minScaleY = 1.2;
      frost.maxScaleY = 2.1;
      frost.minEmitBox = new Vector3(-0.42, 0.16, -0.3);
      frost.maxEmitBox = new Vector3(0.42, 1.52, 0.3);
      frost.direction1 = new Vector3(-0.2, -0.08, -0.16);
      frost.direction2 = new Vector3(0.2, 0.28, 0.16);
      frost.gravity = new Vector3(0, -0.08, 0);
      frost.color1 = new Color4(0.72, 0.95, 1, 0.95);
      frost.color2 = new Color4(1, 1, 1, 0.82);
      frost.colorDead = new Color4(0.42, 0.78, 1, 0);
      frost.start();
      return [mist, frost];
    }

    const smoke = this.particleSystem(`${key}-smoke`, 28, root, STATUS_TEXTURES.poison);
    smoke.blendMode = ParticleSystem.BLENDMODE_ADD;
    smoke.emitRate = 14;
    smoke.minLifeTime = 1.05;
    smoke.maxLifeTime = 1.75;
    smoke.minSize = 0.38;
    smoke.maxSize = 0.82;
    smoke.minEmitBox = new Vector3(-0.38, 0.12, -0.28);
    smoke.maxEmitBox = new Vector3(0.38, 1.15, 0.28);
    smoke.direction1 = new Vector3(-0.12, 0.18, -0.1);
    smoke.direction2 = new Vector3(0.12, 0.42, 0.1);
    smoke.color1 = new Color4(0.34, 1, 0.18, 0.68);
    smoke.color2 = new Color4(0.68, 0.2, 0.9, 0.58);
    smoke.colorDead = new Color4(0.12, 0.02, 0.18, 0);
    smoke.start();
    return [smoke];
  }

  private particleSystem(
    name: string,
    capacity: number,
    emitter: TransformNode,
    textureUrl: string,
    animationSheet = false,
  ): ParticleSystem {
    const system = new ParticleSystem(
      `status-v2-${name}`,
      capacity,
      this.scene,
      undefined,
      animationSheet,
    );
    system.emitter = emitter;
    system.particleTexture = new Texture(
      textureUrl,
      this.scene,
      false,
      false,
      Texture.NEAREST_SAMPLINGMODE,
    );
    system.minEmitPower = 0.35;
    system.maxEmitPower = 0.72;
    system.minAngularSpeed = -1.2;
    system.maxAngularSpeed = 1.2;
    system.updateSpeed = 0.012;
    system.gravity = new Vector3(0, 0.08, 0);
    if (animationSheet) {
      system.spriteCellWidth = 64;
      system.spriteCellHeight = 64;
      system.startSpriteCellID = 0;
      system.endSpriteCellID = 59;
      system.spriteCellChangeSpeed = 1;
      system.spriteRandomStartCell = true;
    }
    return system;
  }

  private disposeEffect(effect: ActiveStatusVfx): void {
    for (const system of effect.particles) system.dispose(true);
    effect.root.dispose(false, false);
  }

  private makeInstances(recipe: StatusVfxRecipe, key: string): InstancedMesh[] {
    const values: InstancedMesh[] = [];
    const add = (
      shape: "ring" | "shard" | "orb" | "flame" | "star" | "corner",
      index: number,
      x: number,
      y: number,
      z: number,
      accent = false,
    ) => {
      const source = this.source(shape, accent ? recipe.accent : recipe.color);
      const mesh = source.createInstance(`${key}-${shape}-${index}`);
      mesh.position.set(x, y, z);
      values.push(mesh);
      return mesh;
    };

    if (recipe.kind === "frozen") {
      add("ring", 0, 0, 0.08, 0);
      for (let index = 0; index < 5; index += 1) {
        const angle = index / 5 * Math.PI * 2;
        const shard = add("shard", index, Math.cos(angle) * 0.46, 0.48, Math.sin(angle) * 0.46, index % 2 === 0);
        shard.rotation.z = angle * 0.25;
      }
    } else if (recipe.kind === "poisoned") {
      add("ring", 0, 0, 0.08, 0);
      for (let index = 0; index < 5; index += 1) {
        const angle = index / 5 * Math.PI * 2;
        add("orb", index, Math.cos(angle) * 0.42, 0.3 + index * 0.22, Math.sin(angle) * 0.42, index % 2 === 0);
      }
    } else if (recipe.kind === "burning") {
      for (let index = 0; index < 6; index += 1) {
        const angle = index / 6 * Math.PI * 2;
        const flame = add("flame", index, Math.cos(angle) * 0.4, 0.32, Math.sin(angle) * 0.4, index % 2 === 0);
        flame.rotation.z = Math.PI / 4;
      }
    } else if (recipe.kind === "stunned") {
      const halo = add("ring", 0, 0, 2.15, 0, true);
      halo.scaling.setAll(0.75);
      for (let index = 0; index < 4; index += 1) {
        const angle = index / 4 * Math.PI * 2;
        const star = add("star", index, Math.cos(angle) * 0.55, 2.15, Math.sin(angle) * 0.55, index % 2 === 0);
        star.rotation.z = Math.PI / 4;
      }
    } else if (recipe.kind === "shrunk") {
      add("ring", 0, 0, 0.08, 0);
      const middle = add("ring", 1, 0, 0.9, 0, true);
      middle.scaling.setAll(0.65);
    } else {
      add("ring", 0, 0, 0.08, 0, true).scaling.setAll(1.25);
      for (let index = 0; index < 4; index += 1) {
        const angle = index / 4 * Math.PI * 2 + Math.PI / 4;
        add("corner", index, Math.cos(angle) * 0.72, 0.95, Math.sin(angle) * 0.72, index % 2 === 0);
      }
    }
    return values;
  }

  private source(shape: string, color: string): Mesh {
    const key = `${shape}:${color}`;
    const cached = this.sources.get(key);
    if (cached) return cached;
    let mesh: Mesh;
    if (shape === "ring") {
      mesh = MeshBuilder.CreateTorus(`status-source-${key}`, { diameter: 1.05, thickness: 0.065, tessellation: 20 }, this.scene);
    } else if (shape === "orb") {
      mesh = MeshBuilder.CreateIcoSphere(`status-source-${key}`, { radius: 0.1, subdivisions: 1 }, this.scene);
    } else if (shape === "star") {
      mesh = MeshBuilder.CreateBox(`status-source-${key}`, { size: 0.18 }, this.scene);
      mesh.scaling.set(1.4, 0.3, 1.4);
    } else if (shape === "flame") {
      mesh = MeshBuilder.CreateCylinder(`status-source-${key}`, { height: 0.42, diameterTop: 0, diameterBottom: 0.23, tessellation: 4 }, this.scene);
    } else if (shape === "corner") {
      mesh = MeshBuilder.CreateBox(`status-source-${key}`, { width: 0.12, height: 0.44, depth: 0.12 }, this.scene);
      mesh.rotation.z = Math.PI / 4;
    } else {
      mesh = MeshBuilder.CreateCylinder(`status-source-${key}`, { height: 0.52, diameterTop: 0, diameterBottom: 0.19, tessellation: 4 }, this.scene);
    }
    mesh.material = this.material(color);
    mesh.isVisible = false;
    this.sources.set(key, mesh);
    return mesh;
  }

  private material(color: string): StandardMaterial {
    const cached = this.materials.get(color);
    if (cached) return cached;
    const material = new StandardMaterial(`status-material-${color}`, this.scene);
    material.diffuseColor = Color3.FromHexString(color);
    material.emissiveColor = Color3.FromHexString(color).scale(0.9);
    material.specularColor = Color3.Black();
    material.alpha = 0.78;
    material.disableDepthWrite = true;
    this.materials.set(color, material);
    return material;
  }
}
