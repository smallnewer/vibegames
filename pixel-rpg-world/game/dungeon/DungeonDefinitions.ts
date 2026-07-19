export type InteractionKind = "harvest" | "encounter" | "door" | "portal";
export type InteractionTrigger = "interact" | "enter";
export type InteractionState = "idle" | "active" | "completed" | "disabled";
export type DungeonArtProfile = "foundation" | "lava_fortress" | "voxel_dungeon";
export type DungeonSectionPreset =
  | "foundation_room"
  | "lava_bridge_arena"
  | "entry_hall"
  | "living_quarters"
  | "stone_corridor"
  | "training_arena"
  | "workshop"
  | "boss_arena";

export interface DungeonLoreDef {
  readonly region: string;
  readonly summary: string;
  readonly boss: {
    readonly name: string;
    readonly title: string;
    readonly background: string;
  };
}

export interface PointDef {
  readonly id: string;
  readonly x: number;
  readonly z: number;
}

export interface ResourceDef {
  readonly id: string;
  readonly name: string;
}

export interface DungeonManifest {
  readonly themeId: string;
  readonly resource: ResourceDef;
}

export interface WorldBoundsDef {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

export interface DungeonSectionDef {
  readonly id: string;
  readonly zone?: string;
  readonly name?: string;
  readonly preset: DungeonSectionPreset;
  readonly gridX: number;
  readonly gridZ: number;
  readonly rotation: 0 | 90 | 180 | 270;
}

export interface DungeonMapDef {
  readonly mode: "showcase" | "production";
  readonly screenWidth: 18;
  readonly screenDepth: 12;
  readonly bounds: WorldBoundsDef;
  readonly sections: readonly DungeonSectionDef[];
  readonly navigation: DungeonNavigationDef;
}

export interface WalkableSurfaceDef {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  readonly width: number;
  readonly depth: number;
}

export interface StaticBlockerDef extends WalkableSurfaceDef {
  readonly height: number;
}

export interface DungeonNavigationDef {
  readonly walkable: readonly WalkableSurfaceDef[];
  readonly blockers: readonly StaticBlockerDef[];
}

export interface AssetDef {
  readonly id: string;
  readonly kind: "model";
  readonly url: string;
}

export interface PlacementDef {
  readonly id: string;
  readonly asset: string;
  readonly section: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly rotationY: number;
  readonly scale: number;
}

export interface EnemySpawnDef extends PointDef {
  readonly kind: string;
  readonly encounter: string;
}

export interface LegacyEncounterDef {
  readonly id: string;
  readonly members: readonly string[];
}

export interface DungeonRunDef {
  readonly gameplayVersion: 1;
  readonly levelBand: {
    readonly normal: readonly [number, number];
    readonly echo: readonly [number, number];
  };
  readonly entrySection: string;
  readonly bossEncounter: string;
  readonly completionPortal: string;
  readonly firstClearUnlock?: string;
}

export interface EncounterTriggerDef {
  readonly section: string;
  readonly x: number;
  readonly z: number;
  readonly radius: number;
}

export interface EncounterWaveMemberDef {
  readonly id: string;
  readonly actor: string;
  readonly spawn: string;
  readonly levelOffset: number;
  readonly eliteAffix?: string;
}

export interface EncounterWaveDef {
  readonly delay: number;
  readonly members: readonly EncounterWaveMemberDef[];
}

export interface EncounterDef {
  readonly id: string;
  readonly kind: "normal" | "elite" | "boss";
  readonly trigger: EncounterTriggerDef;
  readonly lockInteractions: readonly string[];
  readonly waves: readonly EncounterWaveDef[];
  readonly rewardTable?: string;
  readonly checkpoint?: string;
  readonly bossPhases?: readonly [string, string, string];
}

export type AnyEncounterDef = LegacyEncounterDef | EncounterDef;

export function isRuntimeEncounter(encounter: AnyEncounterDef): encounter is EncounterDef {
  return "waves" in encounter;
}

interface InteractionBaseDef {
  readonly id: string;
  readonly name: string;
  readonly trigger: InteractionTrigger;
  readonly x: number;
  readonly z: number;
  readonly radius: number;
}

export interface HarvestInteractionDef extends InteractionBaseDef {
  readonly kind: "harvest";
  readonly reward: {
    readonly resource: string;
    readonly name: string;
    readonly amount: number;
  };
}

export interface EncounterInteractionDef extends InteractionBaseDef {
  readonly kind: "encounter";
  readonly encounter: string;
}

export interface DoorInteractionDef extends InteractionBaseDef {
  readonly kind: "door";
}

export interface PortalInteractionDef extends InteractionBaseDef {
  readonly kind: "portal";
  readonly destination: {
    readonly x: number;
    readonly z: number;
  };
}

export type InteractionDef =
  | HarvestInteractionDef
  | EncounterInteractionDef
  | DoorInteractionDef
  | PortalInteractionDef;

export interface ColorPairDef {
  readonly color: string;
  readonly emissive: string;
}

export interface ColorRampDef {
  readonly base: string;
  readonly dark: string;
  readonly light: string;
}

export interface DungeonThemePalette {
  readonly stone: ColorRampDef;
  readonly rock: ColorRampDef;
  readonly metal: ColorRampDef;
  readonly wood: ColorRampDef;
  readonly rune: ColorRampDef;
  readonly hazard: ColorRampDef;
  readonly light: {
    readonly fill: string;
    readonly key: string;
    readonly accent: string;
    readonly fog: string;
  };
}

export interface DungeonVisualDef {
  readonly profile: DungeonArtProfile;
  readonly clearColor: string;
  readonly groundColor: string;
  readonly groundSize: number;
  readonly palette?: DungeonThemePalette;
  readonly enemy: {
    readonly stone: string;
    readonly bone: string;
    readonly crystal: string;
    readonly emissive: string;
    readonly projectile: string;
  };
  readonly interactions: {
    readonly harvest: ColorPairDef;
    readonly encounter: ColorPairDef;
    readonly doorStone: ColorPairDef;
    readonly doorGate: ColorPairDef;
    readonly portal: ColorPairDef;
    readonly portalActive: string;
  };
}

export interface DecorationDef {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly color: string;
  readonly emissive?: string;
}

export interface DungeonPackSource {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly name: string;
  readonly lore: DungeonLoreDef;
  readonly manifest: DungeonManifest;
  readonly map: DungeonMapDef;
  readonly run?: DungeonRunDef;
  readonly spawnPoints: readonly PointDef[];
  readonly encounterSpawns?: readonly PointDef[];
  readonly enemies: readonly EnemySpawnDef[];
  readonly encounters: readonly AnyEncounterDef[];
  readonly interactions: readonly InteractionDef[];
  readonly visual: DungeonVisualDef;
  readonly assets: readonly AssetDef[];
  readonly placements: readonly PlacementDef[];
  readonly decorations: readonly DecorationDef[];
  readonly budgets: {
    readonly dynamicLights: number;
    readonly estimatedDrawItems: number;
    readonly estimatedTriangles: number;
  };
}

export interface DungeonPack extends DungeonPackSource {
  readonly encounterById: ReadonlyMap<string, AnyEncounterDef>;
  readonly spawnById: ReadonlyMap<string, PointDef>;
  readonly interactionById: ReadonlyMap<string, InteractionDef>;
}

export function hydrateDungeonPack(source: DungeonPackSource): DungeonPack {
  return {
    ...source,
    encounterById: new Map(source.encounters.map((encounter) => [encounter.id, encounter])),
    spawnById: new Map(
      [...source.spawnPoints, ...(source.encounterSpawns ?? [])].map((spawn) => [spawn.id, spawn]),
    ),
    interactionById: new Map(source.interactions.map((interaction) => [interaction.id, interaction])),
  };
}
