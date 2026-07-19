import type { GameplayEvent } from "../core/GameplayEvent";
import type { GameSnapshot } from "../core/GameSnapshot";
import { decodeSave, encodeSave } from "../save/SaveCodec";
import { migrateToLatest } from "../save/Migrations";
import type { SaveRepository } from "../save/SaveRepository";
import {
  createDefaultSave,
  heroSavesForDungeon,
  saveWithSnapshot,
  saveWithWorldProgress,
  worldProgressFromSave,
} from "../save/SaveProfile";
import type { GameSettingsV1, HeroSaveV1, SaveGameV1 } from "../save/SaveSchema";
import {
  applyDungeonClear,
  canEnterWorldNode,
  type DungeonDifficulty,
  type WorldDungeonId,
  type WorldProgress,
} from "../session/WorldProgress";

export type SessionMode = "loading" | "route" | "dungeon";
export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface GameSessionState {
  readonly mode: SessionMode;
  readonly progress: WorldProgress;
  readonly profile: SaveGameV1;
  readonly saveStatus: SaveStatus;
  readonly saveError?: string;
  readonly dungeonId?: string;
  readonly difficulty?: DungeonDifficulty;
  readonly debugRun?: boolean;
}

const PERSISTENT_EVENTS = new Set<GameplayEvent["type"]>([
  "loot_picked_up",
  "item_equipped",
  "ability_equipped",
  "passive_equipped",
  "item_reinforced",
  "item_salvaged",
  "item_recovered",
  "item_favorite_changed",
  "attribute_allocated",
  "attributes_reset",
  "skill_ranked_up",
  "progression_leveled",
  "resource_collected",
  "dungeon_reward_claimed",
  "dungeon_completed",
]);

export class GameSessionController {
  private stateValue: GameSessionState;
  private repository?: SaveRepository;
  private saveTimer?: ReturnType<typeof setTimeout>;
  private writeQueue: Promise<void> = Promise.resolve();
  private profileRevision = 0;
  private lastPersistedRevision = 0;
  private readonly listeners = new Set<(state: GameSessionState) => void>();

  constructor(
    repository?: SaveRepository,
    private readonly now: () => number = Date.now,
  ) {
    this.repository = repository;
    const profile = createDefaultSave(this.now());
    this.stateValue = {
      mode: "loading",
      profile,
      progress: worldProgressFromSave(profile),
      saveStatus: "idle",
    };
  }

  get state(): GameSessionState {
    return this.stateValue;
  }

  setRepository(repository: SaveRepository): void {
    this.repository = repository;
  }

