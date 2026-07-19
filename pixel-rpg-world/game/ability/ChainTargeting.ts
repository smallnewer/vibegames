import type { TransformComponent } from "../actor/ActorComponents";
import type { EntityId, World } from "../core/World";

export function selectChainTargets(
  world: World,
  source: EntityId,
  candidates: readonly EntityId[],
  range: number,
  maxTargets: number,
): EntityId[] {
  const selected: EntityId[] = [];
  const remaining = [...new Set(candidates)]
    .filter((entity) => entity !== source && world.getComponent("transform", entity) !== undefined);
  let current = source;

  while (selected.length < maxTargets && remaining.length > 0) {
    const origin = world.getComponent<TransformComponent>("transform", current);
    if (!origin) break;
    remaining.sort((left, right) => {
      const leftTransform = world.getComponent<TransformComponent>("transform", left)!;
      const rightTransform = world.getComponent<TransformComponent>("transform", right)!;
      const leftDistance = Math.hypot(leftTransform.x - origin.x, leftTransform.z - origin.z);
      const rightDistance = Math.hypot(rightTransform.x - origin.x, rightTransform.z - origin.z);
      return leftDistance - rightDistance || left - right;
    });
    const next = remaining[0];
    const transform = world.getComponent<TransformComponent>("transform", next)!;
    if (Math.hypot(transform.x - origin.x, transform.z - origin.z) > range) break;
    selected.push(next);
    remaining.shift();
    current = next;
  }
  return selected;
}
