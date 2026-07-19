import { expect, it } from "vitest";
import { GamepadInput } from "../../../game/adapters/browser/GamepadInput";
import { GameSimulation } from "../../../game/core/GameSimulation";

function gamepad(
  axes: readonly number[],
  pressed: readonly number[] = [],
  connected = true,
): Gamepad {
  const buttons = Array.from({ length: 16 }, (_, index) => ({
    pressed: pressed.includes(index),
    touched: pressed.includes(index),
    value: pressed.includes(index) ? 1 : 0,
  }));
  return {
    axes: [...axes],
    buttons,
    connected,
    id: "test-pad",
    index: 0,
    mapping: "standard",
    timestamp: 0,
  } as Gamepad;
}

it("maps one pad to its assigned player with dead zone and edge-triggered actions", () => {
  const snapshot = new GameSimulation({ playerCount: 4 }).snapshot();
  const player = snapshot.players.find((value) => value.slot === 2)!;
  const actor = snapshot.actors.find((value) => value.id === player.actor)!;
  actor.x = -3;
  actor.z = 1;

  let current = gamepad([0.1, 0.1]);
  const input = new GamepadInput(2, 0, () => [current]);
  expect(input.sample(snapshot)).toEqual([
    { type: "move", actor: player.actor, x: 0, z: 0 },
  ]);

  current = gamepad([0.6, 0.8], [0, 1, 2, 3, 7]);
  expect(input.sample(snapshot)).toEqual([
    { type: "move", actor: player.actor, x: 0.6, z: 0.8 },
    { type: "roll", actor: player.actor, x: 0.6, z: 0.8 },
    { type: "cast", actor: player.actor, slot: "melee", aimX: 3, aimZ: 9 },
    { type: "cast", actor: player.actor, slot: "ranged", aimX: 3, aimZ: 9 },
    {
      type: "interact",
      actor: player.actor,
      target: snapshot.interactions.find((value) => value.kind === "harvest")!.id,
    },
  ]);
  expect(input.sample(snapshot)).toEqual([
    { type: "move", actor: player.actor, x: 0.6, z: 0.8 },
  ]);

  current = gamepad([0, 0]);
  input.sample(snapshot);
  current = gamepad([1, 0], [0]);
  expect(input.sample(snapshot).filter((command) => command.type === "roll")).toHaveLength(1);
});

it("maps Y to ranged and the four d-pad directions to the four skill slots", () => {
  const snapshot = new GameSimulation({ playerCount: 1 }).snapshot();
  let current = gamepad([1, 0], [3, 7, 12, 15, 13, 14]);
  const input = new GamepadInput(1, 0, () => [current]);

  expect(input.sample(snapshot).filter((command) => command.type === "cast")).toEqual([
    { type: "cast", actor: snapshot.hero, slot: "ranged", aimX: 7, aimZ: 0 },
    { type: "cast", actor: snapshot.hero, slot: "skill_up", aimX: 7, aimZ: 0 },
    { type: "cast", actor: snapshot.hero, slot: "skill_right", aimX: 7, aimZ: 0 },
    { type: "cast", actor: snapshot.hero, slot: "skill_down", aimX: 7, aimZ: 0 },
    { type: "cast", actor: snapshot.hero, slot: "skill_left", aimX: 7, aimZ: 0 },
  ]);

  current = gamepad([1, 0]);
});

it("routes Menu and menu navigation as UI input without gameplay commands", () => {
  const snapshot = new GameSimulation().snapshot();
  let current = gamepad([0, 0], [9]);
  const input = new GamepadInput(1, 0, () => [current]);
  expect(input.sample(snapshot)).toEqual([{ type: "move", actor: snapshot.hero, x: 0, z: 0 }]);
  expect(input.takeUiInputs()).toEqual([{ type: "open" }]);

  input.setContext("menu");
  current = gamepad([1, 0], [12]);
  expect(input.sample(snapshot)).toEqual([]);
  expect(input.takeUiInputs()).toEqual([{ type: "move_focus", x: 0, y: -1 }]);

  current = gamepad([0, 0]);
  input.sample(snapshot);
  current = gamepad([0, 0], [1]);
  expect(input.sample(snapshot)).toEqual([]);
  expect(input.takeUiInputs()).toEqual([{ type: "back" }]);
  input.setContext("gameplay");
  expect(input.sample(snapshot)).toEqual([{ type: "move", actor: snapshot.hero, x: 0, z: 0 }]);
});

it("uses X+A for the menu secondary action and Y for favorite", () => {
  const snapshot = new GameSimulation().snapshot();
  let current = gamepad([0, 0]);
  const input = new GamepadInput(1, 0, () => [current]);
  input.setContext("menu");

  current = gamepad([0, 0], [0, 2, 3]);
  input.sample(snapshot);
  expect(input.takeUiInputs()).toEqual([{ type: "secondary" }, { type: "favorite" }]);
  current = gamepad([0, 0]);
  input.sample(snapshot);
  expect(input.takeUiInputs()).toEqual([]);

  current = gamepad([0, 0], [2]);
  input.sample(snapshot);
  expect(input.takeUiInputs()).toEqual([]);
  current = gamepad([0, 0]);
  input.sample(snapshot);
  expect(input.takeUiInputs()).toEqual([{ type: "secondary" }]);
});

it("holds B to revive before considering a nearby interaction", () => {
  const snapshot = new GameSimulation({ playerCount: 2 }).snapshot();
  const player = snapshot.players[0];
  const downed = snapshot.actors.find((actor) => actor.id === snapshot.players[1].actor)!;
  const rescuer = snapshot.actors.find((actor) => actor.id === player.actor)!;
  downed.lifeState = "downed";
  downed.x = rescuer.x + 0.5;
  downed.z = rescuer.z;
  const input = new GamepadInput(1, 0, () => [gamepad([0, 0], [1])]);

  expect(input.sample(snapshot).filter((command) => command.type !== "move")).toEqual([
    { type: "revive", actor: player.actor, target: downed.id, held: true },
  ]);
  expect(input.sample(snapshot).filter((command) => command.type !== "move")).toEqual([
    { type: "revive", actor: player.actor, target: downed.id, held: true },
  ]);
});

it("emits nothing for a missing or disconnected assigned pad", () => {
  const snapshot = new GameSimulation({ playerCount: 4 }).snapshot();
  let pads: readonly (Gamepad | null)[] = [];
  const input = new GamepadInput(3, 1, () => pads);

  expect(input.sample(snapshot)).toEqual([]);
  pads = [null, gamepad([1, 0], [2], false)];
  expect(input.sample(snapshot)).toEqual([]);
});
