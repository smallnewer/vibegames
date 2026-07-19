import type { GameplayEvent } from "../core/GameplayEvent";

export interface ToastMessage {
  readonly id: number;
  readonly tone: "loot" | "skill" | "progress" | "warning";
  readonly title: string;
  readonly detail?: string;
  readonly timeLeft: number;
}

export const TOAST_TTL_SECONDS = 2.8;
export const TOAST_QUEUE_LIMIT = 4;

type ToastContent = Omit<ToastMessage, "id" | "timeLeft">;

function toastFor(event: GameplayEvent): ToastContent | undefined {
  if (event.type === "loot_picked_up") {
    return {
      tone: event.kind === "ability" ? "skill" : "loot",
      title: `获得 ${event.label}`,
      detail: event.amount > 1 ? `×${event.amount}` : undefined,
    };
  }
  if (event.type === "inventory_full") {
    return { tone: "warning", title: "背包已满", detail: "物品仍留在地面" };
  }
  if (event.type === "progression_leveled") {
    return { tone: "progress", title: `等级提升至 ${event.to}` };
  }
  if (event.type === "skill_ranked_up") {
    return { tone: "skill", title: "技能升级", detail: `等级 ${event.rank}` };
  }
  if (event.type === "item_equipped") {
    return { tone: "loot", title: "装备已穿戴", detail: event.definition };
  }
  if (event.type === "ability_equipped" || event.type === "passive_equipped") {
    return { tone: "skill", title: "技能已装备" };
  }
  if (event.type === "item_reinforced") {
    return { tone: "progress", title: "强化成功", detail: `+${event.level}` };
  }
  return undefined;
}

export class ToastQueue {
  private nextId = 1;
  private queue: ToastMessage[] = [];

  get messages(): readonly ToastMessage[] {
    return this.queue;
  }

  observe(events: readonly GameplayEvent[]): void {
    for (const event of events) {
      const content = toastFor(event);
      if (!content) continue;
      this.queue.push({
        id: this.nextId,
        ...content,
        timeLeft: TOAST_TTL_SECONDS,
      });
      this.nextId += 1;
      if (this.queue.length > TOAST_QUEUE_LIMIT) this.queue.shift();
    }
  }

  advance(delta: number): void {
    if (delta <= 0 || this.queue.length === 0) return;
    this.queue = this.queue.flatMap((message) => {
      const timeLeft = message.timeLeft - delta;
      return timeLeft > 0 ? [{ ...message, timeLeft }] : [];
    });
  }
}
