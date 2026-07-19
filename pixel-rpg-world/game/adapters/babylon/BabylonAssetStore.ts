import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import type { Node } from "@babylonjs/core/node";
import type { Scene } from "@babylonjs/core/scene";
import "@babylonjs/loaders/glTF";
import type { AssetDef } from "../../dungeon/DungeonDefinitions";

export interface AssetEntries {
  readonly rootNodes: readonly Node[];
  readonly animationGroups: readonly AnimationGroup[];
  dispose(): void;
}

export interface AssetContainerSource {
  instantiateModelsToScene(name: (sourceName: string) => string): AssetEntries;
  dispose(): void;
}

export interface AssetInstance extends AssetEntries {
  readonly assetId: string;
}

export interface AssetStoreStatus {
  total: number;
  loaded: number;
  pending: number;
  failed: number;
  instances: number;
}

export type AssetContainerLoader = (
  url: string,
  scene: Scene,
) => Promise<AssetContainerSource>;

const defaultLoader: AssetContainerLoader = async (url, scene) => (
  LoadAssetContainerAsync(url, scene) as Promise<AssetContainerSource>
);

// GLB 模板只加载一次；每个摆放只持有可独立释放的实例。
export class BabylonAssetStore {
  private readonly definitions = new Map<string, AssetDef>();
  private readonly loads = new Map<string, Promise<AssetContainerSource>>();
  private readonly containers = new Map<string, AssetContainerSource>();
  private readonly failures = new Map<string, Error>();
  private readonly instances = new Set<AssetInstance>();
  private readonly disposedContainers = new Set<AssetContainerSource>();
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    private readonly loader: AssetContainerLoader = defaultLoader,
  ) {}

  async preload(definitions: readonly AssetDef[]): Promise<void> {
    this.assertAlive();
    for (const definition of definitions) this.register(definition);
    await Promise.all(definitions.map((definition) => this.load(definition.id)));
  }

  async instantiate(assetId: string, name: string): Promise<AssetInstance> {
    this.assertAlive();
    const container = await this.load(assetId);
    this.assertAlive();
    const entries = container.instantiateModelsToScene((sourceName) => `${name}-${sourceName}`);
    let released = false;
    const instance: AssetInstance = {
      assetId,
      rootNodes: entries.rootNodes,
      animationGroups: entries.animationGroups,
      dispose: () => {
        if (released) return;
        released = true;
        entries.dispose();
        this.instances.delete(instance);
      },
    };
    this.instances.add(instance);
    return instance;
  }

  status(): AssetStoreStatus {
    return {
      total: this.definitions.size,
      loaded: this.containers.size,
      pending: [...this.loads.keys()].filter((id) => !this.containers.has(id)).length,
      failed: this.failures.size,
      instances: this.instances.size,
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const instance of [...this.instances]) instance.dispose();
    for (const container of this.containers.values()) this.disposeContainer(container);
    this.containers.clear();
    this.loads.clear();
    this.failures.clear();
  }

  private register(definition: AssetDef): void {
    const existing = this.definitions.get(definition.id);
    if (existing && (existing.url !== definition.url || existing.kind !== definition.kind)) {
      throw new Error(`Asset ID changed source: ${definition.id}`);
    }
    if (!existing) this.definitions.set(definition.id, definition);
  }

  private load(assetId: string): Promise<AssetContainerSource> {
    const existing = this.loads.get(assetId);
    if (existing) return existing;
    const definition = this.definitions.get(assetId);
    if (!definition) throw new Error(`Unknown asset: ${assetId}`);

    this.failures.delete(assetId);
    const request = this.loader(definition.url, this.scene).then((container) => {
      if (this.disposed) {
        this.disposeContainer(container);
        throw new Error(`Asset store disposed while loading: ${assetId}`);
      }
      this.containers.set(assetId, container);
      return container;
    }).catch((source: unknown) => {
      const error = source instanceof Error ? source : new Error(String(source));
      if (!this.disposed) this.failures.set(assetId, error);
      if (this.loads.get(assetId) === request) this.loads.delete(assetId);
      throw error;
    });
    this.loads.set(assetId, request);
    return request;
  }

  private disposeContainer(container: AssetContainerSource): void {
    if (this.disposedContainers.has(container)) return;
    this.disposedContainers.add(container);
    container.dispose();
  }

  private assertAlive(): void {
    if (this.disposed) throw new Error("BabylonAssetStore is disposed");
  }
}
