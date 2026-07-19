import type { EntityId } from "./World";
import type {
  AbilitySlot,
  ActiveSkillSlot,
  EquipmentSlot,
  PassiveSlot,
} from "../content/Definitions";
import type { PrimaryAttribute } from "../progression/ProgressionComponents";

// 玩家和 AI 统一使用命令表达操作意图。
export type Command =
  | { type: "move"; actor: EntityId; x: number; z: number }
  | { type: "roll"; actor: EntityId; x: number; z: number }
  | { type: "cast"; actor: EntityId; slot: AbilitySlot; aimX: number; aimZ: number }
  | { type: "interact"; actor: EntityId; target: EntityId }
  | { type: "revive"; actor: EntityId; target: EntityId; held: boolean }
  | { type: "pickup"; actor: EntityId; loot: EntityId }
  | { type: "equip_item"; actor: EntityId; item: number; slot: EquipmentSlot }
  | { type: "equip_ability"; actor: EntityId; ability: string; slot: ActiveSkillSlot }
  | { type: "equip_passive"; actor: EntityId; passive: string; slot: PassiveSlot }
  | { type: "allocate_attribute"; actor: EntityId; attribute: PrimaryAttribute; amount: number }
  | { type: "reset_attributes"; actor: EntityId }
  | { type: "rank_up_skill"; actor: EntityId; ability: string }
  | { type: "reinforce_item"; actor: EntityId; item: number }
  | { type: "salvage_item"; actor: EntityId; item: number }
  | { type: "toggle_favorite"; actor: EntityId; item: number }
  | { type: "recover_item"; actor: EntityId; item: number };
