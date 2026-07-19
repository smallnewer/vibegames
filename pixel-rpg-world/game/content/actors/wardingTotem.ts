import type { ActorArchetypeDef } from "../ActorDefinitions";

export const WARDING_TOTEM = {
  id: "summon.warding_totem",
  name: "守御图腾",
  role: "minion",
  visual: "visual.actor.ember_sentinel",
  stats: {
    maxHealth: 30,
    moveSpeed: 0.01,
    armor: 20,
    attackSpeed: 1,
    pickupRadius: 1,
  },
  radius: 0.4,
  loadout: {
    slots: {
      melee: undefined,
      ranged: undefined,
      skill_up: undefined,
      skill_right: undefined,
      skill_down: undefined,
      skill_left: undefined,
    },
    passives: { passive_1: undefined, passive_2: undefined },
  },
  drops: [],
} as const satisfies ActorArchetypeDef;
