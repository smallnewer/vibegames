import { evaluateAbility } from "./AbilityEvaluation";
import type { EvaluatedAbility } from "./AbilityEvaluation";
import { completeStatBlock, type AbilityDef } from "../content/Definitions";
import type { SkillRank } from "../progression/ProgressionComponents";

export type { EvaluatedAbility } from "./AbilityEvaluation";

export function evaluateAbilityRank(
  definition: AbilityDef,
  rank: SkillRank,
): EvaluatedAbility {
  return evaluateAbility(definition, rank, completeStatBlock({}));
}
