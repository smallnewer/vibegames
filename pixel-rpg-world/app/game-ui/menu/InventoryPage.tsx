import type {
  InventoryPageModel,
  InventorySortMode,
  InventoryView,
} from "../../../game/ui/InventoryPageModel";
import type { UiInput } from "../../../game/ui/UiInput";
import type { UiState } from "../../../game/ui/UiState";
import { ItemDetails } from "./ItemDetails";
import { ItemGrid } from "./ItemGrid";
import { GameIcon } from "../GameIcon";

const VIEWS: readonly [InventoryView, string][] = [["items", "背包"], ["recovery", "临时回收箱"]];
const SORTS: readonly [InventorySortMode, string][] = [
  ["newest", "最新"],
  ["slot", "部位"],
  ["rarity", "稀有度"],
  ["item_level", "物品等级"],
];

export function InventoryPage({
  state,
  model,
  dispatch,
}: {
  readonly state: UiState;
  readonly model: InventoryPageModel;
  readonly dispatch: (input: UiInput) => void;
}) {
  const activate = (id: string) => {
    dispatch({ type: "select_focus", id });
    dispatch({ type: "confirm" });
  };
  return (
    <div className="inventory-page">
      <aside className="equipment-rail" aria-label="已装备">
        <h2>装备</h2>
        {model.equipment.map((entry) => (
          <div key={entry.slot}><GameIcon id={entry.icon} /><small>{entry.slot}</small><span>{entry.name}</span></div>
        ))}
      </aside>
      <section className="inventory-main">
        <header>
          <div className="inventory-views">
            {VIEWS.map(([view, label]) => {
              const id = `inventory:view:${view}`;
              return <button type="button" key={view} aria-pressed={model.view === view} data-focus-id={id} data-controller-focus={state.focusId === id ? "true" : undefined} onClick={() => activate(id)}>{label} · {view === "items" ? `${model.mainCount}/${model.mainCapacity}` : `${model.recoveryCount}/${model.recoveryCapacity}`}</button>;
            })}
          </div>
          <div className="inventory-sorts" aria-label="排序">
            {SORTS.map(([sort, label]) => {
              const id = `inventory:sort:${sort}`;
              return <button type="button" key={sort} aria-pressed={model.sort === sort} data-focus-id={id} data-controller-focus={state.focusId === id ? "true" : undefined} onClick={() => activate(id)}>{label}</button>;
            })}
          </div>
        </header>
        <ItemGrid state={state} cells={model.view === "items" ? model.cells : model.recoveryCells} dispatch={dispatch} />
      </section>
      <ItemDetails state={state} model={model} dispatch={dispatch} />
    </div>
  );
}
