# Universal Manipulator for Cesium Scenes

This project delivers a reusable TypeScript manipulator library that mimics the behaviour of professional DCC gizmos while remaining self-contained and renderable without full Cesium assets. It provides the following:

- A composable `UniversalManipulator` class.
- Modular components for picking, frame resolution, snapping, HUD feedback, and pivot management.
- A canvas-based renderer that keeps handles visible and screen-space sized.
- A complete example application (no build step required) demonstrating translate, rotate, and scale modes with orientation and pivot switching.
- Automated unit tests covering the most critical math primitives.

> **Note**: The demo uses a lightweight canvas renderer so it can run inside this environment. When integrating with Cesium proper you can replace or augment the renderer with real Cesium primitives while reusing the maths, controller and snapping infrastructure from this library.

## Getting Started

### Prerequisites

- Node.js ≥ 18 (provides the `node --test` runner used by the unit tests).
- The repository ships with TypeScript globally available within the execution environment (`tsc`).

### Install & Build

No external dependencies are required. Compile the TypeScript sources once to generate the ESM modules in `dist/`:

```bash
npm run build
```

This command emits library code, tests and example assets into `dist/`.

### Run Tests

After building, execute the automated math tests:

```bash
npm test
```

The tests validate the key numerical behaviours (axis translation, rotation stability and pivot resolution).

### Launch the Example

1. Build the project (`npm run build`).
2. Serve the repository root with a static server of your choice (for example, `python3 -m http.server`).
3. Open `example/index.html` in your browser.

The example scene allows you to drag handles, switch orientation/pivot, and observe snap modifiers (`Shift` for fine, `Ctrl/⌘` for coarse). Undo/redo are mapped to the side panel buttons and keyboard shortcuts (`Ctrl/⌘+Z`, `Ctrl/⌘+Y`).

## Library Usage

```ts
import {
  UniversalManipulator,
  createPerspectiveCamera,
  MatrixTransformTarget,
  updateCameraViewport,
  Orientation,
  Pivot
} from 'cesium-gizmo-demo';

const container = document.getElementById('canvas-host')!;
const camera = createPerspectiveCamera({
  position: new Vector3(50, 40, 40),
  lookAt: new Vector3(0, 0, 0),
  viewportWidth: container.clientWidth,
  viewportHeight: container.clientHeight,
  aspect: container.clientWidth / container.clientHeight
});

const target = new MatrixTransformTarget(Matrix4.fromTranslationRotationScale(
  new Vector3(0, 0, 0),
  Quaternion.identity(),
  new Vector3(1, 1, 1)
));

const manipulator = new UniversalManipulator(
  { target, orientation: 'global', pivot: 'origin' },
  { camera, container }
);

// Change orientation/pivot at runtime
manipulator.setOrientation('local');
manipulator.setPivot('median');

// Enable/disable modes
manipulator.enable({ scale: false });

// Update camera viewport when the host element resizes
updateCameraViewport(camera, container.clientWidth, container.clientHeight);
manipulator.setShow(true);
```

### API Summary

- **`UniversalManipulator`**
  - `setTarget(target | target[])`
  - `setOrientation(orientation: Orientation)`
  - `setPivot(pivot: Pivot)`
  - `enable({ translate?, rotate?, scale? })`
  - `setSnap(stepConfig)`
  - `setSize({ screenPixelRadius, minScale, maxScale })`
  - `setShow(visible)`
  - `undo()` / `redo()`
  - `destroy()`
- **`MatrixTransformTarget`** – simple matrix-backed target adapter useful for plain objects or tests.
- **`createPerspectiveCamera` / `updateCameraViewport`** – helper utilities to maintain the minimal camera state required by the manipulator.

### Snapping & Modifiers

Snap behaviour can be fully configured via `setSnap`. During interaction:

- Hold **Shift** for fine adjustments (`fineModifier`).
- Hold **Ctrl** / **⌘** for coarse adjustments (`coarseModifier`).
- Release modifiers to revert to the base step sizes.

The HUD overlay shows the effective axis, deltas, and whether snapping is active.

## Testing Strategy

The included tests cover:

- Axis translations and rotations via the `TransformSolver` with strict error tolerances (`1e-5`).
- Pivot resolution rules (median, individual) ensuring correctness for multi-target editing.

Additional behaviours (controller state machine, renderer) can be validated through the example application.

## Project Structure

```
src/
  core/            # Controllers, pickers, renderer, solver, frame builder
  math/            # Minimal math primitives (vectors, matrices, quaternions)
  utils/           # Transform helpers and geodesy utilities
  UniversalManipulator.ts
  index.ts         # Public exports
example/
  index.html       # Demo UI
  main.ts          # Example bootstrapping logic
tests/
  *.test.ts        # Unit tests executed via node:test
```

## Limitations & Integration Notes

- The demo renderer is 2D canvas-based. Replace `GizmoRenderer` with Cesium primitives for production usage to leverage depth, lighting, and actual 3D assets.
- `MatrixTransformTarget` manipulates absolute matrices; for hierarchical scenes ensure you adapt the interface to respect parent transforms.
- The library uses double precision math and avoids per-frame allocations to stay performant, but profiling is recommended when integrating with large scenes.

## License

This repository is distributed under the MIT License.
