# Cesium Universal Manipulator Demo

This project delivers a reusable universal manipulator for CesiumJS scenes, providing translation, rotation, and scaling handles with configurable orientation, pivot modes, snapping, and live HUD feedback. It also includes a sample Cesium application and deterministic math-focused unit tests.

## Features

- Unified translate / rotate / scale gizmo with per-mode visibility controls.
- Supports `Orientation = global | local | view | enu | normal | gimbal`.
- Supports `Pivot = origin | median | cursor | individual`.
- Snap system for translation / rotation / scale with fine-step modifiers.
- Math utilities (Vector3, Quaternion, Matrix4) with stable TRS decomposition.
- Event controller with hover / drag states, ESC cancellation, and HUD feedback.
- Example Cesium page demonstrating orientation & pivot switching.

## Getting started

### Prerequisites

- Node.js ≥ 18 (ships with TypeScript compiler in this environment).
- Internet access when running the demo (loads Cesium assets from CDN).

### Build & test

```bash
npm run build
npm test
```

`npm run build` transpiles TypeScript to the `dist` directory. `npm test` recompiles and executes the bespoke unit tests in `dist/tests/run-tests.js`.

### Run the example

1. Build the project (`npm run build`).
2. Open `public/index.html` in a browser.
3. The page loads CesiumJS 1.118 via CDN and the manipulator bundle from `dist/src/example/main.js`.
4. Use the toolbar to change orientation/pivot and toggle translation/rotation/scale handles.

## Library usage

Import the primary class:

```ts
import { UniversalManipulator } from 'cesium-gizmo-demo';
```

Instantiate with a Cesium `Viewer` and your target object (any object exposing a `matrix` property with 16 column-major elements is supported; `position`/`rotation`/`scale` are populated automatically).

```ts
const manipulator = new UniversalManipulator(viewer, {
  target: myTarget,
  orientation: 'enu',
  pivot: 'origin',
  snap: {
    translateStep: 1,
    rotateStep: Cesium.Math.toRadians(5),
    scaleStep: 0.1
  }
});
```

### API surface

- `setTarget(target | target[])`
- `setOrientation(orientation)`
- `setPivot(pivot)`
- `enable({ translate?, rotate?, scale? })`
- `setSnap(stepConfig)`
- `setSize(screenPixelRadius, minScale?, maxScale?)`
- `setCursor(cursorState)`
- `destroy()`

Additional utilities are exported from `src/index.ts` (math helpers, solver, picker, etc.).

## Tests

The unit suite in `tests/run-tests.ts` covers:

- Axis & plane translation solvers
- Axis & view-plane rotation solvers
- Axis scaling solver

Each assertion enforces a tolerance of `1e-5` or tighter.

## Notes & limitations

- The sample adapter expects targets to expose a mutable `matrix` field. For Cesium `Entity` or `Model` instances, wrap them in a `TargetLike` object that synchronises `matrix` back into the engine each frame (see `src/example/main.ts`).
- The manipulator draws using Cesium primitives placed in a `CustomDataSource`; depth testing is disabled so the gizmo always renders on top.
- The math tests run in Node and do not rely on Cesium; the demo requires a browser.

## License

MIT
