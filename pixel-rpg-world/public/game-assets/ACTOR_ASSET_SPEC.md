# Actor asset contract

- Format: local binary glTF 2.0 (`.glb`), meters, Y-up, actor faces +Z before `rotationY` correction.
- Pivot: ground center. Use `yOffset` only for imported legacy assets.
- Animation keys: `idle` is required; `run`, `roll`, `melee`, `ranged`, `skill`, `hit`, `dead` fall back to `idle` when omitted.
- Clip value: exact GLB animation name. `#0` means the first unnamed legacy clip and is only allowed for compatibility samples.
- Sockets: declare `melee` and `ranged`. Prefer an exact GLB node name; always provide a fallback transform.
- Budget: every asset declares maximum file bytes, triangles, bones, textures and animation clips. The compiler reads the real GLB and rejects overflow.
- LOD: `maxAnimatedInstances` caps independently animated skeletons for one visual ID. Extra crowd actors use the existing voxel fallback.
- Runtime: asset templates/materials are shared; actor instances own animation groups and skeleton state. No runtime CDN is allowed.
