import type { EquipmentSlot } from "../../../content/Definitions";
import type {
  HumanoidMaterialDef,
  HumanoidSurfaceName,
  HumanoidWearPieceDef,
} from "./HumanoidAppearance";
import { MELEE_WEAPON_APPEARANCES } from "./MeleeWeaponAppearance";

export interface EquipmentWeaponPieceDef {
  readonly material: string;
  readonly size: readonly [number, number, number];
  readonly position: readonly [number, number, number];
  readonly rotation?: readonly [number, number, number];
}

export interface HumanoidEquipmentAppearanceDef {
  readonly id: string;
  readonly slot: EquipmentSlot;
  readonly materials: Readonly<Record<string, HumanoidMaterialDef>>;
  readonly surfaces?: Partial<Record<HumanoidSurfaceName, string>>;
  readonly pieces?: readonly HumanoidWearPieceDef[];
  readonly weapon?: {
    readonly anchor: "melee" | "ranged";
    readonly pieces: readonly EquipmentWeaponPieceDef[];
  };
}

export const HUMANOID_EQUIPMENT_APPEARANCES = [
  {
    id: "equipment.head.traveler_cap",
    slot: "head",
    materials: { cloth: { color: "#234f63" } },
    pieces: [
      { surface: "head", material: "cloth", scale: [1.08, 0.2, 1.08], offset: [0, 0.48, -0.01] },
    ],
  },
  {
    id: "equipment.chest.traveler_tunic",
    slot: "chest",
    materials: { cloth: { color: "#17394b" } },
    surfaces: {
      torso: "cloth",
      upperArmL: "cloth",
      upperArmR: "cloth",
    },
  },
  {
    id: "equipment.wrists.traveler_bracers",
    slot: "wrists",
    materials: { leather: { color: "#6b3828" } },
    pieces: [
      { surface: "lowerArmL", material: "leather", scale: [1.08, 0.32, 1.08], offset: [0, -0.32, 0] },
      { surface: "lowerArmR", material: "leather", scale: [1.08, 0.32, 1.08], offset: [0, -0.32, 0] },
    ],
  },
  {
    id: "equipment.legs.traveler_pants",
    slot: "legs",
    materials: { cloth: { color: "#0a1d29" } },
    surfaces: {
      upperLegL: "cloth",
      lowerLegL: "cloth",
      upperLegR: "cloth",
      lowerLegR: "cloth",
    },
  },
  {
    id: "equipment.feet.traveler_boots",
    slot: "feet",
    materials: { leather: { color: "#5b3023" } },
    surfaces: { footL: "leather", footR: "leather" },
  },
  {
    id: "equipment.chest.ember_coat",
    slot: "chest",
    materials: {
      cloth: { color: "#651f1b" },
      plate: { color: "#a94b2e", emissive: "#321008" },
    },
    surfaces: {
      torso: "cloth",
      upperArmL: "cloth",
      upperArmR: "cloth",
    },
    pieces: [
      { surface: "torso", material: "plate", scale: [1.08, 0.66, 1.1], offset: [0, 0.08, 0] },
    ],
  },
  ...MELEE_WEAPON_APPEARANCES,
  {
    id: "equipment.weapon.hunter_bow",
    slot: "ranged",
    materials: {
      wood: { color: "#6a3925" },
      string: { color: "#7ce8ef", emissive: "#12383b" },
    },
    weapon: {
      anchor: "ranged",
      pieces: [
        { material: "wood", size: [0.1, 0.62, 0.12], position: [0, 0.28, 0], rotation: [0, 0, -0.22] },
        { material: "wood", size: [0.1, 0.62, 0.12], position: [0, -0.28, 0], rotation: [0, 0, 0.22] },
        { material: "string", size: [0.035, 1.1, 0.035], position: [0.12, 0, 0] },
      ],
    },
  },
] as const satisfies readonly HumanoidEquipmentAppearanceDef[];

const appearanceById = new Map(HUMANOID_EQUIPMENT_APPEARANCES.map((value) => [value.id, value]));

export function getEquipmentAppearance(id: string): HumanoidEquipmentAppearanceDef {
  const appearance = appearanceById.get(
    id as typeof HUMANOID_EQUIPMENT_APPEARANCES[number]["id"],
  );
  if (!appearance) throw new Error(`Unknown equipment appearance: ${id}`);
  return appearance;
}
