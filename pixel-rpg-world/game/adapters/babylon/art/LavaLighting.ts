import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Scene } from "@babylonjs/core/scene";
import type { DungeonThemePalette } from "../../../dungeon/DungeonDefinitions";
import { DEFAULT_DUNGEON_PALETTE } from "./ArtMaterialLibrary";

export interface LavaLightingRig {
  readonly shadowGenerator: ShadowGenerator;
  addShadowCaster(mesh: AbstractMesh): void;
  setPalette(palette: DungeonThemePalette): void;
  setEnabled(enabled: boolean): void;
  update(time: number): void;
  dispose(): void;
}

export function createLavaLighting(scene: Scene): LavaLightingRig {
  const fill = new HemisphericLight("art-cool-fill", new Vector3(-0.3, 1, -0.25), scene);
  fill.diffuse = Color3.FromHexString("#78869b");
  fill.groundColor = Color3.FromHexString("#170a0d");
  fill.intensity = 1.14;

  const key = new DirectionalLight("art-warm-key", new Vector3(0.35, -1, 0.28), scene);
  key.position.set(-8, 12, -8);
  key.diffuse = Color3.FromHexString("#ffd0a0");
  key.intensity = 3.35;
  key.shadowMinZ = 1;
  key.shadowMaxZ = 35;

  const shadowGenerator = new ShadowGenerator(1024, key);
  shadowGenerator.usePercentageCloserFiltering = true;
  shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
  shadowGenerator.bias = 0.002;
  shadowGenerator.normalBias = 0.025;
  shadowGenerator.setDarkness(0.26);

  const fills = [
    [-5.2, 2.1, 2.7, "#ff5a1f", 5.6],
    [0, 1.1, -3.3, "#ff3212", 6.8],
    [5.2, 2.2, 2.5, "#ff7c2e", 5.4],
  ].map(([x, y, z, color, range], index) => {
    const light = new PointLight(`art-lava-fill-${index}`, new Vector3(
      x as number,
      y as number,
      z as number,
    ), scene);
    light.diffuse = Color3.FromHexString(color as string);
    light.range = range as number;
    light.intensity = 1.35;
    return light;
  });
  const beamMaterial = new StandardMaterial("art-light-shaft-material", scene);
  beamMaterial.diffuseColor = Color3.FromHexString("#ffd08a");
  beamMaterial.emissiveColor = Color3.FromHexString("#8d4d21");
  beamMaterial.alpha = 0.09;
  beamMaterial.disableLighting = true;
  beamMaterial.disableDepthWrite = true;
  beamMaterial.backFaceCulling = false;
  const beams = [[-3.9, 2.8], [3.25, 3.6]].map(([x, z], index) => {
    const mesh = MeshBuilder.CreateCylinder(`art-light-shaft-${index}`, {
      height: 8,
      diameterTop: 0.22,
      diameterBottom: 2.2,
      tessellation: 16,
    }, scene);
    mesh.position.set(x, 4.6, z);
    mesh.material = beamMaterial;
    return mesh;
  });

  let enabled = true;
  let palette = DEFAULT_DUNGEON_PALETTE;
  const setPalette = (value: DungeonThemePalette) => {
    palette = value;
    fill.diffuse = Color3.FromHexString(value.light.fill);
    fill.groundColor = Color3.FromHexString(value.rock.dark);
    key.diffuse = Color3.FromHexString(value.light.key);
    for (const light of fills) light.diffuse = Color3.FromHexString(value.light.accent);
    scene.fogColor = Color3.FromHexString(value.light.fog);
  };
  const setEnabled = (value: boolean) => {
    enabled = value;
    fill.intensity = value ? 1.14 : 0.8;
    key.setEnabled(value);
    for (const light of fills) light.setEnabled(value);
    for (const beam of beams) beam.setEnabled(value);
    scene.fogMode = value ? Scene.FOGMODE_EXP2 : Scene.FOGMODE_NONE;
    scene.fogDensity = value ? 0.006 : 0;
    scene.fogColor = Color3.FromHexString(palette.light.fog);
  };
  setPalette(palette);

  return {
    shadowGenerator,
    addShadowCaster(mesh) {
      shadowGenerator.addShadowCaster(mesh, true);
      mesh.receiveShadows = true;
    },
    setPalette,
    setEnabled,
    update(time) {
      if (!enabled) return;
      fills[0].intensity = 1.28 + Math.sin(time * 7.1) * 0.12;
      fills[1].intensity = 1.42 + Math.sin(time * 5.7 + 1.2) * 0.15;
      fills[2].intensity = 1.24 + Math.sin(time * 6.3 + 2.4) * 0.11;
      beams[0].visibility = 0.72 + Math.sin(time * 0.8) * 0.1;
      beams[1].visibility = 0.64 + Math.sin(time * 0.7 + 1.4) * 0.08;
    },
    dispose() {
      shadowGenerator.dispose();
      for (const light of fills) light.dispose();
      for (const beam of beams) beam.dispose(false, false);
      beamMaterial.dispose();
      key.dispose();
      fill.dispose();
    },
  };
}
