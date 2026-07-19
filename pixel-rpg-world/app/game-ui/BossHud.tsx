import type { CombatHudModel } from "../../game/ui/HudTypes";

export function BossHud({ boss }: { readonly boss: CombatHudModel["boss"] }) {
  if (!boss) return null;
  return (
    <section className="boss-hud" data-testid="boss-hud" aria-label="Boss 生命">
      <span>{boss.name}{boss.phaseName ? ` · ${boss.phaseName}` : ""}</span>
      <div><i style={{ width: `${boss.healthRatio * 100}%` }} /></div>
    </section>
  );
}
