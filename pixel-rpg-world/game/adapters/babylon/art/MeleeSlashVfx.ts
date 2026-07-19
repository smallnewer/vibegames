import { Constants } from "@babylonjs/core/Engines/constants";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { ShaderLanguage } from "@babylonjs/core/Materials/shaderLanguage";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Quaternion } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import type { AttackTag, ItemRarity } from "../../../content/Definitions";
import { MELEE_WEAPON_CATALOG } from "../../../content/weapons/MeleeWeaponCatalog";

export type MeleeVfxStyle = "legacy" | "v2";

export const U41_SLASH_V2_RECIPE = {
  planeTiltDegrees: 20,
  forward: 0.52,
  height: 1.04,
  maskTexture: "/game-assets/vfx-v2/slash-line.png",
  noiseTexture: "/game-assets/vfx-v2/fractal-noise.png",
} as const;

const slashVertexGlsl = `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUv;

  void main(void) {
    gl_Position = worldViewProjection * vec4(position, 1.0);
    vUv = uv;
  }
`;

const slashFragmentGlsl = `
  precision highp float;
  uniform sampler2D slashMask;
  uniform sampler2D noiseMask;
  uniform vec3 coreColor;
  uniform vec3 haloColor;
  uniform float progress;
  uniform float opacity;
  uniform float intensity;
  uniform float layer;
  varying vec2 vUv;

  void main(void) {
    vec2 pixelUv = floor(vUv * vec2(56.0, 10.0)) / vec2(56.0, 10.0);
    float line = texture2D(slashMask, vec2(pixelUv.y, pixelUv.x)).r;
    vec2 noiseUv = fract(pixelUv * vec2(2.7, 1.35) + vec2(progress * 1.35, -progress * 0.42));
    float noise = texture2D(noiseMask, noiseUv).r;
    float taper = pow(max(0.0, sin(vUv.x * 3.14159265)), 0.32);
    float dissolve = smoothstep(0.08 + progress * 0.72, 0.42 + progress * 0.58, noise + taper * 0.32);
    float sharpCore = smoothstep(0.58, 0.96, line);
    float streak = line * mix(0.52, 1.0, noise);
    float layerGain = layer < 0.5 ? 0.62 : (layer < 1.5 ? 1.0 : 1.35);
    float alpha = streak * taper * dissolve * opacity * layerGain;
    vec3 color = mix(haloColor, coreColor, sharpCore * (0.68 + layer * 0.12));
    color *= intensity * (0.86 + noise * 0.38 + sharpCore * 0.42);
    gl_FragColor = vec4(color, alpha);
  }
`;

const slashVertexWgsl = `
  attribute position: vec3f;
  attribute uv: vec2f;
  uniform worldViewProjection: mat4x4f;
  varying vUv: vec2f;

  @vertex
  fn main(input: VertexInputs) -> FragmentInputs {
    vertexOutputs.position = uniforms.worldViewProjection * vec4f(input.position, 1.0);
    vertexOutputs.vUv = input.uv;
  }
`;

const slashFragmentWgsl = `
  varying vUv: vec2f;
  var slashMaskSampler: sampler;
  var slashMask: texture_2d<f32>;
  var noiseMaskSampler: sampler;
  var noiseMask: texture_2d<f32>;
  uniform coreColor: vec3f;
  uniform haloColor: vec3f;
  uniform progress: f32;
  uniform opacity: f32;
  uniform intensity: f32;
  uniform layer: f32;

  @fragment
  fn main(input: FragmentInputs) -> FragmentOutputs {
    let pixelUv = floor(input.vUv * vec2f(56.0, 10.0)) / vec2f(56.0, 10.0);
    let line = textureSample(slashMask, slashMaskSampler, vec2f(pixelUv.y, pixelUv.x)).r;
    let noiseUv = fract(pixelUv * vec2f(2.7, 1.35) + vec2f(uniforms.progress * 1.35, -uniforms.progress * 0.42));
    let noise = textureSample(noiseMask, noiseMaskSampler, noiseUv).r;
    let taper = pow(max(0.0, sin(input.vUv.x * 3.14159265)), 0.32);
    let dissolve = smoothstep(0.08 + uniforms.progress * 0.72, 0.42 + uniforms.progress * 0.58, noise + taper * 0.32);
    let sharpCore = smoothstep(0.58, 0.96, line);
    let streak = line * mix(0.52, 1.0, noise);
    let layerGain = select(select(1.35, 1.0, uniforms.layer < 1.5), 0.62, uniforms.layer < 0.5);
    let alpha = streak * taper * dissolve * uniforms.opacity * layerGain;
    var color = mix(uniforms.haloColor, uniforms.coreColor, sharpCore * (0.68 + uniforms.layer * 0.12));
    color *= uniforms.intensity * (0.86 + noise * 0.38 + sharpCore * 0.42);
    fragmentOutputs.color = vec4f(color, alpha);
  }
`;

