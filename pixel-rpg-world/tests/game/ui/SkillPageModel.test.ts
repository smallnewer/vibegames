import { describe, expect, it } from "vitest";
import { GameSimulation } from "../../../game/core/GameSimulation";
import type { GameSnapshot } from "../../../game/core/GameSnapshot";
import { evaluateAbilityRank } from "../../../game/ability/SkillRanks";
import { createCoreContent } from "../../../game/content/coreContent";
import { buildSkillPageModel } from "../../../game/ui/SkillPageModel";

function withProgress(
  snapshot: GameSnapshot,
  updates: Partial<GameSnapshot["progress"]>,
): GameSnapshot {
  const progress = { ...snapshot.progress, ...updates };
  return { ...snapshot, players: [{ ...snapshot.players[0], progress }], progress };
}

describe("SkillPageModel", () => {
  it("sorts unlocked skills first and exposes four directional slots plus weapon skills", () => {
    const source = new GameSimulation({ runSeed: 44 }).snapshot();
    const unlockedAbilities = source.progress.unlockedAbilities.filter((id) => (
      id !== "ability.molten_guard"
    ));
    const model = buildSkillPageModel(withProgress(source, { unlockedAbilities }), 1);
    const firstLocked = model.entries.findIndex((entry) => !entry.unlocked);
    expect(firstLocked).toBeGreaterThan(0);
    expect(model.entries.slice(0, firstLocked).every((entry) => entry.unlocked)).toBe(true);
    expect(model.entries.find((entry) => entry.id === "ability.molten_guard")?.rank).toBe(0);
    expect(model.slots.map((slot) => slot.slot)).toEqual([
      "skill_up",
      "skill_right",
      "skill_down",
      "skill_left",
    ]);
    expect(model.weapons.map((weapon) => weapon.slot)).toEqual(["melee", "ranged"]);
    expect(model.passives.map((passive) => passive.id).sort()).toEqual([
      "passive.execution_rush",
      "passive.hawkeye",
      "passive.iron_vitality",
      "passive.runic_ward",
    ]);
    expect(model.passiveSlots.map((passive) => passive.slot)).toEqual([
      "passive_1",
      "passive_2",
    ]);
  });

  it("uses the shared exact rank multipliers and hides next values at rank five", () => {
    const content = createCoreContent();
    const ability = content.ability("ability.ember_nova");
    expect([1, 2, 3, 4, 5].map((rank) => (
      evaluateAbilityRank(ability, rank as 1 | 2 | 3 | 4 | 5).damageMultiplier
    ))).toEqual([1, 1.12, 1.25, 1.39, 1.55]);

    const source = new GameSimulation({ runSeed: 44 }).snapshot();
    const skillRanks = { ...source.progress.skillRanks, "ability.ember_nova": 5 as const };
    const model = buildSkillPageModel(withProgress(source, { skillRanks }), 1);
    const nova = model.entries.find((entry) => entry.id === "ability.ember_nova")!;
    expect(nova.rank).toBe(5);
    expect(nova.current.damageMultiplier).toBe(1.55);
    expect(nova.next).toBeUndefined();
  });
});
