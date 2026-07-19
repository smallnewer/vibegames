import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const hud = readFileSync("app/game-ui/hud.css", "utf8");
const minimap = readFileSync("app/game-ui/minimap.css", "utf8");
const globals = readFileSync("app/globals.css", "utf8");

describe("responsive HUD CSS contract", () => {
  it("defines safe-area anchors and distinct 1P/2P/3-4P layout rules", () => {
    expect(globals).toContain("--hud-edge: clamp(");
    expect(hud).toContain("env(safe-area-inset-bottom)");
    expect(hud).toContain('[data-party-size="2"]');
    expect(hud).toContain('[data-party-size="3"]');
    expect(hud).toContain('[data-party-size="4"]');
    expect(hud).toContain("@media (max-width: 1280px)");
  });

  it("keeps the default and compact minimap sizes explicit", () => {
    expect(minimap).toMatch(/width:\s*176px/);
    expect(minimap).toMatch(/height:\s*132px/);
    expect(minimap).toContain("@media (max-height: 800px)");
    expect(minimap).toMatch(/width:\s*144px/);
    expect(minimap).toMatch(/height:\s*108px/);
  });

  it("stacks two-player HUD panels vertically at large accessibility scales", () => {
    expect(hud).toContain('.game-shell[data-hud-scale-tier="large"] .player-hud');
    expect(hud).toContain('.game-shell[data-hud-scale-tier="large"] .combat-hud[data-party-size="2"]');
    expect(hud).toContain("flex-direction: column");
    expect(hud).toContain("transform-origin: bottom left");
  });

  it("does not retain obsolete production HUD selectors", () => {
    const productionCss = `${globals}\n${hud}`;
    for (const selector of [
      ".dungeon-header",
      ".location-card",
      ".quality-badge",
      ".controller-panel",
      ".objective-card",
      ".enemy-boss-bar",
      ".hero-status",
      ".control-hint",
    ]) {
      expect(productionCss).not.toContain(selector);
    }
  });
});
