// 保留旧入口，场景编排无需知道角色美术已经拆到独立模块。
export {
  createVoxelCharacter as createActorVisual,
  type VoxelCharacterVisual as ActorVisual,
} from "./art/VoxelCharacters";
