import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import type { ActorSnapshot } from "../../core/GameSnapshot";

export const HEALTH_BAR_POOL_LIMIT = 30;
export const DAMAGED_BAR_TICKS = 180;

export type HealthBarActor = Pick<
  ActorSnapshot,
  | "id"
  | "archetype"
  | "action"
  | "health"
  | "maxHealth"
  | "healthBar"
  | "engaged"
  | "lastDamagedTick"
  | "x"
  | "z"
>;

export interface HealthBarPresentation {
  readonly actor: number;
  readonly style: "minion" | "elite";
  readonly ratio: number;
}

export function healthBarPresentation(
  actor: HealthBarActor,
  currentTick: number,
  onscreen = true,
): HealthBarPresentation | undefined {
  if (
    !onscreen
    || actor.healthBar === "none"
    || actor.action === "dead"
    || actor.health <= 0
  ) return undefined;
  return {
    actor: actor.id,
    style: actor.healthBar,
    ratio: actor.maxHealth > 0
      ? Math.max(0, Math.min(1, actor.health / actor.maxHealth))
      : 0,
  };
}

export function selectHealthBarActors(
  actors: readonly HealthBarActor[],
  currentTick: number,
  isOnscreen: (actor: HealthBarActor) => boolean = () => true,
  limit = HEALTH_BAR_POOL_LIMIT,
): readonly HealthBarPresentation[] {
  return actors.flatMap((actor) => {
    const presentation = healthBarPresentation(actor, currentTick, isOnscreen(actor));
    return presentation ? [{ actor, presentation }] : [];
  }).sort((left, right) => (
    Number(right.presentation.style === "elite") - Number(left.presentation.style === "elite")
    || Number(right.actor.engaged) - Number(left.actor.engaged)
    || (right.actor.lastDamagedTick ?? -1) - (left.actor.lastDamagedTick ?? -1)
    || left.actor.id - right.actor.id
  )).slice(0, Math.max(0, limit)).map((value) => value.presentation);
}

interface HealthBarRecord {
  readonly root: TransformNode;
  readonly background: InstancedMesh;
  readonly minionFill: InstancedMesh;
  readonly eliteFill: InstancedMesh;
  actor?: number;
}

export class ActorHealthBarLayer {
  private readonly backgroundSource: Mesh;
  private readonly minionSource: Mesh;
  private readonly eliteSource: Mesh;
  private readonly materials: readonly StandardMaterial[];
  private readonly records: HealthBarRecord[] = [];
  private readonly byActor = new Map<number, HealthBarRecord>();

  constructor(
    private readonly scene: Scene,
    private readonly limit = HEALTH_BAR_POOL_LIMIT,
  ) {
    const backgroundMaterial = this.material("health-bar-background", "#190f13");
    const minionMaterial = this.material("health-bar-minion", "#c44f38");
    const eliteMaterial = this.material("health-bar-elite", "#df9d3f");
    this.materials = [backgroundMaterial, minionMaterial, eliteMaterial];
    this.backgroundSource = this.source("health-bar-background-source", 1.24, 0.12, backgroundMaterial);
    this.minionSource = this.source("health-bar-minion-source", 1.18, 0.075, minionMaterial);
    this.eliteSource = this.source("health-bar-elite-source", 1, 0.075, eliteMaterial);
  }

  sync(
    actors: readonly HealthBarActor[],
    currentTick: number,
    isOnscreen: (actor: HealthBarActor) => boolean,
    heightFor: (actor: HealthBarActor) => number,
  ): void {
    const actorById = new Map(actors.map((actor) => [actor.id, actor]));
    const selected = selectHealthBarActors(actors, currentTick, isOnscreen, this.limit);
    const selectedIds = new Set(selected.map((value) => value.actor));
    for (const [actorId, record] of this.byActor) {
      if (selectedIds.has(actorId)) continue;
      this.release(record);
    }
    for (const presentation of selected) {
      const actor = actorById.get(presentation.actor)!;
      const record = this.byActor.get(actor.id) ?? this.acquire(actor.id);
      if (!record) continue;
      this.update(record, actor, presentation, heightFor(actor));
    }
  }

  get activeCount(): number {
    return this.byActor.size;
  }

  dispose(): void {
    for (const record of this.records) record.root.dispose(false, false);
    this.backgroundSource.dispose(false, false);
    this.minionSource.dispose(false, false);
    this.eliteSource.dispose(false, false);
    for (const material of this.materials) material.dispose();
    this.records.length = 0;
    this.byActor.clear();
  }

  private acquire(actor: number): HealthBarRecord | undefined {
    let record = this.records.find((candidate) => candidate.actor === undefined);
    if (!record && this.records.length < this.limit) {
      const index = this.records.length;
      const root = new TransformNode(`actor-health-bar-${index}`, this.scene);
      root.billboardMode = TransformNode.BILLBOARDMODE_ALL;
      const background = this.backgroundSource.createInstance(`actor-health-bar-${index}-background`);
      const minionFill = this.minionSource.createInstance(`actor-health-bar-${index}-minion`);
      const eliteFill = this.eliteSource.createInstance(`actor-health-bar-${index}-elite`);
      background.parent = root;
      minionFill.parent = root;
      eliteFill.parent = root;
      record = { root, background, minionFill, eliteFill };
      this.records.push(record);
    }
    if (!record) return undefined;
    record.actor = actor;
    record.root.setEnabled(true);
    this.byActor.set(actor, record);
    return record;
  }

  private update(
    record: HealthBarRecord,
    actor: HealthBarActor,
    presentation: HealthBarPresentation,
    actorHeight: number,
  ): void {
    const width = presentation.style === "elite" ? 1.28 : 1;
    record.root.position.set(actor.x, actorHeight + 0.18, actor.z);
    record.root.scaling.set(width, 1, 1);
    record.background.setEnabled(true);
    record.minionFill.setEnabled(presentation.style === "minion");
    record.eliteFill.setEnabled(presentation.style === "elite");
    const fill = presentation.style === "elite" ? record.eliteFill : record.minionFill;
    fill.scaling.set(presentation.ratio, 1, 1);
    fill.position.x = -(1 - presentation.ratio) * 0.5;
    fill.position.z = -0.006;
  }

  private release(record: HealthBarRecord): void {
    if (record.actor !== undefined) this.byActor.delete(record.actor);
    record.actor = undefined;
    record.root.setEnabled(false);
    record.root.scaling.setAll(1);
    record.minionFill.scaling.setAll(1);
    record.eliteFill.scaling.setAll(1);
  }

  private source(
    name: string,
    width: number,
    height: number,
    material: StandardMaterial,
  ): Mesh {
    const source = MeshBuilder.CreatePlane(name, { width, height }, this.scene);
    source.position.y = -1000;
    source.material = material;
    source.isPickable = false;
    return source;
  }

  private material(name: string, color: string): StandardMaterial {
    const material = new StandardMaterial(name, this.scene);
    const value = Color3.FromHexString(color);
    material.diffuseColor = value;
    material.emissiveColor = value.scale(0.45);
    material.specularColor = Color3.Black();
    material.disableLighting = true;
    return material;
  }
}
