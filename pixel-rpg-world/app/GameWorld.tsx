"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const CELL = 1.45;
const MOVE_SPEED = 4.6;
const PLAYER_RADIUS = 0.38;

type Wall = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

type AnimatedActor = {
  root: THREE.Group;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  phase: number;
};

const cellToWorld = (cell: number) => cell * CELL;
const cellKey = (x: number, z: number) => `${x}:${z}`;

// 固定随机数保证每次刷新纹理一致，便于稳定对比画面。
function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

// 在浏览器里生成原创像素材质，避免依赖或分发游戏原素材。
function makePixelTexture(
  paint: (ctx: CanvasRenderingContext2D, random: () => number) => void,
  repeatX = 1,
  repeatY = 1,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is unavailable");

  ctx.imageSmoothingEnabled = false;
  paint(ctx, seededRandom(8417));
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapNearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeStoneTexture(dark = false) {
  return makePixelTexture((ctx, random) => {
    ctx.fillStyle = dark ? "#242128" : "#343137";
    ctx.fillRect(0, 0, 64, 64);

    // 砖缝、边缘高光和离散噪点共同制造手绘像素质感。
    for (let row = 0; row < 4; row += 1) {
      const top = row * 16;
      const offset = row % 2 === 0 ? -8 : 0;
      for (let col = -1; col < 5; col += 1) {
        const left = offset + col * 16;
        ctx.fillStyle = dark ? "#111015" : "#1c1b20";
        ctx.fillRect(left, top, 16, 2);
        ctx.fillRect(left, top, 2, 16);
        ctx.fillStyle = dark ? "#4a3d40" : "#4e474b";
        ctx.fillRect(left + 2, top + 2, 13, 2);
        ctx.fillRect(left + 2, top + 2, 2, 12);
      }
    }

    for (let index = 0; index < 190; index += 1) {
      const value = random();
      ctx.fillStyle = value > 0.7
        ? (dark ? "#55474a" : "#62565a")
        : (dark ? "#1a181e" : "#29262c");
      const size = random() > 0.82 ? 2 : 1;
      ctx.fillRect(Math.floor(random() * 64), Math.floor(random() * 64), size, size);
    }
  });
}

function makeFloorTexture() {
  return makePixelTexture((ctx, random) => {
    ctx.fillStyle = "#383337";
    ctx.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        const left = x * 16;
        const top = y * 16;
        ctx.fillStyle = (x + y) % 3 === 0 ? "#4b4040" : "#40383b";
        ctx.fillRect(left + 2, top + 2, 12, 12);
        ctx.fillStyle = "#5a4a47";
        ctx.fillRect(left + 3, top + 3, 9, 2);
        ctx.fillStyle = "#221f24";
        ctx.fillRect(left, top, 16, 2);
        ctx.fillRect(left, top, 2, 16);
      }
    }
    for (let index = 0; index < 150; index += 1) {
      ctx.fillStyle = random() > 0.5 ? "#252229" : "#63504b";
      ctx.fillRect(Math.floor(random() * 64), Math.floor(random() * 64), 1, 1);
    }
  });
}

function makeWoodTexture() {
  return makePixelTexture((ctx, random) => {
    ctx.fillStyle = "#5f3528";
    ctx.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 8) {
      ctx.fillStyle = y % 16 === 0 ? "#311e1b" : "#7c4931";
      ctx.fillRect(0, y, 64, 2);
      ctx.fillStyle = "#9b603b";
      ctx.fillRect(0, y + 2, 64, 1);
    }
    for (let index = 0; index < 45; index += 1) {
      ctx.fillStyle = random() > 0.55 ? "#3b231e" : "#aa6840";
      ctx.fillRect(Math.floor(random() * 64), Math.floor(random() * 64), 5, 1);
    }
  }, 1, 2);
}

function makeMetalTexture() {
  return makePixelTexture((ctx, random) => {
    ctx.fillStyle = "#30343c";
    ctx.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 16) {
      for (let x = 0; x < 64; x += 16) {
        ctx.fillStyle = "#1a1d24";
        ctx.fillRect(x, y, 16, 2);
        ctx.fillRect(x, y, 2, 16);
        ctx.fillStyle = "#59606b";
        ctx.fillRect(x + 2, y + 2, 12, 2);
        ctx.fillStyle = "#8a7d65";
        ctx.fillRect(x + 3, y + 3, 2, 2);
        ctx.fillRect(x + 11, y + 11, 2, 2);
      }
    }
    for (let index = 0; index < 70; index += 1) {
      ctx.fillStyle = random() > 0.7 ? "#6f6557" : "#242832";
      ctx.fillRect(Math.floor(random() * 64), Math.floor(random() * 64), 1, 1);
    }
  });
}

function makeRuneTexture() {
  return makePixelTexture((ctx) => {
    ctx.fillStyle = "#241a20";
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = "#4a2d31";
    ctx.fillRect(4, 4, 56, 56);
    ctx.fillStyle = "#17131a";
    ctx.fillRect(8, 8, 48, 48);
    ctx.fillStyle = "#c79c42";
    ctx.fillRect(29, 10, 6, 44);
    ctx.fillRect(10, 29, 44, 6);
    ctx.fillRect(17, 17, 8, 8);
    ctx.fillRect(39, 17, 8, 8);
    ctx.fillRect(17, 39, 8, 8);
    ctx.fillRect(39, 39, 8, 8);
    ctx.fillStyle = "#7f3f32";
    ctx.fillRect(27, 27, 10, 10);
  });
}

function makeSoftParticleTexture() {
  return makePixelTexture((ctx) => {
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.18, "rgba(255,188,89,.95)");
    gradient.addColorStop(0.5, "rgba(255,70,22,.28)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
  });
}

