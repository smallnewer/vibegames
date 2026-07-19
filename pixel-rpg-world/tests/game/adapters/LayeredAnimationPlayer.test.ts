import { Animation } from "@babylonjs/core/Animations/animation";
import { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { describe, expect, it, vi } from "vitest";
import { LayeredAnimationPlayer } from "../../../game/adapters/babylon/LayeredAnimationPlayer";
import type { ActorVisualDef } from "../../../game/content/ActorDefinitions";

function visual(): ActorVisualDef {
  return {
    id: "visual.test",
    asset: "asset.test",
    url: "/game-assets/test.glb",
    scale: 1,
    yOffset: 0,
    rotationY: 0,
    animations: { idle: "Idle", run: "Run", melee: "Slash" },
    animationDurations: { idle: 1, run: 1, melee: 0.8 },
    clipDurations: { Idle: 1, Run: 1, Slash: 0.8 },
    playback: {
      idle: { layer: "full", exitAt: 1, blendSpeed: 0.08 },
      run: { layer: "full", exitAt: 1, blendSpeed: 0.08 },
      melee: { layer: "upper", exitAt: 0.75, blendSpeed: 0.12 },
    },
    sockets: {
      melee: { fallback: { x: 0, y: 1, z: 0 } },
      ranged: { fallback: { x: 0, y: 1, z: 0 } },
    },
    budget: {
      maxBytes: 1,
      maxTriangles: 1,
      maxBones: 1,
      maxTextures: 1,
      maxAnimations: 3,
    },
    lod: { maxAnimatedInstances: 1, fallback: "voxel" },
  };
}

function humanoidVisual(): ActorVisualDef {
  const definition = visual();
  return {
    ...definition,
    animations: {
      idle: "Idle",
      run: "Run",
      melee: "Slash",
      ranged: "Bow",
      skill: "CastShoot",
    },
    animationDurations: {
      idle: 1,
      run: 1,
      melee: 0.8,
      ranged: 0.6,
      skill: 0.5,
    },
    clipDurations: {
      Idle: 1,
      Run: 1,
      Slash: 0.8,
      Lunge: 1,
      Bow: 0.6,
      CastEnter: 0.4,
      CastLoop: 1.2,
      CastShoot: 0.5,
      CastExit: 0.3,
    },
    humanoidActions: {
      melee: ["Slash", "Lunge"],
      bow: "Bow",
      cast: {
        enter: "CastEnter",
        loop: "CastLoop",
        release: "CastShoot",
        exit: "CastExit",
      },
    },
    animationEvents: {
      Slash: [{ id: "slash", at: 0.42 }],
      Lunge: [{ id: "slash", at: 0.54 }],
    },
    playback: {
      ...definition.playback,
      melee: { layer: "upper", exitAt: 1, blendSpeed: 0.12 },
      ranged: { layer: "upper", exitAt: 1, blendSpeed: 0.1 },
      skill: { layer: "full", exitAt: 1, blendSpeed: 0.1 },
    },
  };
}

function group(scene: Scene, name: string, targets: readonly string[]): AnimationGroup {
  const result = new AnimationGroup(name, scene);
  for (const targetName of targets) {
    const target = new TransformNode(targetName, scene);
    const animation = new Animation(
      `${name}-${targetName}`,
      "rotation.y",
      30,
      Animation.ANIMATIONTYPE_FLOAT,
    );
    animation.setKeys([{ frame: 0, value: 0 }, { frame: 30, value: 1 }]);
    result.addTargetedAnimation(animation, target);
  }
  return result;
}

describe("LayeredAnimationPlayer", () => {
  it("keeps run on the legs while melee owns the upper body", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const targets = ["actor-1-root", "actor-1-pelvis", "actor-1-thigh_l", "actor-1-spine_03", "actor-1-upperarm_r"];
    const idle = group(scene, "Idle", targets);
    const run = group(scene, "Run", targets);
    const slash = group(scene, "Slash", targets);
    const runStart = vi.spyOn(run, "start");
    const slashStart = vi.spyOn(slash, "start");

    new LayeredAnimationPlayer([idle, run, slash], visual()).play("melee", 0.5, "run");

    expect(run.mask?.retainsTarget("actor-1-thigh_l")).toBe(true);
    expect(run.mask?.retainsTarget("actor-1-spine_03")).toBe(false);
    expect(slash.mask?.retainsTarget("actor-1-thigh_l")).toBe(false);
    expect(slash.mask?.retainsTarget("actor-1-spine_03")).toBe(true);
    expect(runStart).toHaveBeenCalledWith(true, 1);
    expect(slashStart.mock.calls[0][0]).toBe(false);
    expect(slashStart.mock.calls[0][1]).toBeCloseTo(1.2);
    expect(slashStart.mock.calls[0].slice(2)).toEqual([0, 22.5]);
    expect(slash.blendingSpeed).toBe(0.12);
    engine.dispose();
  });

  it("uses a full-body fallback when a clip has no named targets", () => {
    const definition = visual();
    const slash = {
      name: "Slash",
      stop: vi.fn(),
      start: vi.fn(),
      from: 0,
      to: 30,
      mask: null,
      enableBlending: null,
      blendingSpeed: null,
      targetedAnimations: [],
    };
    const idle = { ...slash, name: "Idle", stop: vi.fn(), start: vi.fn() };

    new LayeredAnimationPlayer([idle, slash] as never, definition).play("melee", 0.5, "idle");

    expect(slash.mask).toBeNull();
    expect(slash.start.mock.calls[0][0]).toBe(false);
    expect(slash.start.mock.calls[0][1]).toBeCloseTo(1.2);
    expect(slash.start.mock.calls[0].slice(2)).toEqual([0, 22.5]);
  });

  it("alternates both selected melee clips and uses the selected bow clip", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const targets = ["Root", "UpperLeg.L", "Torso", "UpperArm.R"];
    const groups = ["Idle", "Run", "Slash", "Lunge", "Bow"].map((name) => (
      group(scene, name, targets)
    ));
    const slashStart = vi.spyOn(groups[2], "start");
    const lungeStart = vi.spyOn(groups[3], "start");
    const bowStart = vi.spyOn(groups[4], "start");
    const player = new LayeredAnimationPlayer(groups, humanoidVisual());

    const slashPlayback = player.play("melee", 0.5, "idle");
    const lungePlayback = player.play("melee", 0.5, "idle");
    player.play("ranged", 0.3, "idle");

    expect(slashStart).toHaveBeenCalledTimes(1);
    expect(lungeStart).toHaveBeenCalledTimes(1);
    expect(bowStart).toHaveBeenCalledTimes(1);
    expect(slashStart.mock.calls[0][1]).toBeCloseTo(1.6);
    expect(lungeStart.mock.calls[0][1]).toBeCloseTo(2);
    expect(bowStart.mock.calls[0][1]).toBeCloseTo(2);
    expect(slashPlayback).toEqual({
      clip: "Slash",
      events: [{ id: "slash", at: 0.42 }],
    });
    expect(lungePlayback).toEqual({
      clip: "Lunge",
      events: [{ id: "slash", at: 0.54 }],
    });
    engine.dispose();
  });

  it("plays the four cast phases with one duration-aligned speed", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const targets = ["Root", "Torso", "UpperArm.R"];
    const names = ["CastEnter", "CastLoop", "CastShoot", "CastExit"];
    const groups = names.map((name) => group(scene, name, targets));
    const starts = groups.map((value) => vi.spyOn(value, "start"));
    const player = new LayeredAnimationPlayer(groups, humanoidVisual());

    player.play("skill", 1.2, "idle");
    expect(starts[0]).toHaveBeenCalledTimes(1);
    for (let index = 0; index < groups.length - 1; index += 1) {
      groups[index].onAnimationGroupEndObservable.notifyObservers(groups[index]);
      expect(starts[index + 1]).toHaveBeenCalledTimes(1);
    }
    for (const start of starts) {
      expect(start.mock.calls[0][0]).toBe(false);
      expect(start.mock.calls[0][1]).toBeCloseTo(2);
      expect(start.mock.calls[0].slice(2)).toEqual([0, 30]);
    }
    engine.dispose();
  });

  it("does not continue a cast sequence after the actor changes action", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const targets = ["Root", "Torso"];
    const idle = group(scene, "Idle", targets);
    const enter = group(scene, "CastEnter", targets);
    const loop = group(scene, "CastLoop", targets);
    const shoot = group(scene, "CastShoot", targets);
    const exit = group(scene, "CastExit", targets);
    const loopStart = vi.spyOn(loop, "start");
    const player = new LayeredAnimationPlayer(
      [idle, enter, loop, shoot, exit],
      humanoidVisual(),
    );

    player.play("skill", 1.2, "idle");
    player.play("idle", 0, "idle");
    enter.onAnimationGroupEndObservable.notifyObservers(enter);

    expect(loopStart).not.toHaveBeenCalled();
    engine.dispose();
  });
});
