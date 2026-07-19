import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";
import { expect, it } from "vitest";
import {
  BabylonPlacementLayer,
  type AssetStorePort,
} from "../../../game/adapters/babylon/BabylonPlacementLayer";
import type { DungeonPack } from "../../../game/dungeon/DungeonDefinitions";
import { DUNGEON_PACK_DATA } from "../../../game/content/generated/dungeonPacks";

it("positions instances and follows visible dungeon sections", async () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const roots: TransformNode[] = [];
  let released = 0;
  const store: AssetStorePort = {
    async preload() {},
    async instantiate(_asset, name) {
      const root = new TransformNode(`${name}-model`, scene);
      roots.push(root);
      return {
        rootNodes: [root],
        animationGroups: [],
        dispose() {
          released += 1;
          root.dispose();
        },
      };
    },
  };
  const source = DUNGEON_PACK_DATA.find((value) => (
    value.id === "dungeon.lava_showcase"
  ))!;
  const pack = structuredClone(source) as unknown as DungeonPack;
  const layer = new BabylonPlacementLayer(scene, store);

  await layer.load(pack);
  expect(layer.instanceCount).toBe(2);
  expect(roots[0].parent?.position.asArray()).toEqual([-4.7, 0.2, -2.4]);

  layer.setVisibleSections(new Set(["section.lava_bridge"]));
  expect(layer.activeCount).toBe(2);
  expect(roots[0].parent?.isEnabled()).toBe(true);

  layer.setVisibleSections(new Set(["section.missing"]));
  expect(layer.activeCount).toBe(0);

  layer.dispose();
  layer.dispose();
  expect(released).toBe(2);
  engine.dispose();
});
