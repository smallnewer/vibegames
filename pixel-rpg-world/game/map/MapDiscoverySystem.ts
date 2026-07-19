import type { DungeonMapDef, DungeonSectionDef } from "../dungeon/DungeonDefinitions";
import type { DownedComponent } from "../party/DownedComponents";
import type { TransformComponent } from "../actor/ActorComponents";
import type { EntityId, World } from "../core/World";
import type { MapDiscoveryComponent, MapPlayerPosition } from "./MapComponents";

export function sectionContaining(
  map: DungeonMapDef,
  x: number,
  z: number,
): DungeonSectionDef | undefined {
  return map.sections.filter((section) => (
    Math.abs(x - section.gridX * map.screenWidth) <= map.screenWidth / 2
    && Math.abs(z - section.gridZ * map.screenDepth) <= map.screenDepth / 2
  )).sort((left, right) => {
    const leftDistance = Math.hypot(
      x - left.gridX * map.screenWidth,
      z - left.gridZ * map.screenDepth,
    );
    const rightDistance = Math.hypot(
      x - right.gridX * map.screenWidth,
      z - right.gridZ * map.screenDepth,
    );
    return leftDistance - rightDistance || left.id.localeCompare(right.id);
  })[0];
}

export function discoverPlayerSections(
  discovery: MapDiscoveryComponent,
  map: DungeonMapDef,
  players: readonly MapPlayerPosition[],
): boolean {
  const found = players.flatMap((player) => {
    if (player.lifeState === "dead") return [];
    const section = sectionContaining(map, player.x, player.z);
    return section ? [section.id] : [];
  });
  const next = [...new Set([...discovery.discoveredSections, ...found])].sort();
  if (
    next.length === discovery.discoveredSections.length
    && next.every((id, index) => id === discovery.discoveredSections[index])
  ) return false;
  discovery.discoveredSections = next;
  return true;
}

export class MapDiscoverySystem {
  update(
    world: World,
    dungeon: EntityId,
    players: readonly EntityId[],
    map: DungeonMapDef,
  ): boolean {
    const discovery = world.getComponent<MapDiscoveryComponent>("mapDiscovery", dungeon);
    if (!discovery) return false;
    return discoverPlayerSections(discovery, map, players.flatMap((player) => {
      const transform = world.getComponent<TransformComponent>("transform", player);
      if (!transform) return [];
      return [{
        x: transform.x,
        z: transform.z,
        lifeState: world.getComponent<DownedComponent>("downed", player)?.state,
      }];
    }));
  }
}
