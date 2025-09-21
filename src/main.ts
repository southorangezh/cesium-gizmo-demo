import './style.css';
import {
  BoxGeometry,
  Cartesian3,
  Color,
  ColorGeometryInstanceAttribute,
  GeometryInstance,
  Matrix4,
  PerInstanceColorAppearance,
  Primitive,
  Viewer
} from 'cesium';
import { UniversalManipulator } from '@/lib/UniversalManipulator';
import { MatrixTransformTarget } from '@/lib/targets';

(window as any).CESIUM_BASE_URL = '/cesium';

const viewer = new Viewer('app', {
  selectionIndicator: false,
  infoBox: false,
  terrainProvider: undefined,
  scene3DOnly: true,
  shouldAnimate: false
});

viewer.scene.globe.show = false;
viewer.scene.skyAtmosphere.show = false;
viewer.scene.backgroundColor = Color.fromCssColorString('#0b1d2b');

const primitives = viewer.scene.primitives;

function createBox(matrix: Matrix4, color: Color): { primitive: Primitive; target: MatrixTransformTarget } {
  const instance = new GeometryInstance({
    geometry: BoxGeometry.fromDimensions({ dimensions: new Cartesian3(500.0, 500.0, 500.0) }),
    modelMatrix: Matrix4.clone(matrix, new Matrix4()),
    attributes: {
      color: ColorGeometryInstanceAttribute.fromColor(color)
    }
  });
  const primitive = new Primitive({
    geometryInstances: instance,
    appearance: new PerInstanceColorAppearance({ translucent: false }),
    asynchronous: false
  });
  primitives.add(primitive);
  const target = new MatrixTransformTarget(Matrix4.clone(matrix, new Matrix4()), undefined, (mat) => {
    instance.modelMatrix = Matrix4.clone(mat, instance.modelMatrix ?? new Matrix4());
  });
  return { primitive, target };
}

const targets: MatrixTransformTarget[] = [];

const originMatrix = Matrix4.fromTranslation(new Cartesian3(0, 0, 0));
const offsetMatrix = Matrix4.fromTranslation(new Cartesian3(600, 0, 0));
const elevatedMatrix = Matrix4.fromTranslation(new Cartesian3(0, 600, 0));

const redBox = createBox(originMatrix, Color.fromCssColorString('#ff6b6b'));
const greenBox = createBox(offsetMatrix, Color.fromCssColorString('#51cf66'));
const blueBox = createBox(elevatedMatrix, Color.fromCssColorString('#339af0'));

targets.push(redBox.target, greenBox.target, blueBox.target);

const manipulator = new UniversalManipulator(viewer, {
  target: targets,
  orientation: 'global',
  pivot: 'origin'
});

setupUi(manipulator, targets);
viewer.scene.camera.flyTo({
  destination: Cartesian3.fromDegrees(-75.2, 39.6, 4000),
  orientation: {
    heading: 0,
    pitch: -Math.PI / 4,
    roll: 0
  }
});

function setupUi(manipulator: UniversalManipulator, targets: MatrixTransformTarget[]) {
  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';
  toolbar.innerHTML = `
    <div class="toolbar-section">
      <label>Orientation</label>
      <select id="orientation">
        <option value="global">Global</option>
        <option value="local">Local</option>
        <option value="view">View</option>
        <option value="enu">ENU</option>
        <option value="normal">Normal</option>
        <option value="gimbal">Gimbal</option>
      </select>
    </div>
    <div class="toolbar-section">
      <label>Pivot</label>
      <select id="pivot">
        <option value="origin">Origin</option>
        <option value="median">Median</option>
        <option value="cursor">Cursor</option>
        <option value="individual">Individual</option>
      </select>
    </div>
    <div class="toolbar-section">
      <label>Snap (m)</label>
      <input type="number" id="snap-translate" value="0.1" step="0.1" />
    </div>
    <div class="toolbar-section">
      <label>Snap (deg)</label>
      <input type="number" id="snap-rotate" value="5" step="1" />
    </div>
    <div class="toolbar-section">
      <label>Snap (scale)</label>
      <input type="number" id="snap-scale" value="0.05" step="0.01" />
    </div>
  `;
  viewer.container.append(toolbar);

  const orientationSelect = toolbar.querySelector('#orientation') as HTMLSelectElement;
  const pivotSelect = toolbar.querySelector('#pivot') as HTMLSelectElement;
  const snapTranslate = toolbar.querySelector('#snap-translate') as HTMLInputElement;
  const snapRotate = toolbar.querySelector('#snap-rotate') as HTMLInputElement;
  const snapScale = toolbar.querySelector('#snap-scale') as HTMLInputElement;

  orientationSelect.addEventListener('change', () => {
    manipulator.setOrientation(orientationSelect.value as any);
  });

  pivotSelect.addEventListener('change', () => {
    manipulator.setPivot(pivotSelect.value as any);
  });

  const updateSnap = () => {
    manipulator.setSnap({
      translate: Number(snapTranslate.value),
      rotate: Number(snapRotate.value),
      scale: Number(snapScale.value)
    });
  };
  snapTranslate.addEventListener('change', updateSnap);
  snapRotate.addEventListener('change', updateSnap);
  snapScale.addEventListener('change', updateSnap);
}
