import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  canonicalTopologySignature,
  compileDungeonSources,
} from "../scripts/compile-dungeons.mjs";
import { compileBalanceSource } from "../scripts/compile-balance.mjs";
import { compileItemCatalog } from "../scripts/compile-items.mjs";
import { compileAbilitySources } from "../scripts/compile-abilities.mjs";

const sourceDir = new URL("../content-src/dungeons/", import.meta.url);
const itemSourceDir = new URL("../content-src/items/", import.meta.url);
const abilitySourceDir = new URL("../content-src/abilities/", import.meta.url);

async function sources() {
  return Promise.all([
    "ice-room.json",
    "lava-showcase.json",
    "training-ground.json",
    "production-foundation.json",
    "frost-mine.json",
    "moss-sanctum.json",
    "storm-throne.json",
    "sunken-library.json",
  ].map(async (filename) => ({
    filename,
    value: JSON.parse(await readFile(new URL(filename, sourceDir), "utf8")),
  })));
}

function cloned(source) {
  return structuredClone(source);
}

const validBalance = {
  version: 1,
  levelCap: 30,
  xpExponent: 1.55,
  attributePointsPerLevel: 3,
  startingSkillPoints: 1,
  skillPointEveryLevels: 2,
  skillRankMultipliers: [1, 1.12, 1.25, 1.39, 1.55],
  resistanceMin: -0.25,
  resistanceMax: 0.75,
  armorCap: 0.65,
  partyHealth: [1, 1.65, 2.2, 2.7],
  partyDamage: [1, 1.08, 1.16, 1.24],
  partyLoot: [1, 1.6, 2.1, 2.5],
  rarityWeights: { normal: 0.68, magic: 0.26, rare: 0.055, unique: 0.005 },
  reinforcement: [
    { level: 1, baseMultiplier: 1.08, scrap: 4, essence: 0, seal: 0 },
    { level: 2, baseMultiplier: 1.17, scrap: 8, essence: 2, seal: 0 },
    { level: 3, baseMultiplier: 1.27, scrap: 14, essence: 4, seal: 1 },
    { level: 4, baseMultiplier: 1.38, scrap: 22, essence: 7, seal: 2 },
    { level: 5, baseMultiplier: 1.5, scrap: 32, essence: 10, seal: 4 },
  ],
};

test("validates the canonical balance contract", () => {
  const result = compileBalanceSource(validBalance, "v1.json");
  assert.match(result.code, /BALANCE_DATA/);
  assert.equal(result.data.levelCap, 30);

  const badCap = cloned(validBalance);
  badCap.levelCap = 31;
  assert.throws(() => compileBalanceSource(badCap, "bad-cap.json"), /levelCap|30/i);

  const badRanks = cloned(validBalance);
  badRanks.skillRankMultipliers[3] = badRanks.skillRankMultipliers[2];
  assert.throws(() => compileBalanceSource(badRanks, "bad-ranks.json"), /skill rank.*increasing/i);

  const badResistance = cloned(validBalance);
  badResistance.resistanceMax = 0.8;
  assert.throws(() => compileBalanceSource(badResistance, "bad-resistance.json"), /resistanceMax|0\.75/i);

  const duplicateReinforcement = cloned(validBalance);
  duplicateReinforcement.reinforcement[4].level = 4;
  assert.throws(() => compileBalanceSource(duplicateReinforcement, "bad-reinforcement.json"), /duplicate reinforcement level/i);

  const badWeights = cloned(validBalance);
  badWeights.rarityWeights.unique = 0.01;
  assert.throws(() => compileBalanceSource(badWeights, "bad-weights.json"), /rarity weights.*sum.*1/i);
});

