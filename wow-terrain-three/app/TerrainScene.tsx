"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { connectG30 } from "./g30-webhid.js";

const MAP_SIZE = 180;
const WATER_LEVEL = 0.2;
const WALK_EYE_HEIGHT = 2.25;
const PARTY_MAX_DISTANCE = 28;
const PARTY_MOVE_SPEED = 6.4;
const SUN_DIRECTION = new THREE.Vector3(0.66, 0.43, -0.62).normalize();
const SKY_LIGHT_COLOR = new THREE.Color(0xb9ccd5);
const GROUND_LIGHT_COLOR = new THREE.Color(0x65664d);
const SUN_LIGHT_COLOR = new THREE.Color(0xfff4e5);

// 生成稳定噪声，让每次刷新得到同一片山谷。
function noise(x: number, z: number) {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = x - x0;
  const tz = z - z0;
  const ux = tx * tx * (3 - 2 * tx);
  const uz = tz * tz * (3 - 2 * tz);
  const hash = (px: number, pz: number) => {
    const value = Math.sin(px * 127.1 + pz * 311.7) * 43758.5453;
    return value - Math.floor(value);
  };
  const a = THREE.MathUtils.lerp(hash(x0, z0), hash(x0 + 1, z0), ux);
  const b = THREE.MathUtils.lerp(hash(x0, z0 + 1), hash(x0 + 1, z0 + 1), ux);
  return THREE.MathUtils.lerp(a, b, uz);
}

// 多层噪声叠加后，大轮廓像山，小轮廓像土坡。
function fbm(x: number, z: number) {
  let value = 0;
  let weight = 0.55;
  let scale = 1;
  for (let i = 0; i < 4; i += 1) {
    value += noise(x * scale, z * scale) * weight;
    scale *= 2.03;
    weight *= 0.48;
  }
  return value;
}

function riverCenter(x: number) {
  return Math.sin(x * 0.055) * 7 + Math.sin(x * 0.125) * 2.5;
}

// 道路沿河岸缓慢弯曲，和河流保持稳定距离。
function roadCenter(x: number) {
  return riverCenter(x) + 18 + Math.sin(x * 0.035) * 4.5;
}

// 山谷中间压出河床，保证水不会穿过地面。
function terrainHeight(x: number, z: number) {
  const rolling = (fbm(x * 0.028, z * 0.028) - 0.48) * 8;
  const longWave = Math.sin(x * 0.025) * 1.8 + Math.cos(z * 0.03) * 1.4;
  const edge = THREE.MathUtils.smoothstep(Math.abs(z), 46, 88);
  const edgeHill = edge * edge * 14;
  const land = 3.7 + rolling + longWave + edgeHill;
  const distance = Math.abs(z - riverCenter(x));
  const valley = 1 - THREE.MathUtils.smoothstep(distance, 3.2, 14);
  const riverBed = -1.35 + (noise(x * 0.11, z * 0.11) - 0.5) * 0.45;
  return THREE.MathUtils.lerp(land, riverBed, valley);
}

