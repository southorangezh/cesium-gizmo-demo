# Cesium Universal Manipulator (Demo Build)

This repository delivers a TypeScript-friendly universal manipulator inspired by professional DCC tooling and designed for Cesium-powered applications. Because the execution environment of this challenge does not allow pulling external npm packages, the library is implemented with a zero-dependency JavaScript core accompanied by TypeScript-ready `.d.ts` typings (see `types/` folder) and math utilities.

The project contains:

- **Reusable library** under `src/lib` implementing the orchestrating `UniversalManipulator` and its collaborators (`GizmoPrimitive`, `GizmoPicker`, `ManipulatorController`, `FrameBuilder`, `TransformSolver`, `Snapper`, `PivotResolver`, `HudOverlay`).
- **Math kernel** under `src/math` with small vector, quaternion, matrix, plane and ray helpers designed to mimic Cesium behaviour and precision practices.
- **Browser demo** (`src/demo/index.html`) showcasing the manipulator running over a simple 2D canvas scene. The demo mocks a Cesium-like camera and ray caster so that the manipulator modules can run without the real Cesium engine.
- **Tests** (see `tests/`) validating solver accuracy, snapping, pivot resolution and orientation frame generation using Node's native test runner.

> **Note**: When integrating with real Cesium (≥ 1.118) replace the demo ray/camera providers with bindings to the Cesium `Scene` camera and viewer canvas. The math utilities in `src/math` are compatible with Cesium `Cartesian3`, `Quaternion`, and `Matrix4` data, allowing progressive migration.

## Quick start (demo)

Open `src/demo/index.html` directly in a modern browser. The manipulator listens to pointer events on the canvas, performs transforms and updates two target matrices rendered as blue squares.

- **Mode**: switch between translate, rotate and scale.
- **Orientation**: choose global, local, view or ENU alignment.
- **Pivot**: select origin, median, cursor or individual.

## Library usage outline

```js
import { UniversalManipulator } from './lib/UniversalManipulator.js';

const manipulator = new UniversalManipulator({
  canvas: viewer.canvas,
  getCamera: () => viewer.camera,
  createRay: (event) => {
    // convert DOM pointer event to a world-space ray using Cesium camera helpers
    return new Cesium.Ray(originCartesian3, directionCartesian3);
  },
  overlayContainer: document.body,
  snap: { translate: 0.25, rotate: Cesium.Math.toRadians(5), scale: 0.1 }
});

manipulator.setTarget(entityOrModel);
manipulator.setMode('translate');
manipulator.setOrientation('enu');
manipulator.setPivot('median');
```

## Testing

```
npm test
```

This repository uses Node's native `test` runner (no external dependencies). The test matrix covers:

- Translation, rotation and scaling solving along single axes and planes.
- Orientation frames (global/local/view/ENU) and normal handling.
- Pivot resolution for origin/median/cursor/individual setups.
- Snapping behaviour including modifier overrides.

## Folder structure

```
├── src
│   ├── lib           # Manipulator core modules
│   ├── math          # Linear algebra helpers
│   └── demo          # Browser demo
├── tests             # Automated tests
└── README.md
```

## Roadmap & integration notes

- Replace the lightweight math utilities with Cesium's `Cartesian3`, `Matrix4`, and `Quaternion` for production builds.
- Swap the `GizmoPrimitive` data representation with actual Cesium primitives (polylines, billboards, model instances) for rich 3D visuals.
- Connect `GizmoPicker` to Cesium's `scene.pickFromRay` pipeline using unique per-handle pick IDs.
- Implement undo/redo stacks and numeric input HUD when running inside a full UI framework.

All components were designed to be stateless, garbage-free during pointer drags and resilient to degenerate camera/target configurations. Numerical tolerances in the solver and frame builder stay within the prescribed `1e-5` error budget.
