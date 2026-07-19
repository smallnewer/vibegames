import { expect, it } from "vitest";
import { LocalInput } from "../../../game/adapters/browser/LocalInput";
import type {
  G30Button,
  G30State,
} from "../../../game/adapters/browser/G30WebHid";
import { GameSimulation } from "../../../game/core/GameSimulation";

function key(target: EventTarget, code: string) {
  const event = new Event("keydown", { cancelable: true });
  Object.defineProperty(event, "code", { value: code });
  target.dispatchEvent(event);
}

function attackPad(index: number): Gamepad {
  return {
    axes: [0, 0],
    buttons: Array.from({ length: 8 }, (_, button) => ({
      pressed: button === 2,
      touched: button === 2,
      value: button === 2 ? 1 : 0,
    })),
    connected: true,
    id: `test-pad-${index}`,
    index,
    mapping: "standard",
    timestamp: 0,
  } as Gamepad;
}

function attackingG30(left = { x: 0, y: 0 }): G30State {
  const buttons = Object.fromEntries([
    "dpadUp",
    "dpadDown",
    "dpadLeft",
    "dpadRight",
    "a",
    "b",
    "x",
    "y",
    "lb",
    "lt",
    "rb",
    "rt",
  ].map((button) => [button, button === "x"])) as Record<G30Button, boolean>;
  return {
    buttons,
    leftStick: left,
    rightStick: { x: 0, y: 0 },
  };
}

it("aggregates keyboard, two G30 slots, and three gamepads in player-slot order", () => {
  const target = new EventTarget();
  const pads = [attackPad(0), attackPad(1), attackPad(2)];
  const input = new LocalInput(target, () => pads, [attackingG30, attackingG30]);
  const snapshot = new GameSimulation({ playerCount: 4 }).snapshot();
  key(target, "KeyJ");

  const attacks = input.sample(snapshot).filter((command) => command.type === "cast");
  expect(attacks.map((command) => command.actor)).toEqual(
    [
      snapshot.players[0].actor,
      snapshot.players[0].actor,
      snapshot.players[1].actor,
      snapshot.players[1].actor,
      snapshot.players[2].actor,
      snapshot.players[3].actor,
    ],
  );
  input.dispose();
});

it("keeps one effective move per actor and lets a solo G30 override neutral keyboard", () => {
  const target = new EventTarget();
  const input = new LocalInput(target, () => [], [
    () => attackingG30({ x: 1, y: 0 }),
    () => null,
  ]);
  const snapshot = new GameSimulation({ playerCount: 1 }).snapshot();

  const moves = input.sample(snapshot).filter((command) => command.type === "move");
  expect(moves).toHaveLength(1);
  expect(moves[0]).toMatchObject({ type: "move", actor: snapshot.hero });
  if (moves[0]?.type === "move") {
    expect(moves[0].x).toBeCloseTo(Math.SQRT1_2);
    expect(moves[0].z).toBeCloseTo(-Math.SQRT1_2);
  }
  input.dispose();
});
