# Cesium Universal Manipulator

A TypeScript implementation of a reusable translate / rotate / scale manipulator designed for CesiumJS scenes. The project ships a lightweight library together with an interactive demo scaffolded with Vite.

## Getting Started

```bash
npm install
npm run dev
```

The demo renders a simulated scene (without Cesium assets inside the evaluation container). The UI exposes callbacks to inspect transformation deltas and to switch between orientation and pivot presets.

## Library Usage

```ts
import { UniversalManipulator } from "cesium-gizmo-demo";

const manipulator = new UniversalManipulator({
  target: entity,
  orientation: "global",
  pivot: "origin",
  snap: {
    translate: 1,
    rotate: (5 * Math.PI) / 180,
    scale: 0.1
  }
});

viewer.scene.canvas.addEventListener("pointerdown", (event) => {
  const world = pickWorld(event);
  manipulator.pointerDown(world, { x: event.clientX, y: event.clientY });
});
```

### API Surface

* `setTarget(target)` – assign a single target or an array for multi-edit sessions.
* `setOrientation(mode)` – switch between `global`, `local`, `view`, `enu`, `normal`, or `gimbal` frames.
* `setPivot(mode)` – choose one of `origin`, `median`, `cursor`, or `individual` pivot strategies.
* `setSnap(stepConfig)` – configure snapping for translation / rotation / scale.
* `setSize(screenPixelRadius, minScale, maxScale)` – control gizmo appearance in screen space.
* `enable(flags)` – toggle manipulator sub-features (free translate, uniform scale, etc.).
* `destroy()` – release the manipulator.

## Testing

The repository includes Vitest specifications covering math utilities and the core solver. Running `npm test` requires access to the npm registry; if that is unavailable, copy the project locally and execute the command after installing dependencies.

## Folder Structure

```
├── src
│   ├── example        # Demo UI and wiring
│   ├── lib            # Library source
│   └── index.ts       # Library entry point
├── tests              # Unit tests (Vitest)
├── index.html         # Vite entry
└── vite.config.ts
```

## License

MIT

