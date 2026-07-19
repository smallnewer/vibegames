import { describe, expect, it } from "vitest";
import type { GameplayEvent } from "../../../game/core/GameplayEvent";
import { ToastQueue } from "../../../game/ui/ToastQueue";

describe("ToastQueue", () => {
  it("maps loot and progression events into readable bounded notices", () => {
    const queue = new ToastQueue();
    const events: GameplayEvent[] = [
      {
        type: "loot_picked_up",
        actor: 1,
        loot: 10,
        kind: "item",
        label: "余烬长刃",
        amount: 1,
      },
      { type: "inventory_full", actor: 1, loot: 11 },
      { type: "progression_leveled", actor: 1, from: 1, to: 2 },
      { type: "skill_ranked_up", actor: 1, ability: "ability.focus", rank: 2 },
      { type: "item_reinforced", actor: 1, item: 2, level: 1 },
    ];

    queue.observe(events);

    expect(queue.messages).toHaveLength(4);
    expect(queue.messages[0].title).toBe("背包已满");
    expect(queue.messages.at(-1)).toMatchObject({ tone: "progress", title: "强化成功" });
    expect(new Set(queue.messages.map((message) => message.id)).size).toBe(4);
  });

  it("uses one 2.8 second lifetime budget and expires without timers", () => {
    const queue = new ToastQueue();
    queue.observe([{
      type: "loot_picked_up",
      actor: 1,
      loot: 10,
      kind: "material",
      label: "装备碎片",
      amount: 3,
    }]);

    expect(queue.messages[0]).toMatchObject({
      tone: "loot",
      title: "获得 装备碎片",
      detail: "×3",
      timeLeft: 2.8,
    });
    queue.advance(2.7);
    expect(queue.messages[0].timeLeft).toBeCloseTo(0.1);
    queue.advance(0.11);
    expect(queue.messages).toEqual([]);
  });
});
