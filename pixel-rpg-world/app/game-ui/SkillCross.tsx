import { ACTIVE_SKILL_SLOTS } from "../../game/content/Definitions";
import type { PlayerHudModel } from "../../game/ui/HudTypes";
import { GameIcon } from "./GameIcon";

const DIRECTION_LABELS = {
  skill_up: "↑",
  skill_right: "→",
  skill_down: "↓",
  skill_left: "←",
} as const;

export function SkillCross({ player }: { readonly player: PlayerHudModel }) {
  return (
    <div className="skill-cross" aria-label={`P${player.slot} 方向技能`}>
      {ACTIVE_SKILL_SLOTS.map((slot) => {
        const skill = player.skills[slot];
        const disabled = !skill.id;
        return (
          <div
            className={`skill-slot skill-slot--${skill.direction}${disabled ? " is-empty" : ""}`}
            data-testid={`player-${player.slot}-skill-${skill.direction}`}
            key={slot}
            style={{ "--cooldown": skill.cooldownRatio } as React.CSSProperties}
            aria-label={`${DIRECTION_LABELS[slot]} ${skill.name}`}
          >
            <kbd aria-hidden="true">{DIRECTION_LABELS[slot]}</kbd>
            <GameIcon id={skill.icon} contentId={skill.id} />
            <span>{skill.name}</span>
            {skill.cooldownLeft > 0.05 && (
              <b>{skill.cooldownLeft.toFixed(1)}</b>
            )}
            {skill.maxCharges > 1 && (
              <span className="skill-charge-count">×{skill.charges}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
