import type { Command } from "../../core/Command";
import type { GameSnapshot } from "../../core/GameSnapshot";
import { contextActionCommands } from "./InputCommands";
import type { InputContext, UiInput } from "./InputContext";

export class KeyboardInput {
  private readonly held = new Set<string>();
  private readonly pressed = new Set<string>();
  private readonly blocked = new Set<string>();
  private aimX = 1;
  private aimZ = 0;
  private context: InputContext = "gameplay";
  private readonly uiInputs: UiInput[] = [];

  constructor(private readonly target: EventTarget = window) {
    this.target.addEventListener("keydown", this.onKeyDown);
    this.target.addEventListener("keyup", this.onKeyUp);
  }

  private readonly onKeyDown = (source: Event) => {
    const event = source as KeyboardEvent;
    if (!this.held.has(event.code)) this.pressed.add(event.code);
    this.held.add(event.code);
    if (["Space", "KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) {
      event.preventDefault();
    }
  };

  private readonly onKeyUp = (source: Event) => {
    const event = source as KeyboardEvent;
    this.held.delete(event.code);
    this.blocked.delete(event.code);
  };

  setContext(context: InputContext): void {
    if (context === this.context) return;
    this.context = context;
    this.pressed.clear();
    this.blocked.clear();
    for (const code of this.held) this.blocked.add(code);
    this.uiInputs.length = 0;
  }

  takeUiInputs(): readonly UiInput[] {
    return this.uiInputs.splice(0);
  }

  // 持续移动每帧发出，动作键每次按下只消费一次。
  sample(snapshot: GameSnapshot): Command[] {
    if (this.context === "menu") {
      if (this.take("Escape")) this.uiInputs.push({ type: "back" });
      if (this.take("Enter") || this.take("Space")) {
        if (this.held.has("KeyX") && !this.blocked.has("KeyX")) {
          this.pressed.delete("KeyX");
          this.uiInputs.push({ type: "secondary" });
        } else {
          this.uiInputs.push({ type: "confirm" });
        }
      }
      if (this.take("KeyX")) this.uiInputs.push({ type: "secondary" });
      if (this.take("KeyY")) this.uiInputs.push({ type: "favorite" });
      if (this.take("KeyQ")) this.uiInputs.push({ type: "previous_page" });
      if (this.take("KeyE")) this.uiInputs.push({ type: "next_page" });
      if (this.take("KeyZ")) this.uiInputs.push({ type: "previous_hero" });
      if (this.take("KeyC")) this.uiInputs.push({ type: "next_hero" });
      for (const [code, x, y] of [
        ["ArrowUp", 0, -1],
        ["ArrowRight", 1, 0],
        ["ArrowDown", 0, 1],
        ["ArrowLeft", -1, 0],
      ] as const) {
        if (this.take(code)) this.uiInputs.push({ type: "move_focus", x, y });
      }
      return [];
    }
    const hero = snapshot.hero;
    const actor = snapshot.actors.find((candidate) => candidate.id === hero)!;
    const { x, z } = actor;
    const held = (code: string) => this.held.has(code) && !this.blocked.has(code);
    const screenRight = Number(held("KeyD")) - Number(held("KeyA"));
    const screenDown = Number(held("KeyS")) - Number(held("KeyW"));
    // 固定等距镜头朝东北看：把屏幕上下左右换算成世界 X/Z 方向。
    const worldX = screenRight - screenDown;
    const worldZ = -screenRight - screenDown;
    const moveLength = Math.hypot(worldX, worldZ);
    const moveX = moveLength > 0 ? worldX / moveLength : 0;
    const moveZ = moveLength > 0 ? worldZ / moveLength : 0;
    if (moveX !== 0 || moveZ !== 0) {
      this.aimX = moveX;
      this.aimZ = moveZ;
    }
    const commands: Command[] = [{ type: "move", actor: hero, x: moveX, z: moveZ }];
    if (this.take("Escape")) this.uiInputs.push({ type: "open" });
    if (this.take("Space")) {
      commands.push({ type: "roll", actor: hero, x: this.aimX, z: this.aimZ });
    }
    if (this.take("KeyJ")) {
      commands.push({
        type: "cast",
        actor: hero,
        slot: "melee",
        aimX: x + this.aimX * 10,
        aimZ: z + this.aimZ * 10,
      });
    }
    if (this.take("KeyK")) {
      commands.push({
        type: "cast",
        actor: hero,
        slot: "ranged",
        aimX: x + this.aimX * 10,
        aimZ: z + this.aimZ * 10,
      });
    }
    commands.push(...contextActionCommands(
      snapshot,
      hero,
      this.pressed.has("KeyE"),
      held("KeyE"),
    ));
    this.pressed.delete("KeyE");
    // 数字键与手柄方向键顺序一致。装配与强化只在正式 UI 中执行。
    for (const [code, slot] of [
      ["Digit1", "skill_up"],
      ["Digit2", "skill_right"],
      ["Digit3", "skill_down"],
      ["Digit4", "skill_left"],
    ] as const) {
      if (this.take(code) && snapshot.progress.abilities[slot].id) {
        commands.push({
          type: "cast",
          actor: hero,
          slot,
          aimX: x + this.aimX * 10,
          aimZ: z + this.aimZ * 10,
        });
      }
    }
    return commands;
  }

  private take(code: string): boolean {
    const exists = this.pressed.has(code);
    this.pressed.delete(code);
    return exists;
  }

  dispose(): void {
    this.target.removeEventListener("keydown", this.onKeyDown);
    this.target.removeEventListener("keyup", this.onKeyUp);
  }
}
