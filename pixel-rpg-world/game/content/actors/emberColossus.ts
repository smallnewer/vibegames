import type { ActorArchetypeDef } from "../ActorDefinitions";

const SLAM = {
  slot: "melee", minRange: 0, maxRange: 1.5, weight: 3,
  telegraphSeconds: 0.65, recoverySeconds: 0.35, requiresLineOfSight: false,
  telegraph: { shape: "cone", angle: 110, length: 1.7 },
} as const;
const BOLT = {
  slot: "ranged", minRange: 3, maxRange: 14, weight: 2,
  telegraphSeconds: 0.65, recoverySeconds: 0.3, requiresLineOfSight: true,
  telegraph: { shape: "line", damageType: "fire", length: 14, width: 0.6 },
} as const;
const NOVA = {
  slot: "skill_up", minRange: 0, maxRange: 4.2, weight: 4,
  telegraphSeconds: 0.8, recoverySeconds: 0.45, requiresLineOfSight: false,
  telegraph: { shape: "circle", damageType: "fire", radius: 4.2 },
} as const;
const CHARGE = {
  slot: "skill_right", minRange: 2.4, maxRange: 8, weight: 4,
  telegraphSeconds: 0.8, recoverySeconds: 0.4, requiresLineOfSight: true,
  telegraph: { shape: "line", length: 8, width: 1.1 },
} as const;

// 新 Boss 的生产入口：属性、技能、AI、阶段和掉落都在这一份脚本里。
export const EMBER_COLOSSUS = {
  id: "boss.ember_colossus",
  name: "熔心巨像",
  role: "boss",
  visual: "visual.actor.ember_boss",
  stats: {
    maxHealth: 360,
    moveSpeed: 2.3,
    meleePower: 8,
    rangedPower: 6,
    armor: 12,
    attackSpeed: 1,
    cooldownRecovery: 0,
    pickupRadius: 1,
  },
  radius: 0.9,
  loadout: {
    slots: {
      melee: "ability.colossus_slam",
      ranged: "ability.colossus_bolt",
      skill_up: "ability.colossus_nova",
      skill_right: "ability.shadow_step",
      skill_down: "ability.battle_focus",
      skill_left: undefined,
    },
    passives: { passive_1: undefined, passive_2: undefined },
  },
  ai: {
    thinkSeconds: 0.22,
    aggroRange: 14,
    leashRange: 20,
    actions: [SLAM, BOLT],
  },
  boss: {
    phases: [
      {
        id: "boss_phase.ember_colossus_1",
        name: "熔岩苏醒",
        startsAtHealthRatio: 1,
        speedMultiplier: 1,
        enterDuration: 0.8,
        enterVisual: "vfx.boss_phase_one",
        clearPendingEffects: true,
        actions: [SLAM, BOLT],
      },
      {
        id: "boss_phase.ember_colossus_2",
        name: "熔心过载",
        startsAtHealthRatio: 0.65,
        speedMultiplier: 1.15,
        enterDuration: 0.8,
        enterVisual: "vfx.boss_phase_two",
        clearPendingEffects: true,
        actions: [NOVA, SLAM, BOLT],
      },
      {
        id: "boss_phase.ember_colossus_3",
        name: "核心崩解",
        startsAtHealthRatio: 0.3,
        speedMultiplier: 1.35,
        enterDuration: 0.8,
        enterVisual: "vfx.boss_phase_three",
        clearPendingEffects: true,
        actions: [CHARGE, NOVA, SLAM, BOLT],
      },
    ],
  },
  drops: [],
} as const satisfies ActorArchetypeDef;
