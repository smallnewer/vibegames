export interface PartyCameraMember {
  readonly x: number;
  readonly z: number;
  readonly previousX: number;
  readonly previousZ: number;
}

export interface PartyCameraState {
  readonly targetX: number;
  readonly targetZ: number;
  readonly radius: number;
  readonly initialized: boolean;
}

export interface PartyCameraFraming {
  readonly baseRadius: number;
  readonly minRadius: number;
  readonly maxRadius: number;
  readonly zoomPerUnit: number;
  readonly deadZone: number;
  readonly lookAheadScale: number;
  readonly maxLookAhead: number;
  readonly followSharpness: number;
  readonly zoomSharpness: number;
}

export const DEFAULT_PARTY_CAMERA: PartyCameraFraming = {
  baseRadius: 13,
  minRadius: 12,
  maxRadius: 30,
  zoomPerUnit: 1.35,
  deadZone: 0.28,
  lookAheadScale: 5,
  maxLookAhead: 0.8,
  followSharpness: 7,
  zoomSharpness: 4.5,
};

export const PRODUCTION_PARTY_CAMERA: PartyCameraFraming = {
  ...DEFAULT_PARTY_CAMERA,
  baseRadius: 41,
  minRadius: 39,
  maxRadius: 55,
  zoomPerUnit: 0.9,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function applyDeadZone(current: number, wanted: number, size: number): number {
  const delta = wanted - current;
  if (Math.abs(delta) <= size) return current;
  return wanted - Math.sign(delta) * size;
}

// 纯函数便于验证双人构图；指数平滑保证 30/60/120 FPS 观感一致。
export function updatePartyCamera(
  previous: PartyCameraState,
  members: readonly PartyCameraMember[],
  deltaSeconds: number,
  framing: PartyCameraFraming,
): PartyCameraState {
  if (members.length === 0) return previous;
  const minX = Math.min(...members.map((member) => member.x));
  const maxX = Math.max(...members.map((member) => member.x));
  const minZ = Math.min(...members.map((member) => member.z));
  const maxZ = Math.max(...members.map((member) => member.z));
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const moveX = members.reduce((total, member) => (
    total + member.x - member.previousX
  ), 0) / members.length;
  const moveZ = members.reduce((total, member) => (
    total + member.z - member.previousZ
  ), 0) / members.length;
  const lookLength = Math.hypot(moveX, moveZ);
  const lookDistance = Math.min(framing.maxLookAhead, lookLength * framing.lookAheadScale);
  const wantedX = centerX + (lookLength > 0 ? moveX / lookLength * lookDistance : 0);
  const wantedZ = centerZ + (lookLength > 0 ? moveZ / lookLength * lookDistance : 0);
  const spread = Math.hypot(maxX - minX, maxZ - minZ);
  const wantedRadius = clamp(
    framing.baseRadius + Math.max(0, spread - 2) * framing.zoomPerUnit,
    framing.minRadius,
    framing.maxRadius,
  );

  if (!previous.initialized) {
    return { targetX: wantedX, targetZ: wantedZ, radius: wantedRadius, initialized: true };
  }

  const delta = clamp(deltaSeconds, 0, 0.1);
  const followBlend = 1 - Math.exp(-framing.followSharpness * delta);
  const zoomBlend = 1 - Math.exp(-framing.zoomSharpness * delta);
  const targetX = applyDeadZone(previous.targetX, wantedX, framing.deadZone);
  const targetZ = applyDeadZone(previous.targetZ, wantedZ, framing.deadZone);
  return {
    targetX: previous.targetX + (targetX - previous.targetX) * followBlend,
    targetZ: previous.targetZ + (targetZ - previous.targetZ) * followBlend,
    radius: previous.radius + (wantedRadius - previous.radius) * zoomBlend,
    initialized: true,
  };
}
