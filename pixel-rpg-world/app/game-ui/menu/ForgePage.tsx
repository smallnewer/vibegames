import type { ForgePageModel } from "../../../game/ui/ForgePageModel";
import type { UiInput } from "../../../game/ui/UiInput";
import type { UiState } from "../../../game/ui/UiState";
import { GameIcon } from "../GameIcon";

const STAT_LABEL: Record<string, string> = {
  meleePower: "近战强度",
  rangedPower: "远程强度",
  skillPower: "技能强度",
  armor: "护甲",
};

export function ForgePage({
  state,
  model,
  dispatch,
}: {
  readonly state: UiState;
  readonly model: ForgePageModel;
  readonly dispatch: (input: UiInput) => void;
}) {
  const selected = model.selected;
  return (
    <div className="forge-page">
      <section className="forge-items">
        <h2>可强化装备</h2>
        {model.entries.map((entry) => (
          <button
            type="button"
            key={entry.id}
            data-focus-id={entry.focusId}
            data-controller-focus={state.focusId === entry.focusId ? "true" : undefined}
            onClick={() => {
              dispatch({ type: "select_focus", id: entry.focusId });
              dispatch({ type: "confirm" });
            }}
          >
            <GameIcon id={entry.icon} /><span>{entry.name}</span><b>+{entry.level}</b><small>{entry.slot}</small>
          </button>
        ))}
      </section>
      <section className="forge-preview">
        <h2>强化预览</h2>
        {selected ? <>
          <div className="forge-level"><span>+{selected.level}</span><i>→</i><strong>+{selected.nextLevel}</strong></div>
          <dl><div><dt>{STAT_LABEL[selected.base.stat] ?? selected.base.stat}</dt><dd>{selected.base.current.toFixed(1)} → {selected.base.next.toFixed(1)}</dd></div>{Object.entries(selected.statDelta).map(([stat, value]) => <div key={stat}><dt>净提升 · {STAT_LABEL[stat] ?? stat}</dt><dd>+{value}</dd></div>)}</dl>
          <p>词缀保持不变 · {selected.affixes.length} 条</p>
        </> : <p>选择装备查看强化预览</p>}
      </section>
      <section className="forge-cost">
        <h2>材料与确认</h2>
        {selected ? <>
          <div className="forge-materials">{selected.materials.length === 0 ? <p>无需材料</p> : selected.materials.map((material) => <div key={material.id}><GameIcon id={material.icon} contentId={material.id} /><span>{material.label}</span><strong data-missing={material.missing > 0 ? "true" : undefined}>{material.have}/{material.need}</strong>{material.missing > 0 ? <small>缺 {material.missing}</small> : null}</div>)}</div>
          <p className="forge-guarantee">100% 成功 · 无失败惩罚</p>
          <button type="button" disabled={!selected.canReinforce} onClick={() => { dispatch({ type: "select_focus", id: selected.focusId }); dispatch({ type: "confirm" }); }}>{selected.pending ? "处理中…" : selected.canReinforce ? `确认强化至 +${selected.nextLevel}` : selected.reason}</button>
        </> : null}
      </section>
    </div>
  );
}
