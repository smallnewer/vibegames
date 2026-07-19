export interface HorizontalDirection {
  readonly x: number;
  readonly z: number;
}

const MIN_ANCHOR_OFFSET = 0.04;

// 刀光跟随挥砍帧的武器骨骼位置；根节点朝向只用于锚点尚未就绪的回退。
export function meleeSlashDirection(
  actor: HorizontalDirection,
  weaponAnchor: HorizontalDirection,
  fallback: HorizontalDirection,
): HorizontalDirection {
  const x = weaponAnchor.x - actor.x;
  const z = weaponAnchor.z - actor.z;
  const length = Math.hypot(x, z);
  if (length < MIN_ANCHOR_OFFSET) return fallback;
  return { x: x / length, z: z / length };
}
