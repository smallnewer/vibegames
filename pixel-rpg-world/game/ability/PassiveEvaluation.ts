import type { PassiveDef, StatModifierSet } from "../content/Definitions";

export type PassiveRank = 1 | 2 | 3;

export interface EvaluatedPassive extends PassiveDef {
  readonly rank: PassiveRank;
  readonly modifiers: StatModifierSet;
}

export function evaluatePassive(
  definition: PassiveDef,
  rank: PassiveRank,
): EvaluatedPassive {
  if (!Number.isInteger(rank) || rank < 1 || rank > 3) {
    throw new Error(`passive rank must be an integer from 1 to 3: ${rank}`);
  }
  return {
    ...definition,
    rank,
    modifiers: definition.rankModifiers?.[rank - 1] ?? definition.modifiers,
  };
}
