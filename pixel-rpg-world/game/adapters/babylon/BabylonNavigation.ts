import { CreateNavigationPluginAsync } from "@babylonjs/addons/navigation/factory/index.js";
import type { RecastNavigationJSPluginV2 } from "@babylonjs/addons/navigation/plugin/RecastNavigationJSPlugin.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";
import * as RecastCore from "@recast-navigation/core";
import * as RecastGenerators from "@recast-navigation/generators";
import type { DungeonNavigationDef } from "../../dungeon/DungeonDefinitions";
import type { GroundNavigation, GroundPoint } from "../../ports/GroundNavigation";

let recastReady: Promise<void> | undefined;

async function createPlugin(): Promise<RecastNavigationJSPluginV2> {
  recastReady ??= RecastCore.init();
  await recastReady;
  return CreateNavigationPluginAsync({
    instance: { ...RecastCore, ...RecastGenerators },
  });
}

// Recast 只存在于 Babylon 适配层，核心移动通过 GroundNavigation 同步查询。
export class BabylonNavigation implements GroundNavigation {
  private disposed = false;

  private constructor(private readonly plugin: RecastNavigationJSPluginV2) {}

  static async create(
    scene: Scene,
    definition: DungeonNavigationDef,
  ): Promise<BabylonNavigation> {
    const plugin = await createPlugin();
    const sources = BabylonNavigation.createSources(scene, definition);
    try {
      const result = plugin.createNavMesh(sources, {
        cs: 0.25,
        ch: 0.2,
        walkableSlopeAngle: 35,
        walkableHeight: 9,
        walkableClimb: 1,
        walkableRadius: 3,
        maxEdgeLen: 48,
        maxSimplificationError: 1.3,
        minRegionArea: 4,
        mergeRegionArea: 8,
        maxVertsPerPoly: 6,
        detailSampleDist: 6,
        detailSampleMaxError: 1,
      });
      if (!result || !plugin.navMesh || !plugin.navMeshQuery) {
        throw new Error("Recast failed to create a navigation mesh");
      }
      plugin.navMeshQuery.defaultQueryHalfExtents = { x: 2, y: 4, z: 2 };
      return new BabylonNavigation(plugin);
    } catch (error) {
      plugin.dispose();
      throw error;
    } finally {
      for (const mesh of sources) mesh.dispose(false, false);
    }
  }

  move(start: GroundPoint, destination: GroundPoint): GroundPoint {
    if (this.disposed) return start;
    const start3 = { x: start.x, y: 0, z: start.z };
    const destination3 = { x: destination.x, y: 0, z: destination.z };
    const nearest = this.plugin.navMeshQuery.findClosestPoint(start3);
    if (!nearest.success || nearest.polyRef === 0) return start;
    const moved = this.plugin.navMeshQuery.moveAlongSurface(
      nearest.polyRef,
      nearest.point,
      destination3,
    );
    return moved.success
      ? { x: moved.resultPosition.x, z: moved.resultPosition.z }
      : start;
  }

  path(start: GroundPoint, destination: GroundPoint): readonly GroundPoint[] {
    if (this.disposed) return [];
    const result = this.plugin.navMeshQuery.computePath(
      { x: start.x, y: 0, z: start.z },
      { x: destination.x, y: 0, z: destination.z },
    );
    return result.success
      ? result.path.map((point) => ({ x: point.x, z: point.z }))
      : [];
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.plugin.dispose();
  }

  private static createSources(
    scene: Scene,
    definition: DungeonNavigationDef,
  ): Mesh[] {
    const meshes: Mesh[] = [];
    for (const surface of definition.walkable) {
      const mesh = MeshBuilder.CreateGround(
        `nav-${surface.id}`,
        { width: surface.width, height: surface.depth, subdivisions: 1 },
        scene,
      );
      mesh.position.set(surface.x, 0, surface.z);
      meshes.push(mesh);
    }
    for (const blocker of definition.blockers) {
      const mesh = MeshBuilder.CreateBox(
        `nav-${blocker.id}`,
        { width: blocker.width, height: blocker.height, depth: blocker.depth },
        scene,
      );
      mesh.position.set(blocker.x, blocker.height / 2, blocker.z);
      meshes.push(mesh);
    }
    return meshes;
  }
}
