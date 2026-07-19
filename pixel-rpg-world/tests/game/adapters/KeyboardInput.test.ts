import { expect, it } from "vitest";
import { KeyboardInput } from "../../../game/adapters/browser/KeyboardInput";
import type { GameSnapshot } from "../../../game/core/GameSnapshot";

function key(target: EventTarget, type: "keydown" | "keyup", code: string) {
  const event = new Event(type, { cancelable: true });
  Object.defineProperty(event, "code", { value: code });
  target.dispatchEvent(event);
}

function snapshot(): GameSnapshot {
  return {
    hero: 1,
    actors: [{
      id: 1,
      faction: "hero",
      action: "idle",
      x: 0,
      z: 0,
      previousX: 0,
      previousZ: 0,
      facingX: 1,
      facingZ: 0,
      health: 100,
      maxHealth: 100,
    }],
    projectiles: [],
    loot: [{ id: 9, kind: "item", name: "Ember Blade", x: 0.5, z: 0 }],
    progress: {
      items: [
        {
          id: 1,
          definition: "item.rust_blade",
          name: "Rust Blade",
          slot: "melee",
          reinforce: 0,
          equipped: true,
        },
        {
          id: 3,
          definition: "item.ember_blade",
          name: "Ember Blade",
          slot: "melee",
          reinforce: 0,
          equipped: false,
        },
      ],
      equipment: {
        slots: { melee: 1 },
        names: {
          head: "未装备",
          chest: "未装备",
          wrists: "未装备",
          legs: "未装备",
          feet: "未装备",
          melee: "Rust Blade",
          ranged: "Hunter Bow",
        },
        visuals: {},
      },
      materials: {
        "material.scrap": 1,
        "material.ember_essence": 0,
        "material.frost_essence": 0,
        "material.tide_essence": 0,
        "material.spore_essence": 0,
        "material.storm_essence": 0,
        "material.seal": 0,
      },
      unlockedAbilities: [
        "ability.battle_focus",
        "ability.ember_nova",
        "ability.shadow_step",
        "passive.ember_guard",
      ],
      abilities: {
        skill_up: { id: "ability.battle_focus", name: "Battle Focus", cooldownLeft: 0 },
        skill_right: { id: "ability.ember_nova", name: "Ember Nova", cooldownLeft: 0 },
        skill_down: { id: "ability.shadow_step", name: "Shadow Step", cooldownLeft: 0 },
        skill_left: { id: "ability.molten_guard", name: "Molten Guard", cooldownLeft: 0 },
      },
      passives: {
        passive_1: { id: "passive.ember_guard", name: "Ember Guard" },
        passive_2: { name: "未装配" },
      },
      statuses: [],
      stats: {
        maxHealth: 100,
        moveSpeed: 4.2,
        meleePower: 40,
        rangedPower: 30,
        armor: 0,
        attackSpeed: 1,
        cooldownRecovery: 0,
        pickupRadius: 1.4,
      },
      statBreakdown: {} as GameSnapshot["progress"]["statBreakdown"],
    },
    dungeon: {
      id: "dungeon.training_ground",
      name: "晶体门训练场",
      emberOre: 0,
      encounter: "idle",
      door: "locked",
      portalUses: 0,
    },
    interactions: [
      {
        id: 10,
        definition: "interaction.ember_ore",
        name: "余烬矿",
        kind: "harvest",
        trigger: "interact",
        state: "idle",
        x: 0.6,
        z: 0,
        radius: 1.4,
        prompt: "采集余烬矿",
      },
      {
        id: 11,
        definition: "interaction.crystal_gate_trigger",
        name: "晶体守卫遭遇",
        kind: "encounter",
        trigger: "enter",
        state: "idle",
        x: 0,
        z: 0,
        radius: 0.9,
        prompt: "进入晶体守卫遭遇",
      },
    ],
  };
}

it("keeps movement held and consumes action keys once per press", () => {
  const target = new EventTarget();
  const input = new KeyboardInput(target);
  key(target, "keydown", "KeyW");
  const firstMove = input.sample(snapshot())[0];
  const secondMove = input.sample(snapshot())[0];
  expect(firstMove).toMatchObject({ type: "move", actor: 1 });
  expect(secondMove).toEqual(firstMove);
  if (firstMove.type === "move") {
    expect(firstMove.x).toBeCloseTo(Math.SQRT1_2);
    expect(firstMove.z).toBeCloseTo(Math.SQRT1_2);
  }

  key(target, "keydown", "Space");
  expect(input.sample(snapshot()).filter((command) => command.type === "roll")).toHaveLength(1);
  expect(input.sample(snapshot()).filter((command) => command.type === "roll")).toHaveLength(0);
  key(target, "keyup", "Space");
  key(target, "keydown", "Space");
  expect(input.sample(snapshot()).filter((command) => command.type === "roll")).toHaveLength(1);

  key(target, "keydown", "KeyJ");
  key(target, "keydown", "KeyK");
  const attacks = input.sample(snapshot()).filter((command) => command.type === "cast");
  expect(attacks).toHaveLength(2);
  expect(input.sample(snapshot()).filter((command) => command.type === "cast")).toHaveLength(0);
  input.dispose();
});

