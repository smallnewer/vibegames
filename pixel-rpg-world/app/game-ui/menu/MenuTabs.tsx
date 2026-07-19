import type { UiInput } from "../../../game/ui/UiInput";
import { UI_PAGES, type UiPage } from "../../../game/ui/UiState";

const LABELS: Record<UiPage, string> = {
  inventory: "背包",
  skills: "技能",
  character: "角色",
  forge: "打造",
  system: "系统",
};

export function MenuTabs({
  page,
  dispatch,
}: {
  readonly page: UiPage;
  readonly dispatch: (input: UiInput) => void;
}) {
  return (
    <nav className="menu-tabs" role="tablist" aria-label="菜单页面">
      {UI_PAGES.map((value) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={value === page}
          onClick={() => dispatch({ type: "select_page", page: value })}
        >
          {LABELS[value]}
        </button>
      ))}
    </nav>
  );
}
