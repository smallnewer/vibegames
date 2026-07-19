import type { EquipmentSlot, StatName } from "../content/Definitions";
import type { GameSnapshot } from "../core/GameSnapshot";
import type { MaterialId } from "../item/ItemComponents";
import type { PlayerSlotId } from "../player/PlayerSlot";
import { itemBaseForDefinition } from "../item/ItemCatalog";

export interface ForgeMaterialRow {
  readonly id: MaterialId;
  readonly label: string;
  readonly color: string;
  readonly icon: string;
  readonly have: number;
  readonly need: number;
  readonly missing: number;
}

export interface ForgeEntryModel {
  readonly id: number;
  readonly focusId: string;
  readonly name: string;
  readonly slot: EquipmentSlot;
  readonly icon: string;
  readonly level: number;
  readonly nextLevel: number;
  readonly canReinforce: boolean;
  readonly pending: boolean;
  readonly reason?: string;
  readonly base: { readonly stat: StatName; readonly current: number; readonly next: number };
  readonly statDelta: Readonly<Partial<Record<StatName, number>>>;
  readonly materials: readonly ForgeMaterialRow[];
  readonly affixes: readonly { readonly definition: string; readonly roll: number }[];
  readonly affixesUnchanged: true;
}

export interface ForgePageModel {
  readonly entries: readonly ForgeEntryModel[];
  readonly selected?: ForgeEntryModel;
}

const MATERIAL_DISPLAY: Record<MaterialId, { label: string; color: string }> = {
  "material.scrap": { label: "装备碎片", color: "#aaa39a", icon: "icon.material.scrap" },
  "material.ember_essence": { label: "余烬精华", color: "#d76a35", icon: "icon.material.essence" },
  "material.frost_essence": { label: "霜寒精华", color: "#79b9e8", icon: "icon.material.essence" },
  "material.tide_essence": { label: "潮汐精华", color: "#4ba7be", icon: "icon.material.essence" },
  "material.spore_essence": { label: "孢生精华", color: "#83ad58", icon: "icon.material.essence" },
  "material.storm_essence": { label: "风暴精华", color: "#a794e8", icon: "icon.material.essence" },
  "material.seal": { label: "界炉印记", color: "#e2bf73", icon: "icon.material.seal" },
};

const REASON = {
  max_level: "已达 +5",
  missing_scrap: "装备碎片不足",
  missing_essence: "主题精华不足",
  missing_seal: "界炉印记不足",
} as const;

export function buildForgePageModel(
  snapshot: GameSnapshot,
  slot: PlayerSlotId,
  options: Readonly<{ focusId: string; pendingItemId?: number }>,
): ForgePageModel {
  const player = snapshot.players.find((candidate) => candidate.slot === slot)
    ?? snapshot.players[0];
  if (!player) throw new Error("forge page requires at least one player");
  const { progress } = player;
  const entries = progress.items.map((item): ForgeEntryModel => {
    const quote = progress.forgeQuotes[item.id];
    if (!quote) throw new Error(`missing core forge quote for item ${item.id}`);
    const materials = (Object.entries(quote.cost) as [MaterialId, number][])
      .filter(([, need]) => need > 0)
      .map(([id, need]) => ({
        id,
        ...MATERIAL_DISPLAY[id],
        have: progress.materials[id],
        need,
        missing: Math.max(0, need - progress.materials[id]),
      }));
    return {
      id: item.id,
      focusId: `forge:item:${item.id}`,
      name: item.name,
      slot: item.slot,
      icon: itemBaseForDefinition(item.definition)?.iconFamily ?? "icon.generic.unknown",
      level: quote.from,
      nextLevel: quote.to,
      canReinforce: quote.allowed && options.pendingItemId === undefined,
      pending: options.pendingItemId === item.id,
      reason: quote.reason ? REASON[quote.reason] : undefined,
      base: quote.baseStat as ForgeEntryModel["base"],
      statDelta: quote.statDelta,
      materials,
      affixes: item.affixes,
      affixesUnchanged: true,
    };
  });
  const selected = entries.find((entry) => entry.focusId === options.focusId) ?? entries[0];
  return { entries, selected };
}
