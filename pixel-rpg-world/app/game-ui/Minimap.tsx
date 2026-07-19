import type { MinimapSnapshot } from "../../game/map/MinimapModel";

const PLAYER_SYMBOLS = ["player-circle", "player-square", "player-triangle", "player-diamond"];

export function Minimap({ model }: { readonly model: MinimapSnapshot }) {
  return (
    <aside className="minimap" data-testid="minimap">
      <svg
        viewBox={`0 0 ${model.width} ${model.height}`}
        role="img"
        aria-label="地下城小地图"
      >
        <defs>
          <symbol id="marker-objective" viewBox="-5 -5 10 10"><path d="M0 -5 5 0 0 5 -5 0Z" /></symbol>
          <symbol id="marker-door" viewBox="-4 -5 8 10"><path d="M-3 5V-4H3V5M0 1H2" /></symbol>
          <symbol id="marker-boss" viewBox="-6 -6 12 12"><path d="m0-6 2 4 4 .5-3 3 1 4.5-4-2-4 2 1-4.5-3-3 4-.5Z" /></symbol>
          <symbol id="marker-exit" viewBox="-5 -5 10 10"><circle r="4" /><path d="M-1-2 2 0-1 2" /></symbol>
          <symbol id="player-circle" viewBox="-5 -5 10 10"><circle r="3.5" /></symbol>
          <symbol id="player-square" viewBox="-5 -5 10 10"><rect x="-3.5" y="-3.5" width="7" height="7" /></symbol>
          <symbol id="player-triangle" viewBox="-5 -5 10 10"><path d="M0-4 4 3-4 3Z" /></symbol>
          <symbol id="player-diamond" viewBox="-5 -5 10 10"><path d="M0-4 4 0 0 4-4 0Z" /></symbol>
        </defs>
        <g className="minimap-connections" aria-hidden="true">
          {model.connections.map((connection) => (
            <line key={connection.id} {...connection} />
          ))}
        </g>
        <g className="minimap-sections" aria-hidden="true">
          {model.sections.map((section) => (
            <rect
              key={section.id}
              x={section.x}
              y={section.y}
              width={section.width}
              height={section.height}
              className={section.discovered ? "is-discovered" : "is-adjacent"}
            />
          ))}
        </g>
        <g className="minimap-markers" aria-hidden="true">
          {model.markers.filter((marker) => marker.visible).map((marker) => (
            <use
              key={marker.id}
              className={`map-marker map-marker--${marker.kind}`}
              href={`#marker-${marker.kind}`}
              x={marker.x - 5}
              y={marker.y - 5}
              width="10"
              height="10"
            />
          ))}
        </g>
        <g className="minimap-players" aria-hidden="true">
          {model.players.map((player) => (
            <g
              key={player.slot}
              className={`map-player map-player--${player.slot}`}
              data-life-state={player.lifeState}
              style={{ transform: `translate(${player.x}px, ${player.y}px)` }}
            >
              <use
                href={`#${PLAYER_SYMBOLS[player.slot - 1]}`}
                x="-5"
                y="-5"
                width="10"
                height="10"
              />
            </g>
          ))}
        </g>
      </svg>
    </aside>
  );
}
