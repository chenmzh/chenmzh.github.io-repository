# Sakura Railway — 春の線路

Fullscreen WebGL voxel cinematic, deployed as a subpage of the Gaming Lab:

https://chenmzh.github.io/chenmzh.github.io-repository/gaming/sakura-railway/

- 150-second six-shot loop: establishing / arrival / sakura / passing / leaving / silence
- A silver commuter train rides one Catmull-Rom curve: surfaces from the mist, crosses the
  cherry-blossom mid-ground, leaves through the right edge — the camera never follows it
- Fully procedural geometry: voxel trees, grass, petals, sleepers, catenary, houses; no glTF, no textures
- Scroll drives the 450vh timeline; desktop pointer parallax ≤1.6°; opt-in synthesized ambient sound
- Three.js 0.170 + Vite, ACES + camera-attached screen-space vignette, quality tiers with soft auto-downgrade
- Seeded layout (mulberry32, seed 20260414) — the scene is identical on every load
