import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Scene } from "@babylonjs/core/scene";
import type { DungeonThemePalette } from "../../../dungeon/DungeonDefinitions";
import { animateLava, createLavaMaterial } from "./LavaMaterials";
import {
  createPixelTexture,
  type PixelTextureSpec,
} from "./PixelTextureFactory";

export const ART_MATERIAL_KEYS = [
  "carvedStone",
  "roughBasalt",
  "agedMetal",
  "darkWood",
  "runeCrystal",
  "lava",
] as const;

export const DEFAULT_DUNGEON_PALETTE: DungeonThemePalette = {
  stone: { base: "#514044", dark: "#2a2024", light: "#88686e" },
  rock: { base: "#30282d", dark: "#181317", light: "#604850" },
  metal: { base: "#565055", dark: "#27232a", light: "#a88b70" },
  wood: { base: "#61362b", dark: "#2b1713", light: "#aa613e" },
  rune: { base: "#351523", dark: "#160a10", light: "#ff7b2e" },
  hazard: { base: "#f53f0e", dark: "#9b1608", light: "#ffd34d" },
  light: { fill: "#9aa7bd", key: "#ffd0a0", accent: "#ff5a1f", fog: "#12070a" },
};

// 地图色板只替换颜色，像素密度和材质种类保持稳定。
function materialSpecs(
  palette: DungeonThemePalette,
  themeId: string,
): Record<(typeof ART_MATERIAL_KEYS)[number], PixelTextureSpec> {
  return {
    carvedStone: { id: `${themeId}-stone`, seed: 1201, ...palette.stone, pattern: "brick" },
    roughBasalt: { id: `${themeId}-rock`, seed: 2309, ...palette.rock, pattern: "rock" },
    agedMetal: { id: `${themeId}-metal`, seed: 3407, ...palette.metal, pattern: "metal" },
    darkWood: { id: `${themeId}-wood`, seed: 4507, ...palette.wood, pattern: "plank" },
    runeCrystal: { id: `${themeId}-rune`, seed: 5609, ...palette.rune, pattern: "rune" },
    lava: { id: `${themeId}-hazard`, seed: 6719, ...palette.hazard, pattern: "lava" },
  };
}

function material(
  scene: Scene,
  name: string,
  spec: PixelTextureSpec,
  metallic: number,
  roughness: number,
): PBRMaterial {
  const texture = createPixelTexture(scene, spec);
  const value = new PBRMaterial(`art-${name}`, scene);
  value.albedoTexture = texture;
  value.albedoColor = Color3.White();
  value.metallic = metallic;
  value.roughness = roughness;
  return value;
}

export class ArtMaterialLibrary {
  readonly carvedStone: PBRMaterial;
  readonly roughBasalt: PBRMaterial;
  readonly agedMetal: PBRMaterial;
  readonly darkWood: PBRMaterial;
  readonly runeCrystal: PBRMaterial;
  readonly lava: PBRMaterial;
  private elapsed = 0;

  constructor(
    private readonly scene: Scene,
    palette: DungeonThemePalette = DEFAULT_DUNGEON_PALETTE,
    themeId = "lava",
  ) {
    const specs = materialSpecs(palette, themeId);
    this.carvedStone = material(scene, `${themeId}-carved-stone`, specs.carvedStone, 0, 0.92);
    this.roughBasalt = material(scene, `${themeId}-rough-basalt`, specs.roughBasalt, 0, 1);
    this.agedMetal = material(scene, `${themeId}-aged-metal`, specs.agedMetal, 0.68, 0.54);
    this.darkWood = material(scene, `${themeId}-dark-wood`, specs.darkWood, 0, 0.88);
    this.runeCrystal = material(scene, `${themeId}-rune-crystal`, specs.runeCrystal, 0.08, 0.42);
    this.runeCrystal.emissiveTexture = this.runeCrystal.albedoTexture;
    this.runeCrystal.emissiveColor = Color3.FromHexString(palette.rune.light).scale(0.7);
    this.lava = createLavaMaterial(scene, createPixelTexture(scene, specs.lava));
  }

  update(delta: number): void {
    this.elapsed += delta;
    animateLava(this.lava, this.elapsed, delta);
  }

  dispose(): void {
    for (const key of ART_MATERIAL_KEYS) this[key].dispose(true, true);
  }
}
