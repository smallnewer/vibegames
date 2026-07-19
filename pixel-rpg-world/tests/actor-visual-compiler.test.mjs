import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  compileActorVisualManifest,
  inspectActorAsset,
  inspectGlb,
} from "../scripts/compile-actor-visuals.mjs";

const projectDir = new URL("../", import.meta.url);
const manifest = JSON.parse(await readFile(
  new URL("../content-src/actors/visuals.json", import.meta.url),
  "utf8",
));

test("inspects and compiles the real local animated actor assets", async () => {
  const result = await compileActorVisualManifest(manifest, projectDir);
  assert.equal(result.visuals.length, 5);
  assert.match(result.code, /visual\.actor\.ember_hero/);
  assert.match(result.code, /visual\.actor\.fox/);
  const hero = result.visuals.find((visual) => visual.id === "visual.actor.ember_hero");
  assert.equal(hero.asset, "asset.actor.humanoid_combat");
  assert.equal(hero.animationDurations.melee, 37 / 24);
  assert.equal(hero.animationDurations.roll, 35 / 24);
  assert.deepEqual(hero.playback.melee, {
    layer: "upper",
    exitAt: 1,
    blendSpeed: 0.1,
  });
  assert.deepEqual(hero.playback.roll, {
    layer: "full",
    exitAt: 1,
    blendSpeed: 0.08,
  });
  assert.deepEqual(hero.humanoidActions, {
    melee: ["Sword_Attack", "Sword_Attack_RM"],
    bow: "Library_Bow_Shoot",
    cast: {
      enter: "Spell_Simple_Enter",
      loop: "Spell_Simple_Idle_Loop",
      release: "Spell_Simple_Shoot",
      exit: "Spell_Simple_Exit",
    },
  });
  assert.deepEqual(hero.animationEvents, {
    Sword_Attack: [{ id: "slash", at: 0.42 }],
    Sword_Attack_RM: [{ id: "slash", at: 0.44 }],
  });
  for (const clip of [
    ...hero.humanoidActions.melee,
    hero.humanoidActions.bow,
    ...Object.values(hero.humanoidActions.cast),
  ]) assert.ok(hero.clipDurations[clip] > 0);

  const humanoid = await inspectActorAsset(new URL(
    "../public/game-assets/actors/humanoid-combat.gltf",
    import.meta.url,
  ));
  const required = [
    "Idle_Loop",
    "Sprint_Loop",
    "Roll",
    "Sword_Attack",
    "Sword_Attack_RM",
    "Library_Bow_Shoot",
    "Spell_Simple_Enter",
    "Spell_Simple_Idle_Loop",
    "Spell_Simple_Shoot",
    "Spell_Simple_Exit",
    "Hit_Chest",
    "Death01",
  ];
  for (const clip of required) assert.ok(humanoid.animations.includes(clip));
  assert.ok(humanoid.nodes.includes("socket.weapon.right"));

  const fox = await inspectGlb(new URL("../public/game-assets/actors/fox.glb", import.meta.url));
  assert.deepEqual(fox.animations, ["Survey", "Walk", "Run"]);
  assert.ok(fox.nodes.includes("b_Head_05"));
  assert.equal(fox.maxBones, 24);
  assert.equal(fox.textures, 1);
});

test("rejects remote, missing clip, missing socket and budget overflow", async () => {
  for (const mutate of [
    (value) => { value.visuals[0].url = "https://example.com/actor.glb"; },
    (value) => { value.visuals[1].animations.idle = "Missing"; },
    (value) => { value.visuals[1].sockets.melee.node = "Missing"; },
    (value) => { value.visuals[1].budget.maxBones = 1; },
    (value) => { value.visuals[1].budget.maxBytes = 1024; },
    (value) => { delete value.visuals[1].humanoidActions; },
    (value) => { value.visuals[1].humanoidActions.cast.release = "Missing"; },
    (value) => { value.visuals[1].animationEvents.Missing = [{ id: "slash", at: 0.5 }]; },
    (value) => { value.visuals[1].animationEvents.Sword_Attack = [
      { id: "late", at: 0.8 },
      { id: "early", at: 0.2 },
    ]; },
  ]) {
    const invalid = structuredClone(manifest);
    mutate(invalid);
    await assert.rejects(() => compileActorVisualManifest(invalid, projectDir));
  }
});

test("allows shared assets but rejects visual duplicates and changed asset sources", async () => {
  const visualDuplicate = structuredClone(manifest);
  visualDuplicate.visuals[1].id = visualDuplicate.visuals[0].id;
  await assert.rejects(() => compileActorVisualManifest(visualDuplicate, projectDir), /duplicate visual/);

  const sharedAsset = structuredClone(manifest);
  sharedAsset.visuals[1].asset = sharedAsset.visuals[0].asset;
  sharedAsset.visuals[1].url = sharedAsset.visuals[0].url;
  await compileActorVisualManifest(sharedAsset, projectDir);

  const changedSource = structuredClone(manifest);
  changedSource.visuals.at(-1).asset = changedSource.visuals[0].asset;
  await assert.rejects(
    () => compileActorVisualManifest(changedSource, projectDir),
    /asset asset\.actor\.humanoid_combat changed source/,
  );
});
