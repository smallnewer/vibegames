import { expect, it } from "vitest";
import { createTrainingDungeonDef } from "../../../game/dungeon/trainingDungeon";

it("defines the fixed harvest, encounter, door, and portal route", () => {
  const definition = createTrainingDungeonDef();
  expect(definition.id).toBe("dungeon.training_ground");
  expect(definition.interactions.map((value) => value.kind).sort()).toEqual([
    "door",
    "encounter",
    "harvest",
    "portal",
  ]);
  expect(definition.interactions.find((value) => value.kind === "portal")!.destination)
    .toEqual({ x: -4, z: -3 });
});
