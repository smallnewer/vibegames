export const HUMANOID_SURFACES = [
  "head",
  "torso",
  "hips",
  "upperArmL",
  "lowerArmL",
  "handL",
  "upperArmR",
  "lowerArmR",
  "handR",
  "upperLegL",
  "lowerLegL",
  "footL",
  "upperLegR",
  "lowerLegR",
  "footR",
] as const;

export type HumanoidSurfaceName = typeof HUMANOID_SURFACES[number];
export type HumanoidWearSlot =
  | "face"
  | "hair"
  | "head"
  | "chest"
  | "wrists"
  | "legs"
  | "feet";

export interface HumanoidMaterialDef {
  readonly color: string;
  readonly emissive?: string;
  readonly texture?: string;
  readonly alpha?: number;
}

export interface HumanoidWearPieceDef {
  readonly surface: HumanoidSurfaceName;
  readonly material: string;
  readonly scale: readonly [number, number, number];
  readonly offset?: readonly [number, number, number];
}

export interface HumanoidWearableDef {
  readonly id: string;
  readonly slot: HumanoidWearSlot;
  readonly pieces: readonly HumanoidWearPieceDef[];
}

export interface HumanoidAppearanceDef {
  readonly id: string;
  readonly materials: Readonly<Record<string, HumanoidMaterialDef>>;
  readonly body: Readonly<Record<HumanoidSurfaceName, string>>;
  readonly wearables: readonly HumanoidWearableDef[];
}

// 贴身衣物替换身体表面；帽子、护腕等再用小型附加块覆盖。
const SIMPLE_BODY = {
  head: "skin",
  torso: "shirt",
  hips: "pants",
  upperArmL: "shirt",
  lowerArmL: "skin",
  handL: "skin",
  upperArmR: "shirt",
  lowerArmR: "skin",
  handR: "skin",
  upperLegL: "pants",
  lowerLegL: "pants",
  footL: "boots",
  upperLegR: "pants",
  lowerLegR: "pants",
  footR: "boots",
} as const satisfies Readonly<Record<HumanoidSurfaceName, string>>;

const FACE_AND_HAIR: readonly HumanoidWearableDef[] = [
  {
    id: "wearable.hair.cap",
    slot: "hair",
    pieces: [
      { surface: "head", material: "hair", scale: [1.05, 0.24, 1.05], offset: [0, 0.42, -0.02] },
    ],
  },
  {
    id: "wearable.face.simple",
    slot: "face",
    pieces: [
      { surface: "head", material: "eyes", scale: [0.12, 0.12, 0.06], offset: [-0.24, 0.06, 0.51] },
      { surface: "head", material: "eyes", scale: [0.12, 0.12, 0.06], offset: [0.24, 0.06, 0.51] },
    ],
  },
];

export const HUMANOID_APPEARANCES = [
  {
    id: "appearance.boss.ember",
    materials: {
      skin: { color: "#b88262" },
      shirt: { color: "#4b1b18" },
      pants: { color: "#201417" },
      boots: { color: "#261714" },
      hair: { color: "#211415" },
      eyes: { color: "#ff9b36", emissive: "#5d1708" },
      armor: { color: "#773226" },
    },
    body: SIMPLE_BODY,
    wearables: [
      ...FACE_AND_HAIR,
      {
        id: "wearable.armor.boss-chest",
        slot: "chest",
        pieces: [{ surface: "torso", material: "armor", scale: [1.06, 0.58, 1.08], offset: [0, 0.12, 0] }],
      },
    ],
  },
  {
    id: "appearance.hero.ember",
    materials: {
      skin: { color: "#d8a27f" },
      shirt: { color: "#17394b" },
      pants: { color: "#0a1d29" },
      boots: { color: "#5b3023" },
      hair: { color: "#17202c" },
      eyes: { color: "#52e8f2", emissive: "#0b343b" },
      wrists: { color: "#5b3023" },
    },
    body: SIMPLE_BODY,
    wearables: [
      ...FACE_AND_HAIR,
      {
        id: "wearable.guard.simple-wrists",
        slot: "wrists",
        pieces: [
          { surface: "lowerArmL", material: "wrists", scale: [1.06, 0.3, 1.06], offset: [0, -0.34, 0] },
          { surface: "lowerArmR", material: "wrists", scale: [1.06, 0.3, 1.06], offset: [0, -0.34, 0] },
        ],
      },
    ],
  },
  {
    id: "appearance.minion.ember",
    materials: {
      skin: { color: "#b8896d" },
      shirt: { color: "#533129" },
      pants: { color: "#241d1c" },
      boots: { color: "#1b1413" },
      hair: { color: "#2b1b18" },
      eyes: { color: "#f0783c", emissive: "#35100a" },
    },
    body: SIMPLE_BODY,
    wearables: FACE_AND_HAIR,
  },
  {
    id: "appearance.sentinel.ember",
    materials: {
      skin: { color: "#b99274" },
      shirt: { color: "#51463f" },
      pants: { color: "#292529" },
      boots: { color: "#19171a" },
      hair: { color: "#282327" },
      eyes: { color: "#bbf6ff", emissive: "#244a54" },
      hood: { color: "#353237" },
    },
    body: SIMPLE_BODY,
    wearables: [
      ...FACE_AND_HAIR,
      {
        id: "wearable.hood.sentinel",
        slot: "head",
        pieces: [{ surface: "head", material: "hood", scale: [1.12, 0.32, 1.12], offset: [0, 0.36, -0.03] }],
      },
    ],
  },
] as const satisfies readonly HumanoidAppearanceDef[];

const appearanceById = new Map(HUMANOID_APPEARANCES.map((appearance) => [appearance.id, appearance]));

// 内容只保存稳定 ID，Babylon 层在生成可见模型时解析具体外观。
export function getHumanoidAppearance(id: string): HumanoidAppearanceDef {
  const appearance = appearanceById.get(id as typeof HUMANOID_APPEARANCES[number]["id"]);
  if (!appearance) throw new Error(`Unknown humanoid appearance: ${id}`);
  return appearance;
}
