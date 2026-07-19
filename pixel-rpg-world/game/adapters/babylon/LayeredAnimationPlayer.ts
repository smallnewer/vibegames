import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import {
  AnimationGroupMask,
  AnimationGroupMaskMode,
} from "@babylonjs/core/Animations/animationGroupMask";
import type { ActorAction, ActorLocomotion } from "../../actor/ActorComponents";
import type {
  ActorAnimationPlayback,
  ActorPlaybackDef,
  ActorVisualDef,
  HumanoidActionClips,
} from "../../content/ActorDefinitions";

const LOWER_BODY = [
  "root",
  "pelvis",
  "thigh_l",
  "calf_l",
  "foot_l",
  "thigh_r",
  "calf_r",
  "foot_r",
  "Root",
  "Body",
  "UpperLeg.L",
  "LowerLeg.L",
  "Foot.L",
  "PoleTarget.L",
  "UpperLeg.R",
  "LowerLeg.R",
  "Foot.R",
  "PoleTarget.R",
] as const;

function isLowerBody(name: string): boolean {
  return LOWER_BODY.some((bone) => name === bone || name.endsWith(`-${bone}`));
}

// 资源决定动作幅度；播放器只负责分层、退出点和过渡速度。
export class LayeredAnimationPlayer {
  private meleeIndex = 0;
  private sequenceVersion = 0;

  constructor(
    private readonly groups: readonly AnimationGroup[],
    private readonly definition: ActorVisualDef,
  ) {}

  stop(): void {
    // 旧序列的结束回调即使晚到，也不能启动下一段动作。
    this.sequenceVersion += 1;
    for (const group of this.groups) {
      group.stop();
      group.mask = null;
    }
  }

  play(
    action: ActorAction,
    actionDuration: number,
    locomotion: ActorLocomotion,
  ): ActorAnimationPlayback | undefined {
    this.stop();
    const version = this.sequenceVersion;
    const humanoid = this.definition.humanoidActions;
    if (action === "skill" && humanoid && this.playCast(humanoid, actionDuration, version)) {
      return this.playback(humanoid.cast.enter);
    }

    const clip = this.resolveClip(action, humanoid);
    const actionGroup = this.findClip(clip);
    const playback = this.definition.playback[action]
      ?? { layer: "full", exitAt: 1, blendSpeed: 0.08 };

    if (!actionGroup) return undefined;

    if (playback.layer === "upper" && action !== "idle" && action !== "run") {
      const locomotionGroup = this.findClip(
        this.definition.animations[locomotion] ?? this.definition.animations.idle,
      );
      if (locomotionGroup && this.canSplit(actionGroup, locomotionGroup)) {
        this.start(locomotionGroup, locomotion, 0, "lower");
        this.start(actionGroup, action, actionDuration, "upper", clip);
        return this.playback(clip);
      }
    }
    this.start(actionGroup, action, actionDuration, "full", clip);
    return this.playback(clip);
  }

  private playback(clip: string): ActorAnimationPlayback {
    return {
      clip,
      events: this.definition.animationEvents?.[clip] ?? [],
    };
  }

  private resolveClip(action: ActorAction, humanoid?: HumanoidActionClips): string {
    if (action === "melee" && humanoid) {
      const clip = humanoid.melee[this.meleeIndex % humanoid.melee.length];
      this.meleeIndex += 1;
      return clip;
    }
    if (action === "ranged" && humanoid) return humanoid.bow;
    return this.definition.animations[action] ?? this.definition.animations.idle;
  }

  private findClip(clip: string): AnimationGroup | undefined {
    const index = clip.startsWith("#") ? Number(clip.slice(1)) : -1;
    return index >= 0
      ? this.groups[index]
      : this.groups.find((group) => group.name === clip || group.name.endsWith(clip));
  }

  // 四段片段共用一个倍率，整套动作会自动贴合玩法 actionDuration。
  private playCast(
    humanoid: HumanoidActionClips,
    actionDuration: number,
    version: number,
  ): boolean {
    const clips = [
      humanoid.cast.enter,
      humanoid.cast.loop,
      humanoid.cast.release,
      humanoid.cast.exit,
    ] as const;
    const groups = clips.map((clip) => this.findClip(clip));
    if (groups.some((group) => !group)) return false;

    const sourceDuration = clips.reduce(
      (total, clip) => total + (this.definition.clipDurations[clip] ?? 0),
      0,
    );
    const speedRatio = actionDuration > 0 && sourceDuration > 0
      ? sourceDuration / actionDuration
      : 1;
    const playback = this.definition.playback.skill
      ?? { layer: "full", exitAt: 1, blendSpeed: 0.08 };

    const playStep = (index: number): void => {
      if (version !== this.sequenceVersion) return;
      const group = groups[index];
      if (!group) return;
      if (index + 1 < groups.length) {
        group.onAnimationGroupEndObservable.addOnce(() => playStep(index + 1));
      }
      this.startGroup(group, playback, speedRatio, "full", false, 1);
    };
    playStep(0);
    return true;
  }

  private canSplit(...groups: readonly AnimationGroup[]): boolean {
    return groups.every((group) => group.targetedAnimations.some((targeted) => (
      typeof targeted.target?.name === "string"
    )));
  }

  private start(
    group: AnimationGroup,
    action: ActorAction,
    actionDuration: number,
    layer: "full" | "lower" | "upper",
    clip = this.definition.animations[action] ?? this.definition.animations.idle,
  ): void {
    const playback = this.definition.playback[action]
      ?? { layer: "full", exitAt: 1, blendSpeed: 0.08 };
    const loop = action === "idle" || action === "run";
    const sourceDuration = this.definition.clipDurations[clip]
      ?? this.definition.animationDurations[action]
      ?? 0;
    const speedRatio = !loop && actionDuration > 0 && sourceDuration > 0
      ? sourceDuration * playback.exitAt / actionDuration
      : 1;
    this.startGroup(group, playback, speedRatio, layer, loop, playback.exitAt);
  }

  private startGroup(
    group: AnimationGroup,
    playback: ActorPlaybackDef,
    speedRatio: number,
    layer: "full" | "lower" | "upper",
    loop: boolean,
    exitAt: number,
  ): void {
    group.enableBlending = true;
    group.blendingSpeed = playback.blendSpeed;
    if (layer !== "full") {
      const names = group.targetedAnimations
        .map((targeted) => targeted.target?.name)
        .filter((name): name is string => typeof name === "string")
        .filter((name) => layer === "lower" ? isLowerBody(name) : !isLowerBody(name));
      group.mask = new AnimationGroupMask(names, AnimationGroupMaskMode.Include);
    }

    if (loop) {
      group.start(true, 1);
      return;
    }
    const to = group.from + (group.to - group.from) * exitAt;
    group.start(false, speedRatio, group.from, to);
  }
}
