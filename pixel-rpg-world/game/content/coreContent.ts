import { ContentRegistry } from "./ContentRegistry";
import { ACTOR_VISUAL_DATA } from "./generated/actorVisuals";
import { ABILITY_DATA } from "./generated/abilities";
import { registerActors } from "./actors/registerActors";
import { registerMeleeWeaponContent } from "./weapons/MeleeWeaponCatalog";
import { ITEM_BASES, UNIQUE_ITEMS, itemBase } from "../item/ItemCatalog";

// 当前训练场的内容全集；系统只认稳定 ID，不写死展示名和数值。
export function createCoreContent(): ContentRegistry {
  const content = new ContentRegistry();
  for (const visual of ACTOR_VISUAL_DATA) content.registerVisual(visual);

  content.registerStatus({
    id: "status.battle_focus",
    name: "Battle Focus",
    duration: 4,
    maxStacks: 1,
    stacking: "refresh",
    modifiers: { percent: { attackSpeed: 0.18 } },
  });
  content.registerStatus({
    id: "status.battle_focus_master",
    name: "Battle Focus Mastery",
    duration: 4,
    maxStacks: 1,
    stacking: "refresh",
    modifiers: { flat: { damageBonus: 0.08 } },
  });
  content.registerStatus({
    id: "status.molten_guard",
    name: "Molten Guard",
    duration: 3,
    maxStacks: 1,
    stacking: "refresh",
    modifiers: { flat: { damageReduction: 0.3 } },
  });
  content.registerStatus({
    id: "status.molten_guard_master",
    name: "Molten Guard Mastery",
    duration: 3,
    maxStacks: 1,
    stacking: "refresh",
    modifiers: { flat: { damageReduction: 0.1 } },
  });
  content.registerStatus({
    id: "status.ice_slow",
    name: "寒意",
    duration: 2.5,
    maxStacks: 1,
    stacking: "refresh",
    modifiers: { percent: { moveSpeed: -0.35 } },
    visual: "vfx.status.frozen",
  });
  content.registerStatus({
    id: "status.rooted",
    name: "缠根",
    duration: 0.75,
    maxStacks: 1,
    stacking: "refresh",
    modifiers: { percent: { moveSpeed: -0.8 } },
    visual: "vfx.status.rooted",
  });
  content.registerStatus({
    id: "status.vulnerable",
    name: "易伤",
    duration: 3,
    maxStacks: 1,
    stacking: "refresh",
    modifiers: { percent: { armor: -0.2 } },
    visual: "vfx.status.vulnerable",
  });
  content.registerStatus({
    id: "status.warding_totem",
    name: "守御结界",
    duration: 0.75,
    maxStacks: 1,
    stacking: "refresh",
    modifiers: {
      flat: {
        fireResist: 0.2,
        iceResist: 0.2,
        poisonResist: 0.2,
        stormResist: 0.2,
      },
    },
    visual: "vfx.status.warding_totem",
  });
  content.registerStatus({
    id: "status.execution_rush",
    name: "处决疾速",
    duration: 3,
    maxStacks: 1,
    stacking: "refresh",
    modifiers: { percent: { attackSpeed: 0.12 } },
  });

  registerMeleeWeaponContent(content);
  for (const ability of ABILITY_DATA) content.registerAbility(ability);
  content.registerAbility({
    id: "ability.stalker_bite",
    name: "Stalker Bite",
    slot: "melee",
    cooldown: 0.9,
    action: "melee",
    actionTime: 0.28,
    visual: "vfx.stalker_bite",
    effect: {
      type: "sequence",
      children: [
        { type: "query_melee", range: 1.55, frontDot: -0.1 },
        {
          type: "damage",
          value: {
            damageType: "physical", minBase: 0, maxBase: 0,
            scalingStat: "meleePower", coefficient: 1, canCrit: false, procCoefficient: 1,
          },
        },
      ],
    },
  });
  content.registerAbility({
    id: "ability.gaoler_cleave",
    name: "Gaoler Cleave",
    slot: "melee",
    cooldown: 1.15,
    action: "melee",
    actionTime: 0.42,
    visual: "vfx.gaoler_cleave",
    effect: {
      type: "sequence",
      children: [
        { type: "query_cone", range: 2, frontDot: -0.15 },
        {
          type: "damage",
          value: {
            damageType: "physical", minBase: 0, maxBase: 0,
            scalingStat: "meleePower", coefficient: 1, canCrit: false, procCoefficient: 1,
          },
        },
      ],
    },
  });
  content.registerAbility({
    id: "ability.furnace_shot",
    name: "Furnace Shot",
    slot: "ranged",
    cooldown: 1.35,
    action: "ranged",
    actionTime: 0.35,
    visual: "vfx.furnace_shot",
    effect: {
      type: "spawn_projectile",
      value: {
        damageType: "fire", minBase: 0, maxBase: 0,
        scalingStat: "rangedPower", coefficient: 1, canCrit: false, procCoefficient: 1,
      },
      speed: 7,
      lifetime: 2,
      radius: 0.2,
    },
  });
  content.registerAbility({
    id: "ability.champion_charge",
    name: "Champion Charge",
    slot: "active",
    cooldown: 3,
    action: "skill",
    actionTime: 0.48,
    visual: "vfx.champion_charge",
    effect: {
      type: "sequence",
      children: [
        { type: "teleport_forward", distance: 2.8 },
        { type: "query_cone", range: 2.2, frontDot: -0.1 },
        {
          type: "damage",
          value: {
            damageType: "physical", minBase: 0, maxBase: 0,
            scalingStat: "meleePower", coefficient: 1.1, canCrit: false, procCoefficient: 1,
          },
        },
      ],
    },
  });
  content.registerAbility({
    id: "ability.hearn_cleave",
    name: "Iron Oath Cleave",
    slot: "melee",
    cooldown: 1.5,
    action: "melee",
    actionTime: 0.52,
    visual: "vfx.hearn_cleave",
    effect: {
      type: "sequence",
      children: [
        { type: "query_cone", range: 2.2, frontDot: -0.25 },
        {
          type: "damage",
          value: {
            damageType: "physical", minBase: 2, maxBase: 4,
            scalingStat: "meleePower", coefficient: 1, canCrit: false, procCoefficient: 1,
          },
        },
        { type: "knockback", distance: 1.1 },
      ],
    },
  });
  content.registerAbility({
    id: "ability.hearn_charge",
    name: "Aimed Gaol Charge",
    slot: "active",
    cooldown: 2.8,
    action: "skill",
    actionTime: 0.5,
    visual: "vfx.hearn_charge",
    effect: {
      type: "sequence",
      children: [
        { type: "teleport_forward", distance: 3.2 },
        { type: "query_cone", range: 2.4, frontDot: -0.1 },
        {
          type: "damage",
          value: {
            damageType: "physical", minBase: 3, maxBase: 5,
            scalingStat: "meleePower", coefficient: 1.1, canCrit: false, procCoefficient: 1,
          },
        },
      ],
    },
  });
  content.registerAbility({
    id: "ability.hearn_fire_ring",
    name: "Burning Edict",
    slot: "active",
    cooldown: 4,
    action: "skill",
    actionTime: 0.65,
    visual: "vfx.hearn_fire_ring",
    effect: {
      type: "parallel",
      children: [
        {
          type: "delay",
          seconds: 0.15,
          child: {
            type: "sequence",
            children: [
              { type: "query_circle", center: "source", radius: 2.8 },
              {
                type: "damage",
                value: {
                  damageType: "fire", minBase: 12, maxBase: 12,
                  scalingStat: "skillPower", coefficient: 0.5, canCrit: false, procCoefficient: 1,
                },
              },
            ],
          },
        },
        {
          type: "delay",
          seconds: 0.45,
          child: {
            type: "sequence",
            children: [
              { type: "query_circle", center: "source", radius: 5 },
              {
                type: "damage",
                value: {
                  damageType: "fire", minBase: 10, maxBase: 10,
                  scalingStat: "skillPower", coefficient: 0.4, canCrit: false, procCoefficient: 1,
                },
              },
              { type: "emit_visual", visual: "vfx.hearn_fire_ring_impact" },
            ],
          },
        },
      ],
    },
  });
  content.registerAbility({
    id: "ability.hearn_call_gaolers",
    name: "Call the Gaolers",
    slot: "active",
    cooldown: 30,
    action: "skill",
    actionTime: 0.7,
    visual: "vfx.hearn_call_gaolers",
    effect: {
      type: "sequence",
      children: [
        { type: "summon_actor", actor: "enemy.ember_gaoler", count: 2, radius: 2.5 },
        { type: "emit_visual", visual: "vfx.hearn_call_gaolers_impact" },
      ],
    },
  });
  content.registerAbility({
    id: "ability.hearn_double_charge",
    name: "Last Lock Double Charge",
    slot: "active",
    cooldown: 3.2,
    action: "skill",
    actionTime: 0.7,
    visual: "vfx.hearn_double_charge",
    effect: {
      type: "sequence",
      children: [
        { type: "teleport_forward", distance: 3 },
        { type: "query_cone", range: 2.4, frontDot: -0.1 },
        {
          type: "damage",
          value: {
            damageType: "physical", minBase: 4, maxBase: 6,
            scalingStat: "meleePower", coefficient: 1, canCrit: false, procCoefficient: 1,
          },
        },
        {
          type: "delay",
          seconds: 0.18,
          child: {
            type: "sequence",
            children: [
              { type: "teleport_forward", distance: 3 },
              { type: "query_cone", range: 2.4, frontDot: -0.1 },
              {
                type: "damage",
                value: {
                  damageType: "physical", minBase: 4, maxBase: 6,
                  scalingStat: "meleePower", coefficient: 1, canCrit: false, procCoefficient: 1,
                },
              },
            ],
          },
        },
      ],
    },
  });
  content.registerAbility({
    id: "ability.colossus_bolt",
    name: "Colossus Bolt",
    slot: "ranged",
    cooldown: 1.4,
    action: "ranged",
    actionTime: 0.32,
    visual: "vfx.colossus_bolt",
    effect: {
      type: "spawn_projectile",
      value: {
        damageType: "fire", minBase: 0, maxBase: 0,
        scalingStat: "rangedPower", coefficient: 1, canCrit: false, procCoefficient: 1,
      },
      speed: 6,
      lifetime: 2.6,
      radius: 0.24,
    },
  });
  content.registerAbility({
    id: "ability.colossus_slam",
    name: "Colossus Slam",
    slot: "melee",
    cooldown: 1.6,
    action: "melee",
    actionTime: 0.5,
    visual: "vfx.colossus_slam",
    effect: {
      type: "sequence",
      children: [
        { type: "query_circle", center: "source", radius: 2.2 },
        {
          type: "damage",
          value: {
            damageType: "physical", minBase: 0, maxBase: 0,
            scalingStat: "meleePower", coefficient: 1, canCrit: false, procCoefficient: 1,
          },
        },
        { type: "knockback", distance: 1.2 },
      ],
    },
  });
  content.registerAbility({
    id: "ability.colossus_nova",
    name: "Colossus Nova",
    slot: "active",
    cooldown: 4.2,
    action: "skill",
    actionTime: 0.6,
    visual: "vfx.colossus_nova",
    effect: {
      type: "delay",
      seconds: 0.3,
      child: {
        type: "sequence",
        children: [
          { type: "query_circle", center: "source", radius: 4.2 },
          {
            type: "damage",
            value: {
              damageType: "fire", minBase: 18, maxBase: 18,
              scalingStat: "skillPower", coefficient: 0, canCrit: false, procCoefficient: 1,
            },
          },
          { type: "emit_visual", visual: "vfx.colossus_nova_impact" },
        ],
      },
    },
  });
  content.registerAbility({
    id: "ability.basic_ranged",
    name: "Basic Ranged",
    slot: "ranged",
    cooldown: 0.65,
    action: "ranged",
    actionTime: 0.24,
    visual: "vfx.arrow_shot",
    effect: {
      type: "spawn_projectile",
      value: {
        damageType: "physical", minBase: 0, maxBase: 0,
        scalingStat: "rangedPower", coefficient: 1, canCrit: true, procCoefficient: 1,
      },
      speed: 9,
      lifetime: 1.6,
      radius: 0.18,
    },
  });
  content.registerAbility({
    id: "ability.crystal_shot",
    name: "Crystal Shot",
    slot: "ranged",
    cooldown: 1.2,
    action: "ranged",
    actionTime: 0.24,
    visual: "vfx.crystal_shot",
    effect: {
      type: "spawn_projectile",
      value: {
        damageType: "storm", minBase: 20, maxBase: 20,
        scalingStat: "rangedPower", coefficient: 0, canCrit: false, procCoefficient: 1,
      },
      speed: 5.5,
      lifetime: 2.5,
      radius: 0.18,
    },
  });
  content.registerPassive({
    id: "passive.ember_guard",
    name: "Ember Guard",
    modifiers: { percent: { maxHealth: 0.2 } },
  });
  content.registerPassive({
    id: "passive.iron_vitality",
    name: "钢铁体魄",
    modifiers: { percent: { maxHealth: 0.08 }, flat: { armor: 6 } },
    rankModifiers: [
      { percent: { maxHealth: 0.08 }, flat: { armor: 6 } },
      { percent: { maxHealth: 0.12 }, flat: { armor: 10 } },
      { percent: { maxHealth: 0.16 }, flat: { armor: 15 } },
    ],
  });
  content.registerPassive({
    id: "passive.execution_rush",
    name: "处决疾行",
    modifiers: { percent: { meleePower: 0.06 } },
    rankModifiers: [
      { percent: { meleePower: 0.06 } },
      { percent: { meleePower: 0.1 } },
      { percent: { meleePower: 0.15 } },
    ],
    onKillStatus: "status.execution_rush",
  });
  content.registerPassive({
    id: "passive.hawkeye",
    name: "鹰眼",
    modifiers: { percent: { rangedPower: 0.06 }, flat: { critRating: 4 } },
    rankModifiers: [
      { percent: { rangedPower: 0.06 }, flat: { critRating: 4 } },
      { percent: { rangedPower: 0.1 }, flat: { critRating: 7 } },
      { percent: { rangedPower: 0.15 }, flat: { critRating: 10 } },
    ],
  });
  content.registerPassive({
    id: "passive.runic_ward",
    name: "符文护持",
    modifiers: {
      percent: { skillPower: 0.06 },
      flat: { fireResist: 0.03, iceResist: 0.03, poisonResist: 0.03, stormResist: 0.03 },
    },
    rankModifiers: [
      {
        percent: { skillPower: 0.06 },
        flat: { fireResist: 0.03, iceResist: 0.03, poisonResist: 0.03, stormResist: 0.03 },
      },
      {
        percent: { skillPower: 0.1 },
        flat: { fireResist: 0.05, iceResist: 0.05, poisonResist: 0.05, stormResist: 0.05 },
      },
      {
        percent: { skillPower: 0.15 },
        flat: { fireResist: 0.08, iceResist: 0.08, poisonResist: 0.08, stormResist: 0.08 },
      },
    ],
  });

  content.registerItem({
    id: "item.hunter_bow",
    name: "Hunter Bow",
    slot: "ranged",
    visual: "equipment.weapon.hunter_bow",
    ability: "ability.basic_ranged",
    modifiers: { flat: { rangedPower: 30 } },
  });
  content.registerItem({
    id: "item.traveler_cap",
    name: "Traveler Cap",
    slot: "head",
    visual: "equipment.head.traveler_cap",
    modifiers: {},
  });
  content.registerItem({
    id: "item.traveler_tunic",
    name: "Traveler Tunic",
    slot: "chest",
    visual: "equipment.chest.traveler_tunic",
    modifiers: {},
  });
  content.registerItem({
    id: "item.traveler_bracers",
    name: "Traveler Bracers",
    slot: "wrists",
    visual: "equipment.wrists.traveler_bracers",
    modifiers: {},
  });
  content.registerItem({
    id: "item.traveler_pants",
    name: "Traveler Pants",
    slot: "legs",
    visual: "equipment.legs.traveler_pants",
    modifiers: {},
  });
  content.registerItem({
    id: "item.traveler_boots",
    name: "Traveler Boots",
    slot: "feet",
    visual: "equipment.feet.traveler_boots",
    modifiers: {},
  });
  content.registerItem({
    id: "item.ember_coat",
    name: "Ember Guard Coat",
    slot: "chest",
    visual: "equipment.chest.ember_coat",
    modifiers: {
      flat: { maxHealth: 15, armor: 20 },
      percent: { attackSpeed: 0.1 },
      final: { moveSpeed: 0.05 },
    },
    reinforce: { stat: "armor", perLevel: 3, maxLevel: 3 },
  });

  const generatedName = (id: string) => id.split(".").at(-1)!
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
  for (const base of ITEM_BASES) {
    content.registerItem({
      id: base.id,
      name: generatedName(base.id),
      slot: base.slot,
      visual: base.visual,
      ability: base.slot === "melee"
        ? "ability.basic_melee"
        : base.slot === "ranged"
          ? "ability.basic_ranged"
          : undefined,
      modifiers: {},
    });
  }
  for (const unique of UNIQUE_ITEMS) {
    const base = itemBase(unique.base);
    content.registerItem({
      id: unique.id,
      name: generatedName(unique.id),
      slot: base.slot,
      visual: base.visual,
      ability: base.slot === "melee"
        ? "ability.basic_melee"
        : base.slot === "ranged"
          ? "ability.basic_ranged"
          : undefined,
      rarity: "unique",
      modifiers: {},
    });
  }

  registerActors(content);

  content.validate();
  return content;
}