test("validates item bases, affixes, and fixed uniques", async () => {
  const [bases, affixes, uniques] = await Promise.all([
    "bases.json", "affixes.json", "uniques.json",
  ].map(async (filename) => JSON.parse(await readFile(new URL(filename, itemSourceDir), "utf8"))));
  const catalog = {
    schemaVersion: 1,
    bases: bases.bases,
    affixes: affixes.affixes,
    uniques: uniques.uniques,
  };
  const result = compileItemCatalog(catalog);
  assert.equal(result.data.affixes.length, 18);
  assert.equal(result.data.uniques.length, 10);

  const duplicateGroup = cloned(catalog);
  duplicateGroup.affixes[1].group = duplicateGroup.affixes[0].group;
  assert.throws(() => compileItemCatalog(duplicateGroup), /duplicate affix group/i);

  const illegalSlot = cloned(catalog);
  illegalSlot.uniques[0].affixes[0] = "affix.utility_move_speed";
  assert.throws(() => compileItemCatalog(illegalSlot), /illegal for slot/i);

  const missingBase = cloned(catalog);
  missingBase.uniques[0].base = "item.base.missing";
  assert.throws(() => compileItemCatalog(missingBase), /missing base/i);

  const reversedTier = cloned(catalog);
  reversedTier.affixes[0].tiers[0] = { minFactor: 2, maxFactor: 1 };
  assert.throws(() => compileItemCatalog(reversedTier), /minFactor exceeds maxFactor/i);

  const tooManyAffixes = cloned(catalog);
  tooManyAffixes.affixes.push({ ...cloned(tooManyAffixes.affixes[0]), id: "affix.extra", group: "extra.group" });
  assert.throws(() => compileItemCatalog(tooManyAffixes), /must NOT have more than 18 items/i);

  const shortUnique = cloned(catalog);
  shortUnique.uniques[0].affixes = shortUnique.uniques[0].affixes.slice(0, 3);
  assert.throws(() => compileItemCatalog(shortUnique), /must NOT have fewer than 4 items/i);
});

test("validates and freezes exactly twelve player active skills", async () => {
  const input = await Promise.all(["player.json", "enemies.json"].map(async (filename) => ({
    filename,
    value: JSON.parse(await readFile(new URL(filename, abilitySourceDir), "utf8")),
  })));
  const result = compileAbilitySources(input);
  assert.equal(result.player.length, 12);
  assert.deepEqual(result.player.map((ability) => ability.id), [...result.player.map(
    (ability) => ability.id,
  )].sort());
  assert.match(result.code, /PLAYER_ABILITY_IDS/);

  const mutatePlayer = (mutate) => {
    const changed = cloned(input);
    const player = changed.find((entry) => entry.value.kind === "player").value.abilities;
    mutate(player);
    return changed;
  };
  const firstDamage = (node) => {
    if (node.type === "damage" || node.type === "spawn_projectile") return node;
    if (node.type === "delay") return firstDamage(node.child);
    if (node.type === "sequence" || node.type === "parallel") {
      return node.children.map(firstDamage).find(Boolean);
    }
    if (node.type === "if_targets") {
      return firstDamage(node.then) ?? (node.otherwise ? firstDamage(node.otherwise) : undefined);
    }
    return undefined;
  };
  assert.throws(() => compileAbilitySources(mutatePlayer((player) => {
    player[0].rankBonuses[0].rank = 0;
  })), /rank|3|5/i);
  assert.throws(() => compileAbilitySources(mutatePlayer((player) => {
    player[0].rankBonuses[0].rank = 6;
  })), /rank|3|5/i);
  assert.throws(() => compileAbilitySources(mutatePlayer((player) => {
    delete firstDamage(player.find((ability) => ability.id === "ability.ember_nova").effect)
      .value.damageType;
  })), /damageType/i);
  assert.throws(() => compileAbilitySources(mutatePlayer((player) => {
    player[0].cooldown = -1;
  })), /cooldown/i);
  assert.throws(() => compileAbilitySources(mutatePlayer((player) => {
    player[0].telegraphSeconds = player[0].actionTime + 0.1;
  })), /telegraph.*action/i);
  assert.throws(() => compileAbilitySources(mutatePlayer((player) => {
    player[0].rankBonuses.push(cloned(player[0].rankBonuses[0]));
  })), /duplicate rank bonus/i);
  for (const charges of [0, 3]) {
    assert.throws(() => compileAbilitySources(mutatePlayer((player) => {
      player[0].charges = charges;
    })), /charges/i);
  }
  for (const field of ["icon", "visual"]) {
    assert.throws(() => compileAbilitySources(mutatePlayer((player) => {
      delete player[0][field];
    })), new RegExp(field, "i"));
  }
  assert.throws(() => compileAbilitySources(mutatePlayer((player) => {
    player[0].effect = {
      type: "spawn_hazard",
      radius: 2,
      duration: 13,
      interval: 0.25,
      visual: "vfx.hazard.fixture",
      child: firstDamage(player[0].effect),
    };
  })), /duration|12/i);
  assert.throws(() => compileAbilitySources(mutatePlayer((player) => {
    player[0].effect = {
      type: "repeat",
      count: 6,
      interval: 0.1,
      child: firstDamage(player[0].effect),
    };
  })), /count|5/i);
  assert.throws(() => compileAbilitySources(mutatePlayer((player) => {
    player[0].effect = { type: "chain_targets", range: 3, maxTargets: 7 };
  })), /maxTargets|6/i);
  assert.throws(() => compileAbilitySources(mutatePlayer((player) => {
    player.pop();
  })), /exactly 12 player/i);
});

