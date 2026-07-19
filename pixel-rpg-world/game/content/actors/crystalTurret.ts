import type { ActorArchetypeDef } from "../ActorDefinitions";

export const CRYSTAL_TURRET = {
  id: "enemy.crystal_turret",
  name: "晶体炮台",
  role: "minion",
  visual: "visual.actor.ember_sentinel",
  stats: {
    maxHealth: 80,
    moveSpeed: 0,
    meleePower: 0,
    rangedPower: 20,
    armor: 0,
    attackSpeed: 1,
    cooldownRecovery: 0,
    pickupRadius: 1,
  },
  radius: 0.6,
  loadout: {
    slots: {
      melee: undefined,
      ranged: "ability.crystal_shot",
      skill_up: undefined,
      skill_right: undefined,
      skill_down: undefined,
      skill_left: undefined,
    },
    passives: { passive_1: undefined, passive_2: undefined },
  },
  ai: {
    thinkSeconds: 0.1,
    warmupSeconds: 1.2,
    aggroRange: 12,
    leashRange: 14,
    actions: [{
      slot: "ranged",
      minRange: 0,
      maxRange: 12,
      weight: 1,
      telegraphSeconds: 0.4,
      recoverySeconds: 0.25,
      requiresLineOfSight: true,
      telegraph: { shape: "line", damageType: "storm", length: 12, width: 0.45 },
    }],
  },
  drops: [],
} as const satisfies ActorArchetypeDef;
