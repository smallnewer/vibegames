export interface FocusCell {
  readonly id: string;
  readonly row: number;
  readonly column: number;
  readonly enabled: boolean;
  readonly group?: string;
}

export function firstEnabled(cells: readonly FocusCell[]): FocusCell | undefined {
  return [...cells].filter((cell) => cell.enabled).sort((left, right) => (
    left.row - right.row || left.column - right.column || left.id.localeCompare(right.id)
  ))[0];
}

export function moveFocus(
  cells: readonly FocusCell[],
  currentId: string,
  x: -1 | 0 | 1,
  y: -1 | 0 | 1,
): string {
  const enabled = cells.filter((cell) => cell.enabled);
  const current = enabled.find((cell) => cell.id === currentId) ?? firstEnabled(enabled);
  if (!current || (x === 0 && y === 0)) return current?.id ?? "";
  const directional = enabled.filter((cell) => {
    if (x !== 0) return cell.row === current.row && Math.sign(cell.column - current.column) === x;
    return cell.column === current.column && Math.sign(cell.row - current.row) === y;
  }).sort((left, right) => {
    const leftDistance = Math.abs(left.row - current.row) + Math.abs(left.column - current.column);
    const rightDistance = Math.abs(right.row - current.row) + Math.abs(right.column - current.column);
    return leftDistance - rightDistance || left.id.localeCompare(right.id);
  });
  return directional[0]?.id ?? current.id;
}

export function restoreFocus(
  cells: readonly FocusCell[],
  preferredId: string,
  anchor?: FocusCell,
): string {
  const enabled = cells.filter((cell) => cell.enabled);
  if (enabled.some((cell) => cell.id === preferredId)) return preferredId;
  const group = anchor?.group;
  const candidates = group
    ? enabled.filter((cell) => cell.group === group)
    : enabled;
  const source = candidates.length > 0 ? candidates : enabled;
  if (anchor) {
    return [...source].sort((left, right) => {
      const leftDistance = Math.abs(left.row - anchor.row) + Math.abs(left.column - anchor.column);
      const rightDistance = Math.abs(right.row - anchor.row) + Math.abs(right.column - anchor.column);
      return leftDistance - rightDistance
        || left.row - right.row
        || left.column - right.column
        || left.id.localeCompare(right.id);
    })[0]?.id ?? "";
  }
  return firstEnabled(source)?.id ?? "";
}
