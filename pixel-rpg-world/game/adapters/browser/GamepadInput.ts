import type { Command } from "../../core/Command";
import type { GameSnapshot } from "../../core/GameSnapshot";
import type { PlayerSlotId } from "../../player/PlayerSlot";
import { contextActionCommands } from "./InputCommands";
import type { InputContext, UiInput } from "./InputContext";

export type GamepadReader = () => readonly (Gamepad | null)[];

const DEAD_ZONE = 0.2;

export class GamepadInput {
  private heldButtons = new Set<number>();
  private blockedButtons = new Set<number>();
  private aimX = 1;
  private aimZ = 0;
  private context: InputContext = "gameplay";
  private readonly uiInputs: UiInput[] = [];
  private menuSecondaryChordUsed = false;

  constructor(
    private readonly slot: PlayerSlotId,
    private readonly gamepadIndex: number,
    private readonly readGamepads: GamepadReader = () => navigator.getGamepads(),
  ) {}

  setContext(context: InputContext): void {
    if (context === this.context) return;
    this.context = context;
    this.blockedButtons = new Set(this.heldButtons);
    this.menuSecondaryChordUsed = this.heldButtons.has(2);
    this.uiInputs.length = 0;
  }

  takeUiInputs(): readonly UiInput[] {
    return this.uiInputs.splice(0);
  }

  // 手柄只映射为 Command；缺失手柄不会占用或影响其他玩家槽。
  sample(snapshot: GameSnapshot): Command[] {
    const player = snapshot.players.find((candidate) => candidate.slot === this.slot);
    const gamepad = this.readGamepads()[this.gamepadIndex];
    if (!player || !gamepad?.connected) {
      this.heldButtons.clear();
      this.blockedButtons.clear();
      return [];
    }

    const actor = snapshot.actors.find((candidate) => candidate.id === player.actor);
    if (!actor) return [];
    const rawX = gamepad.axes[0] ?? 0;
    const rawZ = gamepad.axes[1] ?? 0;
    const length = Math.hypot(rawX, rawZ);
    const moveX = length > DEAD_ZONE ? rawX / length : 0;
    const moveZ = length > DEAD_ZONE ? rawZ / length : 0;
    if (moveX !== 0 || moveZ !== 0) {
      this.aimX = moveX;
      this.aimZ = moveZ;
    }

    const currentButtons = new Set<number>();
    gamepad.buttons.forEach((button, index) => {
      if (button.pressed || button.value >= 0.5) currentButtons.add(index);
    });
    for (const button of this.blockedButtons) {
      if (!currentButtons.has(button)) this.blockedButtons.delete(button);
    }
    const active = (index: number) => (
      currentButtons.has(index) && !this.blockedButtons.has(index)
    );
    const pressed = (index: number) => (
      active(index) && !this.heldButtons.has(index)
    );

    if (this.context === "menu") {
      if (pressed(1) || pressed(9)) this.uiInputs.push({ type: "back" });
      if (pressed(0)) {
        if (active(2)) {
          this.menuSecondaryChordUsed = true;
          this.uiInputs.push({ type: "secondary" });
        } else {
          this.uiInputs.push({ type: "confirm" });
        }
      }
      if (this.heldButtons.has(2) && !currentButtons.has(2)) {
        if (!this.menuSecondaryChordUsed) this.uiInputs.push({ type: "secondary" });
        this.menuSecondaryChordUsed = false;
      }
      if (pressed(3)) this.uiInputs.push({ type: "favorite" });
      if (pressed(4)) this.uiInputs.push({ type: "previous_page" });
      if (pressed(5)) this.uiInputs.push({ type: "next_page" });
      if (pressed(6)) this.uiInputs.push({ type: "previous_hero" });
      if (pressed(7)) this.uiInputs.push({ type: "next_hero" });
      for (const [button, x, y] of [
        [12, 0, -1],
        [15, 1, 0],
        [13, 0, 1],
        [14, -1, 0],
      ] as const) {
        if (pressed(button)) this.uiInputs.push({ type: "move_focus", x, y });
      }
      this.heldButtons = currentButtons;
      return [];
    }

    const commands: Command[] = [
      { type: "move", actor: player.actor, x: moveX, z: moveZ },
    ];
    if (pressed(9)) this.uiInputs.push({ type: "open" });
    if (pressed(0)) {
      commands.push({ type: "roll", actor: player.actor, x: this.aimX, z: this.aimZ });
    }
    if (pressed(2)) {
      commands.push({
        type: "cast",
        actor: player.actor,
        slot: "melee",
        aimX: actor.x + this.aimX * 10,
        aimZ: actor.z + this.aimZ * 10,
      });
    }
    if (pressed(3)) {
      commands.push({
        type: "cast",
        actor: player.actor,
        slot: "ranged",
        aimX: actor.x + this.aimX * 10,
        aimZ: actor.z + this.aimZ * 10,
      });
    }
    commands.push(...contextActionCommands(
      snapshot,
      player.actor,
      pressed(1),
      active(1),
    ));
    // 方向键与 HUD 的上/右/下/左四技能一一对应。
    for (const [button, slot] of [
      [12, "skill_up"],
      [15, "skill_right"],
      [13, "skill_down"],
      [14, "skill_left"],
    ] as const) {
      if (pressed(button) && player.progress.abilities[slot].id) {
        commands.push({
          type: "cast",
          actor: player.actor,
          slot,
          aimX: actor.x + this.aimX * 10,
          aimZ: actor.z + this.aimZ * 10,
        });
      }
    }
    this.heldButtons = currentButtons;
    return commands;
  }
}