it("maps WASD to the fixed isometric camera directions", () => {
  const expected = {
    KeyW: [1, 1],
    KeyA: [-1, 1],
    KeyS: [-1, -1],
    KeyD: [1, -1],
  } as const;

  for (const [code, [xSign, zSign]] of Object.entries(expected)) {
    const target = new EventTarget();
    const input = new KeyboardInput(target);
    key(target, "keydown", code);
    const command = input.sample(snapshot())[0];
    expect(command.type).toBe("move");
    if (command.type === "move") {
      expect(Math.sign(command.x)).toBe(xSign);
      expect(Math.sign(command.z)).toBe(zSign);
      expect(Math.hypot(command.x, command.z)).toBeCloseTo(1);
    }
    input.dispose();
  }
});

it("keeps progression editing out of gameplay keys and maps 1-4 to the four skills", () => {
  const target = new EventTarget();
  const input = new KeyboardInput(target);
  for (const code of [
    "KeyE",
    "KeyQ",
    "KeyZ",
    "KeyX",
    "KeyC",
    "KeyV",
    "KeyB",
    "KeyR",
    "Digit1",
    "Digit2",
    "Digit3",
    "Digit4",
  ]) {
    key(target, "keydown", code);
  }

  expect(input.sample(snapshot()).slice(1)).toEqual([
    { type: "interact", actor: 1, target: 10 },
    { type: "cast", actor: 1, slot: "skill_up", aimX: 10, aimZ: 0 },
    { type: "cast", actor: 1, slot: "skill_right", aimX: 10, aimZ: 0 },
    { type: "cast", actor: 1, slot: "skill_down", aimX: 10, aimZ: 0 },
    { type: "cast", actor: 1, slot: "skill_left", aimX: 10, aimZ: 0 },
  ]);
  expect(input.sample(snapshot())).toHaveLength(1);
  input.dispose();
});

it("separates menu UI input from gameplay commands and clears queued edges", () => {
  const target = new EventTarget();
  const input = new KeyboardInput(target);
  key(target, "keydown", "Escape");
  expect(input.sample(snapshot())).toHaveLength(1);
  expect(input.takeUiInputs()).toEqual([{ type: "open" }]);

  input.setContext("menu");
  key(target, "keyup", "Escape");
  key(target, "keydown", "ArrowLeft");
  expect(input.sample(snapshot())).toEqual([]);
  expect(input.takeUiInputs()).toEqual([{ type: "move_focus", x: -1, y: 0 }]);
  input.dispose();
});

it("maps menu X+confirm to secondary and Y to favorite", () => {
  const target = new EventTarget();
  const input = new KeyboardInput(target);
  input.setContext("menu");
  key(target, "keydown", "KeyX");
  key(target, "keydown", "Enter");
  key(target, "keydown", "KeyY");
  expect(input.sample(snapshot())).toEqual([]);
  expect(input.takeUiInputs()).toEqual([{ type: "secondary" }, { type: "favorite" }]);
  input.dispose();
});

it("keeps E for the nearest explicit interaction while loot uses collision pickup", () => {
  const target = new EventTarget();
  const input = new KeyboardInput(target);
  key(target, "keydown", "KeyE");
  expect(input.sample(snapshot()).filter((command) => command.type !== "move")).toEqual([
    { type: "interact", actor: 1, target: 10 },
  ]);

  key(target, "keyup", "KeyE");
  key(target, "keydown", "KeyE");
  const withoutLoot = { ...snapshot(), loot: [] };
  expect(input.sample(withoutLoot).filter((command) => command.type !== "move")).toEqual([
    { type: "interact", actor: 1, target: 10 },
  ]);

  key(target, "keyup", "KeyE");
  key(target, "keydown", "KeyE");
  expect(input.sample({ ...withoutLoot, interactions: [withoutLoot.interactions[1]] }))
    .toHaveLength(1);
  input.dispose();
});
