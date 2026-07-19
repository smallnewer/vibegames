import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";
import { describe, expect, it } from "vitest";
import {
  BabylonAssetStore,
  type AssetContainerSource,
  type AssetEntries,
} from "../../../game/adapters/babylon/BabylonAssetStore";
import type { AssetDef } from "../../../game/dungeon/DungeonDefinitions";

const ASSET: AssetDef = {
  id: "asset.test_box",
  kind: "model",
  url: "/game-assets/props/box.glb",
};

function source(scene: Scene, counters: { instances: number; disposed: number }): AssetContainerSource {
  return {
    instantiateModelsToScene(name) {
      counters.instances += 1;
      const root = new TransformNode(name("root"), scene);
      let disposed = false;
      return {
        rootNodes: [root],
        animationGroups: [],
        dispose() {
          if (disposed) return;
          disposed = true;
          root.dispose();
        },
      } satisfies AssetEntries;
    },
    dispose() {
      counters.disposed += 1;
    },
  };
}

describe("BabylonAssetStore", () => {
  it("merges concurrent loads and instantiates from one shared template", async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const counters = { loads: 0, instances: 0, disposed: 0 };
    let release!: (value: AssetContainerSource) => void;
    const pending = new Promise<AssetContainerSource>((resolve) => { release = resolve; });
    const store = new BabylonAssetStore(scene, async () => {
      counters.loads += 1;
      return pending;
    });

    const first = store.preload([ASSET]);
    const second = store.preload([ASSET]);
    release(source(scene, counters));
    await Promise.all([first, second]);

    const left = await store.instantiate(ASSET.id, "left");
    const right = await store.instantiate(ASSET.id, "right");
    expect(counters).toMatchObject({ loads: 1, instances: 2, disposed: 0 });
    expect(store.status()).toEqual({ total: 1, loaded: 1, pending: 0, failed: 0, instances: 2 });

    left.dispose();
    left.dispose();
    expect(store.status().instances).toBe(1);
    store.dispose();
    right.dispose();
    expect(counters.disposed).toBe(1);
    expect(store.status().instances).toBe(0);
    engine.dispose();
  });

  it("removes a rejected load so the same asset can retry", async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const counters = { instances: 0, disposed: 0 };
    let attempt = 0;
    const store = new BabylonAssetStore(scene, async () => {
      attempt += 1;
      if (attempt === 1) throw new Error("broken file");
      return source(scene, counters);
    });

    await expect(store.preload([ASSET])).rejects.toThrow("broken file");
    expect(store.status()).toMatchObject({ loaded: 0, failed: 1, pending: 0 });
    await expect(store.preload([ASSET])).resolves.toBeUndefined();
    expect(attempt).toBe(2);
    expect(store.status()).toMatchObject({ loaded: 1, failed: 0, pending: 0 });
    store.dispose();
    engine.dispose();
  });
});
