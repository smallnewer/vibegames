import type { SystemPageModel } from "../../../game/ui/SystemPageModel";
import type { UiInput } from "../../../game/ui/UiInput";
import type { UiState } from "../../../game/ui/UiState";

function activate(focusId: string, dispatch: (input: UiInput) => void): void {
  dispatch({ type: "select_focus", id: focusId });
  dispatch({ type: "confirm" });
}

function focused(state: UiState, focusId: string): "true" | undefined {
  return !state.dialog && state.focusId === focusId ? "true" : undefined;
}

export function SystemPage({
  state,
  model,
  dispatch,
}: {
  readonly state: UiState;
  readonly model: SystemPageModel;
  readonly dispatch: (input: UiInput) => void;
}) {
  return (
    <div className="system-page" data-testid="system-page">
      <section className="system-controller">
        <header>
          <div>
            <small>CONTROLLER</small>
            <h2>雷神 G30 · 本地玩家</h2>
          </div>
        </header>
        <div className="system-controller-slots">
          {model.controllers.map((controller) => (
            <article key={controller.player}>
              <header>
                <strong>P{controller.player}</strong>
                <span data-status={controller.status}>{controller.status}</span>
              </header>
              <p>{controller.message}</p>
              <button
                type="button"
                data-controller-player={controller.player}
                data-controller-focus={focused(state, controller.focusId)}
                disabled={!controller.canConnect}
                onClick={() => activate(controller.focusId, dispatch)}
              >
                {controller.actionLabel} P{controller.player} G30
              </button>
            </article>
          ))}
        </div>
        <small>连接会由你主动确认；未连接也可用键盘、普通手柄继续游戏。</small>
      </section>

      <section className="system-accessibility">
        <header>
          <small>ACCESSIBILITY</small>
          <h2>显示与反馈</h2>
        </header>
        <div>
          {model.rows.map((row) => (
            <button
              key={row.focusId}
              type="button"
              data-controller-focus={focused(state, row.focusId)}
              onClick={() => activate(row.focusId, dispatch)}
            >
              <span>{row.label}</span>
              <strong>{row.value}</strong>
              <small>{row.hint}</small>
            </button>
          ))}
        </div>
      </section>

      <aside className="system-session">
        <section>
          <small>SAVE</small>
          <strong data-save-status={model.save.status}>{model.save.label}</strong>
          {model.save.error && <p>{model.save.error}</p>}
        </section>
        <button
          type="button"
          className="system-return"
          data-controller-focus={focused(state, model.returnFocusId)}
          onClick={() => activate(model.returnFocusId, dispatch)}
        >
          返回界炉之路
        </button>
        <p>B 关闭菜单并继续当前地下城。</p>
      </aside>
    </div>
  );
}
