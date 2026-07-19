import { DungeonRegistry } from "../content/DungeonRegistry";
import type { DungeonPack } from "./DungeonDefinitions";

const dungeons = new DungeonRegistry();

// 旧测试入口暂时保留，数据已经只来自编译后的内容包。
export function createTrainingDungeonDef(): DungeonPack {
  return dungeons.get("dungeon.training_ground");
}