export interface MeleeSlashRecipe {
  readonly visual: string;
  readonly rarity: ItemRarity;
  readonly attackTag: AttackTag;
  readonly radius: number;
  readonly width: number;
  readonly angle: number;
  readonly life: number;
  readonly layers: number;
  readonly coreColor: string;
  readonly haloColor: string;
}

const RARITY_SHAPE = {
  normal: { radius: 0.96, width: 0.2, angle: 105, life: 0.2, layers: 1 },
  magic: { radius: 1.08, width: 0.28, angle: 125, life: 0.24, layers: 2 },
  rare: { radius: 1.22, width: 0.36, angle: 148, life: 0.29, layers: 2 },
  unique: { radius: 1.42, width: 0.46, angle: 172, life: 0.36, layers: 3 },
} as const satisfies Record<ItemRarity, {
  radius: number;
  width: number;
  angle: number;
  life: number;
  layers: number;
}>;

const ELEMENT_COLOR = {
  physical: { core: "#fff2c8", halo: "#d9e8ef" },
  fire: { core: "#fff09b", halo: "#ff4e12" },
  ice: { core: "#efffff", halo: "#35d9ff" },
  poison: { core: "#efff9b", halo: "#64e52e" },
  storm: { core: "#ffffff", halo: "#9a69ff" },
} as const;

export const MELEE_SLASH_RECIPES = Object.fromEntries(
  MELEE_WEAPON_CATALOG.map((weapon) => {
    const shape = RARITY_SHAPE[weapon.rarity];
    const color = ELEMENT_COLOR[weapon.attackTag];
    return [weapon.slashVisual, {
      visual: weapon.slashVisual,
      rarity: weapon.rarity,
      attackTag: weapon.attackTag,
      ...shape,
      coreColor: color.core,
      haloColor: color.halo,
    } satisfies MeleeSlashRecipe];
  }),
) as Readonly<Record<string, MeleeSlashRecipe>>;

interface SlashInstance {
  readonly visual: string;
  readonly poolKey: string;
  readonly style: MeleeVfxStyle;
  readonly root: TransformNode;
  readonly meshes: readonly Mesh[];
  readonly shaderMaterials: readonly ShaderMaterial[];
  life: number;
  totalLife: number;
}

const MAX_SLASHES = 12;

export class MeleeSlashVfx {
  private readonly active: SlashInstance[] = [];
  private readonly pools = new Map<string, SlashInstance[]>();
  private readonly materials = new Map<string, StandardMaterial>();
  private slashMask?: Texture;
  private noiseMask?: Texture;
  private created = 0;

  constructor(private readonly scene: Scene) {}

  has(visual: string): boolean {
    return MELEE_SLASH_RECIPES[visual] !== undefined;
  }

  play(
    visual: string,
    x: number,
    z: number,
    facingX: number,
    facingZ: number,
    style: MeleeVfxStyle = "legacy",
  ): void {
    const recipe = MELEE_SLASH_RECIPES[visual];
    if (!recipe) return;
    const poolKey = `${style}:${visual}`;
    let instance = this.pools.get(poolKey)?.pop();
    if (!instance && this.created < MAX_SLASHES) {
      instance = this.createInstance(recipe, style);
      this.created += 1;
    }
    if (!instance) {
      const oldest = this.active.shift();
      if (!oldest) return;
      this.disposeInstance(oldest);
      this.created -= 1;
      instance = this.createInstance(recipe, style);
      this.created += 1;
    }
    instance.life = recipe.life;
    instance.totalLife = recipe.life;
    const yaw = Math.atan2(facingX, facingZ);
    if (style === "v2") {
      const pose = U41_SLASH_V2_RECIPE;
      instance.root.position.set(
        x + facingX * pose.forward,
        pose.height,
        z + facingZ * pose.forward,
      );
      instance.root.rotationQuaternion = Quaternion.RotationYawPitchRoll(
        yaw,
        Math.PI / 2 - pose.planeTiltDegrees * Math.PI / 180,
        0,
      );
      instance.root.scaling.setAll(0.78);
    } else {
      instance.root.rotationQuaternion = null;
      instance.root.position.set(x + facingX * 0.72, 0.86, z + facingZ * 0.72);
      instance.root.rotation.set(0, yaw, 0);
      instance.root.scaling.setAll(0.82);
    }
    instance.root.setEnabled(true);
    for (const mesh of instance.meshes) mesh.visibility = 1;
    for (const material of instance.shaderMaterials) {
      material.setFloat("progress", 0);
      material.setFloat("opacity", 0);
    }
    this.active.push(instance);
  }