test("compiles all real packs deterministically", async () => {
  const input = await sources();
  const first = compileDungeonSources(input);
  const second = compileDungeonSources([...input].reverse());

  assert.deepEqual(first.packs.map((pack) => pack.id), [
    "dungeon.frost_mine",
    "dungeon.ice_room",
    "dungeon.lava_showcase",
    "dungeon.moss_sanctum",
    "dungeon.production_foundation",
    "dungeon.storm_throne",
    "dungeon.sunken_library",
    "dungeon.training_ground",
  ]);
  assert.equal(
    first.packs.find((pack) => pack.id === "dungeon.lava_showcase").visual.profile,
    "lava_fortress",
  );
  assert.equal(first.code, second.code);
  assert.match(first.code, /DUNGEON_PACK_DATA/);
  assert.match(first.code, /hydrateDungeonPack/);
  assert.equal(first.packs.filter((pack) => pack.map.mode === "production").length, 5);
  const ember = first.packs.find((pack) => pack.id === "dungeon.production_foundation");
  assert.equal(ember.run.gameplayVersion, 1);
  assert.equal(ember.encounters.filter((encounter) => encounter.kind === "normal").length, 3);
  assert.equal(
    first.packs.filter((pack) => pack.map.mode === "production" && pack.run === undefined).length,
    4,
  );
  const formal = first.packs.filter((pack) => pack.visual.profile === "voxel_dungeon");
  assert.ok(formal.every((pack) => pack.map.sections.length === 10));
  assert.equal(
    new Set(formal.map((pack) => canonicalTopologySignature(pack.map.sections))).size,
    formal.length,
  );
  assert.ok(ember.map.navigation.blockers.some((blocker) => blocker.id.startsWith("blocker.wall_")));
  assert.equal(
    ember.map.navigation.blockers.some((blocker) => blocker.id.includes("ember_training_a_south")),
    false,
    "sections in the same combat zone must not keep their shared wall",
  );
});

