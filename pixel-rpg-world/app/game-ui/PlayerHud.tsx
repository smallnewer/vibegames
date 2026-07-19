import type { PlayerHudModel } from "../../game/ui/HudTypes";
import { SkillCross } from "./SkillCross";
import { GameIcon } from "./GameIcon";

interface PlayerHudProps {
  readonly player: PlayerHudModel;
  readonly side: "left" | "right" | "compact";
}

function percent(value: number, maximum: number): number {
  return maximum > 0 ? Math.max(0, Math.min(100, value / maximum * 100)) : 0;
}

export function PlayerHud({ player, side }: PlayerHudProps) {
  const lifeLabel = player.lifeState === "downed"
    ? `倒地 ${Math.ceil(player.downedTimeLeft ?? 0)}s`
    : player.lifeState === "dead" ? "阵亡" : `Lv.${player.level}`;
  return (
    <article
      className={`player-hud player-hud--${side}`}
      data-testid={`player-hud-${player.slot}`}
      data-life-state={player.lifeState}
      aria-label={`玩家 ${player.slot} 状态`}
    >
      <div className="player-core">
        <div className="player-portrait" aria-hidden="true">P{player.slot}</div>
        <div className="player-vitals">
          <span><strong>{player.name}</strong><small>{lifeLabel}</small></span>
          <div className="player-health" data-testid={`player-health-${player.slot}`}>
            <i style={{ width: `${percent(player.health, player.maxHealth)}%` }} />
            <b>{Math.ceil(player.health)} / {Math.ceil(player.maxHealth)}</b>
          </div>
          <div className="player-roll" aria-label="翻滚冷却">
            <i style={{ width: `${(1 - player.rollCooldownRatio) * 100}%` }} />
          </div>
        </div>
        <div className="status-icons" aria-label="角色状态">
          {player.statuses.map((status) => (
            <span key={status.id} title={`${status.id} ${status.timeLeft.toFixed(1)}s`}>
              <GameIcon id={status.icon} />
              {status.stacks > 1 ? status.stacks : "•"}
            </span>
          ))}
        </div>
      </div>
      <div className="player-actions">
        <div className="weapon-slots">
          {[player.melee, player.ranged].map((weapon) => (
            <div
              className={weapon.id ? "weapon-slot" : "weapon-slot is-empty"}
              key={weapon.button}
              style={{ "--cooldown": weapon.cooldownRatio } as React.CSSProperties}
            >
              <kbd>{weapon.button}</kbd>
              <GameIcon id={weapon.icon} />
              <span>{weapon.name}</span>
              {weapon.cooldownLeft > 0.05 && <b>{weapon.cooldownLeft.toFixed(1)}</b>}
              {weapon.maxCharges > 1 && <span>×{weapon.charges}</span>}
            </div>
          ))}
        </div>
        <SkillCross player={player} />
      </div>
    </article>
  );
}
