import type { ActorArchetypeDef } from "../ActorDefinitions";

export const FURNACE_SLINGER = {
  id: "enemy.furnace_slinger",
  name: "熔炉投手",
  role: "minion",
  visual: "visual.actor.ember_sentinel",
  stats: {
    maxHealth: 60,
    moveSpeed: 3,
    rangedPower: 8,
    armor: 2,
    attackSpeed: 1,
    pickupRadius: 1,
  },
  radius: 0.48,
  loadout: {
    slots: {
      melee: undefined,
      ranged: "ability.furnace_shot",
      skill_up: undefined,
      skill_right: undefined,
      skill_down: undefined,
      skill_left: undefined,
    },
    passives: { passive_1: undefined, passive_2: undefined },
  },
  ai: {
    thinkSeconds: 0.18,
    aggroRange: 11,
    leashRange: 16,
    actions: [{
      slot: "ranged",
      minRange: 4,
      maxRange: 8,
      weight: 1,
      telegraphSeconds: 0.4,
      recoverySeconds: 0.3,
      requiresLineOfSight: true,
      telegraph: { shape: "line", damageType: "fire", length: 8, width: 0.4 },
    }],
  },
  drops: [],
} as const satisfies ActorArchetypeDef;