export default function GameWorld() {
  const mountRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef(new Set<string>());
  const [prompt, setPrompt] = useState("穿过熔岩桥，靠近祭坛");
  const [awakened, setAwakened] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07080b);
    scene.fog = new THREE.FogExp2(0x111015, 0.022);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.domElement.dataset.testid = "game-canvas";
    renderer.domElement.setAttribute("aria-label", "可行走的熔火遗迹 3D 地牢");
    mount.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const ssao = new SSAOPass(scene, camera, 1, 1, 16);
    ssao.kernelRadius = 7;
    ssao.minDistance = 0.002;
    ssao.maxDistance = 0.11;
    composer.addPass(ssao);
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.52, 0.42, 1.1);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    const geometryCache = new Map<string, THREE.BoxGeometry>();
    const obstacles: Wall[] = [];
    const walkableCells = new Set<string>();
    const animated: Array<(time: number, delta: number) => void> = [];
    const actors: AnimatedActor[] = [];

    const floorTexture = makeFloorTexture();
    const stoneTexture = makeStoneTexture();
    const darkStoneTexture = makeStoneTexture(true);
    const woodTexture = makeWoodTexture();
    const metalTexture = makeMetalTexture();
    const runeTexture = makeRuneTexture();
    const particleTexture = makeSoftParticleTexture();
    const textures = [floorTexture, stoneTexture, darkStoneTexture, woodTexture, metalTexture, runeTexture, particleTexture];
    textures.forEach((texture) => {
      texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    });

    const material = (
      color: number,
      options: THREE.MeshStandardMaterialParameters = {},
    ) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.86, ...options });

    const floorMaterial = material(0xffffff, { map: floorTexture, roughness: 0.88 });
    const floorWarmMaterial = material(0xb88a7a, { map: floorTexture, roughness: 0.9 });
    const floorMossMaterial = material(0x6f8063, { map: floorTexture, roughness: 0.94 });
    const stoneMaterial = material(0xffffff, { map: stoneTexture, roughness: 0.92 });
    const darkStoneMaterial = material(0xffffff, { map: darkStoneTexture, roughness: 0.96 });
    const woodMaterial = material(0xffffff, { map: woodTexture, roughness: 0.82 });
    const metalMaterial = material(0xffffff, { map: metalTexture, metalness: 0.48, roughness: 0.52 });
    const runeMaterial = material(0xffffff, { map: runeTexture, emissive: 0x3f1708, emissiveIntensity: 0.55 });
    const boneMaterial = material(0xd8d1bd, { roughness: 0.76 });
    const leatherMaterial = material(0x6f392b, { roughness: 0.88 });
    const blackMaterial = material(0x090a0e, { roughness: 0.72 });
    const heroBlueMaterial = material(0x294f68, { roughness: 0.64, metalness: 0.12 });
    const heroTrimMaterial = material(0x47c5d2, { emissive: 0x0b6575, emissiveIntensity: 1.5 });
    const skinMaterial = material(0xd79c78);
    const heroCoatMaterial = material(0x172837, { roughness: 0.82 });
    const goldMaterial = material(0xd8a63c, { metalness: 0.5, roughness: 0.44 });
    const boneDarkMaterial = material(0x756c62, { roughness: 0.88 });
    const eyeGlowMaterial = material(0xb884ff, {
      emissive: 0x6e24ff,
      emissiveIntensity: 3.5,
      toneMapped: false,
    });
    const crystalMaterial = material(0x8c59ff, {
      emissive: 0x6d24ff,
      emissiveIntensity: 3.2,
      roughness: 0.2,
      metalness: 0.18,
    });
    const fireMaterial = material(0xff7a16, {
      emissive: 0xff3200,
      emissiveIntensity: 3.4,
      roughness: 0.25,
      toneMapped: false,
    });
    const emberMaterial = new THREE.PointsMaterial({
      color: 0xff8a2b,
      map: particleTexture,
      size: 0.28,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const sceneMaterials: THREE.Material[] = [
      floorMaterial, floorWarmMaterial, floorMossMaterial, stoneMaterial, darkStoneMaterial,
      woodMaterial, metalMaterial, runeMaterial, boneMaterial, leatherMaterial, blackMaterial,
      heroBlueMaterial, heroTrimMaterial, skinMaterial, heroCoatMaterial, goldMaterial,
      boneDarkMaterial, eyeGlowMaterial, crystalMaterial, fireMaterial, emberMaterial,
    ];

    const getBoxGeometry = (size: [number, number, number]) => {
      const key = size.join(":");
      let geometry = geometryCache.get(key);
      if (!geometry) {
        geometry = new THREE.BoxGeometry(...size);
        geometryCache.set(key, geometry);
      }
      return geometry;
    };

    const addBox = (
      parent: THREE.Object3D,
      size: [number, number, number],
      position: [number, number, number],
      boxMaterial: THREE.Material,
      castShadow = true,
    ) => {
      const mesh = new THREE.Mesh(getBoxGeometry(size), boxMaterial);
      mesh.position.set(...position);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    const addWall = (x: number, z: number, width: number, depth: number) => {
      obstacles.push({
        minX: x - width / 2,
        maxX: x + width / 2,
        minZ: z - depth / 2,
        maxZ: z + depth / 2,
      });
    };

    // 主光只提供方向；真正的戏剧感来自岩浆、火盆和祭坛的局部光。
    scene.add(new THREE.HemisphereLight(0x7180a0, 0x2b0e08, 0.92));
    scene.add(new THREE.AmbientLight(0x7e4937, 0.24));
    const moon = new THREE.DirectionalLight(0xaabbe0, 2.05);
    moon.position.set(10, 18, 14);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    moon.shadow.camera.left = -28;
    moon.shadow.camera.right = 28;
    moon.shadow.camera.top = 28;
    moon.shadow.camera.bottom = -28;
    moon.shadow.bias = -0.00035;
    scene.add(moon);
    const warmKey = new THREE.DirectionalLight(0xff9a58, 1.35);
    warmKey.position.set(-14, 15, 10);
    scene.add(warmKey);

    const altarSpot = new THREE.SpotLight(0xffb36a, 260, 38, 0.5, 0.78, 2);
    altarSpot.position.set(-3, 17, -1);
    altarSpot.target.position.set(0, 0, cellToWorld(-7));
    scene.add(altarSpot, altarSpot.target);

    // 1. 地图不是随机铺满，而是两个房间加一座危险窄桥。
    const floorGroups: Array<{ cells: Array<[number, number]>; material: THREE.Material }> = [
      { cells: [], material: floorMaterial },
      { cells: [], material: floorWarmMaterial },
      { cells: [], material: floorMossMaterial },
    ];

    for (let z = -10; z <= 9; z += 1) {
      for (let x = -10; x <= 9; x += 1) {
        const southRoom = z >= 2 && z <= 9 && x >= -7 && x <= 7;
        const northRoom = z >= -10 && z <= -4 && x >= -7 && x <= 7;
        const bridge = z >= -4 && z <= 2 && x >= -1 && x <= 1;
        const westLedge = x >= -10 && x <= -8 && z >= -8 && z <= 4;
        if (!southRoom && !northRoom && !bridge && !westLedge) continue;

        walkableCells.add(cellKey(x, z));
        const pattern = Math.abs(x * 11 + z * 7) % 17;
        const groupIndex = pattern === 0 ? 2 : pattern < 4 ? 1 : 0;
        floorGroups[groupIndex].cells.push([x, z]);
      }
    }

    const floorGeometry = new THREE.BoxGeometry(CELL * 0.96, 0.5, CELL * 0.96);
    geometryCache.set("floor", floorGeometry);
    const dummy = new THREE.Object3D();
    floorGroups.forEach((group) => {
      const mesh = new THREE.InstancedMesh(floorGeometry, group.material, group.cells.length);
      mesh.receiveShadow = true;
      group.cells.forEach(([x, z], index) => {
        dummy.position.set(cellToWorld(x), -0.25, cellToWorld(z));
        dummy.rotation.y = ((x + z) % 4) * Math.PI / 2;
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
      });
      scene.add(mesh);
    });

    // 岩浆是高亮动态着色器，Bloom 会自然形成参考图里的灼热光晕。
    const lavaUniforms = { uTime: { value: 0 } };
    const lavaMaterial = new THREE.ShaderMaterial({
      uniforms: lavaUniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        void main() {
          vec2 cell = floor(vUv * vec2(94.0, 72.0) + vec2(uTime * 1.4, uTime * .35));
          float n = hash(cell) * .72 + hash(floor(cell * .45)) * .28;
          float pulse = sin((vUv.x + vUv.y) * 22.0 - uTime * 2.4) * .12;
          vec3 deep = vec3(.52, .012, .002);
          vec3 hot = vec3(1.72, .24, .012);
          vec3 color = mix(deep, hot, smoothstep(.34, .92, n + pulse));
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      toneMapped: false,
    });
    sceneMaterials.push(lavaMaterial);
    const lava = new THREE.Mesh(new THREE.PlaneGeometry(35, 22), lavaMaterial);
    lava.rotation.x = -Math.PI / 2;
    lava.position.set(0, -1.55, -1.4);
    scene.add(lava);

    // 岩浆下方再补一层橙光，墙体底部会产生明显反射色。
    const lavaLight = new THREE.PointLight(0xff3b08, 23, 34, 1.75);
    lavaLight.position.set(0, 2.4, -1);
    scene.add(lavaLight);
    const lavaFill = new THREE.PointLight(0xffa02a, 9, 22, 2);
    lavaFill.position.set(-10, 2, 0);
    scene.add(lavaFill);

    const dungeon = new THREE.Group();
    scene.add(dungeon);

    const addWallBlock = (gridX: number, gridZ: number, height = 2.4, y = height / 2) => {
      const x = cellToWorld(gridX);
      const z = cellToWorld(gridZ);
      addBox(dungeon, [CELL * 0.98, height, CELL * 0.98], [x, y, z], darkStoneMaterial);
      addWall(x, z, CELL * 0.92, CELL * 0.92);
    };

    // 背墙采用不规则高度，避免像简单盒子围栏。
    for (let x = -9; x <= 9; x += 1) {
      addWallBlock(x, -11, 3.4 + (Math.abs(x) % 3) * 0.48);
    }
    for (let z = -10; z <= 7; z += 1) {
      addWallBlock(-11, z, 2.9 + (Math.abs(z) % 4 === 0 ? 1.3 : 0));
    }
    for (let z = -10; z <= -4; z += 1) {
      addWallBlock(9, z, 3.0 + (Math.abs(z) % 3) * 0.42);
    }
    for (let x = -7; x <= 7; x += 1) {
      if (Math.abs(x) > 2) addWallBlock(x, 10, 2.1 + (Math.abs(x) % 2) * 0.5);
    }

    // 窄桥两侧做断裂矮墙和桥墩，明确地把“铺地板”变成悬空建筑。
    [-1, 1].forEach((side) => {
      [-3, -1, 1].forEach((gridZ, index) => {
        const broken = side === 1 && index === 1;
        addBox(
          dungeon,
          [0.42, broken ? 0.38 : 0.72, broken ? 1.1 : 2.36],
          [side * CELL * 1.58, broken ? 0.19 : 0.36, cellToWorld(gridZ)],
          stoneMaterial,
        );
      });
      [-4, 2].forEach((gridZ) => {
        addBox(dungeon, [0.72, 1.35, 0.72], [side * CELL * 1.58, 0.68, cellToWorld(gridZ)], darkStoneMaterial);
        addBox(dungeon, [0.9, 0.22, 0.9], [side * CELL * 1.58, 1.42, cellToWorld(gridZ)], metalMaterial);
      });
    });

    const addPillar = (gridX: number, gridZ: number, height = 5.3) => {
      const pillar = new THREE.Group();
      pillar.position.set(cellToWorld(gridX), 0, cellToWorld(gridZ));
      addBox(pillar, [1.65, 0.45, 1.65], [0, 0.22, 0], stoneMaterial);
      addBox(pillar, [1.25, height, 1.25], [0, height / 2 + 0.35, 0], darkStoneMaterial);
      addBox(pillar, [1.65, 0.46, 1.65], [0, height + 0.52, 0], stoneMaterial);
      addBox(pillar, [1.42, 0.18, 1.42], [0, height + 0.84, 0], metalMaterial);
      scene.add(pillar);
      addWall(pillar.position.x, pillar.position.z, 1.35, 1.35);
    };

    addPillar(-7, -9, 6.1);
    addPillar(7, -9, 6.1);
    addPillar(-7, -4, 5.1);
    addPillar(7, -4, 5.1);
    addPillar(-7, 3, 4.6);
    addPillar(7, 3, 4.6);

    // 北侧铁门给玩家一个明确的关卡终点。
    const gate = new THREE.Group();
    gate.position.set(0, 0, cellToWorld(-10.55));
    addBox(gate, [7.2, 0.65, 1.5], [0, 5.6, 0], stoneMaterial);
    addBox(gate, [1.2, 5.4, 1.5], [-3.15, 2.7, 0], stoneMaterial);
    addBox(gate, [1.2, 5.4, 1.5], [3.15, 2.7, 0], stoneMaterial);
    for (let index = -2; index <= 2; index += 1) {
      addBox(gate, [0.16, 4.5, 0.18], [index * 0.85, 2.3, 0.25], metalMaterial);
    }
    addBox(gate, [5.1, 0.22, 0.2], [0, 1.4, 0.25], metalMaterial);
    addBox(gate, [5.1, 0.22, 0.2], [0, 3.2, 0.25], metalMaterial);
    scene.add(gate);

    // 祭坛、地毯、符文和水晶组成主视觉焦点。
    for (let x = -2; x <= 2; x += 1) {
      for (let z = -9; z <= -6; z += 1) {
        addBox(dungeon, [CELL * 0.92, 0.08, CELL * 0.92], [cellToWorld(x), 0.05, cellToWorld(z)], runeMaterial, false);
      }
    }
    const altar = new THREE.Group();
    altar.position.set(0, 0, cellToWorld(-8));
    addBox(altar, [3.9, 0.5, 3.1], [0, 0.25, 0], stoneMaterial);
    addBox(altar, [2.8, 0.55, 2.2], [0, 0.77, 0], darkStoneMaterial);
    addBox(altar, [1.55, 0.5, 1.55], [0, 1.28, 0], metalMaterial);
    const crystal = addBox(altar, [0.95, 1.75, 0.95], [0, 2.35, 0], crystalMaterial);
    crystal.rotation.y = Math.PI / 4;
    crystal.rotation.z = Math.PI / 10;
    scene.add(altar);
    addWall(altar.position.x, altar.position.z, 3.7, 3.0);

    const crystalLight = new THREE.PointLight(0x8755ff, 29, 16, 1.8);
    crystalLight.position.set(0, 3.4, cellToWorld(-8));
    scene.add(crystalLight);
    const coldRim = new THREE.PointLight(0x43caff, 12, 17, 1.9);
    coldRim.position.set(8, 4, -8);
    scene.add(coldRim);

    // 火盆同时带火焰方块、点光源和热色粒子。
    const brazierPositions: Array<[number, number]> = [
      [-6, -7], [6, -7], [-6, 5], [6, 5], [-9, 0],
    ];
    brazierPositions.forEach(([gridX, gridZ], index) => {
      const brazier = new THREE.Group();
      brazier.position.set(cellToWorld(gridX), 0, cellToWorld(gridZ));
      addBox(brazier, [1.1, 0.45, 1.1], [0, 0.22, 0], stoneMaterial);
      addBox(brazier, [0.78, 0.42, 0.78], [0, 0.63, 0], metalMaterial);
      const flameA = addBox(brazier, [0.36, 1.15, 0.36], [-0.12, 1.35, 0], fireMaterial, false);
      const flameB = addBox(brazier, [0.32, 0.86, 0.32], [0.18, 1.22, 0.12], fireMaterial, false);
      flameA.rotation.y = Math.PI / 4;
      flameB.rotation.y = -Math.PI / 4;
      scene.add(brazier);

      const light = new THREE.PointLight(0xff711e, 15, 10, 2);
      light.position.set(brazier.position.x, 2.25, brazier.position.z);
      scene.add(light);
      animated.push((time) => {
        const flicker = 0.82 + Math.sin(time * 9 + index * 1.7) * 0.12 + Math.sin(time * 17) * 0.06;
        light.intensity = 15 * flicker;
        flameA.scale.y = flicker;
        flameB.scale.y = 1.1 - (flicker - 0.82);
      });
    });

    const addCrate = (gridX: number, gridZ: number, scale = 1) => {
      const crate = new THREE.Group();
      crate.position.set(cellToWorld(gridX), 0, cellToWorld(gridZ));
      addBox(crate, [1.35 * scale, 1.28 * scale, 1.35 * scale], [0, 0.64 * scale, 0], woodMaterial);
      addBox(crate, [1.42 * scale, 0.16, 1.42 * scale], [0, 0.2, 0], metalMaterial);
      addBox(crate, [1.42 * scale, 0.16, 1.42 * scale], [0, 1.05 * scale, 0], metalMaterial);
      addBox(crate, [0.14, 1.32 * scale, 1.43 * scale], [0, 0.64 * scale, 0], metalMaterial);
      scene.add(crate);
      addWall(crate.position.x, crate.position.z, 1.2 * scale, 1.2 * scale);
    };
    addCrate(-5, 8, 1);
    addCrate(-4, 8, 0.82);
    addCrate(5, -5, 0.92);
    addCrate(-9, -6, 0.82);

    // 链条用交替方向的方环，远景中仍然保持块状轮廓。
    const addChain = (x: number, z: number, top: number, links: number) => {
      const chain = new THREE.Group();
      chain.position.set(x, top, z);
      for (let index = 0; index < links; index += 1) {
        const link = new THREE.Group();
        link.position.y = -index * 0.56;
        link.rotation.y = index % 2 === 0 ? 0 : Math.PI / 2;
        addBox(link, [0.12, 0.5, 0.12], [-0.22, 0, 0], metalMaterial, false);
        addBox(link, [0.12, 0.5, 0.12], [0.22, 0, 0], metalMaterial, false);
        addBox(link, [0.55, 0.12, 0.12], [0, 0.22, 0], metalMaterial, false);
        addBox(link, [0.55, 0.12, 0.12], [0, -0.22, 0], metalMaterial, false);
        chain.add(link);
      }
      scene.add(chain);
    };
    addChain(-11.2, -4.5, 12.5, 18);
    addChain(9.5, -7.5, 12.8, 15);
    addChain(-8.8, 8.3, 11.6, 13);

    // 轻微倾斜的碎石和断柱负责打破规则网格。
    const rubble: Array<[number, number, number, number]> = [
      [-6, 1, 0.5, 0.2], [-4.7, 1.4, 0.75, -0.35], [4.4, 7.4, 0.55, 0.5],
      [5.2, 7.8, 0.42, -0.4], [-5.8, -5.2, 0.48, 0.35], [7.8, -2.8, 0.8, -0.2],
      [-8.6, -1.3, 0.6, 0.1], [3.4, -4.5, 0.45, 0.6],
    ];
    rubble.forEach(([x, z, size, angle]) => {
      const rock = addBox(scene, [size * 1.4, size, size], [cellToWorld(x), size / 2, cellToWorld(z)], stoneMaterial);
      rock.rotation.y = angle;
      rock.rotation.z = angle * 0.3;
    });

    // 出生房间铺一块完整符文毯，收住空地并形成类似关卡战斗区的视觉中心。
    addBox(dungeon, [5.3, 0.07, 6.8], [0, 0.045, cellToWorld(5)], runeMaterial, false);

    // 体积光采用低透明加法锥体，不依赖外部贴图也能形成光束层次。
    const shaftMaterial = new THREE.MeshBasicMaterial({
      color: 0xffc96a,
      transparent: true,
      opacity: 0.055,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    sceneMaterials.push(shaftMaterial);
    [[-6, -6], [1, -6], [6, 3]].forEach(([x, z], index) => {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 2.8, 14, 4, 1, true), shaftMaterial);
      shaft.position.set(cellToWorld(x), 7, cellToWorld(z));
      shaft.rotation.y = index * 0.7;
      scene.add(shaft);
    });

    // 2. 方块角色增加盔甲分层、武器和发光装饰，避免“几个彩色盒子”的廉价感。
    const makeActor = (
      position: [number, number, number],
      enemy = false,
      armored = false,
      phase = 0,
    ) => {
      const root = new THREE.Group();
      root.position.set(...position);
      const bodyMaterial = enemy ? (armored ? metalMaterial : boneMaterial) : heroBlueMaterial;
      const faceMaterial = enemy ? boneMaterial : skinMaterial;
      const legMaterial = enemy ? (armored ? darkStoneMaterial : boneMaterial) : metalMaterial;

      // 骷髅用肋骨和脊柱搭轮廓；主角用叠层护甲，近景不会只是白盒和彩盒。
      if (enemy) {
        addBox(root, [0.2, 0.86, 0.2], [0, 1.26, 0], boneDarkMaterial);
        [0.98, 1.22, 1.46].forEach((y, ribIndex) => {
          addBox(root, [0.9 - ribIndex * 0.08, 0.13, 0.42], [0, y, 0.03], boneMaterial);
        });
        addBox(root, [0.65, 0.24, 0.48], [0, 0.77, 0], boneDarkMaterial);
        if (armored) {
          addBox(root, [1.02, 0.76, 0.62], [0, 1.3, -0.02], bodyMaterial);
          addBox(root, [1.18, 0.22, 0.76], [0, 1.62, 0], leatherMaterial);
          addBox(root, [0.18, 0.7, 0.08], [0, 1.3, 0.36], goldMaterial);
        }
      } else {
        addBox(root, [0.92, 0.9, 0.6], [0, 1.23, 0], bodyMaterial);
        addBox(root, [1.14, 0.26, 0.76], [0, 1.58, 0], heroTrimMaterial);
        addBox(root, [0.98, 0.22, 0.64], [0, 0.83, 0], leatherMaterial);
        addBox(root, [0.42, 0.7, 0.08], [0, 1.24, 0.35], heroCoatMaterial);
        addBox(root, [0.16, 0.72, 0.1], [0, 1.24, 0.42], heroTrimMaterial);
        addBox(root, [0.1, 0.1, 0.07], [0, 0.83, 0.38], goldMaterial);
        addBox(root, [0.72, 0.68, 0.12], [0, 1.12, -0.38], heroCoatMaterial);
      }

      const head = addBox(root, [0.82, 0.8, 0.78], [0, 2.08, 0], faceMaterial);
      if (enemy) {
        const eyeMaterial = armored ? eyeGlowMaterial : blackMaterial;
        addBox(head, [0.18, 0.17, 0.07], [-0.2, 0.08, 0.42], eyeMaterial, false);
        addBox(head, [0.18, 0.17, 0.07], [0.2, 0.08, 0.42], eyeMaterial, false);
        addBox(head, [0.42, 0.18, 0.62], [0, -0.42, 0.04], boneDarkMaterial);
        addBox(head, [0.08, 0.18, 0.08], [-0.13, -0.42, 0.37], blackMaterial, false);
        addBox(head, [0.08, 0.18, 0.08], [0.13, -0.42, 0.37], blackMaterial, false);
        if (armored) {
          addBox(head, [0.98, 0.34, 0.94], [0, 0.3, -0.02], metalMaterial);
          addBox(head, [0.12, 0.56, 0.12], [0, 0.62, 0], goldMaterial);
        }
      } else {
        addBox(head, [0.86, 0.28, 0.82], [0, 0.32, -0.03], leatherMaterial);
        addBox(head, [0.16, 0.3, 0.08], [-0.33, 0.19, 0.4], leatherMaterial);
        addBox(head, [0.14, 0.13, 0.06], [-0.2, 0.04, 0.42], blackMaterial, false);
        addBox(head, [0.14, 0.13, 0.06], [0.2, 0.04, 0.42], blackMaterial, false);
      }

      const leftArm = new THREE.Group();
      leftArm.position.set(-0.62, 1.28, 0);
      addBox(leftArm, [0.28, 0.84, 0.3], [0, -0.2, 0], bodyMaterial);
      addBox(leftArm, [0.42, 0.28, 0.42], [0, 0.15, 0], enemy ? boneDarkMaterial : metalMaterial);
      root.add(leftArm);
      const rightArm = new THREE.Group();
      rightArm.position.set(0.62, 1.28, 0);
      addBox(rightArm, [0.28, 0.84, 0.3], [0, -0.2, 0], bodyMaterial);
      addBox(rightArm, [0.42, 0.28, 0.42], [0, 0.15, 0], enemy ? boneDarkMaterial : metalMaterial);
      root.add(rightArm);
      const leftLeg = new THREE.Group();
      leftLeg.position.set(-0.23, 0.7, 0);
      addBox(leftLeg, [0.32, 0.82, 0.38], [0, -0.32, 0], legMaterial);
      root.add(leftLeg);
      const rightLeg = new THREE.Group();
      rightLeg.position.set(0.23, 0.7, 0);
      addBox(rightLeg, [0.32, 0.82, 0.38], [0, -0.32, 0], legMaterial);
      root.add(rightLeg);

      // 所有角色都有清晰武器轮廓，缩小后也能读懂战斗关系。
      const blade = addBox(
        rightArm,
        enemy ? [0.16, 1.55, 0.12] : [0.24, 1.66, 0.1],
        [0, -0.92, 0.17],
        enemy ? metalMaterial : heroTrimMaterial,
      );
      blade.rotation.z = enemy ? 0.22 : -0.18;
      addBox(rightArm, [0.68, 0.14, 0.2], [0, -0.27, 0.17], enemy ? leatherMaterial : goldMaterial);
      addBox(rightArm, [0.24, 0.24, 0.18], [0.08, -1.72, 0.17], enemy ? darkStoneMaterial : goldMaterial);
      if (!enemy) {
        const shield = addBox(leftArm, [0.68, 0.88, 0.18], [-0.2, -0.35, 0.28], metalMaterial);
        shield.rotation.z = -0.1;
        addBox(shield, [0.34, 0.42, 0.08], [0, 0, 0.12], heroTrimMaterial);
        addBox(shield, [0.16, 0.16, 0.09], [0, 0, 0.18], goldMaterial);
      }

      scene.add(root);
      const actor = { root, leftArm, rightArm, leftLeg, rightLeg, phase };
      actors.push(actor);
      return actor;
    };

    const hero = makeActor([0, 0.05, cellToWorld(4.5)], false, true, 0);
    hero.root.rotation.y = Math.PI;
    hero.root.scale.setScalar(1.14);
    const heroLight = new THREE.PointLight(0x48cfe5, 5.5, 7, 2);
    scene.add(heroLight);
    const enemies = [
      makeActor([cellToWorld(-4), 0.05, cellToWorld(-6)], true, true, 0.7),
      makeActor([cellToWorld(4), 0.05, cellToWorld(-7)], true, false, 1.8),
      makeActor([cellToWorld(3.5), 0.05, cellToWorld(3)], true, false, 2.6),
      makeActor([cellToWorld(-3.5), 0.05, cellToWorld(3.5)], true, false, 3.4),
    ];
    enemies[0].root.scale.setScalar(1.28);
    enemies.slice(1).forEach((enemy) => enemy.root.scale.setScalar(1.08));

    // 紫晶守卫的能量束是最强的战斗演出锚点。
    const beamGroup = new THREE.Group();
    const beamOuterMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1.7, 0.38, 3.6),
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const beamInnerMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(3.8, 2.2, 5.2),
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    sceneMaterials.push(beamOuterMaterial, beamInnerMaterial);
    const beamOuter = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 8), beamOuterMaterial);
    const beamInner = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 8), beamInnerMaterial);
    beamGroup.add(beamOuter, beamInner);
    scene.add(beamGroup);

    const setBeam = (from: THREE.Vector3, to: THREE.Vector3) => {
      const direction = to.clone().sub(from);
      const length = direction.length();
      beamGroup.position.copy(from).add(to).multiplyScalar(0.5);
      beamGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      beamOuter.scale.set(0.22, length, 0.22);
      beamInner.scale.set(0.075, length, 0.075);
    };
    setBeam(
      enemies[0].root.position.clone().add(new THREE.Vector3(0.8, 1.6, 0)),
      new THREE.Vector3(cellToWorld(4.5), 1.1, cellToWorld(-4.3)),
    );

    // 主角脚下的灵魂符文把角色从深色地面里提出来，也补足战斗截图感。
    const combatRingMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.18, 1.5, 2.4),
      transparent: true,
      opacity: 0.66,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    sceneMaterials.push(combatRingMaterial);
    const combatRing = new THREE.Mesh(new THREE.TorusGeometry(0.96, 0.055, 4, 24), combatRingMaterial);
    combatRing.rotation.x = Math.PI / 2;
    scene.add(combatRing);

    const slashMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.34, 1.8, 2.7),
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    sceneMaterials.push(slashMaterial);
    const slash = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.075, 4, 32, Math.PI * 1.18), slashMaterial);
    slash.rotation.set(0.18, -0.72, -0.42);
    scene.add(slash);

    const soulShards = new THREE.Group();
    for (let index = 0; index < 7; index += 1) {
      const shard = addBox(soulShards, [0.09, 0.26, 0.09], [0, 0, 0], heroTrimMaterial, false);
      shard.userData.angle = index / 7 * Math.PI * 2;
      shard.userData.height = 0.25 + index % 3 * 0.22;
    }
    scene.add(soulShards);

    // 火星覆盖岩浆和火盆附近，紫色火花集中在能量束终点。
    const emberCount = 180;
    const emberPositions = new Float32Array(emberCount * 3);
    const emberSeeds = new Float32Array(emberCount * 4);
    const particleRandom = seededRandom(9321);
    for (let index = 0; index < emberCount; index += 1) {
      const source = index % (brazierPositions.length + 2);
      const gridSource = brazierPositions[source % brazierPositions.length];
      const wideLava = source >= brazierPositions.length;
      emberSeeds[index * 4] = wideLava ? (particleRandom() - 0.5) * 30 : cellToWorld(gridSource[0]);
      emberSeeds[index * 4 + 1] = wideLava ? -1.2 : 1.1;
      emberSeeds[index * 4 + 2] = wideLava ? (particleRandom() - 0.5) * 26 : cellToWorld(gridSource[1]);
      emberSeeds[index * 4 + 3] = particleRandom();
    }
    const emberGeometry = new THREE.BufferGeometry();
    emberGeometry.setAttribute("position", new THREE.BufferAttribute(emberPositions, 3));
    const embers = new THREE.Points(emberGeometry, emberMaterial);
    scene.add(embers);

    const purpleSparkMaterial = new THREE.PointsMaterial({
      color: 0xc38cff,
      map: particleTexture,
      size: 0.32,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    sceneMaterials.push(purpleSparkMaterial);
    const sparkCount = 48;
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkGeometry = new THREE.BufferGeometry();
    sparkGeometry.setAttribute("position", new THREE.BufferAttribute(sparkPositions, 3));
    const sparks = new THREE.Points(sparkGeometry, purpleSparkMaterial);
    scene.add(sparks);

    const startPosition = hero.root.position.clone();
    let lastTime = window.performance.now();
    let frame = 0;
    let currentPrompt = "穿过熔岩桥，靠近祭坛";
    let altarAwakened = false;

    const canWalk = (x: number, z: number) => {
      const gridX = Math.round(x / CELL);
      const gridZ = Math.round(z / CELL);
      if (!walkableCells.has(cellKey(gridX, gridZ))) return false;
      return !obstacles.some((wall) => (
        x + PLAYER_RADIUS > wall.minX
        && x - PLAYER_RADIUS < wall.maxX
        && z + PLAYER_RADIUS > wall.minZ
        && z - PLAYER_RADIUS < wall.maxZ
      ));
    };

    const interact = () => {
      const distance = hero.root.position.distanceTo(altar.position);
      if (distance < 6.2) {
        altarAwakened = true;
        setAwakened(true);
        setPrompt("封印解除 · 紫晶守卫开始充能");
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        event.preventDefault();
        inputRef.current.add(key);
      }
      if (key === "e") interact();
      if (key === "r") hero.root.position.copy(startPosition);
    };
    const onKeyUp = (event: KeyboardEvent) => inputRef.current.delete(event.key.toLowerCase());

    const resize = () => {
      const width = mount.clientWidth;
      const height = Math.max(mount.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      composer.setSize(width, height);
      composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("resize", resize);
    resize();

    const cameraOffset = new THREE.Vector3(13.2, 13.6, 14.5);
    camera.position.copy(hero.root.position).add(cameraOffset);
    camera.lookAt(hero.root.position.x, 0.3, hero.root.position.z - 4.5);
    const move = new THREE.Vector3();
    const cameraForward = new THREE.Vector3(-1, 0, -1).normalize();
    const cameraRight = new THREE.Vector3(1, 0, -1).normalize();

    const animate = (now: number) => {
      frame = window.requestAnimationFrame(animate);
      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const time = now / 1000;
      move.set(0, 0, 0);
      const keys = inputRef.current;
      if (keys.has("w") || keys.has("arrowup")) move.add(cameraForward);
      if (keys.has("s") || keys.has("arrowdown")) move.sub(cameraForward);
      if (keys.has("d") || keys.has("arrowright")) move.add(cameraRight);
      if (keys.has("a") || keys.has("arrowleft")) move.sub(cameraRight);

      const walking = move.lengthSq() > 0;
      if (walking) {
        move.normalize();
        const nextX = hero.root.position.x + move.x * MOVE_SPEED * delta;
        const nextZ = hero.root.position.z + move.z * MOVE_SPEED * delta;
        if (canWalk(nextX, hero.root.position.z)) hero.root.position.x = nextX;
        if (canWalk(hero.root.position.x, nextZ)) hero.root.position.z = nextZ;
        hero.root.rotation.y = Math.atan2(move.x, move.z);
      }

      const stride = walking ? Math.sin(time * 10) * 0.62 : 0;
      hero.leftArm.rotation.x = stride;
      hero.rightArm.rotation.x = -stride;
      hero.leftLeg.rotation.x = -stride;
      hero.rightLeg.rotation.x = stride;
      hero.root.position.y = 0.05 + (walking ? Math.abs(Math.sin(time * 10)) * 0.08 : Math.sin(time * 2.1) * 0.018);

      // 敌人待机仍然有重心变化，画面不会像摆了一圈静态模型。
      enemies.forEach((enemy, index) => {
        const pace = Math.sin(time * 2.2 + enemy.phase);
        enemy.root.position.y = 0.05 + Math.abs(pace) * 0.06;
        enemy.leftArm.rotation.x = pace * 0.14;
        enemy.rightArm.rotation.x = -0.28 + pace * 0.12;
        enemy.root.rotation.y += Math.sin(time * 0.6 + index) * 0.0008;
      });

      lavaUniforms.uTime.value = time;
      crystal.rotation.y = time * 0.72;
      crystal.position.y = 2.35 + Math.sin(time * 1.9) * 0.16;
      crystalLight.intensity = 27 + Math.sin(time * 2.4) * 4;

      const beamCycle = (time % 7.2) / 7.2;
      const beamPower = altarAwakened
        ? 0.8 + Math.sin(time * 6) * 0.2
        : 0.38 + Math.max(0, 1 - Math.abs(beamCycle - 0.62) * 7.5) * 0.62;
      beamGroup.visible = beamPower > 0.02;
      beamOuterMaterial.opacity = beamPower * 0.34;
      beamInnerMaterial.opacity = beamPower * 0.94;
      beamOuter.scale.x = 0.24 + beamPower * 0.2;
      beamOuter.scale.z = 0.24 + beamPower * 0.2;
      beamInner.scale.x = 0.07 + beamPower * 0.04;
      beamInner.scale.z = 0.07 + beamPower * 0.04;

      const emberArray = emberGeometry.getAttribute("position").array as Float32Array;
      for (let index = 0; index < emberCount; index += 1) {
        const seed = emberSeeds[index * 4 + 3];
        const rise = (time * (0.36 + seed * 0.58) + seed * 8) % 3.7;
        emberArray[index * 3] = emberSeeds[index * 4] + Math.sin(time * 2 + index) * 0.18;
        emberArray[index * 3 + 1] = emberSeeds[index * 4 + 1] + rise;
        emberArray[index * 3 + 2] = emberSeeds[index * 4 + 2] + Math.cos(time * 1.7 + index) * 0.18;
      }
      emberGeometry.getAttribute("position").needsUpdate = true;

      const sparkArray = sparkGeometry.getAttribute("position").array as Float32Array;
      const sparkCenter = new THREE.Vector3(cellToWorld(4.5), 1.2, cellToWorld(-4.3));
      for (let index = 0; index < sparkCount; index += 1) {
        const angle = index * 2.399 + time * (0.8 + (index % 3) * 0.2);
        const radius = 0.35 + ((index * 17) % 13) * 0.08 * beamPower;
        sparkArray[index * 3] = sparkCenter.x + Math.cos(angle) * radius;
        sparkArray[index * 3 + 1] = sparkCenter.y + Math.sin(time * 2 + index) * 0.7 + (index % 5) * 0.12;
        sparkArray[index * 3 + 2] = sparkCenter.z + Math.sin(angle) * radius;
      }
      sparkGeometry.getAttribute("position").needsUpdate = true;
      purpleSparkMaterial.opacity = beamPower;

      animated.forEach((animation) => animation(time, delta));

      heroLight.position.set(hero.root.position.x, hero.root.position.y + 2.7, hero.root.position.z + 0.4);
      combatRing.position.set(hero.root.position.x, 0.08, hero.root.position.z);
      combatRing.rotation.z = time * 0.55;
      combatRing.scale.setScalar(0.94 + Math.sin(time * 3.2) * 0.06);
      combatRingMaterial.opacity = 0.5 + Math.sin(time * 3.2) * 0.12;
      const slashPulse = 0.55 + Math.sin(time * 2.6) * 0.45;
      slash.position.set(hero.root.position.x + 0.25, hero.root.position.y + 1.25, hero.root.position.z + 0.2);
      slash.rotation.z = -0.58 + slashPulse * 0.42;
      slash.scale.setScalar(0.88 + slashPulse * 0.18);
      slashMaterial.opacity = 0.22 + slashPulse * 0.42;
      soulShards.position.set(hero.root.position.x, 0.25, hero.root.position.z);
      soulShards.children.forEach((shard) => {
        const angle = shard.userData.angle + time * 1.25;
        shard.position.set(
          Math.cos(angle) * 1.24,
          shard.userData.height + Math.sin(time * 3 + angle) * 0.12,
          Math.sin(angle) * 1.24,
        );
        shard.rotation.y = -angle;
      });

      const altarDistance = hero.root.position.distanceTo(altar.position);
      let nextPrompt = "穿过熔岩桥，靠近祭坛";
      if (altarDistance < 6.2 && !altarAwakened) nextPrompt = "按 E 解除祭坛封印";
      if (altarAwakened) nextPrompt = "封印解除 · 紫晶守卫开始充能";
      if (nextPrompt !== currentPrompt) {
        currentPrompt = nextPrompt;
        setPrompt(nextPrompt);
      }

      const wantedCamera = hero.root.position.clone().add(cameraOffset);
      camera.position.lerp(wantedCamera, 1 - Math.pow(0.004, delta));
      camera.lookAt(hero.root.position.x, 0.55, hero.root.position.z - 4.4);
      composer.render(delta);
    };
    frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", resize);
      composer.dispose();
      renderer.dispose();
      geometryCache.forEach((geometry) => geometry.dispose());
      emberGeometry.dispose();
      sparkGeometry.dispose();
      textures.forEach((texture) => texture.dispose());
      sceneMaterials.forEach((item) => item.dispose());
      mount.replaceChildren();
    };
  }, []);

  const onTouchPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    const key = event.currentTarget.dataset.moveKey;
    if (!key) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    inputRef.current.add(key);
  };

  const onTouchPointerEnd = (event: React.PointerEvent<HTMLButtonElement>) => {
    const key = event.currentTarget.dataset.moveKey;
    if (key) inputRef.current.delete(key);
  };

  return (
    <main className="game-shell">
      <div ref={mountRef} className="game-stage" />

      <header className="dungeon-header">
        <div className="location-card">
          <span className="location-kicker">第 I 区 · 深层遗迹</span>
          <strong>熔火遗迹</strong>
          <span className="location-en">THE FORGE BELOW</span>
        </div>

        <div className="quality-badge" data-testid="quality-badge">
          <span className="quality-dot" />
          <div>
            <small>内部画质验证</small>
            <strong>实时 WebGL 场景</strong>
          </div>
        </div>
      </header>

      <aside className="objective-card">
        <span>当前目标</span>
        <strong>{awakened ? "击败紫晶守卫" : "靠近祭坛，解除封印"}</strong>
        <i>{awakened ? "能量束已锁定" : "穿过中央熔岩桥"}</i>
      </aside>

      <div className="hero-status" aria-label="角色状态">
        <div className="hero-portrait">旅</div>
        <div className="health-bars">
          <span>遗迹行者 · LV.12</span>
          <div className="health-track"><i /></div>
          <div className="soul-track"><i /></div>
        </div>
        <strong>286</strong>
      </div>

      <div className="prompt" role="status">
        <span className="prompt-key">!</span>
        {prompt}
      </div>

      <div className="control-hint">
        <span><kbd>WASD</kbd> / <kbd>方向键</kbd> 移动</span>
        <span><kbd>E</kbd> 互动</span>
        <span><kbd>R</kbd> 回到起点</span>
      </div>

      <div className="touch-controls" aria-label="移动方向">
        <button aria-label="向上移动" className="touch-up" data-move-key="w" onPointerDown={onTouchPointerDown} onPointerUp={onTouchPointerEnd} onPointerCancel={onTouchPointerEnd}>▲</button>
        <button aria-label="向左移动" className="touch-left" data-move-key="a" onPointerDown={onTouchPointerDown} onPointerUp={onTouchPointerEnd} onPointerCancel={onTouchPointerEnd}>◀</button>
        <button aria-label="向下移动" className="touch-down" data-move-key="s" onPointerDown={onTouchPointerDown} onPointerUp={onTouchPointerEnd} onPointerCancel={onTouchPointerEnd}>▼</button>
        <button aria-label="向右移动" className="touch-right" data-move-key="d" onPointerDown={onTouchPointerDown} onPointerUp={onTouchPointerEnd} onPointerCancel={onTouchPointerEnd}>▶</button>
      </div>

      <div className="cinematic-bars" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <div className="film-grain" aria-hidden="true" />
    </main>
  );
}