  update(delta: number): void {
    for (let index = this.active.length - 1; index >= 0; index -= 1) {
      const instance = this.active[index];
      instance.life -= delta;
      const ratio = Math.max(0, instance.life / instance.totalLife);
      const progress = 1 - ratio;
      if (instance.style === "v2") {
        const fadeIn = Math.min(1, progress / 0.12);
        const fadeOut = Math.min(1, ratio / 0.34);
        instance.root.scaling.setAll(0.78 + progress * 0.27);
        for (let layer = 0; layer < instance.shaderMaterials.length; layer += 1) {
          const material = instance.shaderMaterials[layer];
          material.setFloat("progress", progress);
          material.setFloat("opacity", fadeIn * fadeOut * (1 - layer * 0.1));
        }
      } else {
        instance.root.scaling.setAll(0.82 + progress * 0.3);
        for (let layer = 0; layer < instance.meshes.length; layer += 1) {
          instance.meshes[layer].visibility = Math.pow(ratio, 0.72) * (1 - layer * 0.12);
        }
      }
      if (instance.life > 0) continue;
      instance.root.setEnabled(false);
      const pool = this.pools.get(instance.poolKey) ?? [];
      pool.push(instance);
      this.pools.set(instance.poolKey, pool);
      this.active.splice(index, 1);
    }
  }

  get activeCount(): number {
    return this.active.length;
  }

  dispose(): void {
    const instances = [
      ...this.active,
      ...[...this.pools.values()].flat(),
    ];
    for (const instance of instances) this.disposeInstance(instance);
    for (const material of this.materials.values()) material.dispose();
    this.slashMask?.dispose();
    this.noiseMask?.dispose();
    this.active.length = 0;
    this.pools.clear();
  }

  private createInstance(recipe: MeleeSlashRecipe, style: MeleeVfxStyle): SlashInstance {
    if (style === "v2") return this.createV2Instance(recipe);
    const root = new TransformNode(`slash-${recipe.visual}`, this.scene);
    const meshes = Array.from({ length: recipe.layers }, (_, layer) => {
      const halo = layer > 0;
      const mesh = this.createCrescent(
        recipe,
        halo ? recipe.width * (1.34 + layer * 0.12) : recipe.width,
        halo ? recipe.radius * (1.01 + layer * 0.025) : recipe.radius,
      );
      mesh.parent = root;
      mesh.position.z = layer * -0.018;
      mesh.rotation.z = layer === 2 ? -0.08 : layer === 1 ? 0.045 : 0;
      mesh.material = this.material(
        halo ? recipe.haloColor : recipe.coreColor,
        halo ? 0.44 : 0.94,
      );
      return mesh;
    });
    return {
      visual: recipe.visual,
      poolKey: `${style}:${recipe.visual}`,
      style,
      root,
      meshes,
      shaderMaterials: [],
      life: 0,
      totalLife: recipe.life,
    };
  }

  private createV2Instance(recipe: MeleeSlashRecipe): SlashInstance {
    const root = new TransformNode(`slash-v2-${recipe.visual}`, this.scene);
    const radius = Math.max(1.26, recipe.radius);
    const width = Math.max(0.42, recipe.width);
    const angle = Math.max(158, recipe.angle);
    const shapes = [
      { width: width * 1.42, radius: radius * 1.025 },
      { width, radius },
      { width: width * 0.48, radius: radius * 1.015 },
    ] as const;
    const shaderMaterials: ShaderMaterial[] = [];
    const meshes = shapes.map((shape, layer) => {
      const mesh = this.createCrescent(recipe, shape.width, shape.radius, angle);
      mesh.parent = root;
      mesh.position.z = (layer - 1) * 0.018;
      const material = this.v2Material(recipe, layer);
      mesh.material = material;
      shaderMaterials.push(material);
      return mesh;
    });
    return {
      visual: recipe.visual,
      poolKey: `v2:${recipe.visual}`,
      style: "v2",
      root,
      meshes,
      shaderMaterials,
      life: 0,
      totalLife: recipe.life,
    };
  }

