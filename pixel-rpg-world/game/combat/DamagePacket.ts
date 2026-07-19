import type { EntityId } from "../core/World";

export type DamageType = "physical" | "fire" | "ice" | "poison" | "storm";
export type DamageScalingStat = "meleePower" | "rangedPower" | "skillPower";

export interface DamageSpec {
  readonly damageType: DamageType;
  readonly minBase: number;
  readonly maxBase: number;
  readonly scalingStat: DamageScalingStat;
  readonly coefficient: number;
  readonly canCrit: boolean;
  readonly procCoefficient: number;
}

export interface DamagePacket extends DamageSpec {
  readonly source: EntityId;
  readonly target: EntityId;
  readonly skillId: string;
  readonly actionSequence: number;
}

export interface DamageResult {
  readonly rolledBase: number;
  readonly preMitigation: number;
  readonly mitigation: number;
  readonly applied: number;
  readonly critical: boolean;
  readonly killed: boolean;
}
