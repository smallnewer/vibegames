import type { Command } from "../core/Command";
import type { PlayerSlotId } from "../player/PlayerSlot";
import { firstEnabled, moveFocus, restoreFocus, type FocusCell } from "./FocusGrid";
import type { UiInput } from "./UiInput";
import { UI_PAGES, type UiDialog, type UiPage, type UiState } from "./UiState";
import type { InventorySortMode, InventoryView } from "./InventoryPageModel";
import type { SystemAction } from "./SystemPageModel";

export type UiLocalAction =
  | { readonly type: "set_inventory_sort"; readonly sort: InventorySortMode }
  | { readonly type: "set_inventory_view"; readonly view: InventoryView }
  | { readonly type: "toggle_inventory_compare"; readonly item: number }
  | { readonly type: "select_skill"; readonly ability: string }
  | { readonly type: "clear_skill_selection" }
  | { readonly type: "mark_forge_pending"; readonly item: number };

export interface UiActionBinding {
  readonly confirm?: readonly Command[];
  readonly secondary?: readonly Command[];
  readonly favorite?: readonly Command[];
  readonly confirmLocal?: UiLocalAction;
  readonly secondaryLocal?: UiLocalAction;
  readonly favoriteLocal?: UiLocalAction;
  readonly confirmExternal?: SystemAction;
  readonly secondaryExternal?: SystemAction;
  readonly dialog?: UiDialog;
  readonly dialogCommands?: readonly Command[];
  readonly dialogMessage?: string;
  readonly secondaryDialog?: UiDialog;
  readonly secondaryDialogCommands?: readonly Command[];
  readonly secondaryDialogMessage?: string;
}

export interface UiControllerModel {
  readonly heroes: readonly PlayerSlotId[];
  readonly focus: Readonly<Record<UiPage, readonly FocusCell[]>>;
  readonly actions?: Readonly<Record<string, UiActionBinding>>;
}

export interface UiTransition {
  readonly state: UiState;
  readonly commands: readonly Command[];
  readonly externalActions?: readonly SystemAction[];
}

function blankFocus(): Record<UiPage, readonly FocusCell[]> {
  return {
    inventory: [],
    skills: [],
    character: [],
    forge: [],
    system: [],
  };
}

export function emptyUiModel(heroes: readonly PlayerSlotId[] = [1]): UiControllerModel {
  return { heroes, focus: blankFocus() };
}

export class UiController {
  private stateValue: UiState = {
    open: false,
    page: "inventory",
    hero: 1,
    focusId: "",
    inventorySort: "newest",
    inventoryView: "items",
  };
  private readonly rememberedFocus = new Map<string, { id: string; cell?: FocusCell }>();
  private dialogCommands: readonly Command[] = [];

  get state(): UiState {
    return this.stateValue;
  }

  observeGameplayEvents(events: readonly import("../core/GameplayEvent").GameplayEvent[]): void {
    for (const event of events) {
      if (
        (event.type === "item_reinforced" || event.type === "forge_rejected")
        && event.item === this.stateValue.forgePendingItem
      ) {
        this.stateValue = { ...this.stateValue, forgePendingItem: undefined };
      }
    }
  }

