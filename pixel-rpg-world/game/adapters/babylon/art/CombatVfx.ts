import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import "@babylonjs/core/Meshes/instancedMesh";
import type { Scene } from "@babylonjs/core/scene";
import type { GameplayEvent } from "../../../core/GameplayEvent";
import type { GameSnapshot } from "../../../core/GameSnapshot";
import {
  AbilityVfxRegistry,
  type AbilityEffectKind,
  type AbilityVfxRecipe,
} from "./AbilityVfxRegistry";
import { MeleeSlashVfx, type MeleeVfxStyle } from "./MeleeSlashVfx";

export const VFX_LIMITS = {
  short: 96,
  trails: 48,
  ambient: 160,
} as const;

export type CombatEffectKind =
  | AbilityEffectKind
  | "hit_burst"
  | "death_breakup"
  | "loot_beam"
  | "buff_rune"
  | "portal_spiral";

const KIND_LIMITS: Record<CombatEffectKind, number> = {
  melee_arc: 8,
  hit_burst: 32,
  death_breakup: 24,
  loot_beam: 8,
  buff_rune: 8,
  portal_spiral: 16,
  cast_spark: 24,
  nova_ring: 8,
  step_trail: 24,
};

interface ActiveEffect {
  readonly kind: CombatEffectKind;
  readonly mesh: InstancedMesh;
  readonly poolKey: string;
  readonly totalLife: number;
  life: number;
  velocityX: number;
  velocityY: number;
  velocityZ: number;
  spin: number;
}

export function effectForEvent(event: GameplayEvent): CombatEffectKind | undefined {
  if (event.type === "damage_applied") return "hit_burst";
  if (event.type === "actor_died") return "death_breakup";
  if (event.type === "loot_spawned") return "loot_beam";
  if (event.type === "status_added") return "buff_rune";
  if (event.type === "door_opened" || event.type === "actor_teleported") {
    return "portal_spiral";
  }
  return undefined;
}

export function visualRecipeForEvent(
  event: GameplayEvent,
  registry: AbilityVfxRegistry,
): AbilityVfxRecipe | undefined {
  return event.type === "ability_impact" || event.type === "visual_emitted"
    ? registry.resolve(event.visual)
    : undefined;
}

export class CombatVfx {
  private readonly active: ActiveEffect[] = [];
  private readonly pools = new Map<string, InstancedMesh[]>();
  private readonly sources = new Map<string, Mesh>();
  private readonly created = new Map<CombatEffectKind, number>();
  private readonly materials = new Map<string, StandardMaterial>();
  private readonly meleeSlash: MeleeSlashVfx;
  private meleeStyle: MeleeVfxStyle = "legacy";

  constructor(
    private readonly scene: Scene,
    private readonly abilityVfx = new AbilityVfxRegistry(),
  ) {
    this.meleeSlash = new MeleeSlashVfx(scene);
  }

  setMeleeStyle(style: MeleeVfxStyle): void {
    this.meleeStyle = style;
  }

  hasMeleeVisual(visual: string): boolean {
    return this.meleeSlash.has(visual);
  }

  // 正式场景可在骨骼事件点触发，避免表现时间绑死在伤害结算点。
  playMelee(
    visual: string,
    x: number,
    z: number,
    facingX: number,
    facingZ: number,
  ): void {
    this.meleeSlash.play(visual, x, z, facingX, facingZ, this.meleeStyle);
  }

