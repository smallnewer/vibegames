import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { WorldRoute } from "../../../app/game-ui/WorldRoute";
import { createDefaultWorldProgress, worldRouteNodes } from "../../../game/session/WorldProgress";

it("exposes an explicit 1P/2P selector on the world route", () => {
  const html = renderToStaticMarkup(
    <WorldRoute
      nodes={worldRouteNodes(createDefaultWorldProgress())}
      echoUnlocked={false}
      playerCount={2}
      controllers={[
        { player: 1, status: "connected", message: "P1 G30 已连接" },
        { player: 2, status: "idle", message: "P2 G30 未连接" },
      ]}
      onPlayerCountChange={() => {}}
      onConnectController={() => {}}
      onEnter={() => {}}
    />,
  );

  expect(html).toContain("本地玩家");
  expect(html).toContain('data-player-count="1"');
  expect(html).toContain('data-player-count="2"');
  expect(html).toContain('data-player-count="2" aria-pressed="true"');
  expect(html).toContain('data-controller-player="1"');
  expect(html).toContain('data-controller-player="2"');
  expect(html).toContain("P1 G30 已连接");
  expect(html).toContain("P2 G30 未连接");
});
