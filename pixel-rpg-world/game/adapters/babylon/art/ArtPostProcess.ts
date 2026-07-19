import { ImageProcessingConfiguration } from "@babylonjs/core/Materials/imageProcessingConfiguration";
import type { Camera } from "@babylonjs/core/Cameras/camera";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import "@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderPipelineManagerSceneComponent";
import type { Scene } from "@babylonjs/core/scene";

export interface ArtPostProcess {
  setEnabled(enabled: boolean): void;
  dispose(): void;
}

export function createArtPostProcess(scene: Scene, camera: Camera): ArtPostProcess {
  const pipeline = new DefaultRenderingPipeline("art-post", true, scene, [camera]);
  pipeline.samples = 1;
  pipeline.bloomScale = 0.5;
  pipeline.bloomKernel = 32;
  pipeline.bloomThreshold = 0.58;
  pipeline.bloomWeight = 0.22;
  pipeline.depthOfFieldEnabled = false;
  pipeline.chromaticAberrationEnabled = false;
  pipeline.grainEnabled = false;
  pipeline.glowLayerEnabled = false;
  pipeline.sharpen.edgeAmount = 0.16;
  pipeline.sharpen.colorAmount = 0.86;

  const image = scene.imageProcessingConfiguration;
  image.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  image.exposure = 1.62;
  image.contrast = 1.04;
  image.vignetteWeight = 0.42;
  image.vignetteStretch = 0.08;

  const setEnabled = (enabled: boolean) => {
    pipeline.fxaaEnabled = enabled;
    pipeline.bloomEnabled = enabled;
    pipeline.sharpenEnabled = enabled;
    pipeline.imageProcessingEnabled = enabled;
    image.toneMappingEnabled = enabled;
    image.vignetteEnabled = enabled;
  };
  setEnabled(false);

  return {
    setEnabled,
    dispose: () => pipeline.dispose(),
  };
}
