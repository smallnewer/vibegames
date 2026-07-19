import type { Command } from "../../core/Command";
import type { GameSnapshot } from "../../core/GameSnapshot";
import { contextActionCommands } from "./InputCommands";
import type { InputContext, UiInput } from "./InputContext";
import type { G30Button, G30State } from "./G30WebHid";
import type { PlayerSlotId } from "../../player/PlayerSlot";

export type G30StateReader = () => G30State | null;
export type G30StateReaders = readonly [G30StateReader, G30StateReader];

interface Direction {
  readonly x: number;
  readonly z: number;
}

function toWorldDirection(screenX: number, screenUp: number): Direction {
  const worldX = screenX + screenUp;
  const worldZ = screenUp - screenX;
  const length = Math.hypot(worldX, worldZ);
  return length > 0
    ? { x: worldX / length, z: worldZ / length }
    : { x: 0, z: 0 };
}

export class G30Input {
  private heldButtons = new Set<G30Button>();
  private blockedButtons = new Set<G30Button>();
  private aimX = 1;
  private aimZ = 0;
  private context: InputContext = "gameplay";
  private menuChordHeld = false;
  private readonly uiInputs: UiInput[] = [];
  private menuSecondaryChordUsed = false;

  constructor(
    private readonly readState: G30StateReader,
    private readonly slot: PlayerSlotId = 1,
  ) {}

  setContext(context: InputContext): void {
    if (context === this.context) return;
    this.context = context;
    this.blockedButtons = new Set(this.heldButtons);
    this.menuSecondaryChordUsed = this.heldButtons.has("x");
    this.uiInputs.length = 0;
  }

  takeUiInputs(): readonly UiInput[] {
    return this.uiInputs.splice(0);
  }

  sample(snapshot: GameSnapshot): Command[] {
    const state = this.readState();
    if (!state) {
      this.heldButtons.clear();
      this.blockedButtons.clear();
      return [];
    }

    const player = snapshot.players.find((candidate) => candidate.slot === this.slot);
    if (!player) {
      this.heldButtons.clear();
      this.blockedButtons.clear();
      return [];
    }
    const actorId = player.actor;
    const progress = player.progress;
    const actor = snapshot.actors.find((candidate) => candidate.id === actorId);
    if (!actor) return [];

    const movement = toWorldDirection(state.leftStick.x, state.leftStick.y);
    const rightAim = toWorldDirection(state.rightStick.x, state.rightStick.y);
    if (rightAim.x !== 0 || rightAim.z !== 0) {
      this.aimX = rightAim.x;
      this.aimZ = rightAim.z;
    } else if (movement.x !== 0 || movement.z !== 0) {
      this.aimX = movement.x;
      this.aimZ = movement.z;
    }

    const currentButtons = new Set<G30Button>();
    for (const [button, isPressed] of Object.entries(state.buttons)) {
      if (isPressed) currentButtons.add(button as G30Button);
    }
    for (const button of this.blockedButtons) {
      if (!currentButtons.has(button)) this.blockedButtons.delete(button);
    }
    const active = (button: G30Button) => (
      currentButtons.has(button) && !this.blockedButtons.has(button)
    );
    const pressed = (button: G30Button) => (
      active(button) && !this.heldButtons.has(button)
    );
    const menuChord = active("lb") && active("rb");
    const menuChordPressed = menuChord && !this.menuChordHeld;

    if (this.context === "menu") {
      if (pressed("b") || menuChordPressed) {
        this.uiInputs.push({ type: "back" });
      }
      if (pressed("a")) {
        if (active("x")) {
          this.menuSecondaryChordUsed = true;
          this.uiInputs.push({ type: "secondary" });
        } else {
          this.uiInputs.push({ type: "confirm" });
        }
      }
      if (this.heldButtons.has("x") && !currentButtons.has("x")) {
        if (!this.menuSecondaryChordUsed) this.uiInputs.push({ type: "secondary" });
        this.menuSecondaryChordUsed = false;
      }
      if (pressed("y")) this.uiInputs.push({ type: "favorite" });
      if (!menuChordPressed && pressed("lb")) this.uiInputs.push({ type: "previous_page" });
      if (!menuChordPressed && pressed("rb")) this.uiInputs.push({ type: "next_page" });
      if (pressed("lt")) this.uiInputs.push({ type: "previous_hero" });
      if (pressed("rt")) this.uiInputs.push({ type: "next_hero" });
      for (const [button, x, y] of [
        ["dpadUp", 0, -1],
        ["dpadRight", 1, 0],
        ["dpadDown", 0, 1],
        ["dpadLeft", -1, 0],
      ] as const) {
        if (pressed(button)) this.uiInputs.push({ type: "move_focus", x, y });
      }
      this.heldButtons = currentButtons;
      this.menuChordHeld = menuChord;
      return [];
    }

    const commands: Command[] = [];
    if (menuChordPressed) this.uiInputs.push({ type: "open" });
    if (movement.x !== 0 || movement.z !== 0) {
      commands.push({
        type: "move",
        actor: actorId,
        x: movement.x,
        z: movement.z,
      });
    }
    if (pressed("a")) {
      commands.push({
        type: "roll",
        actor: actorId,
        x: this.aimX,
        z: this.aimZ,
      });
    }
    if (pressed("x")) {
      commands.push({
        type: "cast",
        actor: actorId,
        slot: "melee",
        aimX: actor.x + this.aimX * 10,
        aimZ: actor.z + this.aimZ * 10,
      });
    }
    if (pressed("y")) {
      commands.push({
        type: "cast",
        actor: actorId,
        slot: "ranged",
        aimX: actor.x + this.aimX * 10,
        aimZ: actor.z + this.aimZ * 10,
      });
    }
    commands.push(...contextActionCommands(
      snapshot,
      actorId,
      pressed("b"),
      active("b"),
    ));
    for (const [button, slot] of [
      ["dpadUp", "skill_up"],
      ["dpadRight", "skill_right"],
      ["dpadDown", "skill_down"],
      ["dpadLeft", "skill_left"],
    ] as const) {
      if (pressed(button) && progress.abilities[slot].id) {
        commands.push({
          type: "cast",
          actor: actorId,
          slot,
          aimX: actor.x + this.aimX * 10,
          aimZ: actor.z + this.aimZ * 10,
        });
      }
    }

    this.heldButtons = currentButtons;
    this.menuChordHeld = menuChord;
    return commands;
  }
}
