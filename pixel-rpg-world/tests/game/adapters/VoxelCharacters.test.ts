import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import { Scene } from "@babylonjs/core/scene";
import { expect, it } from "vitest";
import { createVoxelCharacter } from "../../../game/adapters/babylon/art/VoxelCharacters";

it("shares merged fallback enemy geometry across a large mob", () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const palette = {
    stone: "#2b211c",
    bone: "#d6bd8b",
    crystal: "#ff5d2e",
    emissive: "#ff5d2e",
    projectile: "#ff5d2e",
  };
  const first = createVoxelCharacter(scene, "enemy", undefined, "theme.test", palette);
  const second = createVoxelCharacter(scene, "enemy", undefined, "theme.test", palette);

  expect(first.hitMeshes.length).toBeGreaterThan(0);
  expect(first.hitMeshes.every((mesh) => mesh instanceof InstancedMesh)).toBe(true);
  expect(second.hitMeshes.every((mesh) => mesh instanceof InstancedMesh)).toBe(true);
  expect(first.hitMeshes.map((mesh) => (mesh as InstancedMesh).sourceMesh)).toEqual(
    second.hitMeshes.map((mesh) => (mesh as InstancedMesh).sourceMesh),
  );

  first.dispose();
  second.dispose();
  scene.dispose();
  engine.dispose();
});
