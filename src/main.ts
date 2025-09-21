import 'cesium/Build/Cesium/Widgets/widgets.css';
import {
  Cartesian3,
  Color,
  createWorldTerrainAsync,
  Math as CesiumMath,
  Viewer,
} from 'cesium';
import { UniversalManipulator } from './lib';
import type { Orientation, Pivot } from './lib/types';

const viewer = new Viewer('viewer', {
  terrainProvider: await createWorldTerrainAsync(),
  selectionIndicator: false,
  timeline: false,
  animation: false,
});
viewer.scene.globe.depthTestAgainstTerrain = true;

const redBox = viewer.entities.add({
  name: 'Red box',
  position: Cartesian3.fromDegrees(-75.59777, 40.03883, 300),
  box: {
    dimensions: new Cartesian3(500.0, 500.0, 500.0),
    material: Color.RED.withAlpha(0.6),
  },
});

const blueModel = viewer.entities.add({
  name: 'Blue model',
  position: Cartesian3.fromDegrees(-75.60377, 40.04383, 300),
  box: {
    dimensions: new Cartesian3(400.0, 600.0, 300.0),
    material: Color.CYAN.withAlpha(0.6),
  },
});

viewer.zoomTo(viewer.entities);

const manipulator = new UniversalManipulator(viewer, {
  target: [redBox, blueModel],
  orientation: 'global',
  pivot: 'median',
  size: { screenPixelRadius: 90, minScale: 0.6, maxScale: 4.0 },
});

const orientations: Orientation[] = ['global', 'local', 'view', 'enu', 'normal', 'gimbal'];
const pivots: Pivot[] = ['origin', 'median', 'cursor', 'individual'];

const panel = document.getElementById('control-panel')!;

function createSelect<T extends string>(labelText: string, values: T[], onChange: (value: T) => void): void {
  const label = document.createElement('label');
  label.textContent = labelText;
  const select = document.createElement('select');
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  select.addEventListener('change', () => onChange(select.value as T));
  label.appendChild(select);
  panel.appendChild(label);
}

createSelect('Orientation', orientations, (value) => manipulator.setOrientation(value));
createSelect('Pivot', pivots, (value) => manipulator.setPivot(value));

const snapInput = document.createElement('input');
snapInput.type = 'number';
snapInput.step = '0.01';
snapInput.min = '0';
snapInput.value = '0.25';
const snapLabel = document.createElement('label');
snapLabel.textContent = 'Translation Snap (Alt)';
snapLabel.appendChild(snapInput);
panel.appendChild(snapLabel);

snapInput.addEventListener('change', () => {
  const value = Number.parseFloat(snapInput.value);
  if (!Number.isFinite(value)) {
    return;
  }
  manipulator.setSnap({ translation: value });
});

const toggle = document.createElement('button');
toggle.textContent = 'Toggle manipulator';
toggle.addEventListener('click', () => {
  if (manipulator.show) {
    manipulator.disable();
  } else {
    manipulator.enable();
  }
});
panel.appendChild(toggle);

const cursorButton = document.createElement('button');
cursorButton.textContent = 'Move cursor to camera ground';
cursorButton.addEventListener('click', () => {
  const ray = viewer.camera.getPickRay(new Cartesian3(viewer.canvas.clientWidth / 2, viewer.canvas.clientHeight / 2, 0));
  const intersection = viewer.scene.globe.pick(ray, viewer.scene);
  if (intersection) {
    manipulator.setPivot('cursor');
    manipulator.setCursorPosition(intersection);
  }
});
panel.appendChild(cursorButton);

const updateTargetButton = document.createElement('button');
updateTargetButton.textContent = 'Target single object';
let multiTarget = true;
updateTargetButton.addEventListener('click', () => {
  if (multiTarget) {
    manipulator.setTarget(redBox);
    updateTargetButton.textContent = 'Target both objects';
    multiTarget = false;
  } else {
    manipulator.setTarget([redBox, blueModel]);
    updateTargetButton.textContent = 'Target single object';
    multiTarget = true;
  }
});
panel.appendChild(updateTargetButton);

viewer.scene.postRender.addEventListener(() => {
  viewer.scene.requestRender();
});
