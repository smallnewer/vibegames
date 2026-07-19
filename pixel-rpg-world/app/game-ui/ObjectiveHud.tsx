import type { CombatHudModel } from "../../game/ui/HudTypes";

export function ObjectiveHud({ objective }: { readonly objective: CombatHudModel["objective"] }) {
  const hasProgress = objective.current !== undefined && objective.total !== undefined;
  return (
    <section
      className="objective-hud"
      data-testid="objective-hud"
      key={objective.changedAtTick}
      aria-label="当前目标"
    >
      <small>OBJECTIVE</small>
      <strong>{objective.text}</strong>
      {hasProgress && <span>{objective.current} / {objective.total}</span>}
    </section>
  );
}
