import type { SkillPageModel } from "../../../game/ui/SkillPageModel";
import type { UiInput } from "../../../game/ui/UiInput";
import type { UiState } from "../../../game/ui/UiState";
import { GameIcon } from "../GameIcon";

const DIRECTION = {
  skill_up: "上",
  skill_right: "右",
  skill_down: "下",
  skill_left: "左",
} as const;

export function SkillLoadoutCross({
  state,
  model,
  dispatch,
}: {
  readonly state: UiState;
  readonly model: SkillPageModel;
  readonly dispatch: (input: UiInput) => void;
}) {
  const activeSelected = model.entries.some((entry) => entry.id === state.skillSelection);
  return (
    <section className="skill-loadout" aria-label="方向技能槽">
      <h2>{state.skillSelection ? "选择装配方向" : "方向技能"}</h2>
      <div className="skill-cross">
        {model.slots.map((slot) => (
          <button
            type="button"
            key={slot.slot}
            data-slot={slot.slot}
            disabled={!activeSelected}
            data-focus-id={slot.focusId}
            data-controller-focus={state.focusId === slot.focusId ? "true" : undefined}
            onClick={() => {
              dispatch({ type: "select_focus", id: slot.focusId });
              dispatch({ type: "confirm" });
            }}
          >
            <GameIcon id={slot.icon} contentId={slot.ability} />
            <small>{DIRECTION[slot.slot]}</small>
            <span>{slot.name}</span>
          </button>
        ))}
      </div>
      {activeSelected ? <p>B 取消本次装配</p> : <p>先在左侧选择一个主动技能</p>}
    </section>
  );
}
