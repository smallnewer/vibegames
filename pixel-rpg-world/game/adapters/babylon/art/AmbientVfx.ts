import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import { VFX_LIMITS } from "./CombatVfx";

interface AmbientParticle {
  readonly mesh: Mesh;
  readonly kind: "ember" | "dust" | "flame" | "shimmer";
  readonly baseX: number;
  readonly baseY: number;
  readonly baseZ: number;
  readonly speed: number;
}

export class AmbientVfx {
  private readonly root: TransformNode;
  private readonly particles: AmbientParticle[] = [];
  private elapsed = 0;

  constructor(private readonly scene: Scene) {
    this.root = new TransformNode("lava-ambient-vfx", scene);
    const ember = this.material("ambient-ember", "#ff7a25", "#ff3a0b", 0.88);
    const dust = this.material("ambient-dust", "#b99873", "#2c1a13", 0.2);
    const flame = this.material("ambient-flame", "#ffc14d", "#ff4b0c", 0.82);
    const shimmer = this.material("ambient-shimmer", "#ff7025", "#ff310b", 0.08);

    for (let index = 0; index < 12; index += 1) {
      const mesh = MeshBuilder.CreateBox("ambient-ember", {
        width: 0.045 + index % 3 * 0.018,
        height: 0.12,
        depth: 0.045,
      }, scene);
      const x = -8 + (index * 37 % 160) / 10;
      const z = index % 2 === 0 ? -3.25 - index % 4 * 0.35 : 3.25 + index % 4 * 0.35;
      mesh.material = ember;
      this.add(mesh, "ember", x, -0.35 + index % 5 * 0.2, z, 0.36 + index % 4 * 0.08);
    }
    for (let index = 0; index < 4; index += 1) {
      const mesh = MeshBuilder.CreateBox("ambient-dust", { size: 0.045 }, scene);
      mesh.material = dust;
      this.add(mesh, "dust", -7 + index * 1.45, 1.1 + index % 3 * 0.7, 4.1, 0.08 + index % 3 * 0.025);
    }
    for (const [x, z] of [[-6.5, 3.5], [-3.6, 1.65], [3.6, 1.65], [6.4, -3.35]] as const) {
      const mesh = MeshBuilder.CreateCylinder("ambient-flame", {
        height: 0.56,
        diameterTop: 0,
        diameterBottom: 0.34,
        tessellation: 4,
      }, scene);
      mesh.material = flame;
      this.add(mesh, "flame", x, 1.82, z, 1);
    }
    for (const z of [-3.65, 3.65]) {
      const mesh = MeshBuilder.CreatePlane("ambient-heat-shimmer", { width: 8.5, height: 1.1 }, scene);
      mesh.material = shimmer;
      mesh.billboardMode = Mesh.BILLBOARDMODE_Y;
      this.add(mesh, "shimmer", 0, 0.08, z, 1);
    }
    if (this.particles.length > VFX_LIMITS.ambient) {
      throw new Error(`Ambient VFX exceeds ${VFX_LIMITS.ambient}`);
    }
  }

  setEnabled(enabled: boolean): void {
    this.root.setEnabled(enabled);
  }

  update(delta: number): void {
    if (!this.root.isEnabled()) return;
    this.elapsed += delta;
    for (let index = 0; index < this.particles.length; index += 1) {
      const particle = this.particles[index];
      if (particle.kind === "ember") {
        const rise = (this.elapsed * particle.speed + index * 0.19) % 2.8;
        particle.mesh.position.y = particle.baseY + rise;
        particle.mesh.position.x = particle.baseX + Math.sin(this.elapsed * 1.3 + index) * 0.12;
        particle.mesh.visibility = 0.35 + Math.sin(this.elapsed * 4 + index) * 0.28;
      } else if (particle.kind === "dust") {
        particle.mesh.position.x = particle.baseX + Math.sin(this.elapsed * particle.speed + index) * 0.45;
        particle.mesh.position.y = particle.baseY + Math.cos(this.elapsed * particle.speed + index) * 0.18;
      } else if (particle.kind === "flame") {
        const pulse = 0.88 + Math.sin(this.elapsed * 8 + index) * 0.14;
        particle.mesh.scaling.set(pulse, 0.9 + pulse * 0.16, pulse);
      } else {
        particle.mesh.visibility = 0.05 + Math.sin(this.elapsed * 1.5 + index) * 0.025;
      }
    }
  }

  get activeCount(): number {
    return this.root.isEnabled() ? this.particles.length : 0;
  }

  dispose(): void {
    this.root.dispose(false, false);
  }

  private add(
    mesh: Mesh,
    kind: AmbientParticle["kind"],
    x: number,
    y: number,
    z: number,
    speed: number,
  ): void {
    mesh.parent = this.root;
    mesh.position.set(x, y, z);
    this.particles.push({ mesh, kind, baseX: x, baseY: y, baseZ: z, speed });
  }

  private material(
    name: string,
    color: string,
    emissive: string,
    alpha: number,
  ): StandardMaterial {
    const material = new StandardMaterial(name, this.scene);
    material.diffuseColor = Color3.FromHexString(color);
    material.emissiveColor = Color3.FromHexString(emissive);
    material.specularColor = Color3.Black();
    material.alpha = alpha;
    material.disableDepthWrite = alpha < 0.5;
    return material;
  }
}
