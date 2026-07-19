export type ActionCategory = "melee" | "bow" | "gun" | "magic" | "other";
export type ActionLibraryId = "kaykit" | "ual1";

export interface NativeActionDef {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly category: ActionCategory;
  readonly featured: boolean;
}

export interface NativeActionLibrary {
  readonly id: ActionLibraryId;
  readonly label: string;
  readonly source: string;
  readonly url: string;
  readonly actions: readonly NativeActionDef[];
}

const KAYKIT_NAMES = [
  "Attack(1h)",
  "AttackCombo",
  "AttackSpinning",
  "BasePose",
  "Block",
  "Cheer",
  "Climbing",
  "Dance",
  "DashBack",
  "DashFront",
  "DashLeft",
  "DashRight",
  "Defeat",
  "HeavyAttack",
  "Hop",
  "Idle",
  "Interact",
  "Jump",
  "LayingDownIdle",
  "PickUp",
  "Roll",
  "Run",
  "Shoot(1h)",
  "Shoot(2h)",
  "Shoot(2h)Bow",
  "Shooting(1h)",
  "Shooting(2h)",
  "Throw",
  "Walk",
  "Wave",
] as const;

const UAL1_NAMES = [
  "A_TPose",
  "Crouch_Fwd_Loop",
  "Crouch_Idle_Loop",
  "Dance_Loop",
  "Death01",
  "Driving_Loop",
  "Fixing_Kneeling",
  "Hit_Chest",
  "Hit_Head",
  "Idle_Loop",
  "Idle_Talking_Loop",
  "Idle_Torch_Loop",
  "Interact",
  "Jog_Fwd_Loop",
  "Jump_Land",
  "Jump_Loop",
  "Jump_Start",
  "PickUp_Table",
  "Pistol_Aim_Down",
  "Pistol_Aim_Neutral",
  "Pistol_Aim_Up",
  "Pistol_Idle_Loop",
  "Pistol_Reload",
  "Pistol_Shoot",
  "Punch_Cross",
  "Punch_Jab",
  "Push_Loop",
  "Roll",
  "Roll_RM",
  "Sitting_Enter",
  "Sitting_Exit",
  "Sitting_Idle_Loop",
  "Sitting_Talking_Loop",
  "Spell_Simple_Enter",
  "Spell_Simple_Exit",
  "Spell_Simple_Idle_Loop",
  "Spell_Simple_Shoot",
  "Sprint_Loop",
  "Swim_Fwd_Loop",
  "Swim_Idle_Loop",
  "Sword_Attack",
  "Sword_Attack_RM",
  "Sword_Idle",
  "Walk_Formal_Loop",
  "Walk_Loop",
] as const;

const CATEGORY_BY_NAME = new Map<string, ActionCategory>([
  ...["Attack(1h)", "AttackCombo", "AttackSpinning", "HeavyAttack"].map(
    (name) => [name, "melee"] as const,
  ),
  ["Shoot(2h)Bow", "bow"],
  ...["Shoot(1h)", "Shoot(2h)", "Shooting(1h)", "Shooting(2h)"].map(
    (name) => [name, "gun"] as const,
  ),
  ...["Punch_Cross", "Punch_Jab", "Sword_Attack", "Sword_Attack_RM"].map(
    (name) => [name, "melee"] as const,
  ),
  ...[
    "Pistol_Aim_Down",
    "Pistol_Aim_Neutral",
    "Pistol_Aim_Up",
    "Pistol_Idle_Loop",
    "Pistol_Reload",
    "Pistol_Shoot",
  ].map((name) => [name, "gun"] as const),
  ...[
    "Spell_Simple_Enter",
    "Spell_Simple_Exit",
    "Spell_Simple_Idle_Loop",
    "Spell_Simple_Shoot",
  ].map((name) => [name, "magic"] as const),
]);

const FEATURED = new Set([
  "Attack(1h)",
  "AttackCombo",
  "AttackSpinning",
  "HeavyAttack",
  "Shoot(1h)",
  "Shoot(2h)",
  "Shoot(2h)Bow",
  "Shooting(1h)",
  "Shooting(2h)",
  "Pistol_Aim_Neutral",
  "Pistol_Reload",
  "Pistol_Shoot",
  "Spell_Simple_Enter",
  "Spell_Simple_Exit",
  "Spell_Simple_Idle_Loop",
  "Spell_Simple_Shoot",
  "Sword_Attack",
  "Sword_Attack_RM",
]);

const LABEL_BY_NAME: Readonly<Record<string, string>> = {
  "Attack(1h)": "单手横砍",
  AttackCombo: "连续挥砍",
  AttackSpinning: "旋身大挥砍",
  HeavyAttack: "蓄力重砍",
  "Shoot(1h)": "单手枪点射",
  "Shoot(2h)": "双手枪点射",
  "Shoot(2h)Bow": "弓箭发射",
  "Shooting(1h)": "单手枪连射",
  "Shooting(2h)": "双手枪连射",
  Pistol_Aim_Neutral: "手枪瞄准",
  Pistol_Reload: "手枪换弹",
  Pistol_Shoot: "手枪开火",
  Spell_Simple_Enter: "施法起手",
  Spell_Simple_Idle_Loop: "持续蓄力",
  Spell_Simple_Shoot: "远程施法发射",
  Spell_Simple_Exit: "施法收势",
  Sword_Attack: "挥剑攻击",
  Sword_Attack_RM: "挥剑前冲",
};

// 稳定编号来自原始 GLB 动作顺序，用户可直接回复编号选片。
function buildActions(prefix: string, names: readonly string[]): readonly NativeActionDef[] {
  return names.map((name, index) => ({
    id: `${prefix}${String(index + 1).padStart(2, "0")}`,
    name,
    label: LABEL_BY_NAME[name] ?? name,
    category: CATEGORY_BY_NAME.get(name) ?? "other",
    featured: FEATURED.has(name),
  }));
}

export const ACTION_LIBRARIES: readonly NativeActionLibrary[] = [
  {
    id: "kaykit",
    label: "KayKit · 30 个",
    source: "KayKit Character Animations 1.2",
    url: "/game-assets/action-lab/kaykit-character-animations-v1.2.glb",
    actions: buildActions("K", KAYKIT_NAMES),
  },
  {
    id: "ual1",
    label: "Quaternius · 45 个",
    source: "Universal Animation Library 1 Standard",
    url: "/game-assets/action-lab/quaternius-ual1-standard.glb",
    actions: buildActions("U", UAL1_NAMES),
  },
];
