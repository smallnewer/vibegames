import type { InventoryCellModel } from "../../../game/ui/InventoryPageModel";
import type { UiInput } from "../../../game/ui/UiInput";
import type { UiState } from "../../../game/ui/UiState";
import { GameIcon } from "../GameIcon";

const RARITY_LABEL = {
  normal: "普通",
  magic: "魔法",
  rare: "稀有",
  unique: "暗金",
} as const;

export function ItemGrid({
  state,
  cells,
  dispatch,
}: {
  readonly state: UiState;
  readonly cells: readonly InventoryCellModel[];
  readonly dispatch: (input: UiInput) => void;
}) {
  return (
    <div className="item-grid" role="grid" aria-label="物品格">
      {cells.map((cell) => (
        <button
          type="button"
          role="gridcell"
          key={cell.focusId}
          disabled={!cell.enabled}
          data-focus-id={cell.focusId}
          data-controller-focus={state.focusId === cell.focusId ? "true" : undefined}
          data-rarity={cell.item?.rarity}
          aria-label={cell.item?.name ?? `空格 ${cell.index + 1}`}
          onClick={() => {
            dispatch({ type: "select_focus", id: cell.focusId });
            dispatch({ type: "confirm" });
          }}
        >
          {cell.item ? (
            <>
              <GameIcon id={cell.icon} label={cell.item.name} />
              <small>Lv.{cell.item.itemLevel}</small>
              {cell.item.reinforce > 0 ? <b>+{cell.item.reinforce}</b> : null}
              {cell.item.favorite ? <i aria-label="已收藏">◆</i> : null}
              <em>{RARITY_LABEL[cell.item.rarity]}</em>
            </>
          ) : null}
        </button>
      ))}
    </div>
  );
}
