import type { Scene } from "@babylonjs/core/scene";

export interface RenderMetrics {
  renderWidth: number;
  renderHeight: number;
  drawCalls: number;
  triangles: number;
  textureBytes: number;
  particles: number;
  liveVfx: number;
  liveProjectiles: number;
  activeSections: number;
  activeSectionIds: readonly string[];
  assetTemplates: number;
  assetInstances: number;
  assetPending: number;
  assetFailed: number;
  assetError?: string;
  animatedActors: number;
  fallbackActors: number;
  pendingActors: number;
  navigationReady: boolean;
  gpuMs?: number;
  gpuMainPassMs?: number;
}

// 纹理按未压缩 RGBA 估算，供同场景前后对比，不冒充驱动显存精确值。
export function estimateTextureBytes(scene: Scene): number {
  return scene.textures.reduce((total, texture) => {
    const size = texture.getSize();
    const faces = texture.isCube ? 6 : 1;
    return total + size.width * size.height * 4 * faces;
  }, 0);
}
