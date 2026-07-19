import type { ActorAction, ActorFaction } from "../actor/ActorComponents";
import type { InteractionState } from "../dungeon/DungeonDefinitions";
import type { EntityId } from "./World";
import type { ActiveSkillSlot, EquipmentSlot, PassiveSlot } from "../content/Definitions";
import type { DamageType } from "../combat/DamagePacket";
import type { PrimaryAttribute } from "../progression/ProgressionComponents";
import type { PlayerSlotId } from "../player/PlayerSlot";
import type { DungeonRunPhase } from "../dungeon/DungeonRunComponents";

// 玩法事实只供表现层和界面消费，不能反向修改核心状态。
export type GameplayEvent =
  | { type: "actor_spawned"; actor: EntityId; faction: ActorFaction }
  | { type: "action_started"; actor: EntityId; action: ActorAction }
  | { type: "ability_cast"; actor: EntityId; ability: string; visual: string; aimX: number; aimZ: number }
  | {
      type: "ability_telegraph_started";
      source: EntityId;
      ability: string;
      targetX: number;
      targetZ: number;
      duration: number;
      shape: "circle" | "cone" | "line";
      damageType: DamageType;
      radius?: number;
      angle?: number;
      length?: number;
      width?: number;
    }
  | { type: "ability_telegraph_cancelled"; source: EntityId; ability: string }
  | { type: "ability_impact"; actor: EntityId; ability: string; visual: string; aimX: number; aimZ: number }
  | { type: "visual_emitted"; actor: EntityId; visual: string; aimX: number; aimZ: number }
  | {
      type: "damage_applied";
      source: EntityId;
      target: EntityId;
      amount: number;
      damageType: DamageType;
      critical: boolean;
      skillId: string;
    }
  | { type: "actor_staggered"; source: EntityId; target: EntityId; duration: number }
  | { type: "healing_applied"; source: EntityId; target: EntityId; amount: number }
  | { type: "projectile_spawned"; projectile: EntityId; faction: ActorFaction }
  | { type: "projectile_removed"; projectile: EntityId }
  | { type: "hazard_spawned"; hazard: EntityId; visual: string; x: number; z: number; radius: number }
  | { type: "hazard_removed"; hazard: EntityId }
  | { type: "summon_spawned"; summon: EntityId; owner: EntityId; actor: string }
  | { type: "summon_removed"; summon: EntityId; owner: EntityId }
  | { type: "status_added"; target: EntityId; status: string; stacks: number }
  | { type: "status_removed"; target: EntityId; status: string }
  | { type: "loot_spawned"; loot: EntityId; kind: "item" | "ability" | "material"; owner: PlayerSlotId }
  | {
      type: "loot_picked_up";
      actor: EntityId;
      loot: EntityId;
      kind: "item" | "ability" | "material";
      label: string;
      amount: number;
    }
  | { type: "inventory_full"; actor: EntityId; loot: EntityId }
  | {
      type: "item_equipped";
      actor: EntityId;
      item: number;
      definition: string;
      slot: EquipmentSlot;
    }
  | { type: "ability_equipped"; actor: EntityId; ability: string; slot: ActiveSkillSlot }
  | { type: "passive_equipped"; actor: EntityId; passive: string; slot: PassiveSlot }
  | { type: "item_reinforced"; actor: EntityId; item: number; level: number }
  | { type: "item_salvaged"; actor: EntityId; item: number; scrap: number }
  | { type: "item_recovered"; actor: EntityId; item: number }
  | { type: "item_favorite_changed"; actor: EntityId; item: number; favorite: boolean }
  | {
      type: "forge_rejected";
      actor: EntityId;
      item: number;
      reason: "max_level" | "missing_scrap" | "missing_essence" | "missing_seal" | "missing_item" | "favorite" | "equipped";
    }
  | { type: "attribute_allocated"; actor: EntityId; attribute: PrimaryAttribute; amount: number }
  | { type: "attributes_reset"; actor: EntityId; refunded: number }
  | { type: "skill_ranked_up"; actor: EntityId; ability: string; rank: number }
  | { type: "progression_leveled"; actor: EntityId; from: number; to: number }
  | { type: "interaction_changed"; target: EntityId; state: InteractionState }
  | { type: "resource_collected"; actor: EntityId; resource: string; amount: number }
  | { type: "door_opened"; target: EntityId }
  | { type: "actor_teleported"; actor: EntityId; x: number; z: number }
  | { type: "encounter_started"; encounter: string }
  | { type: "encounter_completed"; encounter: string }
  | { type: "elite_reward_claimed"; encounter: string }
  | { type: "boss_intro_completed"; encounter: string }
  | { type: "dungeon_reward_claimed"; player: PlayerSlotId }
  | { type: "dungeon_reward_settled" }
  | { type: "party_wiped" }
  | { type: "hero_downed"; actor: EntityId; duration: number }
  | { type: "hero_revived"; actor: EntityId; by: EntityId; health: number }
  | { type: "checkpoint_reset"; checkpoint: string; encounter: string }
  | {
      type: "profile_progress_requested";
      clearedDungeon: string;
      unlockDungeon?: string;
    }
  | { type: "dungeon_phase_changed"; from: DungeonRunPhase; to: DungeonRunPhase }
  | { type: "checkpoint_activated"; checkpoint: string }
  | { type: "dungeon_completed"; dungeon: string; difficulty: "normal" | "echo" }
  | {
      type: "boss_phase_started";
      actor: EntityId;
      phaseId: string;
      phaseName: string;
      index: number;
      duration: number;
      visual: string;
    }
  | { type: "actor_died"; actor: EntityId };
