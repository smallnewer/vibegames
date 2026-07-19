import type { GameplayEvent } from "../../../core/GameplayEvent";

export interface EncounterPresentationCue {
  readonly id: string;
  readonly cameraImpulse: number;
  readonly audioHook: string;
}

export function encounterPresentationCue(
  event: GameplayEvent,
): EncounterPresentationCue | undefined {
  if (event.type === "encounter_started") {
    return { id: `room:start:${event.encounter}`, cameraImpulse: 0.12, audioHook: "audio.room_lock" };
  }
  if (event.type === "encounter_completed") {
    return { id: `room:clear:${event.encounter}`, cameraImpulse: 0.08, audioHook: "audio.room_clear" };
  }
  if (event.type === "boss_phase_started") {
    return { id: `boss:phase:${event.phaseId}`, cameraImpulse: 0.22, audioHook: "audio.boss_phase" };
  }
  if (event.type === "party_wiped") {
    return { id: "party:wipe", cameraImpulse: 0.28, audioHook: "audio.party_wipe" };
  }
  if (event.type === "dungeon_completed") {
    return { id: `dungeon:complete:${event.dungeon}`, cameraImpulse: 0.14, audioHook: "audio.dungeon_clear" };
  }
  return undefined;
}

export class EncounterPresentation {
  constructor(private readonly play: (cue: EncounterPresentationCue) => void) {}

  sync(events: readonly GameplayEvent[]): void {
    for (const event of events) {
      const cue = encounterPresentationCue(event);
      if (cue) this.play(cue);
    }
  }
}