  // 只消费逻辑事件；伤害、死亡、掉落等表现不猜按键意图。
  sync(snapshot: GameSnapshot, events: readonly GameplayEvent[]): void {
    for (const event of events) {
      if (event.type === "boss_phase_started") {
        const actor = snapshot.actors.find((value) => value.id === event.actor);
        if (actor) {
          this.spawnAbility(
            this.abilityVfx.resolve(event.visual),
            actor.x,
            actor.z,
            actor.facingX,
            actor.facingZ,
            actor.x,
            actor.z,
          );
        }
        continue;
      }
      const recipe = visualRecipeForEvent(event, this.abilityVfx);
      if (recipe && (event.type === "ability_impact" || event.type === "visual_emitted")) {
        const actor = snapshot.actors.find((value) => value.id === event.actor);
        if (actor) {
          this.spawnAbility(
            recipe,
            actor.x,
            actor.z,
            actor.facingX,
            actor.facingZ,
            event.aimX,
            event.aimZ,
          );
        }
        continue;
      }
      const kind = effectForEvent(event);
      if (!kind) continue;
      if (event.type === "damage_applied") {
        const source = snapshot.actors.find((value) => value.id === event.source);
        const target = snapshot.actors.find((value) => value.id === event.target);
        if (target) {
          const length = source ? Math.hypot(target.x - source.x, target.z - source.z) : 0;
          const directionX = length > 0 ? (target.x - source!.x) / length : 1;
          const directionZ = length > 0 ? (target.z - source!.z) / length : 0;
          this.spawnDirectionalHit(
            target.x,
            1.15,
            target.z,
            directionX,
            directionZ,
            event.critical,
            target.faction === "enemy" ? "#ff943b" : "#ff5c58",
          );
        }
      } else if (event.type === "actor_died") {
        const actor = snapshot.actors.find((value) => value.id === event.actor);
        if (actor) this.spawnBurst(kind, actor.x, 1.2, actor.z, "#ff6d2e", 10);
      } else if (event.type === "action_started") {
        const actor = snapshot.actors.find((value) => value.id === event.actor);
        if (actor) {
          this.spawn(kind, actor.x + actor.facingX * 0.72, 0.78, actor.z + actor.facingZ * 0.72, "#ffd878", 0.2, {
            rotationY: Math.atan2(actor.facingX, actor.facingZ),
          });
        }
      } else if (event.type === "loot_spawned") {
        const loot = snapshot.loot.find((value) => value.id === event.loot);
        if (loot) {
          const color = event.kind === "ability" ? "#62eaff" : event.kind === "item" ? "#ff7b39" : "#ffd45b";
          this.spawn(kind, loot.x, 1.35, loot.z, color, 0.8);
        }
      } else if (event.type === "status_added") {
        const actor = snapshot.actors.find((value) => value.id === event.target);
        if (actor) this.spawnBurst(kind, actor.x, 0.2, actor.z, "#67efff", 3);
      } else if (event.type === "actor_teleported") {
        this.spawnBurst(kind, event.x, 0.45, event.z, "#ffb83f", 8);
      } else if (event.type === "door_opened") {
        const door = snapshot.interactions.find((value) => value.id === event.target);
        if (door) this.spawnBurst(kind, door.x, 0.45, door.z, "#ffb83f", 8);
      }
    }
  }

  update(delta: number): void {
    this.meleeSlash.update(delta);
    for (let index = this.active.length - 1; index >= 0; index -= 1) {
      const effect = this.active[index];
      effect.life -= delta;
      effect.mesh.position.x += effect.velocityX * delta;
      effect.mesh.position.y += effect.velocityY * delta;
      effect.mesh.position.z += effect.velocityZ * delta;
      effect.mesh.rotation.y += effect.spin * delta;
      effect.mesh.rotation.z += effect.spin * 0.6 * delta;
      const ratio = Math.max(0, effect.life / effect.totalLife);
      if (effect.kind === "melee_arc") {
        effect.mesh.scaling.setAll(0.82 + (1 - ratio) * 0.35);
      } else if (effect.kind === "nova_ring") {
        effect.mesh.scaling.setAll(0.65 + (1 - ratio) * 2.8);
      } else if (effect.kind === "loot_beam") {
        const width = Math.max(0.04, ratio);
        effect.mesh.scaling.set(width, 1, width);
      } else {
        effect.mesh.scaling.setAll(Math.max(0.04, ratio));
      }
      if (effect.life > 0) continue;
      effect.mesh.setEnabled(false);
      const pool = this.pools.get(effect.poolKey) ?? [];
      pool.push(effect.mesh);
      this.pools.set(effect.poolKey, pool);
      this.active.splice(index, 1);
    }
  }

