# VRLabs Weapon Slash Web Proof

- Source: <https://github.com/VRLabs/Weapon-Slash>
- Pinned commit: `822f0a8bf9269d89915c4bd207770a8f6b345bd9`
- License: MIT, copied verbatim to `LICENSE.txt`
- Mesh source: `Resources/Meshes/Circle.fbx`
- Atlas source: `Resources/Textures/Circle.png`

`circle.glb` is a mesh-only conversion made with:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
  --python scripts/blender/convert-vrlabs-slash.py -- Circle.fbx circle.glb
```

`circle-atlas.png` preserves the source 8×8 atlas and is resized to 2048×2048,
matching the upstream Unity texture import limit. The proprietary Unity shader is
not copied; `/rig-lab` rebuilds the required atlas and additive behavior in Babylon.js.
