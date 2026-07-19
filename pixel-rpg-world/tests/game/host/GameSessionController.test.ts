import { describe, expect, it, vi } from "vitest";
import { MemorySaveRepository } from "../../../game/adapters/browser/MemorySaveRepository";
import { GameSimulation } from "../../../game/core/GameSimulation";
import type { GameplayEvent } from "../../../game/core/GameplayEvent";
import { GameSessionController } from "../../../game/host/GameSessionController";
import { decodeSave, encodeSave } from "../../../game/save/SaveCodec";
import { createDefaultSave } from "../../../game/save/SaveProfile";
import type { SaveRepository } from "../../../game/save/SaveRepository";

const CHANGE_EVENT: GameplayEvent = {
  type: "item_favorite_changed",
  actor: 1,
  item: 1,
  favorite: true,
};

class DelayedRepository implements SaveRepository {
  payload: unknown;
  readonly pending: { value: string; resolve: () => void }[] = [];

  constructor(payload: unknown) {
    this.payload = payload;
  }

  async load(): Promise<unknown> {
    return this.payload;
  }

  save(encoded: string): Promise<void> {
    return new Promise((resolve) => {
      this.pending.push({
        value: encoded,
        resolve: () => {
          this.payload = encoded;
          resolve();
        },
      });
    });
  }

  async preserveCorrupt(): Promise<void> {}
}

describe("GameSessionController", () => {
  it("loads before route entry and creates a default profile only when missing", async () => {
    const repository = new MemorySaveRepository();
    const controller = new GameSessionController(repository, () => 100);
    await expect(controller.start()).resolves.toMatchObject({ mode: "route", saveStatus: "saved" });
    const decoded = decodeSave(await repository.load());
    expect(decoded.ok).toBe(true);
    expect(controller.heroSaves(2)).toHaveLength(2);
  });

  it("preserves corrupt payloads and does not silently overwrite them", async () => {
    const repository = new MemorySaveRepository();
    await repository.save("broken-json");
    const controller = new GameSessionController(repository, () => 222);
    await controller.start();
    expect(controller.state).toMatchObject({ mode: "route", saveStatus: "error" });
    expect(repository.corruptEntries().get("corrupt:222")).toBe("broken-json");
    expect(await repository.load()).toBe("broken-json");
  });

  it("hydrates both heroes before constructing a dungeon simulation", async () => {
    const repository = new MemorySaveRepository();
    const base = createDefaultSave(1);
    const profile = {
      ...base,
      heroes: {
        ...base.heroes,
        hero_1: { ...base.heroes.hero_1, level: 7, experience: 44 },
        hero_2: { ...base.heroes.hero_2, level: 4, experience: 21 },
      },
    };
    await repository.save(encodeSave(profile));
    const controller = new GameSessionController(repository, () => 2);
    await controller.start();
    const snapshot = new GameSimulation({
      playerCount: 2,
      heroSaves: controller.heroSaves(2),
      runSeed: 3,
    }).snapshot();
    expect(snapshot.players.map((player) => [player.progress.level, player.progress.experience]))
      .toEqual([[7, 44], [4, 21]]);
  });

  it("debounces persistent gameplay events for one second", async () => {
    vi.useFakeTimers();
    const repository = new MemorySaveRepository();
    const controller = new GameSessionController(repository, () => 500);
    await controller.start();
    controller.captureSnapshot(new GameSimulation({ runSeed: 8 }).snapshot(), [CHANGE_EVENT]);
    expect(controller.state.saveStatus).toBe("saving");
    await vi.advanceTimersByTimeAsync(999);
    expect(controller.state.saveStatus).toBe("saving");
    await vi.advanceTimersByTimeAsync(1);
    expect(controller.state.saveStatus).toBe("saved");
    vi.useRealTimers();
  });

  it("persists accessibility settings through the same debounced queue", async () => {
    vi.useFakeTimers();
    const repository = new MemorySaveRepository();
    const controller = new GameSessionController(repository, () => 700);
    await controller.start();
    controller.updateSettings({
      hudScale: 1.15,
      reducedFlash: true,
      screenShake: 0.5,
      damageNumbers: true,
    });
    expect(controller.state.saveStatus).toBe("saving");
    await vi.advanceTimersByTimeAsync(1_000);
    const decoded = decodeSave(await repository.load());
    expect(decoded.ok && decoded.value.settings).toEqual({
      hudScale: 1.15,
      reducedFlash: true,
      screenShake: 0.5,
      damageNumbers: true,
    });
    vi.useRealTimers();
  });

  it("serializes writes so an older completion cannot overwrite a newer profile", async () => {
    const repository = new DelayedRepository(encodeSave(createDefaultSave(1)));
    const controller = new GameSessionController(repository, () => 10);
    await controller.start();
    const first = new GameSimulation({ runSeed: 1 }).snapshot();
    controller.captureSnapshot(first, [CHANGE_EVENT]);
    const firstFlush = controller.flush();
    await vi.waitFor(() => expect(repository.pending).toHaveLength(1));

    const firstPlayer = first.players[0];
    const progress = { ...firstPlayer.progress, level: 2 };
    const newer = {
      ...first,
      players: [{ ...firstPlayer, progress }],
      progress,
    };
    controller.captureSnapshot(newer, [CHANGE_EVENT]);
    const secondFlush = controller.flush();
    expect(repository.pending).toHaveLength(1);
    repository.pending[0].resolve();
    await firstFlush;
    await vi.waitFor(() => expect(repository.pending).toHaveLength(2));
    repository.pending[1].resolve();
    await secondFlush;
    const decoded = decodeSave(repository.payload);
    expect(decoded.ok && decoded.value.heroes.hero_1.level).toBe(2);
  });
});
