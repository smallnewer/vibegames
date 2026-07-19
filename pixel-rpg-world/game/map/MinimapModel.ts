import type { GameSnapshot } from "../core/GameSnapshot";
import {
  isRuntimeEncounter,
  type DungeonPack,
  type DungeonSectionDef,
} from "../dungeon/DungeonDefinitions";
import type { HeroLifeState } from "../party/DownedComponents";
import type { PlayerSlotId } from "../player/PlayerSlot";
import { sectionContaining } from "./MapDiscoverySystem";

const DEFAULT_WIDTH = 176;
const DEFAULT_HEIGHT = 132;
const PADDING = 8;

export interface MinimapSnapshot {
  readonly width: number;
  readonly height: number;
  readonly sections: readonly {
    readonly id: string;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly discovered: boolean;
    readonly adjacent: boolean;
  }[];
  readonly connections: readonly {
    readonly id: string;
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
  }[];
  readonly players: readonly {
    readonly slot: PlayerSlotId;
    readonly x: number;
    readonly y: number;
    readonly lifeState: HeroLifeState;
  }[];
  readonly markers: readonly {
    readonly id: string;
    readonly kind: "objective" | "door" | "boss" | "exit";
    readonly x: number;
    readonly y: number;
    readonly visible: boolean;
  }[];
}

interface Projection {
  readonly x: (worldX: number) => number;
  readonly y: (worldZ: number) => number;
  readonly scale: number;
}

function projection(pack: DungeonPack, width: number, height: number): Projection {
  const bounds = pack.map.bounds;
  const availableWidth = Math.max(1, width - PADDING * 2);
  const availableHeight = Math.max(1, height - PADDING * 2);
  const worldWidth = Math.max(1, bounds.maxX - bounds.minX);
  const worldHeight = Math.max(1, bounds.maxZ - bounds.minZ);
  const scale = Math.min(availableWidth / worldWidth, availableHeight / worldHeight);
  const renderedWidth = worldWidth * scale;
  const renderedHeight = worldHeight * scale;
  const offsetX = (width - renderedWidth) / 2;
  const offsetY = (height - renderedHeight) / 2;
  return {
    x: (worldX) => offsetX + (worldX - bounds.minX) * scale,
    y: (worldZ) => offsetY + (bounds.maxZ - worldZ) * scale,
    scale,
  };
}

function adjacent(left: DungeonSectionDef, right: DungeonSectionDef): boolean {
  return Math.abs(left.gridX - right.gridX) + Math.abs(left.gridZ - right.gridZ) === 1;
}

function pointSection(pack: DungeonPack, x: number, z: number): DungeonSectionDef | undefined {
  return sectionContaining(pack.map, x, z);
}

function currentObjectivePoint(
  snapshot: GameSnapshot,
  pack: DungeonPack,
): { id: string; x: number; z: number } | undefined {
  const encounters = pack.encounters.filter(isRuntimeEncounter);
  const active = encounters.find((encounter) => encounter.id === snapshot.run.activeEncounter);
  if (active) return { id: active.id, x: active.trigger.x, z: active.trigger.z };
  if (snapshot.run.phase === "reward" || snapshot.run.phase === "completed") {
    const portal = pack.interactions.find((interaction) => (
      interaction.id === pack.run?.completionPortal
    ));
    return portal ? { id: portal.id, x: portal.x, z: portal.z } : undefined;
  }
  const incomplete = encounters.filter((encounter) => (
    !snapshot.run.completedEncounters?.includes(encounter.id)
  ));
  const nonBoss = incomplete.filter((encounter) => encounter.kind !== "boss");
  const candidates = nonBoss.length > 0 ? nonBoss : incomplete;
  const hero = snapshot.actors.find((actor) => actor.id === snapshot.hero);
  return [...candidates].sort((left, right) => {
    const leftDistance = hero
      ? Math.hypot(left.trigger.x - hero.x, left.trigger.z - hero.z) : 0;
    const rightDistance = hero
      ? Math.hypot(right.trigger.x - hero.x, right.trigger.z - hero.z) : 0;
    return leftDistance - rightDistance || left.id.localeCompare(right.id);
  }).map((encounter) => ({
    id: encounter.id,
    x: encounter.trigger.x,
    z: encounter.trigger.z,
  }))[0];
}

