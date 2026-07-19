import { evaluateAbilityRank, type EvaluatedAbility } from "../ability/SkillRanks";
import { createCoreContent } from "../content/coreContent";
import type { ActiveSkillSlot } from "../content/Definitions";
import type { GameSnapshot } from "../core/GameSnapshot";
import type { PlayerSlotId } from "../player/PlayerSlot";
import type { SkillRank } from "../progression/ProgressionComponents";
import {
  evaluatePassive,
  type EvaluatedPassive,
  type PassiveRank,
} from "../ability/PassiveEvaluation";
import type { PassiveSlot } from "../content/Definitions";

export interface SkillPageEntry {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly rank: 0 | SkillRank;
  readonly unlocked: boolean;
  readonly current: EvaluatedAbility;
  readonly next?: EvaluatedAbility;
  readonly equippedSlot?: ActiveSkillSlot;
  readonly focusId: string;
}

export interface SkillPageModel {
  readonly entries: readonly SkillPageEntry[];
  readonly passives: readonly {
    readonly id: string;
    readonly name: string;
    readonly icon: "icon.generic.passive";
    readonly rank: 0 | PassiveRank;
    readonly unlocked: boolean;
    readonly current: EvaluatedPassive;
    readonly next?: EvaluatedPassive;
    readonly equippedSlot?: PassiveSlot;
    readonly focusId: string;
  }[];
  readonly slots: readonly {
    slot: ActiveSkillSlot;
    name: string;
    ability?: string;
    icon?: string;
    focusId: string;
  }[];
  readonly weapons: readonly {
    slot: "melee" | "ranged";
    name: string;
    ability?: string;
    icon: "icon.weapon.sword" | "icon.weapon.bow";
  }[];
  readonly passiveSlots: readonly {
    readonly slot: PassiveSlot;
    readonly name: string;
    readonly passive?: string;
    readonly icon: "icon.generic.passive";
    readonly focusId: string;
  }[];
  readonly unspentSkills: number;
}

const CONTENT = createCoreContent();
const ACTIVE_SLOTS = ["skill_up", "skill_right", "skill_down", "skill_left"] as const;

export function buildSkillPageModel(
  snapshot: GameSnapshot,
  slot: PlayerSlotId,
): SkillPageModel {
  const player = snapshot.players.find((candidate) => candidate.slot === slot)
    ?? snapshot.players[0];
  if (!player) throw new Error("skill page requires at least one player");
  const { progress } = player;
  const unlocked = new Set(progress.unlockedAbilities);
  const entries = CONTENT.abilityDefinitions()
    .filter((ability) => ability.slot === "active")
    .map((ability): SkillPageEntry => {
      const isUnlocked = unlocked.has(ability.id);
      const rank = isUnlocked ? progress.skillRanks[ability.id] ?? 1 : 0;
      const evaluatedRank = (rank === 0 ? 1 : rank) as SkillRank;
      const equippedSlot = ACTIVE_SLOTS.find((active) => (
        progress.abilities[active].id === ability.id
      ));
      return {
        id: ability.id,
        name: ability.name,
        icon: ability.icon ?? "icon.generic.unknown",
        rank,
        unlocked: isUnlocked,
        current: evaluateAbilityRank(ability, evaluatedRank),
        next: isUnlocked && evaluatedRank < 5
          ? evaluateAbilityRank(ability, (evaluatedRank + 1) as SkillRank)
          : undefined,
        equippedSlot,
        focusId: `skill:${ability.id}`,
      };
    })
    .sort((left, right) => (
      Number(right.unlocked) - Number(left.unlocked)
      || left.name.localeCompare(right.name, "zh-CN")
      || left.id.localeCompare(right.id)
    ));
  const passives = CONTENT.passiveDefinitions()
    .filter((passive) => passive.id !== "passive.ember_guard")
    .map((passive) => {
      const isUnlocked = unlocked.has(passive.id);
      const rank = isUnlocked
        ? Math.min(3, progress.skillRanks[passive.id] ?? 1) as PassiveRank
        : 0;
      const evaluatedRank = (rank === 0 ? 1 : rank) as PassiveRank;
      const equippedSlot = (["passive_1", "passive_2"] as const).find((slot) => (
        progress.passives[slot].id === passive.id
      ));
      return {
        id: passive.id,
        name: passive.name,
        icon: "icon.generic.passive" as const,
        rank,
        unlocked: isUnlocked,
        current: evaluatePassive(passive, evaluatedRank),
        next: isUnlocked && evaluatedRank < 3
          ? evaluatePassive(passive, (evaluatedRank + 1) as PassiveRank)
          : undefined,
        equippedSlot,
        focusId: `passive:${passive.id}`,
      };
    })
    .sort((left, right) => (
      Number(right.unlocked) - Number(left.unlocked)
      || left.name.localeCompare(right.name, "zh-CN")
      || left.id.localeCompare(right.id)
    ));
  return {
    entries,
    passives,
    slots: ACTIVE_SLOTS.map((active) => ({
      slot: active,
      name: progress.abilities[active].name,
      ability: progress.abilities[active].id,
      icon: progress.abilities[active].id
        ? CONTENT.ability(progress.abilities[active].id!).icon
        : undefined,
      focusId: `skill-slot:${active}`,
    })),
    weapons: (["melee", "ranged"] as const).map((weapon) => ({
      slot: weapon,
      name: progress.weapons[weapon].name,
      ability: progress.weapons[weapon].id,
      icon: weapon === "melee" ? "icon.weapon.sword" : "icon.weapon.bow",
    })),
    passiveSlots: (["passive_1", "passive_2"] as const).map((slot) => ({
      slot,
      name: progress.passives[slot].name,
      passive: progress.passives[slot].id,
      icon: "icon.generic.passive",
      focusId: `passive-slot:${slot}`,
    })),
    unspentSkills: progress.unspentSkills,
  };
}
