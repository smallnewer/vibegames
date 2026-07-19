import { describe, expect, it } from "vitest";
import { xpToNext } from "../../../game/progression/Experience";

describe("xpToNext", () => {
  it("matches the locked curve", () => {
    expect(xpToNext(1)).toBe(100);
    expect(xpToNext(10)).toBe(3550);
    expect(xpToNext(29)).toBe(18480);
    expect(xpToNext(30)).toBe(0);
  });

  it("rejects invalid levels", () => {
    expect(() => xpToNext(0)).toThrow(/level/i);
    expect(() => xpToNext(1.5)).toThrow(/level/i);
    expect(() => xpToNext(31)).toThrow(/level/i);
  });
});
