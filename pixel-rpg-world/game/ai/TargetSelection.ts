import type { EntityId } from "../core/World";

export interface TargetCandidate {
  readonly id: EntityId;
  readonly distance: number;
  readonly threat: number;
}

export function selectTarget(
  candidates: readonly TargetCandidate[],
  current: EntityId | undefined,
  canSwitch: boolean,
): EntityId | undefined {
  if (candidates.length === 0) return undefined;
  if (!canSwitch && current !== undefined && candidates.some((value) => value.id === current)) {
    return current;
  }
  return [...candidates].sort((left, right) => (
    right.threat - left.threat || left.distance - right.distance || left.id - right.id
  ))[0].id;
}
