import type { ActorRole } from "../content/ActorDefinitions";

// 运行时只保存稳定 ID；名字、模型和行为继续由内容脚本解释。
export interface ActorIdentityComponent {
  archetype: string;
  name: string;
  role: ActorRole;
  visual: string;
}
