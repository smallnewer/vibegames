import { describe, expect, it } from "vitest";
import { moveFocus, restoreFocus, type FocusCell } from "../../../game/ui/FocusGrid";

function grid(width = 6, height = 5): FocusCell[] {
  return Array.from({ length: width * height }, (_, index) => ({
    id: `inventory:item:${index + 1}`,
    row: Math.floor(index / width),
    column: index % width,
    enabled: true,
    group: "inventory",
  }));
}

describe("FocusGrid", () => {
  it("moves without wrapping at 6x5 inventory edges", () => {
    const cells = grid();
    expect(moveFocus(cells, "inventory:item:1", -1, 0)).toBe("inventory:item:1");
    expect(moveFocus(cells, "inventory:item:1", 0, -1)).toBe("inventory:item:1");
    expect(moveFocus(cells, "inventory:item:6", 1, 0)).toBe("inventory:item:6");
    expect(moveFocus(cells, "inventory:item:30", 0, 1)).toBe("inventory:item:30");
  });

  it("skips disabled cells in the requested direction", () => {
    const cells = grid().map((cell) => (
      cell.id === "inventory:item:2" ? { ...cell, enabled: false } : cell
    ));
    expect(moveFocus(cells, "inventory:item:1", 1, 0)).toBe("inventory:item:3");
  });

  it("restores to the nearest semantic cell after an item disappears", () => {
    const before = grid();
    const anchor = before.find((cell) => cell.id === "inventory:item:8")!;
    const after = before.filter((cell) => cell.id !== anchor.id);
    expect(restoreFocus(after, anchor.id, anchor)).toBe("inventory:item:2");
  });
});
