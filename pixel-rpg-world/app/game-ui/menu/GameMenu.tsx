import type { GameUiModel } from "../../../game/ui/GameUiModel";
import type { UiInput } from "../../../game/ui/UiInput";
import type { UiState } from "../../../game/ui/UiState";
import { ConfirmDialog } from "./ConfirmDialog";
import { CharacterPage } from "./CharacterPage";
import { InventoryPage } from "./InventoryPage";
import { SkillPage } from "./SkillPage";
import { ForgePage } from "./ForgePage";
import { ControlLegend } from "./ControlLegend";
import { MenuTabs } from "./MenuTabs";
import { SystemPage } from "./SystemPage";

export function GameMenu({
  state,
  model,
  dispatch,
}: {
  readonly state: UiState;
  readonly model: GameUiModel;
  readonly dispatch: (input: UiInput) => void;
}) {
  const hero = model.selectedHero;
  return (
    <section className="game-menu" data-testid="game-menu" hidden={!state.open} aria-label="游戏菜单">
      <header>
        <div>
          <small>PAUSED</small>
          <strong>{model.pageTitle}</strong>
        </div>
        <button type="button" onClick={() => dispatch({ type: "next_hero" })}>
          P{hero.slot} · {hero.name} · Lv.{hero.level}
        </button>
      </header>
      <MenuTabs page={state.page} dispatch={dispatch} />
      <main className="menu-content" role="tabpanel" aria-label={model.pageTitle}>
        {state.page === "inventory" ? (
          <InventoryPage state={state} model={model.inventory} dispatch={dispatch} />
        ) : state.page === "skills" ? (
          <SkillPage state={state} model={model.skills} dispatch={dispatch} />
        ) : state.page === "character" ? (
          <CharacterPage state={state} model={model.character} dispatch={dispatch} />
        ) : state.page === "forge" ? (
          <ForgePage state={state} model={model.forge} dispatch={dispatch} />
        ) : (
          <SystemPage state={state} model={model.system} dispatch={dispatch} />
        )}
      </main>
      <ControlLegend page={state.page} />
      <ConfirmDialog state={state} dispatch={dispatch} />
    </section>
  );
}
