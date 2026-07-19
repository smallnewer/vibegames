import { describe, expect, it } from "vitest";
import { balanceGateFailures, runBalanceSimulation } from "../../../game/balance/BalanceSimulation";

describe("balance simulation", () => {
  it("produces identical complete reports for the same seeds", () => {
    const options = { seeds: 100, players: [1, 2], levels: [10] } as const;
    const first = runBalanceSimulation(options);
    const second = runBalanceSimulation(options);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(first).toMatchObject({
      seedCount: 100,
      ttk: expect.any(Array),
      incomingHitRatio: expect.any(Array),
      dropsPerDungeon: expect.any(Array),
      rarityDistribution: expect.any(Object),
      forgeTimeToLevel: expect.any(Array),
    });
  });

  it("keeps one-player combat, boss guarantees, and forge pacing inside blueprint gates", () => {
    const report = runBalanceSimulation({ seeds: 1_000, players: [1, 2], levels: [1, 10, 20, 30] });
    expect(balanceGateFailures(report)).toEqual([]);
    expect(report.dropsPerDungeon.every((row) => row.bossEquipmentPerPlayer >= 1)).toBe(true);
  });
});
