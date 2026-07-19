import type { ItemRarity } from "../../../content/Definitions";
import { MELEE_WEAPON_CATALOG } from "../../../content/weapons/MeleeWeaponCatalog";
import type {
  EquipmentWeaponPieceDef,
  HumanoidEquipmentAppearanceDef,
} from "./EquipmentAppearance";

const RARITY_GLOW = {
  normal: { scale: 1, alpha: 0, emissive: "#000000" },
  magic: { scale: 1.08, alpha: 0.2, emissive: "#1d6d91" },
  rare: { scale: 1.16, alpha: 0.28, emissive: "#682594" },
  unique: { scale: 1.27, alpha: 0.36, emissive: "#b64c10" },
} as const satisfies Record<ItemRarity, { scale: number; alpha: number; emissive: string }>;

const ELEMENT_PALETTE = {
  physical: { edge: "#d7e1e5", core: "#77838a", glow: "#d7efff" },
  fire: { edge: "#ffd15c", core: "#a52b18", glow: "#ff5a18" },
  ice: { edge: "#d7fbff", core: "#4f9bb5", glow: "#55dfff" },
  poison: { edge: "#d7ff68", core: "#496527", glow: "#88ef35" },
  storm: { edge: "#efe6ff", core: "#7658b5", glow: "#9b72ff" },
} as const;

function bladePieces(): readonly EquipmentWeaponPieceDef[] {
  return [
    { material: "grip", size: [0.08, 0.26, 0.08], position: [0, 0.12, 0] },
    { material: "guard", size: [0.34, 0.07, 0.1], position: [0, 0.28, 0] },
    { material: "core", size: [0.13, 0.68, 0.055], position: [0.035, 0.64, 0], rotation: [0, 0, -0.08] },
    { material: "edge", size: [0.055, 0.64, 0.068], position: [-0.055, 0.65, 0], rotation: [0, 0, -0.08] },
    { material: "edge", size: [0.11, 0.14, 0.06], position: [0.085, 1, 0], rotation: [0, 0, 0.58] },
  ];
}

function swordPieces(): readonly EquipmentWeaponPieceDef[] {
  return [
    { material: "grip", size: [0.08, 0.28, 0.08], position: [0, 0.13, 0] },
    { material: "guard", size: [0.42, 0.08, 0.11], position: [0, 0.3, 0] },
    { material: "core", size: [0.17, 0.72, 0.065], position: [0, 0.7, 0] },
    { material: "edge", size: [0.035, 0.68, 0.075], position: [-0.085, 0.69, 0] },
    { material: "edge", size: [0.035, 0.68, 0.075], position: [0.085, 0.69, 0] },
    { material: "edge", size: [0.16, 0.18, 0.065], position: [0, 1.08, 0], rotation: [0, 0, Math.PI / 4] },
  ];
}

function axePieces(): readonly EquipmentWeaponPieceDef[] {
  return [
    { material: "grip", size: [0.1, 0.86, 0.1], position: [0, 0.42, 0] },
    { material: "guard", size: [0.13, 0.24, 0.13], position: [0, 0.75, 0] },
    { material: "core", size: [0.46, 0.38, 0.12], position: [-0.14, 0.92, 0], rotation: [0, 0, -0.12] },
    { material: "edge", size: [0.12, 0.4, 0.14], position: [-0.38, 0.91, 0], rotation: [0, 0, -0.2] },
    { material: "edge", size: [0.18, 0.15, 0.13], position: [0.13, 0.98, 0], rotation: [0, 0, Math.PI / 4] },
  ];
}

function hammerPieces(): readonly EquipmentWeaponPieceDef[] {
  return [
    { material: "grip", size: [0.11, 0.86, 0.11], position: [0, 0.42, 0] },
    { material: "guard", size: [0.15, 0.25, 0.15], position: [0, 0.72, 0] },
    { material: "core", size: [0.68, 0.34, 0.32], position: [0, 0.94, 0] },
    { material: "edge", size: [0.16, 0.4, 0.36], position: [-0.35, 0.94, 0] },
    { material: "edge", size: [0.16, 0.4, 0.36], position: [0.35, 0.94, 0] },
  ];
}

const FAMILY_PIECES = {
  blade: bladePieces,
  sword: swordPieces,
  axe: axePieces,
  hammer: hammerPieces,
} as const;

// 稀有度外壳只包住主刃/锤头，不把握柄也糊成一团光。
function glowPieces(
  pieces: readonly EquipmentWeaponPieceDef[],
  rarity: ItemRarity,
): readonly EquipmentWeaponPieceDef[] {
  if (rarity === "normal") return [];
  const scale = RARITY_GLOW[rarity].scale;
  return pieces
    .filter((piece) => piece.material === "core" || piece.material === "edge")
    .map((piece) => ({
      ...piece,
      material: "glow",
      size: [piece.size[0] * scale, piece.size[1] * scale, piece.size[2] * scale],
    }));
}

export const MELEE_WEAPON_APPEARANCES: readonly HumanoidEquipmentAppearanceDef[] = (
  MELEE_WEAPON_CATALOG.map((weapon) => {
    const palette = ELEMENT_PALETTE[weapon.attackTag];
    const rarityGlow = RARITY_GLOW[weapon.rarity];
    const pieces = FAMILY_PIECES[weapon.family]();
    return {
      id: weapon.visual,
      slot: "melee",
      materials: {
        grip: { color: weapon.rarity === "unique" ? "#4b1d13" : "#3a2721" },
        guard: { color: weapon.rarity === "normal" ? "#6c7478" : palette.core, emissive: rarityGlow.emissive },
        core: { color: palette.core, emissive: rarityGlow.emissive },
        edge: { color: palette.edge, emissive: weapon.rarity === "normal" ? "#182127" : palette.glow },
        glow: { color: palette.glow, emissive: palette.glow, alpha: rarityGlow.alpha },
      },
      weapon: {
        anchor: "melee",
        pieces: [...glowPieces(pieces, weapon.rarity), ...pieces],
      },
    };
  })
);
