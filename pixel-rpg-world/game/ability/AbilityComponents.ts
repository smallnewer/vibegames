import type { AbilitySlot, PassiveSlot } from "../content/Definitions";

export interface AbilityChargeState {
  charges: number;
  recharge: number[];
}

export interface AbilityLoadoutComponent {
  slots: Record<AbilitySlot, string | undefined>;
  cooldowns: Record<AbilitySlot, AbilityChargeState>;
  passives: Record<PassiveSlot, string | undefined>;
  actionSequence?: number;
}

const ABILITY_SLOTS: readonly AbilitySlot[] = [
  "melee",
  "ranged",
  "skill_up",
  "skill_right",
  "skill_down",
  "skill_left",
];

export function createAbilityChargeState(charges = 1): AbilityChargeState {
  return { charges, recharge: [] };
}

export function createAbilityChargeStates(): Record<AbilitySlot, AbilityChargeState> {
  return Object.fromEntries(ABILITY_SLOTS.map((slot) => (
    [slot, createAbilityChargeState()]
  ))) as Record<AbilitySlot, AbilityChargeState>;
}

// 只在内存迁移边界容忍旧的 scalar cooldown；读取后立即升格。
export function normalizeAbilityChargeState(value: unknown): AbilityChargeState {
  if (
    typeof value === "object"
    && value !== null
    && "charges" in value
    && "recharge" in value
    && Array.isArray(value.recharge)
  ) {
    return value as AbilityChargeState;
  }
  const legacy = typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
  return legacy > 0 ? { charges: 0, recharge: [legacy] } : createAbilityChargeState();
}

export function syncAbilityChargeCapacity(
  state: AbilityChargeState,
  capacity: 1 | 2,
): void {
  const total = state.charges + state.recharge.length;
  if (total < capacity) state.charges += capacity - total;
  if (state.charges > capacity) state.charges = capacity;
  while (state.charges + state.recharge.length > capacity && state.recharge.length > 0) {
    state.recharge.pop();
  }
}

export function advanceAbilityChargeState(state: AbilityChargeState, elapsed: number): void {
  if (elapsed <= 0 || state.recharge.length === 0) return;
  state.recharge = state.recharge.map((remaining) => remaining - elapsed);
  const completed = state.recharge.filter((remaining) => remaining <= 0).length;
  if (completed > 0) {
    state.charges += completed;
    state.recharge = state.recharge.filter((remaining) => remaining > 0);
  }
}

export function spendAbilityCharge(state: AbilityChargeState, cooldown: number): boolean {
  if (state.charges <= 0) return false;
  state.charges -= 1;
  const tail = state.recharge[state.recharge.length - 1] ?? 0;
  state.recharge.push(tail + cooldown);
  return true;
}

export function earliestRecharge(state: AbilityChargeState): number {
  return Math.max(0, state.recharge[0] ?? 0);
}

const LEGACY_ACTIVE_SLOT_KEYS = [
  ["ability", "1"].join("_"),
  ["ability", "2"].join("_"),
  ["ability", "3"].join("_"),
] as const;

// 只供内存中的旧 loadout 升格；持久化存档由正式 save migration 负责。
export function normalizeAbilitySlots(
  input: Readonly<Record<string, string | undefined>>,
): Record<AbilitySlot, string | undefined> {
  return {
    melee: input.melee,
    ranged: input.ranged,
    skill_up: input.skill_up ?? input[LEGACY_ACTIVE_SLOT_KEYS[0]],
    skill_right: input.skill_right ?? input[LEGACY_ACTIVE_SLOT_KEYS[1]],
    skill_down: input.skill_down ?? input[LEGACY_ACTIVE_SLOT_KEYS[2]],
    skill_left: input.skill_left,
  };
}