  handle(input: UiInput, model: UiControllerModel): UiTransition {
    this.reconcile(model);
    if (!this.stateValue.open) {
      if (input.type === "open") this.open(model);
      return { state: this.stateValue, commands: [] };
    }
    if (this.stateValue.dialog) return this.handleDialog(input);
    if (input.type === "close") return this.close();
    if (input.type === "back") {
      if (this.stateValue.page === "skills" && this.stateValue.skillSelection) {
        this.applyLocal({ type: "clear_skill_selection" });
        return { state: this.stateValue, commands: [] };
      }
      return this.close();
    }
    if (input.type === "next_page" || input.type === "previous_page") {
      this.changePage(input.type === "next_page" ? 1 : -1, model);
      return { state: this.stateValue, commands: [] };
    }
    if (input.type === "select_page") {
      if (input.page !== this.stateValue.page) {
        this.remember();
        this.stateValue = {
          ...this.stateValue,
          page: input.page,
          focusId: "",
          skillSelection: undefined,
        };
        this.restore(model);
      }
      return { state: this.stateValue, commands: [] };
    }
    if (input.type === "next_hero" || input.type === "previous_hero") {
      this.changeHero(input.type === "next_hero" ? 1 : -1, model);
      return { state: this.stateValue, commands: [] };
    }
    if (input.type === "move_focus") {
      const focusId = moveFocus(
        model.focus[this.stateValue.page],
        this.stateValue.focusId,
        input.x,
        input.y,
      );
      this.setFocus(focusId, model);
      return { state: this.stateValue, commands: [] };
    }
    if (input.type === "select_focus") {
      const exists = model.focus[this.stateValue.page].some((cell) => (
        cell.id === input.id && cell.enabled
      ));
      if (exists) this.setFocus(input.id, model);
      return { state: this.stateValue, commands: [] };
    }
    const binding = model.actions?.[this.stateValue.focusId];
    if (input.type === "confirm" && binding?.dialog) {
      this.openDialog(binding.dialog, binding.dialogCommands, binding.dialogMessage);
      return { state: this.stateValue, commands: [] };
    }
    if (input.type === "secondary" && binding?.secondaryDialog) {
      this.openDialog(
        binding.secondaryDialog,
        binding.secondaryDialogCommands,
        binding.secondaryDialogMessage,
      );
      return { state: this.stateValue, commands: [] };
    }
    const commands = input.type === "confirm"
      ? binding?.confirm
      : input.type === "secondary"
        ? binding?.secondary
        : input.type === "favorite"
          ? binding?.favorite
          : undefined;
    const local = input.type === "confirm"
      ? binding?.confirmLocal
      : input.type === "secondary"
        ? binding?.secondaryLocal
        : input.type === "favorite"
          ? binding?.favoriteLocal
          : undefined;
    const external = input.type === "confirm"
      ? binding?.confirmExternal
      : input.type === "secondary"
        ? binding?.secondaryExternal
        : undefined;
    if (local) this.applyLocal(local);
    return {
      state: this.stateValue,
      commands: commands ?? [],
      externalActions: external ? [external] : undefined,
    };
  }

  private open(model: UiControllerModel): void {
    const hero = model.heroes.includes(this.stateValue.hero)
      ? this.stateValue.hero
      : model.heroes[0] ?? 1;
    this.stateValue = { ...this.stateValue, open: true, hero };
    this.restore(model);
  }

  private close(): UiTransition {
    this.remember();
    this.stateValue = {
      ...this.stateValue,
      open: false,
      dialog: undefined,
      dialogFocus: undefined,
      dialogMessage: undefined,
      skillSelection: undefined,
    };
    this.dialogCommands = [];
    return { state: this.stateValue, commands: [] };
  }

  private handleDialog(input: UiInput): UiTransition {
    if (input.type === "back" || input.type === "close") {
      this.stateValue = {
        ...this.stateValue,
        dialog: undefined,
        dialogFocus: undefined,
        dialogMessage: undefined,
      };
      this.dialogCommands = [];
      return { state: this.stateValue, commands: [] };
    }
    if (input.type === "move_focus" && input.x !== 0) {
      this.stateValue = {
        ...this.stateValue,
        dialogFocus: input.x > 0 ? "confirm" : "cancel",
      };
      return { state: this.stateValue, commands: [] };
    }
    if (input.type !== "confirm") return { state: this.stateValue, commands: [] };
    if (this.stateValue.dialogFocus !== "confirm") {
      this.stateValue = {
        ...this.stateValue,
        dialog: undefined,
        dialogFocus: undefined,
        dialogMessage: undefined,
      };
      this.dialogCommands = [];
      return { state: this.stateValue, commands: [] };
    }
    const commands = this.dialogCommands;
    this.dialogCommands = [];
    this.stateValue = {
      ...this.stateValue,
      dialog: undefined,
      dialogFocus: undefined,
      dialogMessage: undefined,
    };
    return { state: this.stateValue, commands };
  }

