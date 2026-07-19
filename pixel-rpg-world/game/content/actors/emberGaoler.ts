import type { ActorArchetypeDef } from "../ActorDefinitions";

export const EMBER_GAOLER = {
  id: "enemy.ember_gaoler",
  name: "余烬狱卒",
  role: "minion",
  visual: "visual.actor.ember_minion",
  stats: {
    maxHealth: 95,
    moveSpeed: 2.7,
    meleePower: 7,
    armor: 8,
    attackSpeed: 1,
    pickupRadius: 1,
  },
  radius: 0.5,
  loadout: {
    slots: {
      melee: "ability.gaoler_cleave",
      ranged: undefined,
      skill_up: undefined,
      skill_right: undefined,
      skill_down: undefined,
      skill_left: undefined,
    },
    passives: { passive_1: undefined, passive_2: undefined },
  },
  ai: {
    thinkSeconds: 0.2,
    aggroRange: 9,
    leashRange: 14,
    actions: [{
      slot: "melee",
      minRange: 0,
      maxRange: 2,
      weight: 1,
      telegraphSeconds: 0.35,
      recoverySeconds: 0.3,
      requiresLineOfSight: false,
      telegraph: { shape: "cone", angle: 100, length: 2 },
    }],
  },
  drops: [],
} as const satisfies ActorArchetypeDef;