const terrainVertexShader = /* glsl */ `
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying float vHeight;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vHeight = worldPosition.y;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const terrainFragmentShader = /* glsl */ `
  uniform vec3 uSunDirection;
  uniform vec3 uFogColor;
  uniform vec3 uSkyLightColor;
  uniform vec3 uGroundLightColor;
  uniform vec3 uSunLightColor;
  uniform sampler2D uGrassMap;
  uniform sampler2D uDirtMap;
  uniform sampler2D uRoadMap;
  uniform sampler2D uRockMap;
  uniform sampler2D uSandMap;
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying float vHeight;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float weight = 0.55;
    for (int i = 0; i < 4; i++) {
      value += valueNoise(p) * weight;
      p *= 2.03;
      weight *= 0.48;
    }
    return value;
  }

  float textureHeight(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
  }

  float roadCenter(float x) {
    float river = sin(x * 0.055) * 7.0 + sin(x * 0.125) * 2.5;
    return river + 18.0 + sin(x * 0.035) * 4.5;
  }

  void main() {
    vec2 p = vWorldPosition.xz;
    vec3 normal = normalize(vNormal);
    vec3 lightDirection = normalize(uSunDirection);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float slope = 1.0 - max(normal.y, 0.0);
    float broadNoise = fbm(p * 0.04);

    // AI 只负责统一画风，材质摆放仍由可控规则决定。
    vec2 textureUv = p * 0.072 + vec2(broadNoise * 0.09, broadNoise * -0.06);
    vec3 grassTexture = texture2D(uGrassMap, textureUv).rgb;
    vec3 dirtTexture = texture2D(uDirtMap, textureUv).rgb;
    vec3 roadTexture = texture2D(uRoadMap, textureUv).rgb;
    vec3 rockTexture = texture2D(uRockMap, textureUv).rgb;
    vec3 sandTexture = texture2D(uSandMap, textureUv).rgb;
    vec3 ground = grassTexture * mix(0.88, 1.06, smoothstep(0.24, 0.86, broadNoise));
    float shoreMask = (1.0 - smoothstep(0.25, 3.2, vHeight)) * (1.0 - smoothstep(0.28, 0.58, slope));
    float rockMask = clamp(smoothstep(0.34, 0.7, slope) + smoothstep(15.0, 24.0, vHeight), 0.0, 1.0);
    ground = mix(ground, sandTexture * vec3(0.88, 0.92, 0.8), shoreMask);
    ground = mix(ground, rockTexture * vec3(0.92, 0.96, 0.9), rockMask);

    // 草、泥肩、路芯分三段软过渡，边缘不会像贴纸。
    float roadDistance = abs(p.y - roadCenter(p.x));
    float roadWidth = 2.65 + sin(p.x * 0.19) * 0.28 + sin(p.x * 0.53) * 0.12;
    float roadCore = 1.0 - smoothstep(roadWidth - 0.35, roadWidth + 0.35, roadDistance);
    float roadBlend = 1.0 - smoothstep(roadWidth + 0.1, roadWidth + 2.65, roadDistance);
    vec3 roadColor = roadTexture * 1.06;
    ground = mix(ground, dirtTexture, roadBlend * 0.62);
    ground = mix(ground, roadColor, roadCore * (1.0 - shoreMask));

    // 从草地和石板明暗生成细法线，不加模型面数也能摆脱纸片感。
    vec2 detailStep = vec2(1.0 / 1024.0);
    vec3 detailBase = mix(grassTexture, roadTexture, roadCore);
    vec3 detailX = mix(
      texture2D(uGrassMap, textureUv + vec2(detailStep.x, 0.0)).rgb,
      texture2D(uRoadMap, textureUv + vec2(detailStep.x, 0.0)).rgb,
      roadCore
    );
    vec3 detailZ = mix(
      texture2D(uGrassMap, textureUv + vec2(0.0, detailStep.y)).rgb,
      texture2D(uRoadMap, textureUv + vec2(0.0, detailStep.y)).rgb,
      roadCore
    );
    float surfaceHeight = textureHeight(detailBase);
    vec2 surfaceSlope = vec2(surfaceHeight - textureHeight(detailX), surfaceHeight - textureHeight(detailZ));
    vec3 detailNormal = normalize(normal + vec3(surfaceSlope.x, 0.0, surfaceSlope.y) * 4.8);

    // 只抬地形的中间色，暗部仍有层次，也不会影响天空和水面曝光。
    vec3 artisticGround = mix(ground, sqrt(max(ground, vec3(0.0))), 0.22);

    // 冷天空、暖地面和中性太阳组成同一套环境光，背光面也保留颜色。
    float skyWeight = smoothstep(-0.18, 0.82, detailNormal.y);
    vec3 ambientLight = mix(uGroundLightColor, uSkyLightColor, skyWeight);
    float wrappedSun = smoothstep(-0.22, 0.78, dot(detailNormal, lightDirection));
    float slopeShade = mix(0.82, 1.0, smoothstep(0.08, 0.72, normal.y));
    vec3 color = artisticGround * (ambientLight + uSunLightColor * wrappedSun * 0.7) * slopeShade;

    // 宽高光覆盖所有地表，形成旧式游戏里随镜头移动的太阳反光带。
    vec3 halfDirection = normalize(lightDirection + viewDirection);
    float reflectionAngle = max(dot(detailNormal, halfDirection), 0.0);
    float broadReflection = pow(reflectionAngle, 4.0);
    float focusedReflection = pow(reflectionAngle, 28.0);
    float viewGrazing = pow(1.0 - max(dot(detailNormal, viewDirection), 0.0), 2.0);
    float reflectionStrength = 0.24 + viewGrazing * 0.1 + roadCore * 0.07 + rockMask * 0.05 + shoreMask * 0.1;
    vec3 reflectedGround = mix(artisticGround, vec3(0.94, 0.9, 0.78), 0.42);
    color += reflectedGround * broadReflection * reflectionStrength;
    color += vec3(1.0, 0.97, 0.9) * focusedReflection * (
      roadCore * 0.02 + rockMask * 0.03 + shoreMask * 0.12
    );

    float fog = smoothstep(82.0, 165.0, distance(cameraPosition, vWorldPosition));
    color = mix(color, uFogColor, fog * 0.88);
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const waterVertexShader = /* glsl */ `
  varying vec3 vWorldPosition;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const waterFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uSunDirection;
  uniform vec3 uFogColor;
  uniform sampler2D uWaterMap;
  varying vec3 vWorldPosition;

  float riverCenter(float x) {
    return sin(x * 0.055) * 7.0 + sin(x * 0.125) * 2.5;
  }

  void main() {
    vec2 p = vWorldPosition.xz;
    float riverDistance = abs(p.y - riverCenter(p.x));
    float riverWidth = 5.4 + sin(p.x * 0.08) * 0.75;
    if (riverDistance > riverWidth + 0.75) discard;

    // 两组方向不同的流动波纹，亮线负责旧水面那层“纹理感”。
    float waveA = sin(p.x * 0.48 + p.y * 0.23 + uTime * 0.72);
    float waveB = sin(p.x * -0.26 + p.y * 0.56 - uTime * 0.5);
    float waveC = sin(p.x * 0.72 - p.y * 0.19 + uTime * 0.34);
    float waveLines = pow(0.5 + 0.5 * waveA, 7.0) + pow(0.5 + 0.5 * waveB, 9.0);
    vec3 waterA = texture2D(uWaterMap, p * 0.055 + vec2(uTime * 0.012, uTime * 0.004)).rgb;
    vec3 waterB = texture2D(uWaterMap, p * 0.071 + vec2(-uTime * 0.006, uTime * 0.01)).rgb;
    vec3 paintedWater = mix(waterA, waterB, 0.38);
    vec3 normal = normalize(vec3((waveA + waveC) * 0.15, 1.0, (waveB - waveC) * 0.13));
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    vec3 lightDirection = normalize(uSunDirection);

    float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.2);
    float shallow = smoothstep(riverWidth - 2.8, riverWidth, riverDistance);
    vec3 deepWater = vec3(0.035, 0.15, 0.13);
    vec3 shallowWater = vec3(0.25, 0.34, 0.2);
    vec3 skyWater = vec3(0.34, 0.52, 0.56);
    vec3 color = paintedWater * vec3(0.72, 0.82, 0.82);
    color = mix(color, deepWater, 0.34);
    color = mix(color, shallowWater, shallow * 0.52);
    color = mix(color, skyWater, 0.1 + fresnel * 0.48);
    color += vec3(0.2, 0.29, 0.25) * waveLines * 0.12;

    // 中性日光带仍跟镜头移动，但不再把整片水染成金色。
    vec3 halfDirection = normalize(lightDirection + viewDirection);
    float sunGlint = pow(max(dot(normal, halfDirection), 0.0), 86.0);
    float wideGlint = pow(max(dot(normal, halfDirection), 0.0), 22.0);
    color += vec3(1.0, 0.95, 0.82) * (sunGlint * 1.7 + wideGlint * 0.12);

    float edge = smoothstep(riverWidth + 0.4, riverWidth - 0.35, riverDistance);
    float foam = smoothstep(riverWidth - 1.0, riverWidth, riverDistance);
    color += vec3(0.55, 0.61, 0.48) * foam * (0.12 + waveLines * 0.08);
    float fog = smoothstep(88.0, 165.0, distance(cameraPosition, vWorldPosition));
    color = mix(color, uFogColor, fog * 0.84);
    gl_FragColor = vec4(color, edge * 0.92);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const skyVertexShader = /* glsl */ `
  varying vec3 vDirection;

  void main() {
    vDirection = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragmentShader = /* glsl */ `
  uniform vec3 uSunDirection;
  varying vec3 vDirection;

  void main() {
    vec3 direction = normalize(vDirection);
    float height = clamp(direction.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 horizon = vec3(0.58, 0.68, 0.67);
    vec3 zenith = vec3(0.2, 0.4, 0.53);
    vec3 color = mix(horizon, zenith, smoothstep(0.08, 0.82, height));
    float sun = max(dot(direction, normalize(uSunDirection)), 0.0);
    color += vec3(0.98, 0.88, 0.72) * pow(sun, 32.0) * 0.22;
    color += vec3(1.0, 0.96, 0.84) * pow(sun, 700.0) * 1.6;
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function createTerrain(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  const geometry = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE, 180, 180);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i += 1) {
    positions.setY(i, terrainHeight(positions.getX(i), positions.getZ(i)));
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();

  const textureLoader = new THREE.TextureLoader();
  const terrainTextures = [
    textureLoader.load("/textures/terrain-grass.png"),
    textureLoader.load("/textures/terrain-dirt.png"),
    textureLoader.load("/textures/terrain-road.png"),
    textureLoader.load("/textures/terrain-rock.png"),
    textureLoader.load("/textures/terrain-sand.png"),
  ];
  const maxAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  terrainTextures.forEach((texture) => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = maxAnisotropy;
  });

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uSunDirection: { value: SUN_DIRECTION },
      uFogColor: { value: new THREE.Color(0x8aa3a0) },
      uSkyLightColor: { value: SKY_LIGHT_COLOR },
      uGroundLightColor: { value: GROUND_LIGHT_COLOR },
      uSunLightColor: { value: SUN_LIGHT_COLOR },
      uGrassMap: { value: terrainTextures[0] },
      uDirtMap: { value: terrainTextures[1] },
      uRoadMap: { value: terrainTextures[2] },
      uRockMap: { value: terrainTextures[3] },
      uSandMap: { value: terrainTextures[4] },
    },
    vertexShader: terrainVertexShader,
    fragmentShader: terrainFragmentShader,
  });
  const terrain = new THREE.Mesh(geometry, material);
  terrain.receiveShadow = true;
  scene.add(terrain);
  return terrainTextures;
}

function createWater(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  const geometry = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE, 180, 180);
  geometry.rotateX(-Math.PI / 2);
  const texture = new THREE.TextureLoader().load("/textures/water-surface.png");
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSunDirection: { value: SUN_DIRECTION },
      uFogColor: { value: new THREE.Color(0x8aa3a0) },
      uWaterMap: { value: texture },
    },
    vertexShader: waterVertexShader,
    fragmentShader: waterFragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const water = new THREE.Mesh(geometry, material);
  water.position.y = WATER_LEVEL;
  water.renderOrder = 2;
  scene.add(water);
  return { material, texture };
}

function createTrees(scene: THREE.Scene) {
  const treeLimit = 260;
  const trunk = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.2, 0.42, 4.2, 7),
    new THREE.MeshLambertMaterial({ color: 0x563821 }),
    treeLimit,
  );
  const crown = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 1),
    // 实例色已经包含树冠颜色，底色必须为白色，避免二次相乘变黑。
    new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
    treeLimit * 4,
  );
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  const color = new THREE.Color();
  let seed = 1789;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  let count = 0;
  let crownCount = 0;

  for (let attempt = 0; attempt < 1200 && count < treeLimit; attempt += 1) {
    const x = (random() - 0.5) * (MAP_SIZE - 12);
    const z = (random() - 0.5) * (MAP_SIZE - 12);
    const y = terrainHeight(x, z);
    const riverDistance = Math.abs(z - riverCenter(x));
    const roadDistance = Math.abs(z - roadCenter(x));
    const slope = Math.abs(terrainHeight(x + 1.2, z) - terrainHeight(x - 1.2, z))
      + Math.abs(terrainHeight(x, z + 1.2) - terrainHeight(x, z - 1.2));
    if (riverDistance < 11 || roadDistance < 6.2 || y < 1.6 || slope > 3.1 || random() < 0.23) continue;

    const size = 0.72 + random() * 0.72;
    const angle = random() * Math.PI * 2;
    quaternion.setFromEuler(new THREE.Euler(0, angle, 0));

    position.set(x, y + 2.1 * size, z);
    scale.set(size, size, size);
    matrix.compose(position, quaternion, scale);
    trunk.setMatrixAt(count, matrix);

    // 四个不对称团块组成一棵树，轮廓更接近旧魔兽的手塑树冠。
    const clumps = [
      [0, 5.2, 0, 1.8, 1.6, 1.65],
      [-1.25, 4.75, 0.35, 1.42, 1.28, 1.34],
      [1.15, 4.85, -0.5, 1.36, 1.34, 1.28],
      [0.25, 6.35, 0.15, 1.22, 1.3, 1.16],
    ];
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (let clumpIndex = 0; clumpIndex < clumps.length; clumpIndex += 1) {
      const [offsetX, offsetY, offsetZ, scaleX, scaleY, scaleZ] = clumps[clumpIndex];
      const worldX = x + (offsetX * cos - offsetZ * sin) * size;
      const worldZ = z + (offsetX * sin + offsetZ * cos) * size;
      position.set(worldX, y + offsetY * size, worldZ);
      quaternion.setFromEuler(new THREE.Euler(random() * 0.16, angle + random() * 0.7, random() * 0.12));
      const shape = 0.92 + random() * 0.16;
      scale.set(scaleX * size * shape, scaleY * size, scaleZ * size / shape);
      matrix.compose(position, quaternion, scale);
      crown.setMatrixAt(crownCount, matrix);
      color.setHSL(0.265 + random() * 0.04, 0.38, 0.22 + random() * 0.09 + clumpIndex * 0.008);
      crown.setColorAt(crownCount, color);
      crownCount += 1;
    }
    count += 1;
  }

  trunk.count = count;
  crown.count = crownCount;
  trunk.instanceMatrix.needsUpdate = true;
  crown.instanceMatrix.needsUpdate = true;
  if (crown.instanceColor) crown.instanceColor.needsUpdate = true;
  scene.add(trunk, crown);
}

function createRocks(scene: THREE.Scene) {
  const rockLimit = 85;
  const rocks = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(1, 0),
    new THREE.MeshLambertMaterial({ color: 0x68675a }),
    rockLimit,
  );
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  let seed = 9127;
  const random = () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return seed / 4294967296;
  };
  let count = 0;

  for (let attempt = 0; attempt < 500 && count < rockLimit; attempt += 1) {
    const x = (random() - 0.5) * 168;
    const z = (random() - 0.5) * 168;
    const y = terrainHeight(x, z);
    if (Math.abs(z - riverCenter(x)) < 7 || Math.abs(z - roadCenter(x)) < 5.2 || y < 1.2) continue;
    const size = 0.55 + random() * 1.7;
    position.set(x, y + size * 0.35, z);
    quaternion.setFromEuler(new THREE.Euler(random(), random() * Math.PI, random() * 0.35));
    scale.set(size * (0.75 + random() * 0.8), size * (0.55 + random() * 0.45), size);
    matrix.compose(position, quaternion, scale);
    rocks.setMatrixAt(count, matrix);
    count += 1;
  }
  rocks.count = count;
  rocks.instanceMatrix.needsUpdate = true;
  scene.add(rocks);
}

type PartyAction = "Idle" | "Run" | "Attack";

type PartyPlayer = {
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  actions: Record<PartyAction, THREE.AnimationAction>;
  currentAction: PartyAction;
  attacking: boolean;
  moving: boolean;
};

const PARTY_KEYS = [
  { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD", attack: "Space" },
  { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", attack: "Enter" },
] as const;

// 两个克隆各自创建 Mixer，骨骼动画不会互相抢状态。
function createPartyPlayer(
  source: THREE.Group,
  clips: THREE.AnimationClip[],
  markerColor: number,
): PartyPlayer {
  const model = SkeletonUtils.clone(source) as THREE.Group;
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });

  const root = new THREE.Group();
  root.add(model);

  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1.02, 40),
    new THREE.MeshBasicMaterial({
      color: markerColor,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  marker.position.y = 0.07;
  marker.rotation.x = -Math.PI / 2;
  root.add(marker);

  const mixer = new THREE.AnimationMixer(model);
  const clip = (name: PartyAction) => {
    const value = THREE.AnimationClip.findByName(clips, name);
    if (!value) throw new Error(`角色动作缺失：${name}`);
    return mixer.clipAction(value);
  };
  const actions = {
    Idle: clip("Idle"),
    Run: clip("Run"),
    Attack: clip("Attack"),
  };
  actions.Attack.setLoop(THREE.LoopOnce, 1);
  actions.Attack.clampWhenFinished = true;
  actions.Idle.play();

  const player: PartyPlayer = {
    root,
    mixer,
    actions,
    currentAction: "Idle",
    attacking: false,
    moving: false,
  };
  mixer.addEventListener("finished", (event) => {
    if (event.action !== actions.Attack) return;
    player.attacking = false;
    setPartyAction(player, player.moving ? "Run" : "Idle");
  });
  return player;
}

// Idle 和 Run 做短交叉淡化；Attack 播放期间不被移动状态打断。
function setPartyAction(player: PartyPlayer, actionName: "Idle" | "Run") {
  if (player.attacking || player.currentAction === actionName) return;
  player.actions[player.currentAction].fadeOut(0.12);
  player.actions[actionName].reset().fadeIn(0.12).play();
  player.currentAction = actionName;
}

function triggerPartyAttack(player: PartyPlayer) {
  if (player.attacking) return;
  player.actions[player.currentAction].fadeOut(0.08);
  player.actions.Attack.reset().fadeIn(0.08).play();
  player.currentAction = "Attack";
  player.attacking = true;
}

// 先检查地面，再真正移动，避免进河、上陡坡或走散。
function movePartyPlayer(
  player: PartyPlayer,
  direction: THREE.Vector3,
  delta: number,
  teammate: PartyPlayer,
) {
  if (direction.lengthSq() === 0) return false;
  const intensity = Math.min(1, direction.length());
  direction.normalize();
  const nextX = THREE.MathUtils.clamp(
    player.root.position.x + direction.x * PARTY_MOVE_SPEED * delta * intensity,
    -MAP_SIZE / 2 + 3,
    MAP_SIZE / 2 - 3,
  );
  const nextZ = THREE.MathUtils.clamp(
    player.root.position.z + direction.z * PARTY_MOVE_SPEED * delta * intensity,
    -MAP_SIZE / 2 + 3,
    MAP_SIZE / 2 - 3,
  );
  const currentGround = terrainHeight(player.root.position.x, player.root.position.z);
  const nextGround = terrainHeight(nextX, nextZ);
  const teammateDistance = Math.hypot(nextX - teammate.root.position.x, nextZ - teammate.root.position.z);
  const staysDry = nextGround > WATER_LEVEL - 0.6;
  const canStep = Math.abs(nextGround - currentGround) < 0.85;
  if (!staysDry || !canStep || teammateDistance > PARTY_MAX_DISTANCE) return false;

  player.root.position.set(nextX, nextGround, nextZ);
  const targetYaw = Math.atan2(direction.x, direction.z);
  const yawDelta = Math.atan2(
    Math.sin(targetYaw - player.root.rotation.y),
    Math.cos(targetYaw - player.root.rotation.y),
  );
  player.root.rotation.y += yawDelta * (1 - Math.exp(-delta * 16));
  return true;
}

const partyCameraCenter = new THREE.Vector3();
const partyCameraTarget = new THREE.Vector3();
const partyCameraPosition = new THREE.Vector3();
const partyCameraLook = new THREE.Vector3();

// 相机跟随两人中点；队伍拉开时自动升高、拉远。
function updatePartyCamera(players: PartyPlayer[], camera: THREE.PerspectiveCamera, delta: number) {
  if (players.length !== 2) return;
  partyCameraCenter.copy(players[0].root.position).add(players[1].root.position).multiplyScalar(0.5);
  const distance = players[0].root.position.distanceTo(players[1].root.position);
  const cameraDistance = 14.5 + distance * 0.55;
  partyCameraTarget.set(partyCameraCenter.x, partyCameraCenter.y + 1.45, partyCameraCenter.z);
  partyCameraPosition.set(
    partyCameraCenter.x + cameraDistance * 0.82,
    partyCameraCenter.y + 8.2 + distance * 0.24,
    partyCameraCenter.z + cameraDistance * 0.38,
  );
  const moveBlend = 1 - Math.exp(-delta * 4.8);
  const lookBlend = 1 - Math.exp(-delta * 7.5);
  camera.position.lerp(partyCameraPosition, moveBlend);
  partyCameraLook.lerp(partyCameraTarget, lookBlend);
  camera.lookAt(partyCameraLook);
}

type ViewMode = "orbit" | "walk" | "party";

type G30State = {
  buttons: {
    dpadUp: boolean;
    dpadDown: boolean;
    dpadLeft: boolean;
    dpadRight: boolean;
    a: boolean;
    b: boolean;
    x: boolean;
    y: boolean;
    lb: boolean;
    lt: boolean;
    rb: boolean;
    rt: boolean;
  };
  leftStick: { x: number; y: number };
  rightStick: { x: number; y: number };
};

type G30Controller = Awaited<ReturnType<typeof connectG30>>;
type G30Status = "idle" | "connecting" | "connected" | "unsupported" | "error";

function movementFromG30(state: G30State | null) {
  if (!state) return { x: 0, y: 0 };
  const dpadX = Number(state.buttons.dpadRight) - Number(state.buttons.dpadLeft);
  const dpadY = Number(state.buttons.dpadUp) - Number(state.buttons.dpadDown);
  const x = state.leftStick.x !== 0 ? state.leftStick.x : dpadX;
  const y = state.leftStick.y !== 0 ? state.leftStick.y : dpadY;
  const scale = Math.max(1, Math.hypot(x, y));
  return { x: x / scale, y: y / scale };
}

function g30ErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "连接 G30 失败。";
}

export function TerrainScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const partyPlayersRef = useRef<PartyPlayer[]>([]);
  const viewModeRef = useRef<ViewMode>("party");
  const pressedKeysRef = useRef(new Set<string>());
  const walkYawRef = useRef(-Math.PI / 2);
  const walkPitchRef = useRef(-0.08);
  const g30StateRef = useRef<G30State | null>(null);
  const g30ControllerRef = useRef<G30Controller | null>(null);
  const previousG30ARef = useRef(false);
  const g30MountedRef = useRef(false);
  const [autoTour, setAutoTour] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("party");
  const [g30Status, setG30Status] = useState<G30Status>("idle");
  const [g30Message, setG30Message] = useState("G30 可控制 P1；首次使用需要浏览器授权。");

  const connectController = useCallback(async (request: boolean) => {
    if (!("hid" in navigator)) {
      setG30Status("unsupported");
      setG30Message("当前浏览器不支持 WebHID，请使用 Edge 或 Chrome。");
      return;
    }

    if (request) {
      setG30Status("connecting");
      setG30Message("请在浏览器设备列表中选择 THUNDEROBOT G30。");
    }

    try {
      g30ControllerRef.current?.disconnect();
      g30ControllerRef.current = null;
      g30StateRef.current = null;
      previousG30ARef.current = false;

      const controller = await connectG30({
        request,
        onInput: (next: G30State) => {
          g30StateRef.current = next;
          const pressedA = next.buttons.a;
          if (pressedA && !previousG30ARef.current && viewModeRef.current === "party") {
            const player = partyPlayersRef.current[0];
            if (player) {
              triggerPartyAttack(player);
              void g30ControllerRef.current?.rumble(70).catch(() => undefined);
            }
          }
          previousG30ARef.current = pressedA;
        },
      });

      if (!g30MountedRef.current) {
        controller.disconnect();
        return;
      }
      g30ControllerRef.current = controller;
      setG30Status("connected");
      setG30Message("G30 已连接：左摇杆或方向键移动，A 键攻击。");
    } catch (error) {
      if (!g30MountedRef.current) return;
      const message = g30ErrorMessage(error);
      if (!request && message.includes("尚未获得 WebHID 授权")) {
        setG30Status("idle");
        setG30Message("G30 可控制 P1；首次使用需要浏览器授权。");
        return;
      }
      setG30Status(message.includes("不支持 WebHID") ? "unsupported" : "error");
      setG30Message(message);
    }
  }, []);

  useEffect(() => {
    g30MountedRef.current = true;
    queueMicrotask(() => {
      if (g30MountedRef.current) void connectController(false);
    });
    return () => {
      g30MountedRef.current = false;
      g30ControllerRef.current?.disconnect();
      g30ControllerRef.current = null;
      g30StateRef.current = null;
      previousG30ARef.current = false;
    };
  }, [connectController]);

  useEffect(() => {
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    viewModeRef.current = viewMode;
    partyPlayersRef.current.forEach((player) => {
      player.root.visible = viewMode === "party";
    });
    if (!controls || !camera) return;

    if (viewMode === "walk") {
      const startX = -18;
      const startZ = roadCenter(startX);
      camera.position.set(startX, terrainHeight(startX, startZ) + WALK_EYE_HEIGHT, startZ);
      camera.rotation.order = "YXZ";
      camera.rotation.set(walkPitchRef.current, walkYawRef.current, 0);
      controls.enabled = false;
      controls.autoRotate = false;
      return;
    }

    if (viewMode === "party") {
      controls.enabled = false;
      controls.autoRotate = false;
      updatePartyCamera(partyPlayersRef.current, camera, 1);
      return;
    }

    camera.position.set(-55, 27, 52);
    controls.target.set(0, 2.6, 0);
    controls.enabled = true;
    controls.autoRotate = autoTour;
    controls.update();
  }, [autoTour, viewMode]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8aa3a0);
    scene.fog = new THREE.Fog(0x8aa3a0, 86, 172);

    const camera = new THREE.PerspectiveCamera(48, mount.clientWidth / mount.clientHeight, 0.1, 420);
    camera.position.set(-55, 27, 52);
    camera.rotation.order = "YXZ";
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // 手绘贴图需要保住中间亮度，电影曲线会把它们压得发黑。
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.06;
    mount.appendChild(renderer.domElement);

    // 天空和太阳由同一个方向驱动，地面与水面的高光才能对齐。
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(260, 32, 18),
      new THREE.ShaderMaterial({
        uniforms: { uSunDirection: { value: SUN_DIRECTION } },
        vertexShader: skyVertexShader,
        fragmentShader: skyFragmentShader,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    );
    sky.renderOrder = -10;
    scene.add(sky);

    // 实体和地形共用同样的天空、地面与太阳颜色，避免受光割裂。
    scene.add(new THREE.HemisphereLight(SKY_LIGHT_COLOR, GROUND_LIGHT_COLOR, 1.46));
    const sunlight = new THREE.DirectionalLight(SUN_LIGHT_COLOR, 1.42);
    sunlight.position.copy(SUN_DIRECTION).multiplyScalar(120);
    scene.add(sunlight);

    const terrainTextures = createTerrain(scene, renderer);
    const { material: waterMaterial, texture: waterTexture } = createWater(scene, renderer);
    createTrees(scene);
    createRocks(scene);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 2.6, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.minDistance = 18;
    controls.maxDistance = 118;
    controls.minPolarAngle = Math.PI * 0.16;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.24;
    controls.update();
    controlsRef.current = controls;

    let disposed = false;
    new GLTFLoader().loadAsync("/models/bovine-hero-runtime.glb").then((gltf) => {
      if (disposed) return;
      const players = [
        createPartyPlayer(gltf.scene, gltf.animations, 0xf1b84b),
        createPartyPlayer(gltf.scene, gltf.animations, 0x65c8e8),
      ];
      const startX = -18;
      const startZ = roadCenter(startX);
      players[0].root.position.set(startX, terrainHeight(startX, startZ - 1.5), startZ - 1.5);
      players[1].root.position.set(startX, terrainHeight(startX, startZ + 1.5), startZ + 1.5);
      players.forEach((player) => {
        player.root.rotation.y = Math.atan2(0.82, 0.38);
        player.root.visible = viewModeRef.current === "party";
        scene.add(player.root);
      });
      partyPlayersRef.current = players;
      if (viewModeRef.current === "party") updatePartyCamera(players, camera, 1);
    }).catch((error: unknown) => {
      console.error("角色模型加载失败", error);
    });

    const timer = new THREE.Timer();
    timer.connect(document);
    const walkDirection = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const partyCenter = new THREE.Vector3();
    const partyForward = new THREE.Vector3();
    const partyRight = new THREE.Vector3();
    const partyDirection = [new THREE.Vector3(), new THREE.Vector3()];
    let lookPointerId: number | null = null;
    let lookPointerX = 0;
    let lookPointerY = 0;

    const updateWalkLook = (moveX: number, moveY: number) => {
      walkYawRef.current -= moveX * 0.0021;
      walkPitchRef.current = THREE.MathUtils.clamp(
        walkPitchRef.current - moveY * 0.0018,
        -Math.PI * 0.42,
        Math.PI * 0.34,
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const walkKeys = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      const partyKeys = [...walkKeys, "Space", "Enter"];
      if (viewModeRef.current === "walk" && walkKeys.includes(event.code)) {
        event.preventDefault();
        pressedKeysRef.current.add(event.code);
        return;
      }
      if (viewModeRef.current === "party" && partyKeys.includes(event.code)) {
        event.preventDefault();
        pressedKeysRef.current.add(event.code);
        if (event.repeat) return;
        if (event.code === "Space" && partyPlayersRef.current[0]) {
          triggerPartyAttack(partyPlayersRef.current[0]);
        }
        if (event.code === "Enter" && partyPlayersRef.current[1]) {
          triggerPartyAttack(partyPlayersRef.current[1]);
        }
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeysRef.current.delete(event.code);
    };
    const handleMouseMove = (event: MouseEvent) => {
      if (viewModeRef.current !== "walk" || document.pointerLockElement !== renderer.domElement) return;
      updateWalkLook(event.movementX, event.movementY);
    };
    // Pointer Lock 不可用时，按住画面拖动也能转动摄像头。
    const handleLookPointerDown = (event: PointerEvent) => {
      if (viewModeRef.current !== "walk" || document.pointerLockElement === renderer.domElement) return;
      lookPointerId = event.pointerId;
      lookPointerX = event.clientX;
      lookPointerY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const handleLookPointerMove = (event: PointerEvent) => {
      if (lookPointerId !== event.pointerId || viewModeRef.current !== "walk") return;
      updateWalkLook(event.clientX - lookPointerX, event.clientY - lookPointerY);
      lookPointerX = event.clientX;
      lookPointerY = event.clientY;
    };
    const handleLookPointerUp = (event: PointerEvent) => {
      if (lookPointerId !== event.pointerId) return;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      lookPointerId = null;
    };
    const handleCanvasClick = () => {
      if (viewModeRef.current !== "walk" || document.pointerLockElement === renderer.domElement) return;
      renderer.domElement.requestPointerLock().catch(() => undefined);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    document.addEventListener("mousemove", handleMouseMove);
    renderer.domElement.addEventListener("click", handleCanvasClick);
    renderer.domElement.addEventListener("pointerdown", handleLookPointerDown);
    renderer.domElement.addEventListener("pointermove", handleLookPointerMove);
    renderer.domElement.addEventListener("pointerup", handleLookPointerUp);
    renderer.domElement.addEventListener("pointercancel", handleLookPointerUp);

    let frame = 0;
    const animate = (timestamp?: number) => {
      frame = window.requestAnimationFrame(animate);
      timer.update(timestamp);
      waterMaterial.uniforms.uTime.value = timer.getElapsed();
      const delta = Math.min(timer.getDelta(), 0.05);
      partyPlayersRef.current.forEach((player) => player.mixer.update(delta));

      if (viewModeRef.current === "walk") {
        const keys = pressedKeysRef.current;
        const g30State = g30StateRef.current;
        const g30Movement = movementFromG30(g30State);
        forward.set(-Math.sin(walkYawRef.current), 0, -Math.cos(walkYawRef.current));
        right.set(Math.cos(walkYawRef.current), 0, -Math.sin(walkYawRef.current));
        walkDirection.set(0, 0, 0);
        if (keys.has("KeyW") || keys.has("ArrowUp")) walkDirection.add(forward);
        if (keys.has("KeyS") || keys.has("ArrowDown")) walkDirection.sub(forward);
        if (keys.has("KeyD") || keys.has("ArrowRight")) walkDirection.add(right);
        if (keys.has("KeyA") || keys.has("ArrowLeft")) walkDirection.sub(right);
        walkDirection.addScaledVector(forward, g30Movement.y);
        walkDirection.addScaledVector(right, g30Movement.x);
        if (g30State) {
          updateWalkLook(
            g30State.rightStick.x * delta * 950,
            -g30State.rightStick.y * delta * 760,
          );
        }

        if (walkDirection.lengthSq() > 0) {
          const intensity = Math.min(1, walkDirection.length());
          walkDirection.normalize().multiplyScalar(7.2 * delta * intensity);
          const nextX = THREE.MathUtils.clamp(camera.position.x + walkDirection.x, -MAP_SIZE / 2 + 3, MAP_SIZE / 2 - 3);
          const nextZ = THREE.MathUtils.clamp(camera.position.z + walkDirection.z, -MAP_SIZE / 2 + 3, MAP_SIZE / 2 - 3);
          const currentGround = terrainHeight(camera.position.x, camera.position.z);
          const nextGround = terrainHeight(nextX, nextZ);
          const staysDry = nextGround > WATER_LEVEL - 0.6;
          const canStepUp = nextGround - currentGround < 0.75;
          if (staysDry && canStepUp) {
            camera.position.x = nextX;
            camera.position.z = nextZ;
          }
        }

        const ground = terrainHeight(camera.position.x, camera.position.z);
        camera.position.y = THREE.MathUtils.lerp(
          camera.position.y,
          ground + WALK_EYE_HEIGHT,
          1 - Math.exp(-delta * 18),
        );
        camera.rotation.set(walkPitchRef.current, walkYawRef.current, 0);
      } else if (viewModeRef.current === "party") {
        const players = partyPlayersRef.current;
        if (players.length === 2) {
          partyCenter.copy(players[0].root.position).add(players[1].root.position).multiplyScalar(0.5);
          partyForward.subVectors(partyCenter, camera.position).setY(0).normalize();
          partyRight.crossVectors(partyForward, camera.up).normalize();
          const g30Movement = movementFromG30(g30StateRef.current);

          players.forEach((player, index) => {
            const keys = PARTY_KEYS[index];
            const direction = partyDirection[index].set(0, 0, 0);
            if (pressedKeysRef.current.has(keys.up)) direction.add(partyForward);
            if (pressedKeysRef.current.has(keys.down)) direction.sub(partyForward);
            if (pressedKeysRef.current.has(keys.right)) direction.add(partyRight);
            if (pressedKeysRef.current.has(keys.left)) direction.sub(partyRight);
            if (index === 0) {
              direction.addScaledVector(partyForward, g30Movement.y);
              direction.addScaledVector(partyRight, g30Movement.x);
            }
            player.moving = movePartyPlayer(player, direction, delta, players[index === 0 ? 1 : 0]);
            setPartyAction(player, player.moving ? "Run" : "Idle");
          });
          updatePartyCamera(players, camera, delta);
        }
      } else {
        controls.update();
      }
      renderer.render(scene, camera);
    };
    animate();

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", resize);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("mousemove", handleMouseMove);
      renderer.domElement.removeEventListener("click", handleCanvasClick);
      renderer.domElement.removeEventListener("pointerdown", handleLookPointerDown);
      renderer.domElement.removeEventListener("pointermove", handleLookPointerMove);
      renderer.domElement.removeEventListener("pointerup", handleLookPointerUp);
      renderer.domElement.removeEventListener("pointercancel", handleLookPointerUp);
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
      timer.dispose();
      controls.dispose();
      controlsRef.current = null;
      cameraRef.current = null;
      partyPlayersRef.current.forEach((player) => player.mixer.stopAllAction());
      partyPlayersRef.current = [];
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
      terrainTextures.forEach((texture) => texture.dispose());
      waterTexture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const switchToOrbit = () => {
    viewModeRef.current = "orbit";
    setViewMode("orbit");
    setAutoTour(true);
    pressedKeysRef.current.clear();
    if (document.pointerLockElement) document.exitPointerLock();
  };

  const switchToWalk = () => {
    viewModeRef.current = "walk";
    setViewMode("walk");
    setAutoTour(false);
    pressedKeysRef.current.clear();
    const canvas = mountRef.current?.querySelector("canvas");
    canvas?.requestPointerLock().catch(() => undefined);
  };

  const switchToParty = () => {
    viewModeRef.current = "party";
    setViewMode("party");
    setAutoTour(false);
    pressedKeysRef.current.clear();
    if (document.pointerLockElement) document.exitPointerLock();
  };

  return (
    <main className="world">
      <div ref={mountRef} className="world__canvas" aria-label="可拖动查看的程序化三维山谷" />
      <div className="world__shade" />
      <section className="world__hud" aria-label="场景说明">
        <p className="world__eyebrow">Three.js terrain study</p>
        <h1 className="world__title">暮光河谷</h1>
        <p className="world__note">同屏双人 RPG 原型：先把角色、移动、动作和共享镜头跑顺。</p>
        <div className="world__tags" aria-label="已实现效果">
          <span className="world__tag">程序化地形</span>
          <span className="world__tag">石板路软过渡</span>
          <span className="world__tag">旧式水面</span>
          <span className="world__tag">同屏双人</span>
        </div>
        <div className={`world__controller world__controller--${g30Status}`}>
          <button
            className="world__controller-button"
            type="button"
            disabled={g30Status === "connecting" || g30Status === "connected" || g30Status === "unsupported"}
            onClick={() => void connectController(true)}
          >
            <span className="world__controller-dot" aria-hidden="true" />
            {g30Status === "connecting"
              ? "正在连接…"
              : g30Status === "connected"
                ? "G30 已连接"
                : "连接 G30 手柄"}
          </button>
          <p className="world__controller-status" role="status" aria-live="polite">
            {g30Message}
          </p>
        </div>
        <div className="world__modes" aria-label="控制模式">
          <button
            className={`world__mode${viewMode === "orbit" ? " world__mode--active" : ""}`}
            type="button"
            aria-pressed={viewMode === "orbit"}
            onClick={switchToOrbit}
          >
            观景模式
          </button>
          <button
            className={`world__mode${viewMode === "walk" ? " world__mode--active" : ""}`}
            type="button"
            aria-pressed={viewMode === "walk"}
            onClick={switchToWalk}
          >
            地面行走
          </button>
          <button
            className={`world__mode${viewMode === "party" ? " world__mode--active" : ""}`}
            type="button"
            aria-pressed={viewMode === "party"}
            onClick={switchToParty}
          >
            同屏双人
          </button>
        </div>
        {viewMode === "orbit" ? (
          <button
            className={`world__tour${autoTour ? "" : " world__tour--paused"}`}
            type="button"
            aria-pressed={autoTour}
            onClick={() => setAutoTour((value) => !value)}
          >
            <span className="world__tour-dot" aria-hidden="true" />
            {autoTour ? "自动巡游中" : "继续自动巡游"}
          </button>
        ) : viewMode === "walk" ? (
          <p className="world__walk-help">
            WASD 行走 · 拖动画面转头 · G30 左摇杆移动 / 右摇杆转头
          </p>
        ) : (
          <div className="world__players" aria-label="双人控制说明">
            <span className="world__player world__player--one">
              P1 · WASD · 空格 · G30 左摇杆 / 方向键 · A 攻击
            </span>
            <span className="world__player world__player--two">P2 · 方向键 · 回车</span>
          </div>
        )}
      </section>
      <p className="world__tip">
        {viewMode === "orbit"
          ? "拖动旋转 · 滚轮缩放"
          : viewMode === "walk"
            ? "键盘或 G30 行走 · 拖动 / 右摇杆转头"
            : "G30 控制 P1 · 镜头自动跟随"}
      </p>
    </main>
  );
}
