import type { DungeonSectionDef } from "../../../dungeon/DungeonDefinitions";

const SCREEN_WIDTH = 18;
const SCREEN_DEPTH = 12;

function distanceSquared(section: DungeonSectionDef, x: number, z: number): number {
  const dx = section.gridX * SCREEN_WIDTH - x;
  const dz = section.gridZ * SCREEN_DEPTH - z;
  return dx * dx + dz * dz;
}

// 只激活当前屏和相邻屏，正式十屏地图也不会一次性提交全部场景。
export function visibleSectionIds(
  sections: readonly DungeonSectionDef[],
  x: number,
  z: number,
): readonly string[] {
  if (sections.length === 0) return [];
  const current = [...sections].sort((left, right) => (
    distanceSquared(left, x, z) - distanceSquared(right, x, z)
    || left.id.localeCompare(right.id)
  ))[0];
  return sections
    .filter((section) => (
      section.id === current.id
      || Math.abs(section.gridX - current.gridX) + Math.abs(section.gridZ - current.gridZ) === 1
    ))
    .sort((left, right) => (
      Number(right.id === current.id) - Number(left.id === current.id)
      || distanceSquared(left, x, z) - distanceSquared(right, x, z)
      || left.id.localeCompare(right.id)
    ))
    .slice(0, 5)
    .map((section) => section.id);
}
