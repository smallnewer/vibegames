import type { Command } from "../../core/Command";
import type { GameSnapshot } from "../../core/GameSnapshot";
import { G30Input, type G30StateReaders } from "./G30Input";
import { GamepadInput, type GamepadReader } from "./GamepadInput";
import { KeyboardInput } from "./KeyboardInput";
import type { InputContext, UiInput } from "./InputContext";

function coalesceMoves(commands: readonly Command[]): Command[] {
  const result: Command[] = [];
  const moveIndexByActor = new Map<number, number>();
  for (const command of commands) {
    if (command.type !== "move") {
      result.push(command);
      continue;
    }
    const existingIndex = moveIndexByActor.get(command.actor);
    if (existingIndex === undefined) {
      moveIndexByActor.set(command.actor, result.length);
      result.push(command);
      continue;
    }
    const existing = result[existingIndex];
    if (
      existing?.type === "move"
      && existing.x === 0
      && existing.z === 0
      && (command.x !== 0 || command.z !== 0)
    ) {
      result[existingIndex] = command;
    }
  }
  return result;
}

export class LocalInput {
  private readonly keyboard: KeyboardInput;
  private readonly g30s: readonly G30Input[];
  private readonly gamepads: readonly GamepadInput[];

  constructor(
    target: EventTarget = window,
    readGamepads: GamepadReader = () => navigator.getGamepads(),
    readG30States: G30StateReaders = [() => null, () => null],
  ) {
    this.keyboard = new KeyboardInput(target);
    this.g30s = [
      new G30Input(readG30States[0], 1),
      new G30Input(readG30States[1], 2),
    ];
    this.gamepads = [
      new GamepadInput(2, 0, readGamepads),
      new GamepadInput(3, 1, readGamepads),
      new GamepadInput(4, 2, readGamepads),
    ];
  }

  // 顺序固定为玩家 1 到 4，避免同帧交互结果受设备轮询顺序影响。
  sample(snapshot: GameSnapshot): Command[] {
    return coalesceMoves([
      ...this.keyboard.sample(snapshot),
      ...this.g30s.flatMap((g30) => g30.sample(snapshot)),
      ...this.gamepads.flatMap((gamepad) => gamepad.sample(snapshot)),
    ]);
  }

  setContext(context: InputContext): void {
    this.keyboard.setContext(context);
    for (const g30 of this.g30s) g30.setContext(context);
    for (const gamepad of this.gamepads) gamepad.setContext(context);
  }

  takeUiInputs(): readonly UiInput[] {
    return [
      ...this.keyboard.takeUiInputs(),
      ...this.g30s.flatMap((g30) => g30.takeUiInputs()),
      ...this.gamepads.flatMap((gamepad) => gamepad.takeUiInputs()),
    ];
  }

  dispose(): void {
    this.keyboard.dispose();
  }
}
