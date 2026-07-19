import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import { Logger } from "@babylonjs/core/Misc/logger";
import { Scene } from "@babylonjs/core/scene";
import { expect, it, vi } from "vitest";
import type { GameSnapshot } from "../../../game/core/GameSnapshot";
import {
  CombatVfx,
  effectForEvent,
  VFX_LIMITS,
} from "../../../game/adapters/babylon/art/CombatVfx";

it("locks bounded visual effect pools", () => {
  expect(VFX_LIMITS).toEqual({ short: 96, trails: 48, ambient: 160 });
});

it("maps impact and death from gameplay facts", () => {
  expect(effectForEvent({
    type: "damage_applied",
    source: 1,
    target: 2,
    amount: 10,
  })).toBe("hit_burst");
  expect(effectForEvent({ type: "actor_died", actor: 2 })).toBe("death_breakup");
});

it("exposes formal melee playback for animation-event scheduling", () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const vfx = new CombatVfx(scene);

  vfx.setMeleeStyle("v2");
  expect(vfx.hasMeleeVisual("vfx.melee.rust_blade")).toBe(true);
  vfx.playMelee("vfx.melee.rust_blade", 0, 0, 0, 1);
  expect(vfx.activeCount).toBe(1);

  vfx.dispose();
  scene.dispose();
  engine.dispose();
});

it("shares one hit-shard source across a six-piece damage burst", () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const vfx = new CombatVfx(scene);
  const snapshot = {
    actors: [
      { id: 1, x: 0, z: 2, faction: "hero" },
      { id: 2, x: 1, z: 2, faction: "enemy" },
    ],
    loot: [],
    interactions: [],
  } as unknown as GameSnapshot;

  vfx.sync(snapshot, [{ type: "damage_applied", source: 1, target: 2, amount: 10 }]);
  const shards = scene.meshes.filter((mesh) => mesh.name === "vfx-hit-shard");

  expect(shards).toHaveLength(6);
  expect(shards.every((mesh) => mesh instanceof InstancedMesh)).toBe(true);
  expect(new Set(shards.map((mesh) => (mesh as InstancedMesh).sourceMesh)).size).toBe(1);
  const warn = vi.spyOn(Logger, "Warn");
  vfx.update(0.1);
  expect(shards.reduce((sum, mesh) => sum + mesh.position.x, 0) / shards.length)
    .toBeGreaterThan(1.05);
  expect(warn.mock.calls.flat().join(" ")).not.toContain("visibility on an instanced mesh");
  warn.mockRestore();

  vfx.dispose();
  scene.dispose();
  engine.dispose();
});

it("uses ten bright shards and a pooled shock ring for critical hits", () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const vfx = new CombatVfx(scene);
  const snapshot = {
    actors: [
      { id: 1, x: 0, z: 0, faction: "hero" },
      { id: 2, x: 1, z: 0, faction: "enemy" },
    ],
    loot: [],
    interactions: [],
  } as unknown as GameSnapshot;

  vfx.sync(snapshot, [{
    type: "damage_applied",
    source: 1,
    target: 2,
    amount: 20,
    damageType: "physical",
    critical: true,
    skillId: "ability.test",
  }]);

  expect(scene.meshes.filter((mesh) => mesh.name === "vfx-hit-shard")).toHaveLength(10);
  expect(scene.meshes.filter((mesh) => mesh.name === "vfx-nova-ring")).toHaveLength(1);
  expect(vfx.metrics().nova_ring).toBe(1);

  vfx.dispose();
  scene.dispose();
  engine.dispose();
});
