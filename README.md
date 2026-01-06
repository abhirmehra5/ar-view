# AR View

Create AR experiences with QR codes. Generate 3D text, photos, logos, and view them in augmented reality.

## Features

- **AR Text** - Type text, customize color/depth/gloss, get a QR code
- **AR Photo** - Upload an image, it becomes a floating 3D photo in AR
- **AR Logo** - Upload an SVG, it gets extruded into a 3D model
- **3D File** - Upload a GLB/GLTF file directly

## Tech Stack

- Next.js
- Three.js + gltf-transform for 3D generation
- Google model-viewer for WebAR
- Vercel Blob for persistent storage

## Development

```bash
npm install
npm run dev
```

## Deployment

Deployed on Vercel with Blob storage for persistent 3D models.