test("rejects invalid gameplay-version-one encounter contracts", async () => {
  const input = await sources();
  const production = cloned(input.find((source) => source.filename === "production-foundation.json"));
  const encounter = (source, id = "encounter.refuge_gate") => (
    source.value.encounters.find((entry) => entry.id === id)
  );

  const outsideTrigger = cloned(production);
  encounter(outsideTrigger).trigger.x = 54;
  assert.throws(() => compileDungeonSources([outsideTrigger]), /trigger is outside section/i);

  const emptyWave = cloned(production);
  encounter(emptyWave).waves[0].members = [];
  assert.throws(() => compileDungeonSources([emptyWave]), /members.*fewer than 1/i);

  const missingSpawn = cloned(production);
  encounter(missingSpawn).waves[0].members[0].spawn = "spawn.missing";
  assert.throws(() => compileDungeonSources([missingSpawn]), /missing spawn/i);

  const duplicateMember = cloned(production);
  encounter(duplicateMember).waves[1].members[0].id = encounter(duplicateMember).waves[0].members[0].id;
  assert.throws(() => compileDungeonSources([duplicateMember]), /duplicate encounter member/i);

  const shortBoss = cloned(production);
  encounter(shortBoss, "encounter.warden_hearn").bossPhases.pop();
  assert.throws(() => compileDungeonSources([shortBoss]), /bossPhases.*fewer than 3/i);

  const noCheckpoint = cloned(production);
  delete encounter(noCheckpoint, "encounter.warden_hearn").checkpoint;
  assert.throws(() => compileDungeonSources([noCheckpoint]), /checkpoint/i);

  const noReward = cloned(production);
  delete encounter(noReward).rewardTable;
  assert.throws(() => compileDungeonSources([noReward]), /rewardTable/i);

  const noPortal = cloned(production);
  noPortal.value.interactions = noPortal.value.interactions.filter((entry) => entry.kind !== "portal");
  assert.throws(() => compileDungeonSources([noPortal]), /portal|completion/i);
});

test("rejects weak or disconnected formal dungeon layouts", async () => {
  const input = await sources();
  const production = cloned(input.find((source) => source.filename === "production-foundation.json"));

  const noLore = cloned(production);
  delete noLore.value.lore;
  assert.throws(() => compileDungeonSources([noLore]), /production-foundation.*lore/i);

  const disconnected = cloned(production);
  Object.assign(
    disconnected.value.map.sections.find((section) => section.preset === "living_quarters"),
    { gridX: 0, gridZ: 4 },
  );
  disconnected.value.map.bounds.maxZ = 54;
  assert.throws(() => compileDungeonSources([disconnected]), /connected/i);

  const noWorkshop = cloned(production);
  noWorkshop.value.map.sections.find((section) => section.preset === "workshop").preset = "stone_corridor";
  assert.throws(() => compileDungeonSources([noWorkshop]), /requires workshop/i);

  const narrowBoss = cloned(production);
  narrowBoss.value.map.sections.find((section) => section.id.endsWith("boss_b")).zone = "zone.ember_false_boss";
  assert.throws(() => compileDungeonSources([narrowBoss]), /boss_arena requires a connected 2-section zone/i);

  const straight = cloned(production);
  straight.value.map.bounds = { minX: -9, maxX: 171, minZ: -6, maxZ: 30 };
  straight.value.map.sections.forEach((section, index) => {
    section.gridX = index;
    section.gridZ = 0;
    section.zone = `zone.straight_${index}`;
    section.name = `直线房间${index}`;
  });
  straight.value.spawnPoints.forEach((spawn, index) => {
    spawn.z = index % 2;
  });
  assert.throws(() => compileDungeonSources([straight]), /footprint.*3x3/i);
});

