import type { GameplayEvent } from "../core/GameplayEvent";
import type { EntityId } from "../core/World";

export interface CombatFeedback {
  readonly hitStopSeconds: number;
  readonly cameraImpulse: number;
}

export const MAX_HIT_STOP_SECONDS = 0.055;
export const MAX_CAMERA_IMPULSE = 0.1;

export function combatFeedback(
  events: readonly GameplayEvent[],
  heroes: readonly EntityId[],
): CombatFeedback {
  const heroIds = new Set(heroes);
  const deaths = new Set(events.flatMap((event) => (
    event.type === "actor_died" ? [event.actor] : []
  )));
  let hitStopSeconds = 0;
  let cameraImpulse = 0;

  for (const event of events) {
    if (event.type !== "damage_applied") continue;
    if (heroIds.has(event.source)) {
      const level = deaths.has(event.target)
        ? { hitStopSeconds: 0.055, cameraImpulse: 0.1 }
        : event.critical
          ? { hitStopSeconds: 0.04, cameraImpulse: 0.07 }
          : { hitStopSeconds: 0.025, cameraImpulse: 0.035 };
      hitStopSeconds = Math.max(hitStopSeconds, level.hitStopSeconds);
      cameraImpulse = Math.max(cameraImpulse, level.cameraImpulse);
    }
    if (heroIds.has(event.target)) cameraImpulse = Math.max(cameraImpulse, 0.055);
  }
  return {
    hitStopSeconds: Math.min(MAX_HIT_STOP_SECONDS, hitStopSeconds),
    cameraImpulse: Math.min(MAX_CAMERA_IMPULSE, cameraImpulse),
  };
}