  private changePage(direction: 1 | -1, model: UiControllerModel): void {
    this.remember();
    const current = UI_PAGES.indexOf(this.stateValue.page);
    const page = UI_PAGES[(current + direction + UI_PAGES.length) % UI_PAGES.length];
    this.stateValue = { ...this.stateValue, page, focusId: "", skillSelection: undefined };
    this.restore(model);
  }

  private changeHero(direction: 1 | -1, model: UiControllerModel): void {
    if (model.heroes.length === 0) return;
    this.remember();
    const current = Math.max(0, model.heroes.indexOf(this.stateValue.hero));
    const hero = model.heroes[(current + direction + model.heroes.length) % model.heroes.length];
    this.stateValue = { ...this.stateValue, hero, focusId: "", skillSelection: undefined };
    this.restore(model);
  }

  private reconcile(model: UiControllerModel): void {
    if (!model.heroes.includes(this.stateValue.hero) && model.heroes[0]) {
      this.stateValue = { ...this.stateValue, hero: model.heroes[0] };
    }
    if (!this.stateValue.open) return;
    const cells = model.focus[this.stateValue.page];
    const remembered = this.rememberedFocus.get(this.memoryKey());
    const current = cells.find((cell) => cell.id === this.stateValue.focusId);
    const focusId = restoreFocus(cells, this.stateValue.focusId, current ?? remembered?.cell);
    if (focusId !== this.stateValue.focusId) this.stateValue = { ...this.stateValue, focusId };
  }

  private restore(model: UiControllerModel): void {
    const cells = model.focus[this.stateValue.page];
    const remembered = this.rememberedFocus.get(this.memoryKey());
    const focusId = restoreFocus(cells, remembered?.id ?? "", remembered?.cell)
      || firstEnabled(cells)?.id
      || "";
    this.stateValue = { ...this.stateValue, focusId };
  }

  private setFocus(focusId: string, model: UiControllerModel): void {
    this.stateValue = { ...this.stateValue, focusId };
    const cell = model.focus[this.stateValue.page].find((value) => value.id === focusId);
    this.rememberedFocus.set(this.memoryKey(), { id: focusId, cell });
  }

  private remember(): void {
    this.rememberedFocus.set(this.memoryKey(), { id: this.stateValue.focusId });
  }

  private memoryKey(): string {
    return `${this.stateValue.hero}:${this.stateValue.page}`;
  }

  private applyLocal(action: UiLocalAction): void {
    if (action.type === "set_inventory_sort") {
      this.stateValue = { ...this.stateValue, inventorySort: action.sort };
    }
    if (action.type === "set_inventory_view") {
      this.stateValue = {
        ...this.stateValue,
        inventoryView: action.view,
        inventoryCompareId: undefined,
      };
    }
    if (action.type === "toggle_inventory_compare") {
      this.stateValue = {
        ...this.stateValue,
        inventoryCompareId: this.stateValue.inventoryCompareId === action.item
          ? undefined
          : action.item,
      };
    }
    if (action.type === "select_skill") {
      this.stateValue = {
        ...this.stateValue,
        skillSelection: action.ability,
        focusId: "skill-slot:skill_up",
      };
    }
    if (action.type === "clear_skill_selection") {
      const selected = this.stateValue.skillSelection;
      this.stateValue = {
        ...this.stateValue,
        skillSelection: undefined,
        focusId: selected ? `skill:${selected}` : this.stateValue.focusId,
      };
    }
    if (action.type === "mark_forge_pending") {
      this.stateValue = { ...this.stateValue, forgePendingItem: action.item };
    }
  }

  private openDialog(
    dialog: UiDialog,
    commands: readonly Command[] | undefined,
    message: string | undefined,
  ): void {
    this.dialogCommands = commands ?? [];
    this.stateValue = {
      ...this.stateValue,
      dialog,
      dialogFocus: "cancel",
      dialogMessage: message,
    };
  }
}
