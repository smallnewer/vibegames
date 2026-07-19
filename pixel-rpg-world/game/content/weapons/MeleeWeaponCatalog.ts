import type { ContentRegistry } from "../ContentRegistry";
import type { AttackTag, ItemRarity, StatusDef } from "../Definitions";

export type MeleeWeaponFamily = "blade" | "sword" | "axe" | "hammer";

export interface MeleeWeaponCatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly family: MeleeWeaponFamily;
  readonly rarity: ItemRarity;
  readonly attackTag: AttackTag;
  readonly visual: string;
  readonly ability: string;
  readonly slashVisual: string;
  readonly meleePower: number;
  readonly onHitStatus?: string;
}

export const MELEE_STATUS_DEFINITIONS = [
  {
    id: "status.frozen",
    name: "Frozen",
    duration: 3.2,
    maxStacks: 1,
    stacking: "refresh",
    modifiers: { percent: { moveSpeed: -0.45 } },
    visual: "vfx.status.frozen",
  },
  {
    id: "status.poisoned",
    name: "Poisoned",
    duration: 4,
    maxStacks: 1,
    stacking: "refresh",
    modifiers: {},
    visual: "vfx.status.poisoned",
  },
  {
    id: "status.burning",
    name: "Burning",
    duration: 3.5,
    maxStacks: 1,
    stacking: "refresh",
    modifiers: {},
    visual: "vfx.status.burning",
  },
  {
    id: "status.stunned",
    name: "Stunned",
    duration: 1.8,
    maxStacks: 1,
    stacking: "refresh",
    modifiers: { percent: { moveSpeed: -0.95 } },
    visual: "vfx.status.stunned",
  },
  {
    id: "status.shrunk",
    name: "Shrunk",
    duration: 4,
    maxStacks: 1,
    stacking: "refresh",
    modifiers: {},
    visual: "vfx.status.shrunk",
  },
  {
    id: "status.enlarged",
    name: "Enlarged",
    duration: 4,
    maxStacks: 1,
    stacking: "refresh",
    modifiers: {},
    visual: "vfx.status.enlarged",
  },
] as const satisfies readonly StatusDef[];

