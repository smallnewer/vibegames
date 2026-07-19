import type { DungeonPack } from "../dungeon/DungeonDefinitions";
import { DUNGEON_PACK_DATA } from "./generated/dungeonPacks";

// 编译产物只读，运行时不能偷偷改地图配置。
function freezePack<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezePack(child);
    Object.freeze(value);
  }
  return value;
}

export class DungeonRegistry {
  private readonly packs = new Map<string, DungeonPack>();

  constructor(values: readonly DungeonPack[] = DUNGEON_PACK_DATA) {
    for (const value of values) {
      if (this.packs.has(value.id)) throw new Error(`Duplicate dungeon: ${value.id}`);
      this.packs.set(value.id, freezePack(value));
    }
  }

  get(id: string): DungeonPack {
    const value = this.packs.get(id);
    if (!value) throw new Error(`Unknown dungeon: ${id}`);
    return value;
  }
}
