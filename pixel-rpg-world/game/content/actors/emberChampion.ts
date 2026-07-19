import type { ActorArchetypeDef } from "../ActorDefinitions";

const CLEAVE = {
  slot: "melee", minRange: 0, maxRange: 2.2, weight: 4,
  telegraphSeconds: 0.45, recoverySeconds: 0.35, requiresLineOfSight: false,
  telegraph: { shape: "cone", angle: 115, length: 2.2 },
} as const;
const CHARGE = {
  slot: "skill_right", minRange: 2, maxRange: 8, weight: 3,
  telegraphSeconds: 0.45, recoverySeconds: 0.4, requiresLineOfSight: true,
  telegraph: { shape: "line", length: 8, width: 0.8 },
} as const;

export const EMBER_CHAMPION = {
  id: "elite.ember_champion",
  name: "烬甲冠军",
  role: "minion",
  visual: "visual.actor.ember_minion",
  stats: {
    maxHealth: 220,
    moveSpeed: 3.1,
    meleePower: 12,
    armor: 18,
    attackSpeed: 1,
    pickupRadius: 1,
  },
  radius: 0.65,
  loadout: {
    slots: {
      melee: "ability.gaoler_cleave",
      ranged: undefined,
      skill_up: undefined,
      skill_right: "ability.champion_charge",
      skill_down: undefined,
      skill_left: undefined,
    },
    passives: { passive_1: undefined, passive_2: undefined },
  },
  ai: {
    thinkSeconds: 0.18,
    aggroRange: 11,
    leashRange: 17,
    actions: [CLEAVE, CHARGE],
  },
  drops: [],
} as const satisfies ActorArchetypeDef;