  metrics(): Readonly<Record<CombatEffectKind, number>> {
    return {
      melee_arc: this.count("melee_arc"),
      hit_burst: this.count("hit_burst"),
      death_breakup: this.count("death_breakup"),
      loot_beam: this.count("loot_beam"),
      buff_rune: this.count("buff_rune"),
      portal_spiral: this.count("portal_spiral"),
      cast_spark: this.count("cast_spark"),
      nova_ring: this.count("nova_ring"),
      step_trail: this.count("step_trail"),
    };
  }

  get activeCount(): number {
    return this.active.length + this.meleeSlash.activeCount;
  }

  dispose(): void {
    this.meleeSlash.dispose();
    for (const effect of this.active) effect.mesh.dispose(false, false);
    for (const pool of this.pools.values()) {
      for (const mesh of pool) mesh.dispose(false, false);
    }
    for (const source of this.sources.values()) source.dispose(false, false);
    for (const material of this.materials.values()) material.dispose();
    this.active.length = 0;
    this.pools.clear();
    this.sources.clear();
    this.created.clear();
    this.materials.clear();
  }

  private spawnAbility(
    recipe: AbilityVfxRecipe,
    x: number,
    z: number,
    facingX: number,
    facingZ: number,
    aimX: number,
    aimZ: number,
  ): void {
    const aimLength = Math.hypot(aimX - x, aimZ - z);
    const directionX = aimLength > 0 ? (aimX - x) / aimLength : facingX;
    const directionZ = aimLength > 0 ? (aimZ - z) / aimLength : facingZ;
    if (recipe.kind === "melee_arc" && this.meleeSlash.has(recipe.visual)) {
      this.playMelee(recipe.visual, x, z, directionX, directionZ);
      return;
    }
    if (recipe.pattern === "source") {
      const forward = recipe.kind === "melee_arc" ? 0.72 : 0.25;
      this.spawn(
        recipe.kind,
        x + directionX * forward,
        recipe.kind === "nova_ring" ? 0.12 : 0.78,
        z + directionZ * forward,
        recipe.color,
        recipe.life,
        { rotationY: Math.atan2(directionX, directionZ) },
      );
      return;
    }
    if (recipe.pattern === "line") {
      for (let index = 0; index < recipe.count; index += 1) {
        const distance = index / Math.max(1, recipe.count - 1) * 2.4;
        this.spawn(
          recipe.kind,
          x - directionX * distance,
          0.35 + index % 2 * 0.12,
          z - directionZ * distance,
          recipe.color,
          recipe.life,
          { rotationY: Math.atan2(directionX, directionZ), spin: index % 2 ? 2 : -2 },
        );
      }
      return;
    }
    for (let index = 0; index < recipe.count; index += 1) {
      const angle = index / recipe.count * Math.PI * 2;
      this.spawn(
        recipe.kind,
        x + Math.cos(angle) * 0.18,
        recipe.kind === "nova_ring" ? 0.12 : 0.25,
        z + Math.sin(angle) * 0.18,
        recipe.color,
        recipe.life,
        { velocityY: recipe.kind === "buff_rune" ? 0.5 : 0, spin: index % 2 ? 2 : -2 },
      );
    }
  }

  private spawnBurst(
    kind: CombatEffectKind,
    x: number,
    y: number,
    z: number,
    color: string,
    count: number,
  ): void {
    for (let index = 0; index < count; index += 1) {
      const angle = index / count * Math.PI * 2;
      const radius = kind === "portal_spiral" ? 0.58 : 0.18;
      this.spawn(
        kind,
        x + Math.cos(angle) * radius,
        y + (kind === "portal_spiral" ? index * 0.1 : 0),
        z + Math.sin(angle) * radius,
        color,
        kind === "death_breakup" ? 0.56 : 0.32,
        {
          velocityX: Math.cos(angle) * (kind === "portal_spiral" ? 0.25 : 1.3),
          velocityY: kind === "buff_rune" ? 0.72 : 0.9 + index % 3 * 0.24,
          velocityZ: Math.sin(angle) * (kind === "portal_spiral" ? 0.25 : 1.3),
          spin: index % 2 === 0 ? 4.4 : -4.4,
        },
      );
    }
  }

