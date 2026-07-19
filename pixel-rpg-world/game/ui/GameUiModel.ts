import type { GameSnapshot } from "../core/GameSnapshot";
import type { EntityId } from "../core/World";
import type { PlayerSlotId } from "../player/PlayerSlot";
import type { UiState } from "./UiState";
import {
  buildCharacterPageModel,
  type CharacterPageContext,
  type CharacterPageModel,
} from "./CharacterPageModel";
import { buildInventoryPageModel, type InventoryPageModel } from "./InventoryPageModel";
import { buildSkillPageModel, type SkillPageModel } from "./SkillPageModel";
import { buildForgePageModel, type ForgePageModel } from "./ForgePageModel";
import {
  buildSystemPageModel,
  type SystemPageContext,
  type SystemPageModel,
} from "./SystemPageModel";

export interface GameUiHeroSummary {
  readonly slot: PlayerSlotId;
  readonly actor: EntityId;
  readonly name: string;
  readonly level: number;
}

export interface GameUiModel {
  readonly heroes: readonly GameUiHeroSummary[];
  readonly selectedHero: GameUiHeroSummary;
  readonly pageTitle: string;
  readonly character: CharacterPageModel;
  readonly inventory: InventoryPageModel;
  readonly skills: SkillPageModel;
  readonly forge: ForgePageModel;
  readonly system: SystemPageModel;
}

export interface GameUiContext extends CharacterPageContext {
  readonly system?: SystemPageContext;
}

const DEFAULT_SYSTEM_CONTEXT: SystemPageContext = {
  settings: {
    hudScale: 1,
    reducedFlash: false,
    screenShake: 1,
    damageNumbers: false,
  },
  controllers: [
    { player: 1, status: "idle", message: "P1 G30 未连接" },
    { player: 2, status: "idle", message: "P2 G30 未连接" },
  ],
  saveStatus: "idle",
};

const PAGE_TITLES = {
  inventory: "背包",
  skills: "技能",
  character: "角色",
  forge: "打造",
  system: "系统",
} as const;

export function buildGameUiModel(
  snapshot: GameSnapshot,
  state: UiState,
  context: GameUiContext,
): GameUiModel {
  const heroes = snapshot.players.map((player) => {
    const actor = snapshot.actors.find((candidate) => candidate.id === player.actor)!;
    return {
      slot: player.slot,
      actor: player.actor,
      name: actor.name,
      level: player.progress.level,
    };
  });
  return {
    heroes,
    selectedHero: heroes.find((hero) => hero.slot === state.hero) ?? heroes[0],
    pageTitle: PAGE_TITLES[state.page],
    character: buildCharacterPageModel(snapshot, state.hero, context),
    inventory: buildInventoryPageModel(snapshot, state.hero, {
      view: state.inventoryView ?? "items",
      sort: state.inventorySort ?? "newest",
      focusId: state.focusId,
      compareItemId: state.inventoryCompareId,
    }),
    skills: buildSkillPageModel(snapshot, state.hero),
    forge: buildForgePageModel(snapshot, state.hero, {
      focusId: state.focusId,
      pendingItemId: state.forgePendingItem,
    }),
    system: buildSystemPageModel(context.system ?? DEFAULT_SYSTEM_CONTEXT),
  };
}
