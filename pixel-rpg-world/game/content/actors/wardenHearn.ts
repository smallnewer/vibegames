import type { ActorArchetypeDef } from "../ActorDefinitions";

const CLEAVE = {
  slot: "melee", minRange: 0, maxRange: 2.2, weight: 4,
  telegraphSeconds: 0.65, recoverySeconds: 0.35, requiresLineOfSight: false,
  telegraph: { shape: "cone", angle: 120, length: 2.2 },
} as const;
const CHARGE = {
  slot: "skill_right", minRange: 2, maxRange: 8, weight: 3,
  telegraphSeconds: 0.8, recoverySeconds: 0.4, requiresLineOfSight: true,
  telegraph: { shape: "line", length: 8, width: 1.1 },
} as const;
const FIRE_RING = {
  slot: "skill_up", minRange: 0, maxRange: 5, weight: 5,
  telegraphSeconds: 1, recoverySeconds: 0.5, requiresLineOfSight: false,
  telegraph: { shape: "circle", damageType: "fire", radius: 5 },
} as const;
const SUMMON = {
  slot: "skill_down", minRange: 0, maxRange: 14, weight: 10,
  telegraphSeconds: 1, recoverySeconds: 0.6, requiresLineOfSight: false,
  telegraph: { shape: "circle", damageType: "fire", radius: 2.5 },
  maxUsesPerPhase: 1,
} as const;
const DOUBLE_CHARGE = {
  slot: "skill_left", minRange: 2, maxRange: 9, weight: 6,
  telegraphSeconds: 0.8, recoverySeconds: 0.55, requiresLineOfSight: true,
  telegraph: { shape: "line", length: 9, width: 1.2 },
} as const;

export const WARDEN_HEARN = {
  id: "boss.warden_hearn",
  name: "铁誓典狱长赫恩",
  role: "boss",
  visual: "visual.actor.ember_boss",
  stats: {
    maxHealth: 520,
    moveSpeed: 2.4,
    meleePower: 11,
    rangedPower: 0,
    skillPower: 10,
    armor: 16,
    fireResist: 0.2,
    attackSpeed: 1,
    pickupRadius: 1,
  },
  radius: 0.9,
  loadout: {
    slots: {
      melee: "ability.hearn_cleave",
      ranged: undefined,
      skill_up: "ability.hearn_fire_ring",
      skill_right: "ability.hearn_charge",
      skill_down: "ability.hearn_call_gaolers",
      skill_left: "ability.hearn_double_charge",
    },
    passives: { passive_1: undefined, passive_2: undefined },
  },
  ai: {
    thinkSeconds: 0.2,
    aggroRange: 14,
    leashRange: 20,
    actions: [CLEAVE, CHARGE],
  },
  boss: {
    phases: [
      {
        id: "phase.iron_oath",
        name: "铁誓",
        startsAtHealthRatio: 1,
        speedMultiplier: 1,
        actions: [CLEAVE, CHARGE],
        enterDuration: 0.8,
        enterVisual: "vfx.hearn_iron_oath",
        clearPendingEffects: true,
      },
      {
        id: "phase.burning_edict",
        name: "燃烧敕令",
        startsAtHealthRatio: 0.65,
        speedMultiplier: 1.15,
        actions: [SUMMON, FIRE_RING, CLEAVE, CHARGE],
        enterDuration: 0.8,
        enterVisual: "vfx.hearn_burning_edict",
        clearPendingEffects: true,
      },
      {
        id: "phase.last_lock",
        name: "最后一道锁",
        startsAtHealthRatio: 0.3,
        speedMultiplier: 1.3,
        actions: [DOUBLE_CHARGE, FIRE_RING, CLEAVE],
        enterDuration: 0.8,
        enterVisual: "vfx.hearn_last_lock",
        clearPendingEffects: true,
      },
    ],
  },
  drops: [],
} as const satisfies ActorArchetypeDef;
