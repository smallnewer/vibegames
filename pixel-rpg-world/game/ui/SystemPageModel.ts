import type {
  GameSettingsV1,
  ScreenShakeLevel,
} from "../save/SaveSchema";

export type ControllerConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "unsupported"
  | "error";

export type ControllerPlayer = 1 | 2;
export type ControllerFocusId = `system:connect_g30:${ControllerPlayer}`;

export interface ControllerSlotContext {
  readonly player: ControllerPlayer;
  readonly status: ControllerConnectionStatus;
  readonly message: string;
}

export type SystemSettingsAction =
  | { readonly type: "adjust_hud_scale"; readonly direction: 1 | -1 }
  | { readonly type: "toggle_reduced_flash" }
  | { readonly type: "adjust_screen_shake"; readonly direction: 1 | -1 }
  | { readonly type: "toggle_damage_numbers" };

export type SystemAction =
  | SystemSettingsAction
  | { readonly type: "connect_g30"; readonly player: ControllerPlayer }
  | { readonly type: "return_to_route" };

export interface SystemSettingRow {
  readonly focusId: string;
  readonly label: string;
  readonly value: string;
  readonly hint: string;
}

export interface SystemPageModel {
  readonly controllers: readonly {
    readonly player: ControllerPlayer;
    readonly status: ControllerConnectionStatus;
    readonly message: string;
    readonly focusId: ControllerFocusId;
    readonly canConnect: boolean;
    readonly actionLabel: string;
  }[];
  readonly rows: readonly SystemSettingRow[];
  readonly save: {
    readonly status: "idle" | "saving" | "saved" | "error";
    readonly label: string;
    readonly error?: string;
  };
  readonly returnFocusId: "system:return_to_route";
  readonly canResumeWithoutController: true;
}

export interface SystemPageContext {
  readonly settings: GameSettingsV1;
  readonly controllers: readonly [ControllerSlotContext, ControllerSlotContext];
  readonly saveStatus: "idle" | "saving" | "saved" | "error";
  readonly saveError?: string;
}

const SHAKE_LEVELS: readonly ScreenShakeLevel[] = [0, 0.5, 1];

export function normalizeHudScale(value: number): number {
  const clamped = Math.max(0.85, Math.min(2, value));
  if (clamped === 0.85) return 0.85;
  return Number((Math.round(clamped / 0.1) * 0.1).toFixed(1));
}

export function applySystemSettingsAction(
  settings: GameSettingsV1,
  action: SystemSettingsAction,
): GameSettingsV1 {
  if (action.type === "adjust_hud_scale") {
    return {
      ...settings,
      hudScale: normalizeHudScale(settings.hudScale + action.direction * 0.1),
    };
  }
  if (action.type === "toggle_reduced_flash") {
    return { ...settings, reducedFlash: !settings.reducedFlash };
  }
  if (action.type === "toggle_damage_numbers") {
    return { ...settings, damageNumbers: !settings.damageNumbers };
  }
  const index = SHAKE_LEVELS.indexOf(settings.screenShake);
  const nextIndex = Math.max(0, Math.min(SHAKE_LEVELS.length - 1, index + action.direction));
  return { ...settings, screenShake: SHAKE_LEVELS[nextIndex] };
}

function controllerAction(status: ControllerConnectionStatus): {
  readonly canConnect: boolean;
  readonly actionLabel: string;
} {
  if (status === "connecting") return { canConnect: false, actionLabel: "连接中" };
  if (status === "unsupported") return { canConnect: false, actionLabel: "不支持" };
  if (status === "connected") return { canConnect: true, actionLabel: "重新连接" };
  if (status === "error") return { canConnect: true, actionLabel: "重试" };
  return { canConnect: true, actionLabel: "连接" };
}

const SAVE_LABELS = {
  idle: "尚无待保存变更",
  saving: "保存中…",
  saved: "已保存",
  error: "保存失败",
} as const;

export function buildSystemPageModel(context: SystemPageContext): SystemPageModel {
  return {
    controllers: context.controllers.map((slot) => ({
      ...slot,
      focusId: `system:connect_g30:${slot.player}` as ControllerFocusId,
      ...controllerAction(slot.status),
    })),
    rows: [
      {
        focusId: "system:hud_scale",
        label: "HUD 缩放",
        value: `${Math.round(context.settings.hudScale * 100)}%`,
        hint: "A 增大 · X 缩小",
      },
      {
        focusId: "system:reduced_flash",
        label: "降低受击闪烁",
        value: context.settings.reducedFlash ? "开启" : "关闭",
        hint: "A 切换",
      },
      {
        focusId: "system:screen_shake",
        label: "屏幕震动",
        value: `${Math.round(context.settings.screenShake * 100)}%`,
        hint: "A 增加 · X 减少",
      },
      {
        focusId: "system:damage_numbers",
        label: "伤害数字",
        value: context.settings.damageNumbers ? "开启" : "关闭",
        hint: "A 切换 · 正式数字表现将在内容阶段接入",
      },
    ],
    save: {
      status: context.saveStatus,
      label: SAVE_LABELS[context.saveStatus],
      error: context.saveError,
    },
    returnFocusId: "system:return_to_route",
    canResumeWithoutController: true,
  };
}