  private spawnDirectionalHit(
    x: number,
    y: number,
    z: number,
    directionX: number,
    directionZ: number,
    critical: boolean,
    color: string,
  ): void {
    const count = critical ? 10 : 6;
    for (let index = 0; index < count; index += 1) {
      const spread = count === 1 ? 0 : (index / (count - 1) - 0.5) * 0.64;
      const cos = Math.cos(spread);
      const sin = Math.sin(spread);
      const velocityX = directionX * cos - directionZ * sin;
      const velocityZ = directionX * sin + directionZ * cos;
      this.spawn(
        "hit_burst",
        x,
        y + index % 3 * 0.04,
        z,
        critical ? (index % 2 === 0 ? "#fff7d2" : "#ffd15c") : color,
        critical ? 0.38 : 0.32,
        {
          velocityX: velocityX * (critical ? 2 : 1.6),
          velocityY: 0.65 + index % 3 * 0.18,
          velocityZ: velocityZ * (critical ? 2 : 1.6),
          spin: index % 2 === 0 ? 5.2 : -5.2,
          rotationY: Math.atan2(velocityX, velocityZ),
        },
      );
    }
    if (critical) this.spawn("nova_ring", x, 0.12, z, "#fff0a0", 0.24);
  }

  private spawn(
    kind: CombatEffectKind,
    x: number,
    y: number,
    z: number,
    color: string,
    life: number,
    motion: {
      velocityX?: number;
      velocityY?: number;
      velocityZ?: number;
      spin?: number;
      rotationY?: number;
    } = {},
  ): void {
    const alpha = kind === "loot_beam" ? 0.58 : 0.9;
    const poolKey = `${kind}|${color}|${alpha}`;
    let mesh = this.pools.get(poolKey)?.pop();
    if (!mesh && (this.created.get(kind) ?? 0) < KIND_LIMITS[kind]) {
      mesh = this.createInstance(kind, color, alpha, poolKey);
      this.created.set(kind, (this.created.get(kind) ?? 0) + 1);
    }
    if (!mesh) {
      const reusable = this.takePooledInstance(kind);
      if (reusable) {
        reusable.dispose(false, false);
        mesh = this.createInstance(kind, color, alpha, poolKey);
      } else {
        const oldestIndex = this.active.findIndex((effect) => effect.kind === kind);
        if (oldestIndex < 0) return;
        const oldest = this.active.splice(oldestIndex, 1)[0];
        if (oldest.poolKey === poolKey) {
          mesh = oldest.mesh;
        } else {
          oldest.mesh.dispose(false, false);
          mesh = this.createInstance(kind, color, alpha, poolKey);
        }
      }
    }
    mesh.position.set(x, y, z);
    mesh.rotation.set(
      kind === "buff_rune" || kind === "nova_ring" ? Math.PI / 2 : 0,
      motion.rotationY ?? 0,
      0,
    );
    mesh.scaling.setAll(1);
    mesh.setEnabled(true);
    this.active.push({
      kind,
      mesh,
      poolKey,
      life,
      totalLife: life,
      velocityX: motion.velocityX ?? 0,
      velocityY: motion.velocityY ?? 0,
      velocityZ: motion.velocityZ ?? 0,
      spin: motion.spin ?? 0,
    });
  }

  private takePooledInstance(kind: CombatEffectKind): InstancedMesh | undefined {
    const prefix = `${kind}|`;
    for (const [key, pool] of this.pools) {
      if (!key.startsWith(prefix)) continue;
      const mesh = pool.pop();
      if (mesh) return mesh;
    }
    return undefined;
  }

