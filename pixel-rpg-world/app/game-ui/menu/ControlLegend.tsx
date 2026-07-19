import type { UiPage } from "../../../game/ui/UiState";

const PAGE_ACTION: Record<UiPage, string> = {
  inventory: "X 对比 · Y 收藏",
  skills: "X 升级",
  character: "X+A 加 5 点",
  forge: "A 强化",
  system: "A 增加/切换 · X 减少",
};

export function ControlLegend({ page }: { readonly page: UiPage }) {
  return (
    <footer className="menu-legend" aria-label="菜单操作">
      <span>A 确认</span>
      <span>B 返回</span>
      <span>LB/RB 换页</span>
      <span>LT/RT 换角色</span>
      <span>{PAGE_ACTION[page]}</span>
    </footer>
  );
}
