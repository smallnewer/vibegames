export const ZERO_SEED_FALLBACK = 0x6d2b79f5;

export function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) throw new Error(`run seed must be finite: ${seed}`);
  const normalized = seed >>> 0;
  return normalized === 0 ? ZERO_SEED_FALLBACK : normalized;
}

export function hashSeed(rootSeed: number, label: string): number {
  let hash = 0x811c9dc5;
  const value = `${normalizeSeed(rootSeed)}:${label}`;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return normalizeSeed(hash);
}
