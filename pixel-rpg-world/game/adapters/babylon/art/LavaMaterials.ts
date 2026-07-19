import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import type { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Scene } from "@babylonjs/core/scene";

export function createLavaMaterial(scene: Scene, texture: Texture): PBRMaterial {
  const material = new PBRMaterial("art-lava", scene);
  material.albedoTexture = texture;
  material.emissiveTexture = texture;
  material.albedoColor = Color3.FromHexString("#ff4b12");
  material.emissiveColor = Color3.FromHexString("#ff2d08");
  material.roughness = 0.82;
  material.metallic = 0;
  return material;
}

export function animateLava(
  material: PBRMaterial,
  elapsed: number,
  delta: number,
): void {
  const texture = material.albedoTexture as Texture | null;
  if (texture) {
    texture.uOffset = (texture.uOffset + delta * 0.018) % 1;
    texture.vOffset = (texture.vOffset + delta * 0.011) % 1;
  }
  const pulse = 0.82 + Math.sin(elapsed * 1.7) * 0.12;
  material.emissiveColor.set(2.15 * pulse, 0.42 * pulse, 0.045 * pulse);
}
