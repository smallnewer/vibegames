import { describe, expect, it } from "vitest";
import type { GameplayEvent } from "../../../game/core/GameplayEvent";
import { terminalRunEvent } from "../../../game/host/TerminalRunEvent";

describe("terminalRunEvent", () => {
  it("prefers completion when completion and wipe appear together", () => {
    const events: GameplayEvent[] = [
      { type: "party_wiped" },
      { type: "dungeon_completed", dungeon: "dungeon.ember", difficulty: "echo" },
    ];

    expect(terminalRunEvent(events)).toEqual({
      type: "completed",
      dungeon: "dungeon.ember",
      difficulty: "echo",
    });
  });

  it("maps party wipe to a wiped terminal event", () => {
    expect(terminalRunEvent([{ type: "party_wiped" }])).toEqual({ type: "wiped" });
  });

  it("returns undefined when the frame has no terminal event", () => {
    expect(terminalRunEvent([])).toBeUndefined();
  });
});