  // 环带两端收尖，形成游戏刀光而不是细管状真实轨迹。
  private createCrescent(
    recipe: MeleeSlashRecipe,
    width: number,
    radius: number,
    angleDegrees = recipe.angle,
  ): Mesh {
    const mesh = new Mesh(`slash-crescent-${recipe.visual}`, this.scene);
    const steps = 18;
    const half = angleDegrees * Math.PI / 360;
    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    for (let index = 0; index <= steps; index += 1) {
      const ratio = index / steps;
      const angle = -half + ratio * half * 2;
      const taper = Math.sin(Math.PI * ratio) ** 0.45;
      const outer = radius;
      const inner = radius - width * taper;
      positions.push(Math.sin(angle) * outer, Math.cos(angle) * outer - radius * 0.26, 0);
      positions.push(Math.sin(angle) * inner, Math.cos(angle) * inner - radius * 0.26, 0);
      normals.push(0, 0, 1, 0, 0, 1);
      uvs.push(ratio, 0, ratio, 1);
      if (index === steps) continue;
      const base = index * 2;
      indices.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
    }
    const data = new VertexData();
    data.positions = positions;
    data.indices = indices;
    data.normals = normals;
    data.uvs = uvs;
    data.applyToMesh(mesh);
    return mesh;
  }

  private material(color: string, alpha: number): StandardMaterial {
    const key = `${color}-${alpha}`;
    const cached = this.materials.get(key);
    if (cached) return cached;
    const material = new StandardMaterial(`slash-material-${key}`, this.scene);
    material.diffuseColor = Color3.FromHexString(color);
    material.emissiveColor = Color3.FromHexString(color);
    material.specularColor = Color3.Black();
    material.alpha = alpha;
    material.backFaceCulling = false;
    material.disableDepthWrite = true;
    this.materials.set(key, material);
    return material;
  }

  private v2Material(recipe: MeleeSlashRecipe, layer: number): ShaderMaterial {
    const engine = this.scene.getEngine();
    const shaderLanguage = engine.isWebGPU ? ShaderLanguage.WGSL : ShaderLanguage.GLSL;
    const material = new ShaderMaterial(
      `slash-v2-material-${recipe.visual}-${layer}`,
      this.scene,
      engine.isWebGPU
        ? { vertexSource: slashVertexWgsl, fragmentSource: slashFragmentWgsl }
        : { vertexSource: slashVertexGlsl, fragmentSource: slashFragmentGlsl },
      {
        attributes: ["position", "uv"],
        uniforms: [
          "worldViewProjection",
          "coreColor",
          "haloColor",
          "progress",
          "opacity",
          "intensity",
          "layer",
        ],
        samplers: ["slashMask", "noiseMask"],
        needAlphaBlending: true,
        shaderLanguage,
      },
    );
    this.slashMask ??= new Texture(
      U41_SLASH_V2_RECIPE.maskTexture,
      this.scene,
      false,
      false,
      Texture.BILINEAR_SAMPLINGMODE,
    );
    this.noiseMask ??= new Texture(
      U41_SLASH_V2_RECIPE.noiseTexture,
      this.scene,
      false,
      false,
      Texture.NEAREST_SAMPLINGMODE,
    );
    material.setTexture("slashMask", this.slashMask);
    material.setTexture("noiseMask", this.noiseMask);
    material.setColor3("coreColor", Color3.FromHexString(recipe.coreColor));
    material.setColor3("haloColor", Color3.FromHexString(recipe.haloColor));
    material.setFloat("progress", 0);
    material.setFloat("opacity", 0);
    material.setFloat("intensity", layer === 0 ? 0.95 : layer === 1 ? 1.75 : 2.55);
    material.setFloat("layer", layer);
    material.alphaMode = Constants.ALPHA_ADD;
    material.backFaceCulling = false;
    material.disableDepthWrite = true;
    return material;
  }

  private disposeInstance(instance: SlashInstance): void {
    instance.root.dispose(false, false);
    for (const material of instance.shaderMaterials) material.dispose(false, false);
  }
}
