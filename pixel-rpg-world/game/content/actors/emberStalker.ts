import type { ActorArchetypeDef } from "../ActorDefinitions";

export const EMBER_STALKER = {
  id: "enemy.ember_stalker",
  name: "余烬猎兽",
  role: "minion",
  visual: "visual.actor.ember_minion",
  stats: {
    maxHealth: 70,
    moveSpeed: 3.2,
    meleePower: 5,
    rangedPower: 0,
    armor: 0,
    attackSpeed: 1,
    cooldownRecovery: 0,
    pickupRadius: 1,
  },
  radius: 0.5,
  loadout: {
    slots: {
      melee: "ability.stalker_bite",
      ranged: undefined,
      skill_up: undefined,
      skill_right: undefined,
      skill_down: undefined,
      skill_left: undefined,
    },
    passives: { passive_1: undefined, passive_2: undefined },
  },
  ai: {
    thinkSeconds: 0.18,
    aggroRange: 9,
    leashRange: 14,
    actions: [{
      slot: "melee",
      minRange: 0,
      maxRange: 1.55,
      weight: 1,
      telegraphSeconds: 0.3,
      recoverySeconds: 0.2,
      requiresLineOfSight: false,
      telegraph: { shape: "cone", angle: 90, length: 1.55 },
    }],
  },
  drops: [],
} as const satisfies ActorArchetypeDef;
