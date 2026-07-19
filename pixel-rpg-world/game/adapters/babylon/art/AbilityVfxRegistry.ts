export type AbilityEffectKind =
  | "melee_arc"
  | "cast_spark"
  | "buff_rune"
  | "nova_ring"
  | "step_trail";

export interface AbilityVfxRecipe {
  readonly visual: string;
  readonly kind: AbilityEffectKind;
  readonly color: string;
  readonly count: number;
  readonly life: number;
  readonly pattern: "source" | "radial" | "line";
}

type StoredRecipe = Omit<AbilityVfxRecipe, "visual">;

const WEAPON_RECIPES = Object.fromEntries(MELEE_WEAPON_CATALOG.map((weapon) => [
  weapon.slashVisual,
  {
    kind: "melee_arc",
    color: "#ffffff",
    count: 1,
    life: 0.3,
    pattern: "source",
  } satisfies StoredRecipe,
]));

const RECIPES: Readonly<Record<string, StoredRecipe>> = {
  ...WEAPON_RECIPES,
  "vfx.melee_arc": {
    kind: "melee_arc", color: "#ffd878", count: 1, life: 0.2, pattern: "source",
  },
  "vfx.arrow_shot": {
    kind: "cast_spark", color: "#67efff", count: 3, life: 0.22, pattern: "source",
  },
  "vfx.crystal_shot": {
    kind: "cast_spark", color: "#ff7738", count: 3, life: 0.22, pattern: "source",
  },
  "vfx.stalker_bite": {
    kind: "melee_arc", color: "#ff9b46", count: 1, life: 0.2, pattern: "source",
  },
  "vfx.gaoler_cleave": {
    kind: "melee_arc", color: "#f0a45d", count: 1, life: 0.24, pattern: "source",
  },
  "vfx.furnace_shot": {
    kind: "cast_spark", color: "#ff612b", count: 3, life: 0.24, pattern: "source",
  },
  "vfx.champion_charge": {
    kind: "step_trail", color: "#ff8b32", count: 6, life: 0.4, pattern: "line",
  },
  "vfx.hearn_cleave": {
    kind: "melee_arc", color: "#ffc05a", count: 2, life: 0.32, pattern: "source",
  },
  "vfx.hearn_charge": {
    kind: "step_trail", color: "#ff5a24", count: 8, life: 0.46, pattern: "line",
  },
  "vfx.hearn_fire_ring": {
    kind: "nova_ring", color: "#ff3d16", count: 2, life: 0.65, pattern: "source",
  },
  "vfx.hearn_fire_ring_impact": {
    kind: "nova_ring", color: "#ffca58", count: 3, life: 0.72, pattern: "radial",
  },
  "vfx.hearn_call_gaolers": {
    kind: "buff_rune", color: "#ff9a47", count: 6, life: 0.72, pattern: "radial",
  },
  "vfx.hearn_call_gaolers_impact": {
    kind: "cast_spark", color: "#ffd07b", count: 8, life: 0.42, pattern: "radial",
  },
  "vfx.hearn_double_charge": {
    kind: "step_trail", color: "#ffe064", count: 12, life: 0.58, pattern: "line",
  },
  "vfx.colossus_bolt": {
    kind: "cast_spark", color: "#ff3c16", count: 5, life: 0.3, pattern: "source",
  },
  "vfx.colossus_slam": {
    kind: "nova_ring", color: "#ff5a1f", count: 2, life: 0.48, pattern: "radial",
  },
  "vfx.colossus_nova": {
    kind: "nova_ring", color: "#ff2d0a", count: 2, life: 0.58, pattern: "source",
  },
  "vfx.colossus_nova_impact": {
    kind: "nova_ring", color: "#ffd05a", count: 3, life: 0.7, pattern: "radial",
  },
  "vfx.boss_phase_two": {
    kind: "buff_rune", color: "#ff6a20", count: 8, life: 0.8, pattern: "radial",
  },
  "vfx.boss_phase_one": {
    kind: "buff_rune", color: "#ffb34d", count: 5, life: 0.7, pattern: "radial",
  },
  "vfx.boss_phase_three": {
    kind: "nova_ring", color: "#ffdf5a", count: 3, life: 0.9, pattern: "radial",
  },
  "vfx.hearn_iron_oath": {
    kind: "buff_rune", color: "#ffc66b", count: 6, life: 0.8, pattern: "radial",
  },
  "vfx.hearn_burning_edict": {
    kind: "nova_ring", color: "#ff4a1c", count: 3, life: 0.9, pattern: "radial",
  },
  "vfx.hearn_last_lock": {
    kind: "nova_ring", color: "#ffe66a", count: 4, life: 1, pattern: "radial",
  },
  "vfx.battle_focus": {
    kind: "buff_rune", color: "#67efff", count: 3, life: 0.42, pattern: "radial",
  },
  "vfx.ember_nova": {
    kind: "nova_ring", color: "#ff8a2d", count: 1, life: 0.5, pattern: "source",
  },
  "vfx.ember_nova_impact": {
    kind: "nova_ring", color: "#ffd05a", count: 2, life: 0.55, pattern: "radial",
  },
  "vfx.frost_lance": {
    kind: "cast_spark", color: "#86dcff", count: 4, life: 0.28, pattern: "source",
  },
  "vfx.frost_lance_impact": {
    kind: "cast_spark", color: "#d7f4ff", count: 8, life: 0.38, pattern: "radial",
  },
  "vfx.ice_ring": {
    kind: "nova_ring", color: "#7ed9ff", count: 1, life: 0.56, pattern: "source",
  },
  "vfx.ice_ring_impact": {
    kind: "nova_ring", color: "#d5f6ff", count: 2, life: 0.64, pattern: "radial",
  },
  "vfx.storm_chain": {
    kind: "cast_spark", color: "#b8a2ff", count: 4, life: 0.3, pattern: "source",
  },
  "vfx.storm_chain_impact": {
    kind: "cast_spark", color: "#e3d9ff", count: 7, life: 0.38, pattern: "radial",
  },
  "vfx.gale_dash": {
    kind: "step_trail", color: "#a9f0d5", count: 7, life: 0.4, pattern: "line",
  },
  "vfx.hunter_volley": {
    kind: "cast_spark", color: "#f3dc83", count: 5, life: 0.3, pattern: "source",
  },
  "vfx.molten_guard": {
    kind: "buff_rune", color: "#ff8a38", count: 4, life: 0.62, pattern: "radial",
  },
  "vfx.molten_guard_explosion": {
    kind: "nova_ring", color: "#ffc45c", count: 2, life: 0.66, pattern: "radial",
  },
  "vfx.poison_trap": {
    kind: "cast_spark", color: "#8fc85a", count: 4, life: 0.38, pattern: "source",
  },
  "vfx.root_snare": {
    kind: "buff_rune", color: "#79b94e", count: 5, life: 0.58, pattern: "radial",
  },
  "vfx.warding_totem": {
    kind: "buff_rune", color: "#80e5b4", count: 6, life: 0.72, pattern: "radial",
  },
  "vfx.shadow_step": {
    kind: "step_trail", color: "#a968ff", count: 6, life: 0.38, pattern: "line",
  },
  "vfx.shadow_step_afterimage": {
    kind: "step_trail", color: "#8350ca", count: 4, life: 0.32, pattern: "line",
  },
  "vfx.shadow_step_impact": {
    kind: "cast_spark", color: "#d7b2ff", count: 8, life: 0.32, pattern: "radial",
  },
};

export const CORE_ABILITY_VISUAL_IDS = Object.freeze(Object.keys(RECIPES));

// 表现 ID 只能解析为有界配方，内容不能直接创建任意 Babylon 节点。
export class AbilityVfxRegistry {
  resolve(id: string): AbilityVfxRecipe {
    const recipe = RECIPES[id];
    if (!recipe) throw new Error(`Unknown ability visual: ${id}`);
    return { visual: id, ...recipe };
  }
}
import { MELEE_WEAPON_CATALOG } from "../../../content/weapons/MeleeWeaponCatalog";
