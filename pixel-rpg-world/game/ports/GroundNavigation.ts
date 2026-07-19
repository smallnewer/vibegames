import type { WorldBoundsDef } from "../dungeon/DungeonDefinitions";

export interface GroundPoint {
  x: number;
  z: number;
}

// 核心只认识地面点；具体是边界、NavMesh 还是测试替身由宿主决定。
export interface GroundNavigation {
  move(start: GroundPoint, destination: GroundPoint): GroundPoint;
  path(start: GroundPoint, destination: GroundPoint): readonly GroundPoint[];
  dispose(): void;
}

export class BoundsNavigation implements GroundNavigation {
  constructor(private readonly bounds: WorldBoundsDef) {}

  move(_start: GroundPoint, destination: GroundPoint): GroundPoint {
    return {
      x: Math.max(this.bounds.minX, Math.min(this.bounds.maxX, destination.x)),
      z: Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, destination.z)),
    };
  }

  path(start: GroundPoint, destination: GroundPoint): readonly GroundPoint[] {
    return [start, this.move(start, destination)];
  }

  dispose(): void {}
}
