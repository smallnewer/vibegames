# Terrain texture prompt set

Generated with the built-in `imagegen` tool. Grass is the master; dirt, road,
rock, and sand keep its painterly language or derive from the dirt variant.

## Grass master

```text
Use case: stylized-concept
Asset type: seamless tileable game terrain master texture
Primary request: a perfectly seamless square top-down texture of temperate meadow grass with a very subtle muted earth undertone, designed as the master surface for a cohesive fantasy game terrain set
Style/medium: hand-painted diffuse texture in an early-2000s fantasy MMORPG art style; broad soft painterly brushwork; simplified shapes; deliberately non-photorealistic
Composition/framing: orthographic top-down material swatch filling the entire square; uniform visual density; all four edges must tile seamlessly
Lighting/mood: flat neutral albedo only; no directional lighting, no cast shadows, no ambient occlusion baked into the image
Color palette: restrained olive green, moss green, muted sage, small amounts of warm brown; low saturation and low contrast
Materials/textures: soft clumps and broad grass strokes at one consistent medium brush scale
Constraints: seamless on every edge; no obvious focal point; no large objects; no stones; no flowers; no leaves; no paths; no borders; no text; no logos; no watermark
Avoid: dots, speckles, high-frequency noise, confetti-like patches, sharp isolated marks, photographic detail, realistic individual grass blades, PBR shine, dramatic lighting, repeated stamp patterns
```

## Dirt derivative

```text
Use case: precise-object-edit
Asset type: seamless tileable game terrain texture derived from the supplied master texture
Input images: Image 1: edit target and locked style master
Primary request: change only the surface material from meadow grass into compact warm-brown earth suitable for a fantasy MMORPG terrain blend
Style/medium: preserve Image 1's exact early-2000s hand-painted diffuse style, brush scale, softness, visual density, palette restraint, and low contrast
Composition/framing: preserve the same orthographic top-down full-square material swatch and seamless edge behavior
Lighting/mood: keep flat neutral albedo only; no directional lighting, shadows, or baked ambient occlusion
Materials/textures: broad soft packed-earth brush strokes with restrained clay and umber variation; at most a few subtle embedded dry grass strokes inherited from the master
Constraints: change only the represented material; keep the same brush language and texel scale; seamless on every edge; no obvious focal point; no large stones; no cracks; no footprints; no objects; no borders; no text; no logos; no watermark
Avoid: dots, speckles, high-frequency noise, photographic dirt, isolated pebbles, sharp marks, PBR shine, dramatic light, repeated stamps
```

## Road derivative

```text
Use case: precise-object-edit
Asset type: seamless tileable game road-surface texture derived from the supplied dirt texture
Input images: Image 1: edit target and locked style source
Primary request: change only the compact earth into slightly worn fantasy footpath soil, with subtle broad compressed brush strokes and very faint smooth wear variation; it must still read as a generic tileable road material, not a complete road with visible edges
Style/medium: preserve Image 1's exact hand-painted early-2000s fantasy MMORPG diffuse style, brush scale, softness, restrained palette, and low contrast
Composition/framing: preserve orthographic top-down full-square material swatch; uniform density; seamless on every edge
Lighting/mood: flat neutral albedo only; no directional lighting, shadows, or baked ambient occlusion
Materials/textures: muted warm umber packed soil, soft broad worn strokes, extremely sparse tiny embedded pebbles that never become focal points
Constraints: change only surface wear; keep the same brush language and texel scale; seamless every edge; no path boundaries; no grass border; no ruts crossing the full image; no footprints; no tracks; no objects; no cracks; no text; no logos; no watermark
Avoid: dots, speckles, high-frequency noise, photorealistic gravel, isolated stones, sharp marks, PBR shine, repeated stamps
```

## Rock derivative

```text
Use case: precise-object-edit
Asset type: seamless tileable game terrain texture derived from the supplied master texture
Input images: Image 1: edit target and locked style master
Primary request: change only the meadow surface into weathered grey-green slate and compact stone ground suitable for steep fantasy MMORPG hills
Style/medium: preserve Image 1's exact early-2000s hand-painted diffuse style, brush scale, softness, visual density, restrained palette, and low contrast
Composition/framing: preserve the same orthographic top-down full-square material swatch and seamless edge behavior
Lighting/mood: keep flat neutral albedo only; no directional lighting, shadows, highlights, or baked ambient occlusion
Materials/textures: broad soft overlapping stone planes in muted slate grey, moss-grey and a small amount of earthy olive; read as one continuous ground material
Constraints: change only the represented material; keep the same brush language and texel scale; seamless on every edge; no individual boulders; no sharp cracks; no obvious focal point; no objects; no borders; no text; no logos; no watermark
Avoid: dots, speckles, high-frequency noise, photographic rock, cobblestones, isolated pebbles, sharp black seams, PBR shine, dramatic light, repeated stamps
```

