function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
  return value;
}

function combatLevel(level: number): number {
  finite(level, "attacker level");
  return Math.max(1, Math.min(30, level));
}

export function armorMitigation(armor: number, attackerLevel: number): number {
  const safeArmor = Math.max(0, finite(armor, "armor"));
  const level = combatLevel(attackerLevel);
  if (safeArmor === 0) return 0;
  return Math.min(0.65, safeArmor / (safeArmor + 120 + 15 * level));
}

export function critChance(rating: number, attackerLevel: number): number {
  const safeRating = Math.max(0, finite(rating, "crit rating"));
  const level = combatLevel(attackerLevel);
  const value = 0.05 + safeRating / (safeRating + 100 + 10 * level) * 0.40;
  return Math.max(0.05, Math.min(0.50, value));
}
