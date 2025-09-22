# Cesium Universal Manipulator

This repository provides a reusable transform manipulator for CesiumJS scenes. The manipulator exposes translation, rotation, and scaling handles with configurable snapping, pivot modes, and orientation frames. A showcase page demonstrates how to integrate the library into a Cesium viewer.

## Features

- Unified translate/rotate/scale gizmo rendered via Cesium primitives
- Multiple orientation frames (Global, Local, View, ENU, Normal)
- Pivot options (origin, median, cursor, individual)
- Configurable snapping for translation, rotation, and scaling
- HUD overlay displaying live deltas and unit-aware formatting
- Undo/redo helpers via history tracking
- Example page with runtime controls
- Unit tests covering solver math and frame construction

## Getting started

### Build & test

```bash
npm run build
npm test
```

### Using the library

The compiled bundle is emitted to `dist/`. Instantiate the manipulator by passing a `Cesium.Viewer` (or `Scene`) and a collection of targets. Each target should supply an identifier and its current world matrix (column-major order).

```ts
import { UniversalManipulator } from 'cesium-gizmo-demo';

const manipulator = new UniversalManipulator(viewer, {
  target: [
    {
      id: 'model',
      matrix: Cesium.Matrix4.clone(model.computeModelMatrix(Cesium.JulianDate.now(), new Cesium.Matrix4()))
    }
  ],
  orientation: 'global',
  pivot: 'origin',
  snap: { enabled: true, translate: 1, rotate: Cesium.Math.toRadians(5), scale: 0.1 }
});
```

Update the manipulator when the underlying object moves by calling `setTarget` with refreshed matrices. Mode, orientation, pivot, and snapping can be adjusted on the fly via the corresponding setters.

### Example page

Serve `public/index.html` from any static server after running `npm run build`. The page loads Cesium from the official CDN and demonstrates all manipulator modes together with a configuration panel.

## API surface

- `setTarget(target | target[])` — update the active selection
- `setOrientation(orientation)` — switch between global/local/view/enu/normal frames
- `setPivot(pivot)` — change pivot computation strategy
- `enable({ mode: boolean })` — toggle manipulator modes
- `setSnap(config)` — configure snapping steps (translate/rotate/scale)
- `setSize(radius, minScale, maxScale)` — screen size adaptation controls
- `setVisible(show)` — toggle gizmo visibility
- `setCursor(position)` — supply custom cursor/pivot position
- `setNormal(normal)` — override surface normal for NORMAL orientation
- `undo()` / `redo()` — apply history entries
- `destroy()` — dispose the manipulator and release resources

## Testing matrix

Automated tests in `src/tests/index.test.ts` validate:

- Translation/rotation/scale solver accuracy
- Uniform scaling behaviour
- ENU frame construction stability near the equator

Extend tests with additional scenarios (e.g., multi-target pivots, high-latitude frames) as the library evolves.
