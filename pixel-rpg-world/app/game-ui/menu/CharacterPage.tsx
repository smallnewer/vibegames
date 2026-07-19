import type { CharacterPageModel } from "../../../game/ui/CharacterPageModel";
import type { UiInput } from "../../../game/ui/UiInput";
import type { UiState } from "../../../game/ui/UiState";

export function CharacterPage({
  state,
  model,
  dispatch,
}: {
  readonly state: UiState;
  readonly model: CharacterPageModel;
  readonly dispatch: (input: UiInput) => void;
}) {
  const activate = (id: string, input: UiInput = { type: "confirm" }) => {
    dispatch({ type: "select_focus", id });
    dispatch(input);
  };
  return (
    <div className="character-page">
      <section className="character-primary" aria-label="基础属性">
        <header>
          <div>
            <small>可分配点数</small>
            <strong>{model.unspentAttributes}</strong>
          </div>
          <span>Lv.{model.level} · {model.experience}/{model.xpToNext} XP</span>
        </header>
        <div className="attribute-list">
          {model.attributes.map((attribute) => (
            <button
              type="button"
              key={attribute.id}
              disabled={!attribute.canAllocate}
              data-focus-id={attribute.focusId}
              data-controller-focus={state.focusId === attribute.focusId ? "true" : undefined}
              onClick={() => activate(attribute.focusId)}
              title="A 加 1 点；按住 X 再按 A 最多加 5 点"
            >
              <span>{attribute.label}</span>
              <strong>{attribute.value}</strong>
              <small>{attribute.canAllocate ? "A +1 · X+A +5" : "点数不足"}</small>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="attribute-reset"
          disabled={!model.reset.enabled}
          data-focus-id={model.reset.focusId}
          data-controller-focus={state.focusId === model.reset.focusId ? "true" : undefined}
          onClick={() => activate(model.reset.focusId)}
        >
          重置属性{model.reset.refundable > 0 ? ` · 返还 ${model.reset.refundable}` : ""}
          {model.reset.reason ? <small>{model.reset.reason}</small> : null}
        </button>
      </section>
      <div className="character-stat-sections">
        {model.sections.map((section) => (
          <section key={section.id} aria-label={section.label}>
            <h2>{section.label}</h2>
            <dl>
              {section.rows.map((row) => (
                <div key={row.id} title={`基础 ${row.source.base} · 固定 ${row.source.flat} · 百分比 ${row.source.percent} · 最终乘区 ${row.source.finalMultiplier}`}>
                  <dt>{row.label}</dt>
                  <dd>
                    <strong>{row.formatted}</strong>
                    {row.detail ? <small>{row.detail}</small> : null}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
