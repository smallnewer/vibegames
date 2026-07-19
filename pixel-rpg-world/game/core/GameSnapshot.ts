import type { ActorAction, ActorFaction, ActorLocomotion } from "../actor/ActorComponents";
import type {
  AssetDef,
  DecorationDef,
  DungeonMapDef,
  DungeonVisualDef,
  InteractionKind,
  InteractionState,
  InteractionTrigger,
  PlacementDef,
} from "../dungeon/DungeonDefinitions";
import type { EntityId } from "./World";
import type { PlayerSlotId } from "../player/PlayerSlot";
import type {
  ActiveSkillSlot,
  EquipmentSlot,
  ItemRarity,
  PassiveSlot,
  StatBlock,
} from "../content/Definitions";
import type { ActorRole } from "../content/ActorDefinitions";
import type { StatBreakdownMap } from "../actor/Stats";
import type { PrimaryAttribute, SkillRank } from "../progression/ProgressionComponents";
import type { ItemTheme, MaterialId, RolledAffix } from "../item/ItemComponents";
import type { ReinforcementQuote } from "../item/ForgeQuote";
import type { DungeonObjectiveSnapshot, DungeonRunPhase } from "../dungeon/DungeonRunComponents";
import type { HeroLifeState } from "../party/DownedComponents";

export interface EquippedVisualSnapshot {
  slot: EquipmentSlot;
  visual: string;
}

export interface StatusVisualSnapshot {
  id: string;
  visual: string;
}

export interface ActorSnapshot {
  id: EntityId;
  archetype: string;
  name: string;
  role: ActorRole;
  visualId: string;
  bossPhase?: {
    index: number;
    id: string;
    name: string;
  };
  faction: ActorFaction;
  action: ActorAction;
  actionDuration: number;
  locomotion: ActorLocomotion;
  x: number;
  z: number;
  previousX: number;
  previousZ: number;
  facingX: number;
  facingZ: number;
  health: number;
  maxHealth: number;
  lifeState?: HeroLifeState;
  downedTimeLeft?: number;
  reviveProgress?: number;
  rollCooldownLeft: number;
  rollCooldownRatio: number;
  healthBar: "none" | "minion" | "elite";
  engaged: boolean;
  lastDamagedTick?: number;
  playerSlot?: PlayerSlotId;
  statuses: readonly string[];
  statusVisuals: readonly StatusVisualSnapshot[];
  equipmentVisuals: readonly EquippedVisualSnapshot[];
}

export interface ProjectileSnapshot {
  id: EntityId;
  faction: ActorFaction;
  x: number;
  z: number;
  previousX: number;
  previousZ: number;
}

export interface HazardSnapshot {
  id: EntityId;
  visual: string;
  x: number;
  z: number;
  radius: number;
  timeLeft: number;
}

export interface LootSnapshot {
  id: EntityId;
  kind: "item" | "ability" | "material";
  name: string;
  owner: PlayerSlotId;
  x: number;
  z: number;
}

export interface ItemSnapshot {
  id: number;
  definition: string;
  name: string;
  slot: EquipmentSlot;
  itemLevel: number;
  baseRoll: number;
  theme: ItemTheme;
  rarity: ItemRarity;
  affixes: readonly RolledAffix[];
  reinforce: number;
  favorite: boolean;
  equipped: boolean;
  reinforcementQuote: ReinforcementQuote;
}

export interface AbilitySlotSnapshot {
  id?: string;
  name: string;
  cooldownLeft: number;
  cooldownDuration: number;
  charges: number;
  maxCharges: number;
  recharge: readonly number[];
}

export interface PassiveSlotSnapshot {
  id?: string;
  name: string;
}

export interface StatusSnapshot {
  id: string;
  name: string;
  icon: string;
  stacks: number;
  timeLeft: number;
}

export interface HeroProgressSnapshot {
  level: number;
  experience: number;
  xpToNext: number;
  unspentAttributes: number;
  unspentSkills: number;
  skillRanks: Readonly<Record<string, SkillRank>>;
  nextItemId: number;
  allocated: Record<PrimaryAttribute, number>;
  items: readonly ItemSnapshot[];
  recovery: readonly ItemSnapshot[];
  forgeQuotes: Readonly<Record<number, ReinforcementQuote>>;
  equipment: {
    slots: Partial<Record<EquipmentSlot, number>>;
    names: Record<EquipmentSlot, string>;
    visuals: Partial<Record<EquipmentSlot, string>>;
  };
  materials: Record<MaterialId, number>;
  unlockedAbilities: readonly string[];
  abilities: Record<ActiveSkillSlot, AbilitySlotSnapshot>;
  weapons: Record<"melee" | "ranged", AbilitySlotSnapshot>;
  passives: Record<PassiveSlot, PassiveSlotSnapshot>;
  statuses: readonly StatusSnapshot[];
  stats: StatBlock;
  statBreakdown: StatBreakdownMap;
}

export interface PlayerSlotSnapshot {
  slot: PlayerSlotId;
  actor: EntityId;
  progress: HeroProgressSnapshot;
}

export interface InteractionSnapshot {
  id: EntityId;
  definition: string;
  name: string;
  kind: InteractionKind;
  trigger: InteractionTrigger;
  state: InteractionState;
  x: number;
  z: number;
  radius: number;
  prompt: string;
}

export interface DungeonSnapshot {
  id: string;
  name: string;
  themeId: string;
  visual: DungeonVisualDef;
  assets: readonly AssetDef[];
  placements: readonly PlacementDef[];
  decorations: readonly DecorationDef[];
  map: DungeonMapDef;
  resources: readonly {
    id: string;
    name: string;
    amount: number;
  }[];
  encounter: "idle" | "active" | "completed";
  door: "locked" | "open";
  portalUses: number;
}

export interface GameSnapshot {
  tick: number;
  mapDiscovery: {
    readonly discoveredSections: readonly string[];
  };
  run: {
    seed: number;
    phase?: DungeonRunPhase;
    activeEncounter?: string;
    completedEncounters?: readonly string[];
    checkpoint?: string;
    objective?: DungeonObjectiveSnapshot;
    reward?: {
      pendingPlayers: readonly PlayerSlotId[];
      firstClear: boolean;
      unlockDungeon?: string;
    };
  };
  hero: EntityId;
  players: readonly PlayerSlotSnapshot[];
  actors: readonly ActorSnapshot[];
  projectiles: readonly ProjectileSnapshot[];
  hazards: readonly HazardSnapshot[];
  loot: readonly LootSnapshot[];
  progress: HeroProgressSnapshot;
  dungeon: DungeonSnapshot;
  interactions: readonly InteractionSnapshot[];
}
