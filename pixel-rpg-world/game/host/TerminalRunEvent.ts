import type { GameplayEvent } from "../core/GameplayEvent";

export type TerminalRunEvent =
  | {
      readonly type: "completed";
      readonly dungeon: string;
      readonly difficulty: "normal" | "echo";
    }
  | { readonly type: "wiped" };

export function terminalRunEvent(
  events: readonly GameplayEvent[],
): TerminalRunEvent | undefined {
  const completed = events.find((event) => event.type === "dungeon_completed");
  if (completed?.type === "dungeon_completed") {
    return {
      type: "completed",
      dungeon: completed.dungeon,
      difficulty: completed.difficulty,
    };
  }
  return events.some((event) => event.type === "party_wiped")
    ? { type: "wiped" }
    : undefined;
}
