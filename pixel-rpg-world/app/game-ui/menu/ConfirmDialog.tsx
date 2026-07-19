import type { UiInput } from "../../../game/ui/UiInput";
import type { UiState } from "../../../game/ui/UiState";

export function ConfirmDialog({
  state,
  dispatch,
}: {
  readonly state: UiState;
  readonly dispatch: (input: UiInput) => void;
}) {
  if (!state.dialog) return null;
  return (
    <div className="confirm-dialog-backdrop">
      <section className="confirm-dialog" role="dialog" aria-modal="true" aria-label="确认操作">
        <strong>确认{state.dialog === "salvage" ? "分解" : state.dialog === "discard" ? "丢弃" : state.dialog === "rank_skill" ? "升级技能" : "重置属性"}？</strong>
        <p>{state.dialogMessage ?? "此操作需要再次确认。"}</p>
        <div>
          <button
            type="button"
            data-controller-focus={state.dialogFocus === "cancel" ? "true" : undefined}
            onClick={() => dispatch({ type: "back" })}
          >取消</button>
          <button
            type="button"
            data-controller-focus={state.dialogFocus === "confirm" ? "true" : undefined}
            onClick={() => {
              dispatch({ type: "move_focus", x: 1, y: 0 });
              dispatch({ type: "confirm" });
            }}
          >确认</button>
        </div>
      </section>
    </div>
  );
}
