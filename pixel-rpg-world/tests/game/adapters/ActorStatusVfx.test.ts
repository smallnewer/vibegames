import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";
import { expect, it } from "vitest";
import { ActorStatusVfx } from "../../../game/adapters/babylon/art/ActorStatusVfx";

it("creates an instanced persistent status overlay", () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const actor = new TransformNode("actor", scene);
  const body = MeshBuilder.CreateBox("body", { size: 1 }, scene);
  body.parent = actor;
  const baseMaterial = new StandardMaterial("body-base", scene);
  baseMaterial.diffuseColor = new Color3(0.2, 0.3, 0.4);
  body.material = baseMaterial;
  const vfx = new ActorStatusVfx(scene);

  expect(() => vfx.sync([{
    actorId: 1,
    root: actor,
    meshes: [body],
    statuses: [{ id: "status.burning", visual: "vfx.status.burning" }],
  }])).not.toThrow();
  expect(vfx.activeCount).toBe(1);

  vfx.dispose();
  scene.dispose();
  engine.dispose();
});

it("isolates and restores the V2 burning body material", () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const actor = new TransformNode("actor", scene);
  const body = MeshBuilder.CreateBox("body", { size: 1 }, scene);
  body.parent = actor;
  const baseMaterial = new StandardMaterial("body-base", scene);
  baseMaterial.diffuseColor = new Color3(0.18, 0.28, 0.42);
  body.material = baseMaterial;
  const vfx = new ActorStatusVfx(scene);

  vfx.setStyle("v2");
  vfx.sync([{
    actorId: 7,
    root: actor,
    meshes: [body],
    statuses: [{ id: "status.burning", visual: "vfx.status.burning" }],
  }]);

  expect(vfx.bodyTintCount).toBe(1);
  expect(body.material).not.toBe(baseMaterial);
  expect(baseMaterial.diffuseColor).toEqual(new Color3(0.18, 0.28, 0.42));

  vfx.sync([{ actorId: 7, root: actor, meshes: [body], statuses: [] }]);
  expect(vfx.bodyTintCount).toBe(0);
  expect(body.material).toBe(baseMaterial);

  vfx.dispose();
  scene.dispose();
  engine.dispose();
});

it("uses body frost and textured particles for the V2 frozen status", () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const actor = new TransformNode("actor", scene);
  const body = MeshBuilder.CreateBox("body", { size: 1 }, scene);
  body.parent = actor;
  const baseMaterial = new StandardMaterial("body-base", scene);
  body.material = baseMaterial;
  const vfx = new ActorStatusVfx(scene);

  vfx.setStyle("v2");
  vfx.sync([{
    actorId: 9,
    root: actor,
    meshes: [body],
    statuses: [{ id: "status.frozen", visual: "vfx.status.frozen" }],
  }]);

  expect(vfx.bodyTintCount).toBe(1);
  expect(vfx.activeParticleSystemCount).toBe(2);
  expect(body.material).not.toBe(baseMaterial);

  vfx.dispose();
  scene.dispose();
  engine.dispose();
});