  private createInstance(
    kind: CombatEffectKind,
    color: string,
    alpha: number,
    poolKey: string,
  ): InstancedMesh {
    let source = this.sources.get(poolKey);
    if (!source) {
      source = this.createMesh(kind);
      source.name = `vfx-source-${kind}-${this.sources.size}`;
      source.material = this.getMaterial(color, alpha);
      source.isPickable = false;
      source.isVisible = false;
      this.sources.set(poolKey, source);
    }
    const mesh = source.createInstance(this.instanceName(kind));
    mesh.isPickable = false;
    mesh.isVisible = true;
    return mesh;
  }

  private instanceName(kind: CombatEffectKind): string {
    if (kind === "melee_arc") return "vfx-melee-arc";
    if (kind === "loot_beam") return "vfx-loot-beam";
    if (kind === "buff_rune") return "vfx-buff-rune";
    if (kind === "nova_ring") return "vfx-nova-ring";
    if (kind === "step_trail") return "vfx-step-trail";
    if (kind === "cast_spark") return "vfx-cast-spark";
    if (kind === "portal_spiral") return "vfx-portal-spark";
    return kind === "death_breakup" ? "vfx-death-chunk" : "vfx-hit-shard";
  }

  private createMesh(kind: CombatEffectKind): Mesh {
    if (kind === "melee_arc") {
      const path = Array.from({ length: 9 }, (_, index) => {
        const angle = -1.25 + index / 8 * 2.5;
        return new Vector3(Math.sin(angle) * 0.9, 0, Math.cos(angle) * 0.9);
      });
      return MeshBuilder.CreateTube("vfx-melee-arc", {
        path,
        radiusFunction: (index) => 0.14 - index / 8 * 0.08,
        tessellation: 4,
        cap: Mesh.CAP_ALL,
      }, this.scene);
    }
    if (kind === "loot_beam") {
      return MeshBuilder.CreateCylinder("vfx-loot-beam", {
        height: 2.7,
        diameterTop: 0.03,
        diameterBottom: 0.18,
        tessellation: 4,
      }, this.scene);
    }
    if (kind === "buff_rune") {
      const mesh = MeshBuilder.CreateTorus("vfx-buff-rune", {
        diameter: 0.9,
        thickness: 0.055,
        tessellation: 16,
      }, this.scene);
      mesh.rotation.x = Math.PI / 2;
      return mesh;
    }
    if (kind === "nova_ring") {
      return MeshBuilder.CreateTorus("vfx-nova-ring", {
        diameter: 1.15,
        thickness: 0.08,
        tessellation: 24,
      }, this.scene);
    }
    if (kind === "step_trail") {
      return MeshBuilder.CreateBox("vfx-step-trail", {
        width: 0.18,
        height: 0.5,
        depth: 0.32,
      }, this.scene);
    }
    if (kind === "cast_spark") {
      const mesh = MeshBuilder.CreateBox("vfx-cast-spark", { size: 0.16 }, this.scene);
      mesh.rotation.z = Math.PI / 4;
      return mesh;
    }
    if (kind === "portal_spiral") {
      return MeshBuilder.CreateCylinder("vfx-portal-spark", {
        height: 0.22,
        diameterTop: 0,
        diameterBottom: 0.14,
        tessellation: 4,
      }, this.scene);
    }
    return MeshBuilder.CreateBox(
      kind === "death_breakup" ? "vfx-death-chunk" : "vfx-hit-shard",
      kind === "death_breakup"
        ? { width: 0.2, height: 0.28, depth: 0.2 }
        : { width: 0.08, height: 0.3, depth: 0.08 },
      this.scene,
    );
  }

  private getMaterial(color: string, alpha: number): StandardMaterial {
    const key = `${color}-${alpha}`;
    const existing = this.materials.get(key);
    if (existing) return existing;
    const material = new StandardMaterial(`vfx-${key}`, this.scene);
    material.diffuseColor = Color3.FromHexString(color);
    material.emissiveColor = Color3.FromHexString(color).scale(0.85);
    material.specularColor = Color3.Black();
    material.alpha = alpha;
    material.disableDepthWrite = true;
    this.materials.set(key, material);
    return material;
  }

  private count(kind: CombatEffectKind): number {
    return this.active.filter((effect) => effect.kind === kind).length;
  }
}
