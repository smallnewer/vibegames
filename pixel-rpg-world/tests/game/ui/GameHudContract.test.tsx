import { isValidElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { GameHud } from "../../../app/game-ui/GameHud";
import { DungeonRegistry } from "../../../game/content/DungeonRegistry";
import { GameSimulation } from "../../../game/core/GameSimulation";
import { buildMinimap } from "../../../game/map/MinimapModel";
import { buildCombatHud } from "../../../game/ui/HudViewModel";

interface TreeContract {
  readonly elementTypes: string[];
  readonly testIds: string[];
  readonly labels: string[];
}

// 直接展开无 Hook 的纯组件树，不启动 DOM、服务器渲染或游戏引擎。
function inspect(node: ReactNode, contract: TreeContract): void {
  if (Array.isArray(node)) {
    for (const child of node) inspect(child, contract);
    return;
  }
  if (!isValidElement(node)) return;
  if (typeof node.type === "function") {
    const Component = node.type as (props: Record<string, unknown>) => ReactNode;
    inspect(Component(node.props as Record<string, unknown>), contract);
    return;
  }
  if (typeof node.type !== "string") return;
  contract.elementTypes.push(node.type);
  const props = node.props as Record<string, unknown>;
  if (typeof props["data-testid"] === "string") contract.testIds.push(props["data-testid"]);
  if (typeof props["aria-label"] === "string") contract.labels.push(props["aria-label"]);
  inspect(props.children as ReactNode, contract);
}

describe("GameHud component contract", () => {
  it("contains independent players, four skills and SVG minimap without legacy HUD surfaces", () => {
    const registry = new DungeonRegistry();
    const pack = registry.get("dungeon.production_foundation");
    const snapshot = new GameSimulation({
      dungeonId: pack.id,
      playerCount: 2,
    }, registry).snapshot();
    const contract: TreeContract = { elementTypes: [], testIds: [], labels: [] };
    inspect(GameHud({
      model: buildCombatHud(snapshot),
      minimap: buildMinimap(snapshot, pack),
      toasts: [{ id: 1, tone: "loot", title: "获得 装备碎片", timeLeft: 2.8 }],
    }), contract);

    expect(contract.testIds).toContain("combat-hud");
    expect(contract.testIds).toContain("player-hud-1");
    expect(contract.testIds).toContain("player-hud-2");
    for (const direction of ["up", "right", "down", "left"]) {
      expect(contract.testIds).toContain(`player-1-skill-${direction}`);
    }
    expect(contract.elementTypes).toContain("svg");
    expect(contract.elementTypes).not.toContain("canvas");
    expect(contract.labels).toContain("地下城小地图");
    expect(contract.elementTypes).toContain("strong");
    expect(contract.testIds).not.toEqual(expect.arrayContaining([
      "engine-backend",
      "dungeon-switcher",
      "g30-controller",
      "passive-slot-1",
      "nearby-loot",
    ]));
  });
});