export function buildMinimap(
  snapshot: GameSnapshot,
  pack: DungeonPack,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
): MinimapSnapshot {
  const project = projection(pack, width, height);
  const discovered = new Set(snapshot.mapDiscovery.discoveredSections);
  const visibleSections = pack.map.sections.filter((section) => (
    discovered.has(section.id)
    || pack.map.sections.some((candidate) => discovered.has(candidate.id) && adjacent(section, candidate))
  ));
  const visibleIds = new Set(visibleSections.map((section) => section.id));
  const sections = visibleSections.map((section) => ({
    id: section.id,
    x: project.x(section.gridX * pack.map.screenWidth - pack.map.screenWidth / 2),
    y: project.y(section.gridZ * pack.map.screenDepth + pack.map.screenDepth / 2),
    width: pack.map.screenWidth * project.scale,
    height: pack.map.screenDepth * project.scale,
    discovered: discovered.has(section.id),
    adjacent: !discovered.has(section.id),
  }));
  const connections = visibleSections.flatMap((left) => visibleSections.flatMap((right) => {
    if (left.id >= right.id || !adjacent(left, right)) return [];
    return [{
      id: `${left.id}:${right.id}`,
      x1: project.x(left.gridX * pack.map.screenWidth),
      y1: project.y(left.gridZ * pack.map.screenDepth),
      x2: project.x(right.gridX * pack.map.screenWidth),
      y2: project.y(right.gridZ * pack.map.screenDepth),
    }];
  }));
  const players = snapshot.players.flatMap((player) => {
    const actor = snapshot.actors.find((candidate) => candidate.id === player.actor);
    if (!actor || actor.lifeState === "dead" || actor.action === "dead") return [];
    const section = pointSection(pack, actor.x, actor.z);
    if (!section || !discovered.has(section.id)) return [];
    return [{
      slot: player.slot,
      x: Math.max(PADDING, Math.min(width - PADDING, project.x(actor.x))),
      y: Math.max(PADDING, Math.min(height - PADDING, project.y(actor.z))),
      lifeState: actor.lifeState ?? "alive",
    }];
  });
  const markers: MinimapSnapshot["markers"][number][] = [];
  for (const interaction of snapshot.interactions.filter((value) => value.kind === "door")) {
    const section = pointSection(pack, interaction.x, interaction.z);
    markers.push({
      id: interaction.definition,
      kind: "door",
      x: project.x(interaction.x),
      y: project.y(interaction.z),
      visible: interaction.state !== "completed" && section !== undefined && visibleIds.has(section.id),
    });
  }
  const objective = currentObjectivePoint(snapshot, pack);
  if (objective) {
    const section = pointSection(pack, objective.x, objective.z);
    markers.push({
      id: `objective:${objective.id}`,
      kind: "objective",
      x: project.x(objective.x),
      y: project.y(objective.z),
      visible: section !== undefined && visibleIds.has(section.id),
    });
  }
  if (snapshot.run.phase === "boss_intro" || snapshot.run.phase === "boss_combat") {
    const boss = snapshot.actors.find((actor) => actor.role === "boss" && actor.action !== "dead");
    const encounter = pack.encounters.filter(isRuntimeEncounter).find((value) => (
      value.kind === "boss"
    ));
    const location = boss ?? encounter?.trigger;
    if (location) {
      const section = pointSection(pack, location.x, location.z);
      markers.push({
        id: "boss",
        kind: "boss",
        x: project.x(location.x),
        y: project.y(location.z),
        visible: section !== undefined && visibleIds.has(section.id),
      });
    }
  }
  if (snapshot.run.phase === "reward" || snapshot.run.phase === "completed") {
    const exit = pack.interactions.find((value) => value.id === pack.run?.completionPortal);
    if (exit) {
      const section = pointSection(pack, exit.x, exit.z);
      markers.push({
        id: exit.id,
        kind: "exit",
        x: project.x(exit.x),
        y: project.y(exit.z),
        visible: section !== undefined && visibleIds.has(section.id),
      });
    }
  }
  return { width, height, sections, connections, players, markers };
}
