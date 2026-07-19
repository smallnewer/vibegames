export type StatusVfxKind =
  | "frozen"
  | "poisoned"
  | "burning"
  | "stunned"
  | "shrunk"
  | "enlarged";

export interface StatusVfxRecipe {
  readonly visual: string;
  readonly kind: StatusVfxKind;
  readonly color: string;
  readonly accent: string;
  readonly actorScale: number;
}

export const STATUS_VFX_RECIPES = {
  "vfx.status.frozen": { visual: "vfx.status.frozen", kind: "frozen", color: "#65e7ff", accent: "#e9ffff", actorScale: 1 },
  "vfx.status.poisoned": { visual: "vfx.status.poisoned", kind: "poisoned", color: "#77e53f", accent: "#d7ff63", actorScale: 1 },
  "vfx.status.burning": { visual: "vfx.status.burning", kind: "burning", color: "#ff4b18", accent: "#ffd85a", actorScale: 1 },
  "vfx.status.stunned": { visual: "vfx.status.stunned", kind: "stunned", color: "#ffd942", accent: "#fff6b0", actorScale: 1 },
  "vfx.status.shrunk": { visual: "vfx.status.shrunk", kind: "shrunk", color: "#a46cff", accent: "#e1cdff", actorScale: 0.68 },
  "vfx.status.enlarged": { visual: "vfx.status.enlarged", kind: "enlarged", color: "#ff8b32", accent: "#ffe57a", actorScale: 1.35 },
} as const satisfies Readonly<Record<string, StatusVfxRecipe>>;

export function getStatusVfxRecipe(visual: string): StatusVfxRecipe {
  const recipe = STATUS_VFX_RECIPES[visual as keyof typeof STATUS_VFX_RECIPES];
  if (!recipe) throw new Error(`Unknown status visual: ${visual}`);
  return recipe;
}
