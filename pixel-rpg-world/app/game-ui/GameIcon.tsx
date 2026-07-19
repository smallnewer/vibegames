import { gameIconTint, gameIconUrl } from "../../game/ui/IconCatalog";

export function GameIcon({
  id,
  contentId,
  label,
  className = "",
}: {
  readonly id?: string;
  readonly contentId?: string;
  readonly label?: string;
  readonly className?: string;
}) {
  const tint = gameIconTint(contentId);
  return (
    <span
      className={`game-icon ${className}`.trim()}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : "true"}
      data-tinted={tint ? "true" : undefined}
      style={{
        "--game-icon-image": `url("${gameIconUrl(id)}")`,
        "--game-icon-tint": tint ?? "transparent",
      } as React.CSSProperties}
    />
  );
}
