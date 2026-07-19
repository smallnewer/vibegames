import type { WorldNodeDef } from "../../game/session/WorldProgress";
import type {
  ControllerPlayer,
  ControllerSlotContext,
} from "../../game/ui/SystemPageModel";

export function WorldRoute({
  nodes,
  echoUnlocked,
  playerCount,
  controllers,
  onPlayerCountChange,
  onConnectController,
  onEnter,
}: {
  readonly nodes: readonly WorldNodeDef[];
  readonly echoUnlocked: boolean;
  readonly playerCount: 1 | 2;
  readonly controllers: readonly [ControllerSlotContext, ControllerSlotContext];
  readonly onPlayerCountChange: (count: 1 | 2) => void;
  readonly onConnectController: (player: ControllerPlayer) => void;
  readonly onEnter: (node: WorldNodeDef) => void;
}) {
  return (
    <section className="world-route" aria-label="世界路线">
      <header>
        <div><small>THE BOUNDARY FORGES</small><h1>界炉之路</h1></div>
        <p>沿旧王国的五座地下界炉推进。当前版本使用已有地下城场景，路线仅负责选择与成长管理。</p>
        <div className="route-session-options">
          <span>{echoUnlocked ? "回响难度已解锁" : `普通进度 ${nodes.filter((node) => node.cleared).length}/5`}</span>
          <div className="route-party-size" role="group" aria-label="本地玩家数量">
            <small>本地玩家</small>
            {([1, 2] as const).map((count) => (
              <button
                key={count}
                type="button"
                data-player-count={count}
                aria-pressed={playerCount === count}
                onClick={() => onPlayerCountChange(count)}
              >
                {count}P
              </button>
            ))}
          </div>
          <div className="route-controller-slots" role="group" aria-label="G30 手柄连接">
            {controllers.slice(0, playerCount).map((controller) => (
              <button
                key={controller.player}
                type="button"
                data-controller-player={controller.player}
                data-status={controller.status}
                disabled={controller.status === "connecting" || controller.status === "unsupported"}
                onClick={() => onConnectController(controller.player)}
              >
                <strong>P{controller.player} G30</strong>
                <span>{controller.message}</span>
              </button>
            ))}
          </div>
        </div>
      </header>
      <div className="world-route-track">
        {nodes.map((node, index) => (
          <article key={node.id} data-theme={node.theme} data-locked={!node.unlocked || undefined}>
            <i className="route-line" aria-hidden="true" />
            <button type="button" disabled={!node.unlocked} onClick={() => onEnter(node)}>
              <span className="route-index">{String(index + 1).padStart(2, "0")}</span>
              <div><small>Lv.{node.levelBand[0]}–{node.levelBand[1]}</small><h2>{node.name}</h2><p>{node.bossTitle} · {node.boss}</p></div>
              <strong>{node.cleared ? "✓ 首通" : node.unlocked ? "进入" : "锁定"}</strong>
            </button>
            <footer><span>主题材料 · {node.material}</span>{node.lockedReason ? <small>{node.lockedReason}</small> : null}</footer>
          </article>
        ))}
      </div>
      <footer>现有资产路线 · 野外场景将在后续资产阶段替换此展示层</footer>
    </section>
  );
}
