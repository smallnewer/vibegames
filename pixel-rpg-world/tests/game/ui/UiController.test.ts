import { describe, expect, it } from "vitest";
import type { Command } from "../../../game/core/Command";
import type { UiPage } from "../../../game/ui/UiState";
import { UiController, type UiControllerModel } from "../../../game/ui/UiController";

const PAGES: readonly UiPage[] = ["inventory", "skills", "character", "forge", "system"];

function model(itemIds = [41, 42, 43]): UiControllerModel {
  const focus = Object.fromEntries(PAGES.map((page) => {
    const cells = page === "inventory"
      ? itemIds.map((id, index) => ({
          id: `inventory:item:${id}`,
          row: 0,
          column: index,
          enabled: true,
          group: page,
        }))
      : [{
          id: `${page}:first`,
          row: 0,
          column: 0,
          enabled: true,
          group: page,
        }];
    return [page, cells];
  })) as unknown as UiControllerModel["focus"];
  const allocate: Command = { type: "allocate_attribute", actor: 1, attribute: "might", amount: 1 };
  return {
    heroes: [1, 2],
    focus,
    actions: {
      "character:first": { confirm: [allocate] },
      "inventory:item:41": {
        dialog: "salvage",
        dialogCommands: [{ type: "salvage_item", actor: 1, item: 41 }],
        secondaryLocal: { type: "toggle_inventory_compare", item: 41 },
      },
      "skills:first": {
        confirmLocal: { type: "select_skill", ability: "ability.ember_nova" },
      },
      "skill-slot:skill_up": {
        confirm: [{
          type: "equip_ability",
          actor: 1,
          ability: "ability.ember_nova",
          slot: "skill_up",
        }],
        confirmLocal: { type: "clear_skill_selection" },
      },
      "forge:first": {
        confirm: [{ type: "reinforce_item", actor: 1, item: 41 }],
        confirmLocal: { type: "mark_forge_pending", item: 41 },
      },
      "system:first": {
        confirmExternal: { type: "toggle_reduced_flash" },
        secondaryExternal: { type: "adjust_hud_scale", direction: -1 },
      },
    },
  };
}

describe("UiController", () => {
  it("opens, pauses globally by state, closes with B and keeps the current page", () => {
    const controller = new UiController();
    expect(controller.handle({ type: "open" }, model()).state).toMatchObject({
      open: true,
      page: "inventory",
      focusId: "inventory:item:41",
    });
    controller.handle({ type: "next_page" }, model());
    expect(controller.state.page).toBe("skills");
    expect(controller.handle({ type: "back" }, model()).state.open).toBe(false);
    expect(controller.handle({ type: "open" }, model()).state.page).toBe("skills");
  });

  it("wraps pages and heroes while restoring their semantic focus", () => {
    const controller = new UiController();
    controller.handle({ type: "open" }, model());
    controller.handle({ type: "previous_page" }, model());
    expect(controller.state.page).toBe("system");
    controller.handle({ type: "next_page" }, model());
    expect(controller.state.page).toBe("inventory");
    controller.handle({ type: "move_focus", x: 1, y: 0 }, model());
    expect(controller.state.focusId).toBe("inventory:item:42");
    controller.handle({ type: "next_hero" }, model());
    expect(controller.state).toMatchObject({ hero: 2, focusId: "inventory:item:41" });
    controller.handle({ type: "previous_hero" }, model());
    expect(controller.state).toMatchObject({ hero: 1, focusId: "inventory:item:42" });
  });

  it("restores nearest focus when the selected item disappears", () => {
    const controller = new UiController();
    controller.handle({ type: "open" }, model());
    controller.handle({ type: "move_focus", x: 1, y: 0 }, model());
    expect(controller.state.focusId).toBe("inventory:item:42");
    controller.handle({ type: "move_focus", x: 0, y: 0 }, model([41, 43]));
    expect(controller.state.focusId).toBe("inventory:item:43");
  });

  it("returns commands without mutating models and protects destructive dialogs", () => {
    const controller = new UiController();
    const value = model();
    controller.handle({ type: "open" }, value);
    expect(controller.handle({ type: "confirm" }, value)).toMatchObject({
      state: { dialog: "salvage", dialogFocus: "cancel" },
      commands: [],
    });
    expect(controller.handle({ type: "confirm" }, value).commands).toEqual([]);
    controller.handle({ type: "confirm" }, value);
    controller.handle({ type: "move_focus", x: 1, y: 0 }, value);
    expect(controller.handle({ type: "confirm" }, value).commands).toEqual([
      { type: "salvage_item", actor: 1, item: 41 },
    ]);

    controller.handle({ type: "next_page" }, value);
    controller.handle({ type: "next_page" }, value);
    expect(controller.handle({ type: "confirm" }, value).commands).toEqual([
      { type: "allocate_attribute", actor: 1, attribute: "might", amount: 1 },
    ]);
  });

  it("keeps comparison mode as local UI state without emitting a core command", () => {
    const controller = new UiController();
    const value = model();
    controller.handle({ type: "open" }, value);
    expect(controller.handle({ type: "secondary" }, value)).toMatchObject({
      state: { inventoryCompareId: 41 },
      commands: [],
    });
    expect(controller.handle({ type: "secondary" }, value).state.inventoryCompareId)
      .toBeUndefined();
  });

  it("uses B to cancel a two-stage skill selection before closing the menu", () => {
    const controller = new UiController();
    const value = model();
    controller.handle({ type: "open" }, value);
    controller.handle({ type: "next_page" }, value);
    expect(controller.handle({ type: "confirm" }, value).state).toMatchObject({
      open: true,
      skillSelection: "ability.ember_nova",
      focusId: "skill-slot:skill_up",
    });
    expect(controller.handle({ type: "back" }, value).state).toMatchObject({
      open: true,
      focusId: "skill:ability.ember_nova",
    });
  });

  it("holds a forge confirmation until the core result event arrives", () => {
    const controller = new UiController();
    const value = model();
    controller.handle({ type: "open" }, value);
    controller.handle({ type: "next_page" }, value);
    controller.handle({ type: "next_page" }, value);
    controller.handle({ type: "next_page" }, value);
    expect(controller.handle({ type: "confirm" }, value)).toMatchObject({
      state: { forgePendingItem: 41 },
      commands: [{ type: "reinforce_item", actor: 1, item: 41 }],
    });
    controller.observeGameplayEvents([{ type: "item_reinforced", actor: 1, item: 41, level: 1 }]);
    expect(controller.state.forgePendingItem).toBeUndefined();
  });

  it("returns system actions without coupling the UI state to browser services", () => {
    const controller = new UiController();
    const value = model();
    controller.handle({ type: "open" }, value);
    controller.handle({ type: "previous_page" }, value);
    expect(controller.handle({ type: "confirm" }, value).externalActions).toEqual([
      { type: "toggle_reduced_flash" },
    ]);
    expect(controller.handle({ type: "secondary" }, value).externalActions).toEqual([
      { type: "adjust_hud_scale", direction: -1 },
    ]);
  });
});
