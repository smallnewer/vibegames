import type { ActorArchetypeDef } from "../ActorDefinitions";

// 玩家角色也走同一个原型入口，避免英雄成为工厂里的隐藏特例。
export const EMBER_HERO = {
  id: "hero.ember_runner",
  name: "烬行者",
  role: "hero",
  visual: "visual.actor.ember_hero",
  stats: {
    maxHealth: 100,
    moveSpeed: 4.2,
    meleePower: 0,
    rangedPower: 0,
    armor: 0,
    attackSpeed: 1,
    cooldownRecovery: 0,
    pickupRadius: 1.4,
  },
  radius: 0.45,
  loadout: {
    slots: {
      melee: "ability.basic_melee",
      ranged: "ability.basic_ranged",
      skill_up: "ability.battle_focus",
      skill_right: "ability.shadow_step",
      skill_down: "ability.ember_nova",
      skill_left: "ability.molten_guard",
    },
    passives: { passive_1: "passive.iron_vitality", passive_2: undefined },
  },
  drops: [],
} as const satisfies ActorArchetypeDef;