  subscribe(listener: (state: GameSessionState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async start(): Promise<GameSessionState> {
    if (!this.repository) return this.load();
    try {
      const raw = await this.repository.load();
      if (raw === undefined) {
        const profile = createDefaultSave(this.now());
        await this.repository.save(encodeSave(profile));
        return this.setState({
          mode: "route",
          profile,
          progress: worldProgressFromSave(profile),
          saveStatus: "saved",
        });
      }
      const decoded = decodeSave(migrateToLatest(raw));
      if (!decoded.ok) {
        const timestamp = this.now();
        await this.repository.preserveCorrupt(raw, timestamp);
        const profile = createDefaultSave(timestamp);
        return this.setState({
          mode: "route",
          profile,
          progress: worldProgressFromSave(profile),
          saveStatus: "error",
          saveError: `存档损坏，已保留副本（${decoded.issues[0]?.path ?? "$"}）`,
        });
      }
      return this.setState({
        mode: "route",
        profile: decoded.value,
        progress: worldProgressFromSave(decoded.value),
        saveStatus: "saved",
      });
    } catch (error) {
      const profile = createDefaultSave(this.now());
      return this.setState({
        mode: "route",
        profile,
        progress: worldProgressFromSave(profile),
        saveStatus: "error",
        saveError: error instanceof Error ? error.message : "读取存档失败",
      });
    }
  }

  load(progress?: WorldProgress): GameSessionState {
    const source = createDefaultSave(this.now());
    const profile = progress ? saveWithWorldProgress(source, progress, this.now()) : source;
    return this.setState({
      mode: "route",
      profile,
      progress: progress ?? worldProgressFromSave(profile),
      saveStatus: "idle",
    });
  }

  enterDungeon(
    dungeonId: WorldDungeonId,
    difficulty: DungeonDifficulty = "normal",
    options: Readonly<{ debugOverride?: boolean }> = {},
  ): GameSessionState {
    if (!canEnterWorldNode(this.stateValue.progress, dungeonId, options)) return this.stateValue;
    if (difficulty === "echo" && !this.stateValue.progress.echoUnlocked && !options.debugOverride) {
      return this.stateValue;
    }
    return this.setState({
      ...this.stateValue,
      mode: "dungeon",
      dungeonId,
      difficulty,
      debugRun: options.debugOverride === true,
    });
  }

  enterDebugDungeon(dungeonId: string): GameSessionState {
    return this.setState({
      ...this.stateValue,
      mode: "dungeon",
      dungeonId,
      difficulty: "normal",
      debugRun: true,
    });
  }

  captureSnapshot(snapshot: GameSnapshot, events: readonly GameplayEvent[]): GameSessionState {
    if (!events.some((event) => PERSISTENT_EVENTS.has(event.type))) return this.stateValue;
    const profile = saveWithSnapshot(this.stateValue.profile, snapshot, this.now());
    this.profileRevision += 1;
    const state = this.setState({ ...this.stateValue, profile });
    this.scheduleSave();
    return state;
  }

  completeDungeon(dungeonId: WorldDungeonId, difficulty: DungeonDifficulty): GameSessionState {
    const progress = this.stateValue.debugRun
      ? this.stateValue.progress
      : applyDungeonClear(this.stateValue.progress, dungeonId, difficulty);
    const profile = saveWithWorldProgress(this.stateValue.profile, progress, this.now());
    this.profileRevision += 1;
    const state = this.setState({
      ...this.stateValue,
      mode: "route",
      progress,
      profile,
      dungeonId: undefined,
      difficulty: undefined,
      debugRun: undefined,
    });
    void this.flush().catch(() => {});
    return state;
  }

  exitDungeon(): GameSessionState {
    const state = this.setState({
      ...this.stateValue,
      mode: "route",
      dungeonId: undefined,
      difficulty: undefined,
      debugRun: undefined,
    });
    void this.flush().catch(() => {});
    return state;
  }

  heroSaves(playerCount: number): readonly HeroSaveV1[] {
    return heroSavesForDungeon(this.stateValue.profile, playerCount);
  }

  updateSettings(settings: GameSettingsV1): GameSessionState {
    const current = this.stateValue.profile.settings;
    if (
      current.hudScale === settings.hudScale
      && current.reducedFlash === settings.reducedFlash
      && current.screenShake === settings.screenShake
      && current.damageNumbers === settings.damageNumbers
    ) return this.stateValue;
    const profile = {
      ...this.stateValue.profile,
      settings: { ...settings },
      savedAt: this.now(),
    };
    this.profileRevision += 1;
    const state = this.setState({ ...this.stateValue, profile });
    this.scheduleSave();
    return state;
  }

  async flush(): Promise<void> {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = undefined;
    if (this.profileRevision === this.lastPersistedRevision) return;
    if (!this.repository) {
      this.lastPersistedRevision = this.profileRevision;
      this.setState({ ...this.stateValue, saveStatus: "saved", saveError: undefined });
      return;
    }
    const revision = this.profileRevision;
    const encoded = encodeSave({ ...this.stateValue.profile, savedAt: this.now() });
    this.setState({ ...this.stateValue, saveStatus: "saving", saveError: undefined });
    const operation = this.writeQueue.catch(() => {}).then(() => this.repository!.save(encoded));
    this.writeQueue = operation;
    try {
      await operation;
      this.lastPersistedRevision = Math.max(this.lastPersistedRevision, revision);
      if (revision === this.profileRevision) {
        this.setState({ ...this.stateValue, saveStatus: "saved", saveError: undefined });
      }
    } catch (error) {
      if (revision === this.profileRevision) {
        this.setState({
          ...this.stateValue,
          saveStatus: "error",
          saveError: error instanceof Error ? error.message : "写入存档失败",
        });
      }
      throw error;
    }
  }

  dispose(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = undefined;
    this.listeners.clear();
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.setState({ ...this.stateValue, saveStatus: "saving", saveError: undefined });
    this.saveTimer = setTimeout(() => { void this.flush().catch(() => {}); }, 1_000);
  }

  private setState(state: GameSessionState): GameSessionState {
    this.stateValue = state;
    for (const listener of this.listeners) listener(state);
    return state;
  }
}
