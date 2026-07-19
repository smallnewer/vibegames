import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import { Constants } from "@babylonjs/core/Engines/constants";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { ShaderLanguage } from "@babylonjs/core/Materials/shaderLanguage";
import { Color3, Vector2 } from "@babylonjs/core/Maths/math";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";

const MESH_URL = "/game-assets/rig-lab/vrlabs-weapon-slash/circle.glb";
const ATLAS_URL = "/game-assets/rig-lab/vrlabs-weapon-slash/circle-atlas.png";
const EVENT_PROGRESS = 0.52;
const DURATION = 0.32;
const FRAME_COUNT = 64;
const GRID_SIZE = 8;

const vertexShaderGlsl = `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  uniform vec2 frameOffset;
  varying vec2 vAtlasUv;

  void main(void) {
    gl_Position = worldViewProjection * vec4(position, 1.0);
    vAtlasUv = uv * vec2(0.125) + frameOffset;
  }
`;

const fragmentShaderGlsl = `
  precision highp float;
  uniform sampler2D atlas;
  uniform vec3 tint;
  uniform float intensity;
  uniform float opacity;
  varying vec2 vAtlasUv;

  void main(void) {
    vec4 sampleColor = texture2D(atlas, vAtlasUv);
    float energy = max(sampleColor.a, max(sampleColor.r, max(sampleColor.g, sampleColor.b)));
    gl_FragColor = vec4(sampleColor.rgb * tint * intensity, energy * opacity);
  }
`;

const vertexShaderWgsl = `
  attribute position: vec3f;
  attribute uv: vec2f;
  uniform worldViewProjection: mat4x4f;
  uniform frameOffset: vec2f;
  varying vAtlasUv: vec2f;

  @vertex
  fn main(input: VertexInputs) -> FragmentInputs {
    vertexOutputs.position = uniforms.worldViewProjection * vec4f(input.position, 1.0);
    vertexOutputs.vAtlasUv = input.uv * vec2f(0.125) + uniforms.frameOffset;
  }
`;

const fragmentShaderWgsl = `
  varying vAtlasUv: vec2f;
  var atlasSampler: sampler;
  var atlas: texture_2d<f32>;
  uniform tint: vec3f;
  uniform intensity: f32;
  uniform opacity: f32;

  @fragment
  fn main(input: FragmentInputs) -> FragmentOutputs {
    let sampleColor = textureSample(atlas, atlasSampler, input.vAtlasUv);
    let energy = max(sampleColor.a, max(sampleColor.r, max(sampleColor.g, sampleColor.b)));
    fragmentOutputs.color = vec4f(sampleColor.rgb * uniforms.tint * uniforms.intensity, energy * uniforms.opacity);
  }
`;

// 把上游 Unity 的网格+翻页材质重建成一个可复用 Babylon 特效。
export async function createVrlabsSlash(
  scene: Scene,
  parent: TransformNode,
  action: AnimationGroup,
  reportError: (message: string) => void,
  reportStatus: (message: string) => void,
) {
  const container = await LoadAssetContainerAsync(MESH_URL, scene);
  container.addAllToScene();

  const root = new TransformNode("rig-lab-vrlabs-slash-root", scene);
  root.parent = parent;
  root.position.set(0, 0.88, 0.34);
  root.rotation.set(0.08, 0, -0.12);

  for (const node of container.rootNodes) node.parent = root;
  const mesh = container.meshes.find((item) => item.getTotalVertices() > 0);
  if (!mesh) throw new Error("VRLabs 刀光资产缺少网格");

  const engine = scene.getEngine();
  const shaderLanguage = engine.isWebGPU ? ShaderLanguage.WGSL : ShaderLanguage.GLSL;
  const material = new ShaderMaterial(
    "rig-lab-vrlabs-slash-material",
    scene,
    engine.isWebGPU
      ? { vertexSource: vertexShaderWgsl, fragmentSource: fragmentShaderWgsl }
      : { vertexSource: vertexShaderGlsl, fragmentSource: fragmentShaderGlsl },
    {
      attributes: ["position", "uv"],
      uniforms: ["worldViewProjection", "frameOffset", "tint", "intensity", "opacity"],
      samplers: ["atlas"],
      needAlphaBlending: true,
      shaderLanguage,
    },
  );
  const atlas = new Texture(ATLAS_URL, scene, false, true, Texture.BILINEAR_SAMPLINGMODE);
  material.setTexture("atlas", atlas);
  material.setColor3("tint", new Color3(0.26, 0.86, 1));
  material.setFloat("intensity", 2.8);
  material.setFloat("opacity", 0);
  material.setVector2("frameOffset", Vector2.Zero());
  let shaderStatus = "…";
  material.onCompiled = () => {
    shaderStatus = "✓";
  };
  material.onError = (_effect, errors) => {
    shaderStatus = "×";
    reportError(`VRLabs WGSL 编译失败：${errors}`);
  };
  material.alphaMode = Constants.ALPHA_ADD;
  material.backFaceCulling = false;
  material.disableDepthWrite = true;
  mesh.material = material;
  mesh.isPickable = false;
  mesh.receiveShadows = false;
  root.setEnabled(false);

  let previousProgress = 1;
  let age = DURATION;
  let frame = 0;
  let triggerCount = 0;
  let drawCount = 0;
  let reportAge = 0;
  mesh.onBeforeRenderObservable.add(() => {
    drawCount += 1;
  });

  const report = (progress: number) => {
    reportStatus(
      `纹理${atlas.isReady() ? "✓" : "…"} · Shader${shaderStatus} · 事件${triggerCount} · 绘制${drawCount} · 进度${progress.toFixed(2)} · 帧${frame}`,
    );
  };
  report(0);

  return {
    update(deltaSeconds: number) {
      const frameRange = Math.max(1, action.to - action.from);
      const actionProgress = (action.getCurrentFrame() - action.from) / frameRange;
      if (previousProgress < EVENT_PROGRESS && actionProgress >= EVENT_PROGRESS) {
        age = 0;
        triggerCount += 1;
        root.setEnabled(true);
      }
      previousProgress = actionProgress;
      reportAge += deltaSeconds;
      if (reportAge >= 0.25) {
        reportAge = 0;
        report(actionProgress);
      }
      if (age >= DURATION) return;

      // 0.5x 检查时材质动画跟随动作一起减速，避免再次出现状态和动作错位。
      age = Math.min(DURATION, age + deltaSeconds * Math.abs(action.speedRatio));
      const life = age / DURATION;
      frame = Math.min(FRAME_COUNT - 1, Math.floor(life * FRAME_COUNT));
      const row = Math.floor(frame / GRID_SIZE);
      material.setVector2(
        "frameOffset",
        new Vector2((frame % GRID_SIZE) / GRID_SIZE, (GRID_SIZE - row - 1) / GRID_SIZE),
      );
      material.setFloat("opacity", Math.min(1, (1 - life) / 0.3));

      const easeOut = 1 - Math.pow(1 - life, 3);
      const scale = 0.78 + 0.22 * easeOut;
      root.scaling.set(scale, scale, scale);
      root.position.z = 0.34 + 0.14 * easeOut;
      root.rotation.z = -0.12 + 0.22 * easeOut;

      if (age >= DURATION) root.setEnabled(false);
    },
  };
}
