# Cesium Universal Manipulator Demo

A reusable TypeScript manipulator (translate/rotate/scale) for CesiumJS scenes, bundled with an interactive demo built with Vite.

## Getting Started

```bash
npm install
npm run dev
```

The demo runs at <http://localhost:5173> and copies the Cesium static assets automatically.

## Production build

```bash
npm run build
npm run preview
```

## Testing

```bash
npm test
```

## Library Overview

The library exposes a high-level `UniversalManipulator` class accompanied by modular components for picking, snapping, frame construction, and math solvers. Core modules live under `src/lib`:

| Module | Responsibility |
| --- | --- |
| `UniversalManipulator` | Public API, orchestrates rendering, events, and target updates. |
| `GizmoPrimitive` | Draws the gizmo handles, maintains highlights and scaling. |
| `GizmoPicker` | Maps Cesium `pick` results to logical handle metadata. |
| `ManipulatorController` | Pointer event state machine (hover/drag/cancel). |
| `FrameBuilder` | Builds orientation frames (global/local/view/ENU/etc.). |
| `TransformSolver` | Numerically solves translation/rotation/scale deltas. |
| `Snapper` | Applies snap and modifier logic. |
| `PivotResolver` | Chooses pivot points for origin/median/cursor/individual modes. |
| `HudOverlay` | Displays live delta readouts. |
| `targets` | Helper wrappers for matrix/model targets. |

## Demo Features

* Multiple primitive boxes that can be manipulated individually or together.
* Toolbar for orientation/pivot/snap configuration.
* HUD overlay showing live delta values.
* Handles that scale to stay screen-size consistent.

## API Sketch

```ts
const manipulator = new UniversalManipulator(viewer, {
  target: [new ModelTransformTarget(model)],
  orientation: 'local',
  pivot: 'median',
  snap: { translate: 0.5, rotate: 5, scale: 0.1 },
  size: { screenPixelRadius: 96, minScale: 0.5, maxScale: 200 }
});

manipulator.setOrientation('view');
manipulator.setPivot('individual');
manipulator.setSnap({ translate: 0.25, rotate: 2.5, scale: 0.05 });
```

Targets must implement the `TransformTarget` interface (see `src/lib/types.ts`). Helpers for matrix-backed primitives and `Cesium.Model` instances live in `src/lib/targets.ts`.

## Testing Matrix

Unit tests cover the core numeric solver for axis/plane translation, axis and view-plane rotation, and axis/uniform scaling. Extend the suite to cover additional edge cases and snapping modifiers.

## License

MIT