// 首批武器固定为四类四品，玩法和表现都只认这些稳定 ID。
export const MELEE_WEAPON_CATALOG = [
  { id: "item.rust_blade", name: "铁背刀", family: "blade", rarity: "normal", attackTag: "physical", visual: "equipment.weapon.rust_blade", ability: "ability.basic_melee", slashVisual: "vfx.melee.rust_blade", meleePower: 40 },
  { id: "item.venom_sabre", name: "毒牙弯刀", family: "blade", rarity: "magic", attackTag: "poison", visual: "equipment.weapon.venom_sabre", ability: "ability.weapon.venom_sabre", slashVisual: "vfx.melee.venom_sabre", meleePower: 44, onHitStatus: "status.poisoned" },
  { id: "item.frostbite_blade", name: "霜咬战刀", family: "blade", rarity: "rare", attackTag: "ice", visual: "equipment.weapon.frostbite_blade", ability: "ability.weapon.frostbite_blade", slashVisual: "vfx.melee.frostbite_blade", meleePower: 48, onHitStatus: "status.frozen" },
  { id: "item.ember_blade", name: "曜日长刀", family: "blade", rarity: "unique", attackTag: "fire", visual: "equipment.weapon.ember_blade", ability: "ability.weapon.ember_blade", slashVisual: "vfx.melee.ember_blade", meleePower: 48, onHitStatus: "status.burning" },

  { id: "item.guard_sword", name: "卫戍剑", family: "sword", rarity: "normal", attackTag: "physical", visual: "equipment.weapon.guard_sword", ability: "ability.weapon.guard_sword", slashVisual: "vfx.melee.guard_sword", meleePower: 40 },
  { id: "item.storm_sword", name: "逐电剑", family: "sword", rarity: "magic", attackTag: "storm", visual: "equipment.weapon.storm_sword", ability: "ability.weapon.storm_sword", slashVisual: "vfx.melee.storm_sword", meleePower: 44, onHitStatus: "status.stunned" },
  { id: "item.glacier_sword", name: "冰誓剑", family: "sword", rarity: "rare", attackTag: "ice", visual: "equipment.weapon.glacier_sword", ability: "ability.weapon.glacier_sword", slashVisual: "vfx.melee.glacier_sword", meleePower: 48, onHitStatus: "status.frozen" },
  { id: "item.phoenix_greatsword", name: "凰焰巨剑", family: "sword", rarity: "unique", attackTag: "fire", visual: "equipment.weapon.phoenix_greatsword", ability: "ability.weapon.phoenix_greatsword", slashVisual: "vfx.melee.phoenix_greatsword", meleePower: 52, onHitStatus: "status.burning" },

  { id: "item.frontier_axe", name: "拓荒斧", family: "axe", rarity: "normal", attackTag: "physical", visual: "equipment.weapon.frontier_axe", ability: "ability.weapon.frontier_axe", slashVisual: "vfx.melee.frontier_axe", meleePower: 40 },
  { id: "item.plague_axe", name: "疫喙斧", family: "axe", rarity: "magic", attackTag: "poison", visual: "equipment.weapon.plague_axe", ability: "ability.weapon.plague_axe", slashVisual: "vfx.melee.plague_axe", meleePower: 44, onHitStatus: "status.poisoned" },
  { id: "item.thunder_axe", name: "裂雷斧", family: "axe", rarity: "rare", attackTag: "storm", visual: "equipment.weapon.thunder_axe", ability: "ability.weapon.thunder_axe", slashVisual: "vfx.melee.thunder_axe", meleePower: 48, onHitStatus: "status.stunned" },
  { id: "item.inferno_axe", name: "炼狱刑斧", family: "axe", rarity: "unique", attackTag: "fire", visual: "equipment.weapon.inferno_axe", ability: "ability.weapon.inferno_axe", slashVisual: "vfx.melee.inferno_axe", meleePower: 52, onHitStatus: "status.burning" },

  { id: "item.iron_maul", name: "铸铁锤", family: "hammer", rarity: "normal", attackTag: "physical", visual: "equipment.weapon.iron_maul", ability: "ability.weapon.iron_maul", slashVisual: "vfx.melee.iron_maul", meleePower: 40 },
  { id: "item.frost_bell_hammer", name: "霜钟锤", family: "hammer", rarity: "magic", attackTag: "ice", visual: "equipment.weapon.frost_bell_hammer", ability: "ability.weapon.frost_bell_hammer", slashVisual: "vfx.melee.frost_bell_hammer", meleePower: 44, onHitStatus: "status.frozen" },
  { id: "item.venom_warhammer", name: "瘴毒战锤", family: "hammer", rarity: "rare", attackTag: "poison", visual: "equipment.weapon.venom_warhammer", ability: "ability.weapon.venom_warhammer", slashVisual: "vfx.melee.venom_warhammer", meleePower: 48, onHitStatus: "status.poisoned" },
  { id: "item.heavenfall_hammer", name: "天陨雷锤", family: "hammer", rarity: "unique", attackTag: "storm", visual: "equipment.weapon.heavenfall_hammer", ability: "ability.weapon.heavenfall_hammer", slashVisual: "vfx.melee.heavenfall_hammer", meleePower: 52, onHitStatus: "status.stunned" },
] as const satisfies readonly MeleeWeaponCatalogEntry[];

export function registerMeleeWeaponContent(content: ContentRegistry): void {
  for (const status of MELEE_STATUS_DEFINITIONS) content.registerStatus(status);

  for (const weapon of MELEE_WEAPON_CATALOG as readonly MeleeWeaponCatalogEntry[]) {
    content.registerAbility({
      id: weapon.ability,
      name: weapon.name,
      slot: "melee",
      cooldown: 0.45,
      action: "melee",
      actionTime: 0.45,
      visual: weapon.slashVisual,
      timeline: {
        impactAt: 0.34,
        motion: { distance: 0.55, startAt: 0.12, endAt: 0.46, easing: "ease_out_cubic" },
      },
      effect: {
        type: "sequence",
        children: [
          { type: "query_melee", range: 1.65, frontDot: 0.2 },
          {
            type: "damage",
            value: {
              damageType: weapon.attackTag,
              minBase: 0,
              maxBase: 0,
              scalingStat: "meleePower",
              coefficient: 1,
              canCrit: true,
              procCoefficient: 1,
            },
          },
          ...(weapon.onHitStatus
            ? [{ type: "apply_status" as const, status: weapon.onHitStatus, stacks: 1 }]
            : []),
        ],
      },
    });
    content.registerItem({
      id: weapon.id,
      name: weapon.name,
      slot: "melee",
      visual: weapon.visual,
      ability: weapon.ability,
      rarity: weapon.rarity,
      attackTags: [weapon.attackTag],
      onHitStatus: weapon.onHitStatus,
      modifiers: { flat: { meleePower: weapon.meleePower } },
      ...(weapon.id === "item.ember_blade"
        ? { reinforce: { stat: "meleePower" as const, perLevel: 8, maxLevel: 3 } }
        : {}),
    });
  }
}
