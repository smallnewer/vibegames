import type { ActorAction } from "../../../actor/ActorComponents";

export interface CharacterPose {
  readonly bodyPitch: number;
  readonly bodyRoll: number;
  readonly bodyLift: number;
  readonly leftArmPitch: number;
  readonly rightArmPitch: number;
  readonly leftLegPitch: number;
  readonly rightLegPitch: number;
  readonly weaponYaw: number;
  readonly squash: number;
}

const BASE_POSE: CharacterPose = {
  bodyPitch: 0,
  bodyRoll: 0,
  bodyLift: 0,
  leftArmPitch: 0,
  rightArmPitch: 0,
  leftLegPitch: 0,
  rightLegPitch: 0,
  weaponYaw: 0,
  squash: 1,
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function mix(from: number, to: number, amount: number): number {
  return from + (to - from) * clamp01(amount);
}

// 逻辑动作不带骨骼数据；这里把归一化阶段翻成稳定的体素姿势。
export function samplePose(action: ActorAction, phase: number): CharacterPose {
  const time = clamp01(phase);
  if (action === "idle") {
    return { ...BASE_POSE, bodyLift: Math.sin(time * Math.PI * 2) * 0.025 };
  }
  if (action === "run") {
    const stride = Math.sin(time * Math.PI * 2) * 0.72;
    return {
      ...BASE_POSE,
      bodyPitch: 0.08,
      bodyLift: Math.abs(Math.sin(time * Math.PI * 2)) * 0.07,
      leftArmPitch: stride,
      rightArmPitch: -stride,
      leftLegPitch: -stride,
      rightLegPitch: stride,
    };
  }
  if (action === "melee") {
    const rightArmPitch = time < 0.25
      ? mix(-0.2, -1.8, time / 0.25)
      : time < 0.45
        ? mix(-1.8, -2.65, (time - 0.25) / 0.2)
        : mix(-2.65, 0, (time - 0.45) / 0.55);
    return {
      ...BASE_POSE,
      bodyPitch: time < 0.45 ? -0.16 : mix(-0.16, 0, (time - 0.45) / 0.55),
      bodyRoll: Math.sin(time * Math.PI) * -0.12,
      leftArmPitch: -0.55,
      rightArmPitch,
      weaponYaw: Math.sin(time * Math.PI) * 0.68,
    };
  }
  if (action === "ranged") {
    const draw = time < 0.58 ? time / 0.58 : 1 - (time - 0.58) / 0.42;
    return {
      ...BASE_POSE,
      bodyPitch: -0.08,
      leftArmPitch: -1.48,
      rightArmPitch: mix(-0.55, -1.42, draw),
      weaponYaw: -0.28,
    };
  }
  if (action === "roll") {
    return {
      ...BASE_POSE,
      bodyPitch: time * Math.PI * 2,
      bodyLift: Math.sin(time * Math.PI) * 0.18,
      bodyRoll: Math.sin(time * Math.PI) * 0.2,
      leftArmPitch: -1.25,
      rightArmPitch: -1.25,
      squash: 1 - Math.sin(time * Math.PI) * 0.3,
    };
  }
  if (action === "hit") {
    return {
      ...BASE_POSE,
      bodyPitch: Math.sin(time * Math.PI) * 0.24,
      bodyRoll: Math.sin(time * Math.PI) * 0.22,
      bodyLift: Math.sin(time * Math.PI) * 0.08,
      squash: 1 - Math.sin(time * Math.PI) * 0.12,
    };
  }
  if (action === "dead") {
    return {
      ...BASE_POSE,
      bodyPitch: mix(0, Math.PI / 2, time),
      bodyRoll: mix(0, Math.PI / 2, time),
      bodyLift: -mix(0, 0.46, time),
      squash: mix(1, 0.76, time),
    };
  }
  return {
    ...BASE_POSE,
    bodyLift: Math.sin(time * Math.PI) * 0.12,
    leftArmPitch: -1.35,
    rightArmPitch: -1.35,
    weaponYaw: Math.sin(time * Math.PI * 2) * 0.24,
  };
}

export function actionPhase(action: ActorAction, elapsed: number): number {
  if (action === "idle") return elapsed * 0.7 % 1;
  if (action === "run") return elapsed * 1.75 % 1;
  const duration: Record<Exclude<ActorAction, "idle" | "run">, number> = {
    roll: 0.28,
    melee: 0.38,
    ranged: 0.46,
    skill: 0.55,
    hit: 0.2,
    dead: 0.72,
  };
  return clamp01(elapsed / duration[action]);
}
