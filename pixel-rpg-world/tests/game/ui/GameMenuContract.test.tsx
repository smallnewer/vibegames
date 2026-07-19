import { isValidElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { GameMenu } from "../../../app/game-ui/menu/GameMenu";
import type { GameUiModel } from "../../../game/ui/GameUiModel";
import type { UiState } from "../../../game/ui/UiState";

interface NodeRecord {
  readonly type: string;
  readonly props: Record<string, unknown>;
}

function inspect(node: ReactNode, records: NodeRecord[]): void {
  if (Array.isArray(node)) {
    for (const child of node) inspect(child, records);
    return;
  }
  if (!isValidElement(node)) return;
  if (typeof node.type === "function") {
    const Component = node.type as (props: Record<string, unknown>) => ReactNode;
    inspect(Component(node.props as Record<string, unknown>), records);
    return;
  }
  if (typeof node.type !== "string") return;
  const props = node.props as Record<string, unknown>;
  records.push({ type: node.type, props });
  inspect(props.children as ReactNode, records);
}

const model: GameUiModel = {
  heroes: [
    { slot: 1, actor: 1, name: "烬行者", level: 3 },
    { slot: 2, actor: 2, name: "烬行者", level: 2 },
  ],
  selectedHero: { slot: 1, actor: 1, name: "烬行者", level: 3 },
  pageTitle: "背包",
  character: {
    level: 3,
    experience: 0,
    xpToNext: 100,
    unspentAttributes: 0,
    attributes: [],
    sections: [],
    reset: { focusId: "character:reset", enabled: false, refundable: 0 },
  },
  inventory: {
    view: "items",
    sort: "newest",
    cells: [],
    recoveryCells: [],
    equipment: [],
    compareActive: false,
    mainCount: 0,
    mainCapacity: 30,
    recoveryCount: 0,
    recoveryCapacity: 12,
  },
  skills: {
    entries: [],
    slots: [],
    weapons: [],
    unspentSkills: 0,
  },
  forge: { entries: [] },
  system: {
    controllers: [
      {
        player: 1,
        status: "connected",
        message: "P1 G30 已连接",
        focusId: "system:connect_g30:1",
        canConnect: true,
        actionLabel: "重新连接",
      },
      {
        player: 2,
        status: "idle",
        message: "P2 G30 未连接",
        focusId: "system:connect_g30:2",
        canConnect: true,
        actionLabel: "连接",
      },
    ],
    rows: [],
    save: { status: "saved", label: "已保存" },
    returnFocusId: "system:return_to_route",
    canResumeWithoutController: true,
  },
};

function render(state: UiState): NodeRecord[] {
  const records: NodeRecord[] = [];
  inspect(GameMenu({ state, model, dispatch: () => {} }), records);
  return records;
}

describe("GameMenu component contract", () => {
  it("is hidden by default and provides tabs, selected hero, content and legend", () => {
    const records = render({
      open: false,
      page: "inventory",
      hero: 1,
      focusId: "inventory:first",
    });
    const shell = records.find((node) => node.props["data-testid"] === "game-menu")!;
    expect(shell.props.hidden).toBe(true);
    expect(records.find((node) => node.props.role === "tablist")).toBeDefined();
    expect(records.filter((node) => node.props.role === "tab")).toHaveLength(5);
    expect(records.find((node) => node.props.role === "tabpanel")).toBeDefined();
    expect(records.find((node) => node.props["aria-label"] === "菜单操作")).toBeDefined();
  });

  it("renders an accessible modal with exactly one controller focus", () => {
    const records = render({
      open: true,
      page: "inventory",
      hero: 1,
      focusId: "inventory:first",
      dialog: "salvage",
      dialogFocus: "cancel",
    });
    expect(records.find((node) => node.props.role === "dialog")?.props["aria-modal"]).toBe("true");
    expect(records.filter((node) => node.props["data-controller-focus"] === "true"))
      .toHaveLength(1);
  });

  it("renders independent P1 and P2 G30 connection controls on the system page", () => {
    const records = render({
      open: true,
      page: "system",
      hero: 1,
      focusId: "system:connect_g30:2",
    });
    expect(records.filter((node) => node.props["data-controller-player"] !== undefined)
      .map((node) => node.props["data-controller-player"]))
      .toEqual([1, 2]);
    expect(records.filter((node) => node.props["data-controller-focus"] === "true"))
      .toHaveLength(1);
  });
});