## Stone road derivative

```text
Use case: precise-object-edit
Asset type: seamless tileable stone-road texture for a fantasy MMORPG terrain shader
Input images: Image 1: edit target and locked brushwork/texel-scale source; Image 2: supporting stone palette and painterly material reference
Primary request: replace only Image 1's packed soil with a clearly readable old hand-laid stone road made from broad irregular rounded flagstones; medium-large stones, shallow muted earth seams, and extremely restrained moss between a few joints
Style/medium: preserve Image 1's soft hand-painted early-2000s fantasy MMORPG diffuse style and brush scale; borrow Image 2's muted grey-green stone palette; simplified, deliberately non-photorealistic
Composition/framing: orthographic top-down full-square material swatch; generic road surface with no visible road borders or direction; uniform density; seamless on all four edges
Lighting/mood: flat neutral albedo only; very soft painted value separation inside stones; no directional lighting, cast shadows, highlights, or baked ambient occlusion
Color palette: desaturated warm slate grey, muted taupe, moss-grey, small amounts of earthy brown in joints; low saturation and moderate-low contrast
Materials/textures: broad irregular flagstones around 12 to 20 stones across the image; soft rounded shapes; visible but subdued joints; one consistent medium brush scale
Constraints: change only the surface material; preserve the established painterly language; seamless every edge; no focal stone; no road boundary; no grass border; no text; no logos; no watermark
Avoid: tiny cobblestones, dot patterns, speckles, high-frequency gravel, sharp black mortar lines, perfect brick grid, repeated stamps, photographic rock, deep cracks, PBR shine, dramatic lighting
```

## Sand derivative

```text
Use case: precise-object-edit
Asset type: seamless tileable game shoreline texture derived from the supplied dirt texture
Input images: Image 1: edit target and locked style source
Primary request: change only the compact brown earth into muted warm ochre sandy soil suitable for a soft fantasy MMORPG river bank
Style/medium: preserve Image 1's exact hand-painted early-2000s fantasy MMORPG diffuse style, brush scale, softness, visual density, restrained palette, and low contrast
Composition/framing: preserve orthographic top-down full-square material swatch; uniform density; seamless on every edge
Lighting/mood: flat neutral albedo only; no directional lighting, shadows, highlights, wet shine, or baked ambient occlusion
Materials/textures: broad soft sandy-soil strokes in desaturated tan, warm ochre and a very small amount of muted earth brown; cohesive with the supplied dirt
Constraints: change only the represented material and color; keep the same brush language and texel scale; seamless every edge; no shells; no individual rocks; no grass; no ripples; no cracks; no objects; no borders; no text; no logos; no watermark
Avoid: dots, speckles, high-frequency noise, photographic sand grains, isolated pebbles, sharp marks, bright yellow beach sand, PBR shine, repeated stamps
```

## Water surface

```text
Use case: precise-object-edit
Asset type: seamless tileable painted water-surface texture for an old fantasy MMORPG river shader
Input images: Image 1: locked brushwork, softness, texel-scale, and palette-restraint reference only
Primary request: create a muted teal-green river-water material with broad soft curved ripple strokes and gentle flowing bands; the water must be visually textured but calm and readable
Style/medium: preserve Image 1's hand-painted early-2000s fantasy MMORPG diffuse style, broad brush scale, softness, simplified shapes, and restrained contrast; deliberately non-photorealistic
Composition/framing: orthographic top-down full-square material swatch; uniform density; direction-neutral enough to support two moving shader layers; seamless on all four edges
Lighting/mood: flat neutral albedo only; no directional light, no sun reflection, no baked highlights, no cast shadows, no ambient occlusion
Color palette: desaturated deep teal, grey-green, muted blue-green, small amounts of pale sage; avoid saturated blue
Materials/textures: broad elongated curved ripple brush strokes, soft overlapping flow shapes, low-to-medium frequency detail
Constraints: seamless every edge; no shoreline; no foam; no objects; no focal point; no text; no logos; no watermark
Avoid: pure blue, flat solid color, tiny wave noise, dots, speckles, high-frequency grain, photographic water, mirror reflections, sharp white streaks, repeated stamp patterns, PBR shine
```
