import { BALANCE_DATA } from "../content/generated/balance";

export function xpToNext(level: number): number {
  if (!Number.isInteger(level) || level < 1 || level > BALANCE_DATA.levelCap) {
    throw new Error(`level must be an integer from 1 to ${BALANCE_DATA.levelCap}: ${level}`);
  }
  if (level === BALANCE_DATA.levelCap) return 0;
  return Math.round((100 * level ** BALANCE_DATA.xpExponent) / 10) * 10;
}
