import "@babylonjs/core/Engines/WebGPU/Extensions/engine.dynamicTexture";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import type { Scene } from "@babylonjs/core/scene";

export const PIXEL_TEXTURE_SIZE = 32;

export interface PixelTextureSpec {
  readonly id: string;
  readonly seed: number;
  readonly base: string;
  readonly dark: string;
  readonly light: string;
  readonly pattern: "brick" | "rock" | "plank" | "metal" | "rune" | "lava";
}

export interface PixelMark {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly color: string;
}

function randomSource(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

// 返回可测试的像素绘制指令，浏览器层只负责画到 DynamicTexture。
export function pixelPattern(spec: PixelTextureSpec): readonly PixelMark[] {
  const random = randomSource(spec.seed);
  const marks: PixelMark[] = [{
    x: 0,
    y: 0,
    width: PIXEL_TEXTURE_SIZE,
    height: PIXEL_TEXTURE_SIZE,
    color: spec.base,
  }];
  const add = (x: number, y: number, width: number, height: number, color: string) => {
    marks.push({ x, y, width, height, color });
  };

  if (spec.pattern === "brick") {
    for (let row = 0; row < 4; row += 1) {
      const y = row * 8;
      const offset = row % 2 === 0 ? -4 : 0;
      add(0, y, 32, 1, spec.dark);
      add(0, y + 1, 32, 1, spec.light);
      for (let x = offset; x < 32; x += 8) add(x, y, 1, 8, spec.dark);
    }
  }
  if (spec.pattern === "rock") {
    for (let index = 0; index < 28; index += 1) {
      const x = Math.floor(random() * 28);
      const y = Math.floor(random() * 28);
      const size = 1 + Math.floor(random() * 4);
      add(x, y, size, 1, index % 3 === 0 ? spec.light : spec.dark);
      if (size > 2) add(x, y + 1, 1, 2, spec.dark);
    }
  }
  if (spec.pattern === "plank") {
    for (let y = 0; y < 32; y += 8) {
      add(0, y, 32, 1, spec.dark);
      add(0, y + 1, 32, 1, spec.light);
    }
    for (let index = 0; index < 18; index += 1) {
      add(Math.floor(random() * 27), Math.floor(random() * 32), 5, 1, spec.dark);
    }
  }
  if (spec.pattern === "metal") {
    for (let y = 0; y < 32; y += 8) {
      for (let x = 0; x < 32; x += 8) {
        add(x, y, 8, 1, spec.dark);
        add(x, y, 1, 8, spec.dark);
        add(x + 1, y + 1, 6, 1, spec.light);
        add(x + 2, y + 2, 1, 1, spec.light);
        add(x + 6, y + 6, 1, 1, spec.dark);
      }
    }
  }
  if (spec.pattern === "rune") {
    for (let index = 3; index < 29; index += 4) {
      add(index, 2, 1, 28, spec.dark);
      add(2, index, 28, 1, spec.dark);
    }
    for (const [x, y] of [[16, 4], [12, 8], [20, 8], [16, 12], [8, 16], [24, 16]]) {
      add(x - 1, y - 1, 3, 3, spec.light);
    }
  }
  if (spec.pattern === "lava") {
    for (let index = 0; index < 70; index += 1) {
      const x = Math.floor(random() * 32);
      const y = Math.floor(random() * 32);
      const length = 1 + Math.floor(random() * 5);
      add(x, y, Math.min(length, 32 - x), 1, index % 3 === 0 ? spec.light : spec.dark);
    }
  }

  for (let index = 0; index < 72; index += 1) {
    const color = random() > 0.68 ? spec.light : spec.dark;
    add(
      Math.floor(random() * PIXEL_TEXTURE_SIZE),
      Math.floor(random() * PIXEL_TEXTURE_SIZE),
      random() > 0.86 ? 2 : 1,
      1,
      color,
    );
  }
  return marks;
}

export function createPixelTexture(scene: Scene, spec: PixelTextureSpec): DynamicTexture {
  const texture = new DynamicTexture(
    `pixel-${spec.id}`,
    { width: PIXEL_TEXTURE_SIZE, height: PIXEL_TEXTURE_SIZE },
    scene,
    true,
    Texture.NEAREST_NEAREST_MIPNEAREST,
  );
  const context = texture.getContext() as unknown as CanvasRenderingContext2D;
  context.imageSmoothingEnabled = false;
  for (const mark of pixelPattern(spec)) {
    context.fillStyle = mark.color;
    context.fillRect(mark.x, mark.y, mark.width, mark.height);
  }
  texture.wrapU = Texture.WRAP_ADDRESSMODE;
  texture.wrapV = Texture.WRAP_ADDRESSMODE;
  texture.update(false);
  return texture;
}