test("rejects structural, reference, and budget defects with source context", async () => {
  const [ice] = await sources();

  const unknown = cloned(ice);
  unknown.value.unknown = true;
  assert.throws(() => compileDungeonSources([unknown]), /ice-room\.json.*additional/i);

  const duplicate = cloned(ice);
  duplicate.value.decorations.push(cloned(duplicate.value.decorations[0]));
  assert.throws(() => compileDungeonSources([duplicate]), /ice-room\.json.*duplicate.*decoration/i);

  const badColor = cloned(ice);
  badColor.value.visual.groundColor = "blue";
  assert.throws(() => compileDungeonSources([badColor]), /ice-room\.json.*groundColor/i);

  const zeroRadius = cloned(ice);
  zeroRadius.value.interactions[0].radius = 0;
  assert.throws(() => compileDungeonSources([zeroRadius]), /ice-room\.json.*radius/i);

  const missingMember = cloned(ice);
  missingMember.value.encounters[0].members = ["enemy.missing"];
  assert.throws(() => compileDungeonSources([missingMember]), /ice-room\.json.*enemy\.missing/i);

  const overflow = cloned(ice);
  overflow.value.decorations = Array.from({ length: 65 }, (_, index) => ({
    ...cloned(ice.value.decorations[0]),
    id: `decoration.overflow_${index}`,
  }));
  assert.throws(() => compileDungeonSources([overflow]), /ice-room\.json.*64 decorations/i);
});

test("enforces showcase and production screen capacity", async () => {
  const [ice] = await sources();
  const section = (index) => ({
    id: `section.fixture_${index}`,
    preset: "foundation_room",
    gridX: index,
    gridZ: 0,
    rotation: 0,
  });
  const production = cloned(ice);
  production.filename = "production.json";
  production.value.id = "dungeon.production_fixture";
  production.value.map.mode = "production";
  production.value.map.bounds = { minX: -9, maxX: 171, minZ: -6, maxZ: 6 };

  production.value.map.sections = Array.from({ length: 5 }, (_, index) => section(index));
  assert.doesNotThrow(() => compileDungeonSources([production]));

  production.value.map.sections = Array.from({ length: 4 }, (_, index) => section(index));
  assert.throws(() => compileDungeonSources([production]), /production.*5.*10 screens/i);

  production.value.map.sections = Array.from({ length: 11 }, (_, index) => section(index));
  assert.throws(() => compileDungeonSources([production]), /production.*5.*10 screens/i);

  production.value.map.sections = Array.from({ length: 10 }, (_, index) => section(index));
  production.value.map.sections[9].gridX = 8;
  assert.throws(() => compileDungeonSources([production]), /duplicate.*section grid/i);
});

test("validates local assets, placements, and walkable navigation", async () => {
  const [ice] = await sources();
  const valid = cloned(ice);
  valid.value.assets = [
    { id: "asset.prop_box", kind: "model", url: "/game-assets/props/box.glb" },
  ];
  valid.value.placements = [
    {
      id: "placement.box_a",
      asset: "asset.prop_box",
      section: "section.ice",
      x: 0,
      y: 0,
      z: 3,
      rotationY: 0,
      scale: 1,
    },
  ];
  valid.value.map.navigation = {
    walkable: [{ id: "walkable.ice", x: 0, z: 0, width: 16, depth: 10 }],
    blockers: [{ id: "blocker.ice_pillar", x: 5, z: 4, width: 1, depth: 1, height: 3 }],
  };
  assert.doesNotThrow(() => compileDungeonSources([valid]));

  const missingAsset = cloned(valid);
  missingAsset.value.placements[0].asset = "asset.missing";
  assert.throws(() => compileDungeonSources([missingAsset]), /placement\.box_a.*asset\.missing/i);

  const missingSection = cloned(valid);
  missingSection.value.placements[0].section = "section.missing";
  assert.throws(() => compileDungeonSources([missingSection]), /placement\.box_a.*section\.missing/i);

  const remoteAsset = cloned(valid);
  remoteAsset.value.assets[0].url = "https://example.com/box.glb";
  assert.throws(() => compileDungeonSources([remoteAsset]), /asset\.prop_box.*local.*game-assets/i);

  const unwalkableSpawn = cloned(valid);
  unwalkableSpawn.value.spawnPoints[0].x = 8.5;
  assert.throws(() => compileDungeonSources([unwalkableSpawn]), /spawn\.ice_player_1.*walkable/i);
});
