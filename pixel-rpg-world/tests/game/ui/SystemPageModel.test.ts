import { describe, expect, it } from "vitest";
import {
  applySystemSettingsAction,
  buildSystemPageModel,
  normalizeHudScale,
  type ControllerConnectionStatus,
} from "../../../game/ui/SystemPageModel";
import type { GameSettingsV1 } from "../../../game/save/SaveSchema";

const DEFAULTS: GameSettingsV1 = {
  hudScale: 1,
  reducedFlash: false,
  screenShake: 1,
  damageNumbers: false,
};

describe("SystemPageModel", () => {
  it.each([
    [0.1, 0.85],
    [1.16, 1.2],
    [1.96, 2],
    [2.4, 2],
  ])("clamps HUD scale %s to a 0.1 step", (input, expected) => {
    expect(normalizeHudScale(input)).toBe(expected);
  });

  it("applies reversible accessibility settings with bounded screen shake", () => {
    let settings = applySystemSettingsAction(DEFAULTS, {
      type: "adjust_hud_scale",
      direction: 1,
    });
    expect(settings.hudScale).toBe(1.1);
    settings = applySystemSettingsAction(settings, { type: "toggle_reduced_flash" });
    expect(settings.reducedFlash).toBe(true);
    settings = applySystemSettingsAction(settings, {
      type: "adjust_screen_shake",
      direction: -1,
    });
    expect(settings.screenShake).toBe(0.5);
    settings = applySystemSettingsAction(settings, {
      type: "adjust_screen_shake",
      direction: -1,
    });
    expect(settings.screenShake).toBe(0);
    settings = applySystemSettingsAction(settings, {
      type: "adjust_screen_shake",
      direction: -1,
    });
    expect(settings.screenShake).toBe(0);
    settings = applySystemSettingsAction(settings, { type: "toggle_damage_numbers" });
    expect(settings.damageNumbers).toBe(true);
  });

  it.each<readonly [ControllerConnectionStatus, boolean, string]>([
    ["idle", true, "连接"],
    ["connecting", false, "连接中"],
    ["connected", true, "重新连接"],
    ["unsupported", false, "不支持"],
    ["error", true, "重试"],
  ])("maps %s controller state without blocking gameplay", (status, canConnect, label) => {
    const model = buildSystemPageModel({
      settings: DEFAULTS,
      controllers: [
        { player: 1, status, message: `status:${status}` },
        { player: 2, status: "idle", message: "P2 G30 未连接" },
      ],
      saveStatus: "saved",
    });
    expect(model.controllers[0]).toMatchObject({
      player: 1,
      status,
      canConnect,
      actionLabel: label,
      focusId: "system:connect_g30:1",
    });
    expect(model.controllers[1]).toMatchObject({
      player: 2,
      focusId: "system:connect_g30:2",
    });
    expect(model.canResumeWithoutController).toBe(true);
    expect(model.rows).toHaveLength(4);
    expect(model.rows.map((row) => row.focusId)).toEqual([
      "system:hud_scale",
      "system:reduced_flash",
      "system:screen_shake",
      "system:damage_numbers",
    ]);
  });
});
