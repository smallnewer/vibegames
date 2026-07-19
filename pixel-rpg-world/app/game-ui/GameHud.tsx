import type { CombatHudModel } from "../../game/ui/HudTypes";
import { BossHud } from "./BossHud";
import { InteractionPrompt } from "./InteractionPrompt";
import { ObjectiveHud } from "./ObjectiveHud";
import { PlayerHud } from "./PlayerHud";
import type { MinimapSnapshot } from "../../game/map/MinimapModel";
import { Minimap } from "./Minimap";
import type { ToastMessage } from "../../game/ui/ToastQueue";
import { ToastStack } from "./ToastStack";

export function GameHud({
  model,
  minimap,
  toasts,
}: {
  readonly model: CombatHudModel;
  readonly minimap: MinimapSnapshot;
  readonly toasts: readonly ToastMessage[];
}) {
  const partySize = model.players.length;
  return (
    <section
      className="combat-hud"
      data-testid="combat-hud"
      data-party-size={partySize}
      aria-label="战斗界面"
    >
      <ObjectiveHud objective={model.objective} />
      <BossHud boss={model.boss} />
      <Minimap model={minimap} />
      <ToastStack messages={toasts} />
      <div className="party-hud">
        {model.players.map((player, index) => (
          <PlayerHud
            key={player.slot}
            player={player}
            side={partySize > 2 ? "compact" : index === 0 ? "left" : "right"}
          />
        ))}
      </div>
      <InteractionPrompt prompt={model.prompt} />
    </section>
  );
}
