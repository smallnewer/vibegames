import { describe, expect, it, vi } from "vitest";
import { GameClock } from "../../../game/core/GameClock";

describe("GameClock", () => {
  it("runs logic at a fixed 60 Hz step", () => {
    const tick = vi.fn();
    const clock = new GameClock();

    const alpha = clock.advance(1 / 30, tick);

    expect(tick).toHaveBeenCalledTimes(2);
    expect(tick).toHaveBeenNthCalledWith(1, 1 / 60);
    expect(alpha).toBeCloseTo(0);
  });

  it("limits catch-up work after a long pause", () => {
    const tick = vi.fn();
    const clock = new GameClock(5);

    clock.advance(2, tick);

    expect(tick).toHaveBeenCalledTimes(5);
  });
});
