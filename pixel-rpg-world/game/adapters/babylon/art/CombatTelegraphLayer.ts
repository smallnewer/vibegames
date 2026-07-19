import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";
import type { DamageType } from "../../../combat/DamagePacket";
import type { GameplayEvent } from "../../../core/GameplayEvent";
import type { GameSnapshot } from "../../../core/GameSnapshot";

type TelegraphStarted = Extract<GameplayEvent, { type: "ability_telegraph_started" }>;
type TelegraphShape = TelegraphStarted["shape"];

export const TELEGRAPH_POOL_LIMITS = Object.freeze({
  circle: 16,
  cone: 8,
  line: 8,
});

export interface TelegraphGeometry {
  readonly x: number;
  readonly z: number;
  readonly rotationY: number;
  readonly width: number;
  readonly depth: number;
  readonly opacity: number;
}

interface ActiveTelegraph {
  readonly key: string;
  readonly mesh: Mesh;
  readonly shape: TelegraphShape;
  readonly event: TelegraphStarted;
  readonly sourceX: number;
  readonly sourceZ: number;
  elapsed: number;
}

const COLORS: Readonly<Record<DamageType, string>> = {
  physical: "#ffcc66",
  fire: "#ff4b1f",
  ice: "#66d9ff",
  poison: "#7ee35a",
  storm: "#b28cff",
};

export function telegraphGeometry(
  event: TelegraphStarted,
  sourceX: number,
  sourceZ: number,
  progress: number,
): TelegraphGeometry {
  const clamped = Math.max(0, Math.min(1, progress));
  if (event.shape === "circle") {
    const diameter = (event.radius ?? 1) * 2;
    return {
      x: event.targetX,
      z: event.targetZ,
      rotationY: 0,
      width: diameter,
      depth: diameter,
      opacity: clamped,
    };
  }
  const dx = event.targetX - sourceX;
  const dz = event.targetZ - sourceZ;
  const distance = Math.hypot(dx, dz);
  const directionX = distance > 0 ? dx / distance : 0;
  const directionZ = distance > 0 ? dz / distance : 1;
  const length = event.length ?? Math.max(1, distance);
  const width = event.shape === "line"
    ? event.width ?? 0.5
    : Math.max(0.1, 2 * length * Math.tan((event.angle ?? 90) * Math.PI / 360));
  return {
    x: sourceX + directionX * length / 2,
    z: sourceZ + directionZ * length / 2,
    rotationY: Math.atan2(directionX, directionZ),
    width,
    depth: length,
    opacity: clamped,
  };
}

export class CombatTelegraphLayer {
  private readonly active = new Map<string, ActiveTelegraph>();
  private readonly pools = new Map<TelegraphShape, Mesh[]>();
  private readonly created: Record<TelegraphShape, number> = { circle: 0, cone: 0, line: 0 };
  private readonly materials = new Map<DamageType, StandardMaterial>();

  constructor(private readonly scene: Scene) {}

  sync(snapshot: GameSnapshot, events: readonly GameplayEvent[]): void {
    for (const event of events) {
      if (event.type === "ability_telegraph_started") {
        const actor = snapshot.actors.find((candidate) => candidate.id === event.source);
        if (!actor) continue;
        const key = this.key(event.source, event.ability);
        this.release(key);
        const mesh = this.acquire(event.shape);
        if (!mesh) continue;
        mesh.material = this.material(event.damageType);
        mesh.setEnabled(true);
        const active: ActiveTelegraph = {
          key,
          mesh,
          shape: event.shape,
          event,
          sourceX: actor.x,
          sourceZ: actor.z,
          elapsed: 0,
        };
        this.active.set(key, active);
        this.apply(active);
      }
      if (event.type === "ability_telegraph_cancelled") {
        this.release(this.key(event.source, event.ability));
      }
      if (event.type === "ability_impact") {
        this.release(this.key(event.actor, event.ability));
      }
      if (event.type === "actor_died") {
        for (const [key, active] of this.active) {
          if (active.event.source === event.actor) this.release(key);
        }
      }
    }
  }

  update(step: number): void {
    for (const active of this.active.values()) {
      active.elapsed += step;
      this.apply(active);
    }
  }

  get activeCount(): number {
    return this.active.size;
  }

  pooledCount(shape: TelegraphShape): number {
    return this.pools.get(shape)?.length ?? 0;
  }

  get materialCount(): number {
    return this.materials.size;
  }

  dispose(): void {
    for (const active of this.active.values()) active.mesh.dispose(false, false);
    for (const pool of this.pools.values()) {
      for (const mesh of pool) mesh.dispose(false, false);
    }
    for (const material of this.materials.values()) material.dispose();
    this.active.clear();
    this.pools.clear();
    this.materials.clear();
  }

  private key(source: number, ability: string): string {
    return `${source}:${ability}`;
  }

  private acquire(shape: TelegraphShape): Mesh | undefined {
    const pool = this.pools.get(shape) ?? [];
    this.pools.set(shape, pool);
    const reused = pool.pop();
    if (reused) return reused;
    if (this.created[shape] >= TELEGRAPH_POOL_LIMITS[shape]) return undefined;
    this.created[shape] += 1;
    const mesh = shape === "line"
      ? MeshBuilder.CreateGround("telegraph-line", { width: 1, height: 1 }, this.scene)
      : MeshBuilder.CreateDisc(
          `telegraph-${shape}`,
          {
            radius: 0.5,
            tessellation: shape === "circle" ? 32 : 12,
            arc: shape === "cone" ? 0.25 : 1,
          },
          this.scene,
        );
    if (shape !== "line") mesh.rotation.x = Math.PI / 2;
    mesh.isPickable = false;
    mesh.renderingGroupId = 1;
    return mesh;
  }

  private release(key: string): void {
    const active = this.active.get(key);
    if (!active) return;
    active.mesh.setEnabled(false);
    active.mesh.visibility = 1;
    const pool = this.pools.get(active.shape) ?? [];
    pool.push(active.mesh);
    this.pools.set(active.shape, pool);
    this.active.delete(key);
  }

  private apply(active: ActiveTelegraph): void {
    const geometry = telegraphGeometry(
      active.event,
      active.sourceX,
      active.sourceZ,
      active.event.duration > 0 ? active.elapsed / active.event.duration : 1,
    );
    active.mesh.position.set(geometry.x, 0.025, geometry.z);
    active.mesh.rotation.y = geometry.rotationY;
    if (active.shape === "line") active.mesh.scaling.set(geometry.width, 1, geometry.depth);
    else active.mesh.scaling.set(geometry.width, geometry.depth, 1);
    active.mesh.visibility = 0.15 + geometry.opacity * 0.65;
  }

  private material(type: DamageType): StandardMaterial {
    const existing = this.materials.get(type);
    if (existing) return existing;
    const material = new StandardMaterial(`telegraph-${type}`, this.scene);
    const color = Color3.FromHexString(COLORS[type]);
    material.diffuseColor = color.scale(0.4);
    material.emissiveColor = color;
    material.specularColor = Color3.Black();
    material.alpha = 0.65;
    material.disableLighting = true;
    material.disableDepthWrite = true;
    this.materials.set(type, material);
    return material;
  }
}
