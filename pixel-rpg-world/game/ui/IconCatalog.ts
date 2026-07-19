export const MASTER_ICON_IDS = [
  "icon.weapon.sword", "icon.weapon.longblade", "icon.weapon.axe",
  "icon.weapon.bow", "icon.weapon.crossbow", "icon.weapon.focus",
  "icon.armor.head", "icon.armor.chest", "icon.armor.wrists",
  "icon.armor.legs", "icon.armor.feet", "icon.generic.unknown",
  "icon.skill.burst", "icon.skill.movement", "icon.skill.buff",
  "icon.skill.shield", "icon.skill.projectile", "icon.skill.control",
  "icon.skill.trap", "icon.skill.totem",
  "icon.material.scrap", "icon.material.essence", "icon.material.seal",
  "icon.generic.passive",
] as const;

export type MasterIconId = typeof MASTER_ICON_IDS[number];
const MASTER_IDS = new Set<string>(MASTER_ICON_IDS);

const CONTENT_TINTS: Readonly<Record<string, string>> = {
  "ability.ember_nova": "#ff6b35",
  "ability.shadow_step": "#bd83ff",
  "ability.battle_focus": "#f0b44e",
  "ability.molten_guard": "#ff7b43",
  "ability.frost_lance": "#79d7ff",
  "ability.ice_ring": "#9cecff",
  "ability.storm_chain": "#b7a2ff",
  "ability.gale_dash": "#a8eee2",
  "ability.poison_trap": "#8bcf52",
  "ability.root_snare": "#86b85b",
  "ability.warding_totem": "#e4c66f",
  "ability.hunter_volley": "#d5ddc6",
  "material.ember_essence": "#ed713b",
  "material.frost_essence": "#74c7ff",
  "material.tide_essence": "#45b6c9",
  "material.spore_essence": "#8fca57",
  "material.storm_essence": "#aa91f4",
};

export function masterIconId(id?: string): MasterIconId {
  if (id && MASTER_IDS.has(id)) return id as MasterIconId;
  if (id === "icon.unknown") return "icon.generic.unknown";
  if (id === "material.scrap") return "icon.material.scrap";
  if (id === "material.seal") return "icon.material.seal";
  if (id?.startsWith("material.") && id.endsWith("_essence")) return "icon.material.essence";
  if (id?.startsWith("passive.")) return "icon.generic.passive";
  return "icon.generic.unknown";
}

export function gameIconUrl(id?: string): string {
  const master = masterIconId(id);
  return `/game-assets/icons/master/${master.slice("icon.".length).replaceAll(".", "-")}.png`;
}

export function gameIconTint(contentId?: string): string | undefined {
  return contentId ? CONTENT_TINTS[contentId] : undefined;
}
