import type { PlayerSlotId } from "../player/PlayerSlot";
import type {
  InventorySortMode,
  InventoryView,
} from "./InventoryPageModel";

export const UI_PAGES = ["inventory", "skills", "character", "forge", "system"] as const;
export type UiPage = typeof UI_PAGES[number];
export type UiDialog = "salvage" | "discard" | "reset_attributes" | "rank_skill";

export interface UiState {
  readonly open: boolean;
  readonly page: UiPage;
  readonly hero: PlayerSlotId;
  readonly focusId: string;
  readonly inventorySort?: InventorySortMode;
  readonly inventoryView?: InventoryView;
  readonly inventoryCompareId?: number;
  readonly skillSelection?: string;
  readonly forgePendingItem?: number;
  readonly dialog?: UiDialog;
  readonly dialogMessage?: string;
  readonly dialogFocus?: "cancel" | "confirm";
}
