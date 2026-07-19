import { expect, it } from "vitest";
import { G30Input } from "../../../game/adapters/browser/G30Input";
import type {
  G30Button,
  G30State,
} from "../../../game/adapters/browser/G30WebHid";
import { GameSimulation } from "../../../game/core/GameSimulation";

const BUTTON_NAMES: readonly G30Button[] = [
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
];

function g30({
  pressed = [],
  left = { x: 0, y: 0 },
  right = { x: 0, y: 0 },
}: {
  pressed?: readonly G30Button[];
  left?: { x: number; y: number };
  right?: { x: number; y: number };
} = {}): G30State {
  return {
    buttons: Object.fromEntries(BUTTON_NAMES.map((button) => [
      button,
      pressed.includes(button),
    ])) as Record<G30Button, boolean>,
    leftStick: left,
    rightStick: right,
  };
}

it("stays silent without active G30 movement or state", () => {
  const snapshot = new GameSimulation().snapshot();
  let current: G30State | null = null;
  const input = new G30Input(() => current);

  expect(input.sample(snapshot)).toEqual([]);
  current = g30();
  expect(input.sample(snapshot)).toEqual([]);
});

it("maps G30 movement, right-stick aim, and edge-triggered actions to player one", () => {
  const snapshot = new GameSimulation().snapshot();
  const actor = snapshot.actors.find((candidate) => candidate.id === snapshot.hero)!;
  actor.x = -3;
  actor.z = 1;
  let current = g30({
    pressed: [
      "a",
      "b",
      "x",
      "y",
      "rt",
      "dpadUp",
      "dpadRight",
      "dpadDown",
      "dpadLeft",
    ],
    left: { x: 1, y: 0 },
    right: { x: 0, y: 1 },
  });
  const input = new G30Input(() => current);
  const diagonal = Math.SQRT1_2;
  const aimX = actor.x + diagonal * 10;
  const aimZ = actor.z + diagonal * 10;

  const first = input.sample(snapshot);
  expect(first).toMatchObject([
    { type: "move", actor: snapshot.hero },
    { type: "roll", actor: snapshot.hero },
    { type: "cast", actor: snapshot.hero, slot: "melee" },
    { type: "cast", actor: snapshot.hero, slot: "ranged" },
    {
      type: "interact",
      actor: snapshot.hero,
      target: snapshot.interactions.find((value) => value.kind === "harvest")!.id,
    },
    { type: "cast", actor: snapshot.hero, slot: "skill_up" },
    { type: "cast", actor: snapshot.hero, slot: "skill_right" },
    { type: "cast", actor: snapshot.hero, slot: "skill_down" },
    { type: "cast", actor: snapshot.hero, slot: "skill_left" },
  ]);
  if (first[0]?.type !== "move" || first[1]?.type !== "roll") {
    throw new Error("Expected G30 movement and roll commands first.");
  }
  expect(first[0].x).toBeCloseTo(diagonal);
  expect(first[0].z).toBeCloseTo(-diagonal);
  expect(first[1].x).toBeCloseTo(diagonal);
  expect(first[1].z).toBeCloseTo(diagonal);
  for (const command of [first[2], first[3], first[5], first[6], first[7], first[8]]) {
    if (command?.type !== "cast") throw new Error("Expected a G30 cast command.");
    expect(command.aimX).toBeCloseTo(aimX);
    expect(command.aimZ).toBeCloseTo(aimZ);
  }

  const held = input.sample(snapshot);
  expect(held).toMatchObject([{ type: "move", actor: snapshot.hero }]);
  if (held[0]?.type !== "move") throw new Error("Expected held G30 movement.");
  expect(held[0].x).toBeCloseTo(diagonal);
  expect(held[0].z).toBeCloseTo(-diagonal);

  current = g30();
  input.sample(snapshot);
  current = g30({ pressed: ["a"] });
  const repressed = input.sample(snapshot);
  expect(repressed).toMatchObject([{ type: "roll", actor: snapshot.hero }]);
  if (repressed[0]?.type !== "roll") throw new Error("Expected a repressed roll.");
  expect(repressed[0].x).toBeCloseTo(diagonal);
  expect(repressed[0].z).toBeCloseTo(diagonal);
});

it("keeps two G30 readers fixed to P1 and P2", () => {
  const solo = new GameSimulation({ playerCount: 1 }).snapshot();
  const coop = new GameSimulation({ playerCount: 2 }).snapshot();
  const p1 = new G30Input(
    () => g30({ pressed: ["x"], left: { x: 1, y: 0 } }),
    1,
  );
  const p2 = new G30Input(
    () => g30({ pressed: ["x"], left: { x: -1, y: 0 } }),
    2,
  );

  expect(p1.sample(solo).map((command) => command.actor))
    .toEqual([solo.players[0].actor, solo.players[0].actor]);
  expect(p2.sample(solo)).toEqual([]);
  expect(p1.sample(coop).filter((command) => command.type === "move"))
    .toEqual([expect.objectContaining({ actor: coop.players[0].actor })]);
  expect(p2.sample(coop).filter((command) => command.type === "move"))
    .toEqual([expect.objectContaining({ actor: coop.players[1].actor })]);
});

it("keeps the d-pad reserved for skills when the left stick is neutral", () => {
  const snapshot = new GameSimulation().snapshot();
  const actor = snapshot.actors.find((candidate) => candidate.id === snapshot.hero)!;
  const input = new G30Input(() => g30({ pressed: ["dpadUp"] }));

  const commands = input.sample(snapshot);
  expect(commands).toEqual([{
    type: "cast",
    actor: snapshot.hero,
    slot: "skill_up",
    aimX: actor.x + 10,
    aimZ: actor.z,
  }]);
});

it("opens the menu once on an LB+RB rising chord and emits UI-only menu navigation", () => {
  const snapshot = new GameSimulation().snapshot();
  let current = g30({ pressed: ["lb", "rb"] });
  const input = new G30Input(() => current);

  expect(input.sample(snapshot)).toEqual([]);
  expect(input.takeUiInputs()).toEqual([{ type: "open" }]);
  input.sample(snapshot);
  expect(input.takeUiInputs()).toEqual([]);

  input.setContext("menu");
  current = g30({ pressed: ["dpadRight"] });
  expect(input.sample(snapshot)).toEqual([]);
  expect(input.takeUiInputs()).toEqual([{ type: "move_focus", x: 1, y: 0 }]);
});

it("uses G30 X+A for menu secondary and Y for favorite", () => {
  const snapshot = new GameSimulation().snapshot();
  let current = g30();
  const input = new G30Input(() => current);
  input.setContext("menu");

  current = g30({ pressed: ["x", "a", "y"] });
  input.sample(snapshot);
  expect(input.takeUiInputs()).toEqual([{ type: "secondary" }, { type: "favorite" }]);
  current = g30();
  input.sample(snapshot);
  expect(input.takeUiInputs()).toEqual([]);
});
