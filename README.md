# Cesium Universal Manipulator

A reusable universal manipulator (translate/rotate/scale gizmo) for CesiumJS ≥ 1.118 built with TypeScript and Vite. The package ships with a production-ready library, automated math unit tests and a fully interactive demo scene showcasing single and multi-object editing, snap controls, cursor pivots and HUD feedback.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173 to inspect the Cesium scene and manipulator.

To run unit tests:

```bash
npm run test
```

## Library usage

```ts
import { Viewer } from 'cesium';
import { UniversalManipulator } from 'cesium-gizmo-demo/lib';

const viewer = new Viewer('viewer');
const manipulator = new UniversalManipulator(viewer, {
  target: viewer.entities.values, // Cesium.Entity | Cesium.Model | TargetLike[]
  orientation: 'global',
  pivot: 'median',
  snap: { translation: 0.25, rotation: (5 * Math.PI) / 180 },
  size: { screenPixelRadius: 90, minScale: 0.8, maxScale: 4.0 },
});

manipulator.setOrientation('local');
manipulator.setPivot('cursor');
manipulator.setCursorPosition(Cesium.Cartesian3.fromDegrees(-75.6, 40.04, 300));
```

### `UniversalManipulator` API

- `setTarget(target)` – bind one or multiple Cesium entities/models (or custom TargetLike wrappers).
- `setOrientation(orientation)` – switch between global/local/view/enu/normal/gimbal frames.
- `setPivot(pivot)` – choose origin/median/cursor/individual centers.
- `setCursorPosition(cartesian)` – update the 3D cursor for cursor pivot mode.
- `enable()` / `disable()` – toggle gizmo visibility.
- `setSnap(stepConfig)` – configure translation/rotation/scale snap increments.
- `setSize(screenPixelRadius, minScale, maxScale)` – control screen-space sizing.
- `destroy()` – remove event listeners and primitives.

Targets can be provided as Cesium `Entity`, `Model`, or any object implementing the `TargetLike` interface (`getMatrix`, `setMatrix`, `getPosition`, `getOrientation`). Multi-select collections can be passed as arrays.

### Coordinate systems & pivots

Transform solving happens in an ENU-friendly frame defined by the selected orientation. The manipulator keeps rotation (R) and scale (S) orthogonal during non-uniform edits, preserving clean TRS decomposition when writing matrices back to Cesium entities or models. Pivot modes follow these rules:

- **Origin** – each object’s origin, grouped as a whole.
- **Median** – geometric center of all selected items.
- **Cursor** – uses the interactive 3D cursor supplied via `setCursorPosition`.
- **Individual** – per-object transforms while maintaining a shared gizmo pose.

## Demo features

The example app (`npm run dev`) exposes a control panel for:

- Switching orientation and pivot modes.
- Adjusting translation snap (hold **Alt** to enable, **Ctrl** for fine and **Shift** for coarse increments).
- Toggling the manipulator and changing target selection.
- Teleporting the cursor to the camera ground intersection.

The HUD overlay shows ΔT / ΔR / ΔS values with metric units and degrees. Handles honor Cesium’s depth testing, stay screen-size consistent and provide hover/active highlights.

## Testing matrix

Automated Vitest suites cover:

- Axis & plane translation precision.
- Axis rotation and view ring stability.
- Uniform scaling factor resolution.
- Pivot resolution for origin/median/cursor cases.

Extend the suite with end-to-end coverage by spawning Cesium’s headless scene harness if deeper regressions are required.
