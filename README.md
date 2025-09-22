# Cesium Universal Manipulator

This repository delivers a reusable manipulator/gizmo for Cesium scenes, providing unified translate/rotate/scale workflows, multiple orientation modes, configurable snap behaviour, HUD feedback and a demonstration page. The implementation is framework-agnostic and ships as modern ES modules that can be imported directly in browsers or bundled in larger applications.

## Features

- **Full TRS support** – single-axis translation, planar translation, axis rotation, view rotation, axis scaling and uniform scaling.
- **Orientation frames** – Global, Local, View, ENU, Normal and Gimbal references using a dedicated `FrameBuilder`.
- **Pivot management** – Origin, Median, Cursor and Individual pivot strategies handled by `PivotResolver`.
- **Snap & numeric entry** – Translation/rotation/scale snapping with modifier support plus HUD driven numeric overrides.
- **HUD overlay** – Real-time deltas, numeric input with unit parsing and quick cancel/apply actions.
- **Entity integration** – Works with Cesium `Entity`, `Model` or custom matrix-backed targets via adapter utilities.
- **Extensible modules** – `GizmoPrimitive`, `GizmoPicker`, `ManipulatorController`, `TransformSolver`, `Snapper` and more exposed as separate building blocks.
- **Tests** – Deterministic solver unit tests covering axis/plane translation, axis rotation and scale cases.
- **Demo** – Interactive example with configuration controls for modes, pivots and snapping.

## Getting Started

Clone the repository and serve the project with any static web server. No build step is required.

```bash
# clone and enter the directory
git clone <repo-url>
cd cesium-gizmo-demo

# run the test suite
npm test

# launch a local HTTP server (example using Python)
python -m http.server 8080
```

Open `http://localhost:8080/public/index.html` in a browser to explore the demo scene. The demo loads Cesium 1.118 from CDN and instantiates the manipulator with a sample entity and configuration sidebar.

## Library Usage

Import the `UniversalManipulator` class (and supporting modules as needed) into your Cesium application. The manipulator expects a live `viewer` instance.

```html
<script type="module">
  import { UniversalManipulator } from './src/index.js';

  const viewer = new Cesium.Viewer('cesiumContainer');
  const entity = viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883, 100),
    box: { dimensions: new Cesium.Cartesian3(50.0, 50.0, 50.0) }
  });

  const manipulator = new UniversalManipulator(viewer, {
    target: entity,
    orientation: 'global',
    pivot: 'origin',
    snap: {
      translate: { step: 0, microStep: 0.1 },
      rotate: { step: 5 * Math.PI / 180 },
      scale: { step: 0 }
    }
  });

  // Update configuration on demand
  manipulator.setOrientation('local');
  manipulator.setPivot('median');
  manipulator.enable('rotate', true);
</script>
```

### API Summary

- `manipulator.show` – toggle gizmo visibility.
- `setTarget(target | target[])` – attach single or multiple Cesium entities/models.
- `setOrientation(mode)` – choose global/local/view/enu/normal/gimbal frames.
- `setPivot(mode)` – select origin/median/cursor/individual.
- `enable(mode, enabled)` – toggle translate/rotate/scale.
- `setSnap(stepConfig)` – configure snapping increments per mode.
- `setSize({ axisLength, planeSize, ringRadius, scaleBoxSize })` – adjust visual scale factors.
- `destroy()` – detach events, HUD and primitives.

Supporting modules (`TransformSolver`, `FrameBuilder`, `Snapper`, etc.) are available via `src/index.js` for custom integrations.

## Testing

The repository ships with a Node-based test runner that exercises the solver math with 1e-5 precision tolerances.

```bash
npm test
```

Outputs `All tests passed.` when successful.

## Demo Content

The sample page (`public/index.html`) demonstrates:

- Translate/rotate/scale handles with hover/active feedback.
- Orientation switching across global/local/view/ENU/normal/gimbal modes.
- Pivot options including median and cursor (cursor defaults to origin but can be updated programmatically).
- Snap configuration for translation (meters), rotation (degrees) and scale (percentage).
- HUD overlay showing deltas plus numeric entry with unit parsing (m, cm, km, °, %).

### Serving Notes

Because Cesium assets must be requested over HTTP/S, ensure the demo is opened via a local server rather than the `file://` protocol. The repository includes only standard ES modules and does not require bundling, but you may integrate it into build pipelines as needed.

## License

MIT License.
