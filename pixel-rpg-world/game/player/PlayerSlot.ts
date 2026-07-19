export type PlayerSlotId = 1 | 2 | 3 | 4;

// 玩家槽只描述逻辑归属，键盘和手柄绑定留在浏览器适配层。
export interface PlayerSlotComponent {
  slot: PlayerSlotId;
}
