import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import type { Node } from "@babylonjs/core/node";
import type { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { AssetDef, DungeonPack } from "../../dungeon/DungeonDefinitions";

export interface PlacementInstance {
  readonly rootNodes: readonly Node[];
  readonly animationGroups: readonly AnimationGroup[];
  dispose(): void;
}

export interface AssetStorePort {
  preload(definitions: readonly AssetDef[]): Promise<void>;
  instantiate(assetId: string, name: string): Promise<PlacementInstance>;
}

interface PlacementRecord {
  readonly section: string;
  readonly root: TransformNode;
  readonly instance: PlacementInstance;
}

// 只管理地下城静态摆放；资源缓存和场景主体仍由各自对象负责。
export class BabylonPlacementLayer {
  private readonly records: PlacementRecord[] = [];
  private visibleSections?: ReadonlySet<string>;
  private generation = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    private readonly assets: AssetStorePort,
  ) {}

  async load(pack: Pick<DungeonPack, "assets" | "placements">): Promise<void> {
    this.assertAlive();
    const generation = ++this.generation;
    this.clear();
    await this.assets.preload(pack.assets);
    const loaded = await Promise.all(pack.placements.map(async (placement) => {
      const instance = await this.assets.instantiate(placement.asset, placement.id);
      const root = new TransformNode(placement.id, this.scene);
      root.position.set(placement.x, placement.y, placement.z);
      root.rotation.y = placement.rotationY;
      root.scaling.setAll(placement.scale);
      for (const child of instance.rootNodes) child.parent = root;
      return { section: placement.section, root, instance } satisfies PlacementRecord;
    }));
    if (this.disposed || generation !== this.generation) {
      for (const record of loaded) this.release(record);
      return;
    }
    this.records.push(...loaded);
    this.applyVisibility();
  }

  setVisibleSections(sections: ReadonlySet<string>): void {
    this.visibleSections = new Set(sections);
    this.applyVisibility();
  }

  get instanceCount(): number {
    return this.records.length;
  }

  get activeCount(): number {
    return this.records.filter((record) => record.root.isEnabled()).length;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.generation += 1;
    this.clear();
  }

  private applyVisibility(): void {
    for (const record of this.records) {
      record.root.setEnabled(!this.visibleSections || this.visibleSections.has(record.section));
    }
  }

  private clear(): void {
    for (const record of this.records.splice(0)) this.release(record);
  }

  private release(record: PlacementRecord): void {
    for (const child of record.instance.rootNodes) child.parent = null;
    record.instance.dispose();
    record.root.dispose();
  }

  private assertAlive(): void {
    if (this.disposed) throw new Error("BabylonPlacementLayer is disposed");
  }
}
