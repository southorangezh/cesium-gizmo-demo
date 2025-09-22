import { UniversalManipulator } from '../core/UniversalManipulator.js';
import { Orientation, Pivot, TargetLike } from '../core/types.js';
import { Matrix4 as MathMatrix4 } from '../utils/math/Matrix4.js';

const Cesium = (window as any).Cesium;

function createViewer(): any {
  const viewer = new Cesium.Viewer('cesiumContainer', {
    animation: false,
    timeline: false,
    infoBox: false,
    geocoder: false
  });
  viewer.scene.globe.depthTestAgainstTerrain = false;
  viewer.scene.globe.enableLighting = true;
  return viewer;
}

function createBoxEntity(viewer: any): any {
  const position = Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883, 30);
  const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(position);
  const entity = viewer.entities.add({
    name: 'Draggable box',
    modelMatrix,
    box: {
      dimensions: new Cesium.Cartesian3(10, 10, 10),
      material: Cesium.Color.WHITE.withAlpha(0.8),
      outline: true,
      outlineColor: Cesium.Color.DEEPSKYBLUE
    }
  });
  return entity;
}

function toTargetLike(matrix: any): TargetLike {
  const elements = Array.from(matrix as number[]);
  const mathMatrix = MathMatrix4.fromArray(elements);
  const translation = mathMatrix.getTranslation();
  const rotation = mathMatrix.getRotation();
  const scale = mathMatrix.getScale();
  return {
    matrix: elements,
    position: translation.toArray(),
    rotation: [rotation.w, rotation.x, rotation.y, rotation.z],
    scale: scale.toArray()
  };
}

function applyMatrixToEntity(entity: any, target: TargetLike): void {
  if (!target.matrix) return;
  entity.modelMatrix = Cesium.Matrix4.fromArray(target.matrix);
}

function buildUi(manipulator: UniversalManipulator): void {
  const orientationSelect = document.getElementById('orientation') as HTMLSelectElement;
  const pivotSelect = document.getElementById('pivot') as HTMLSelectElement;
  const translateToggle = document.getElementById('enable-translate') as HTMLInputElement;
  const rotateToggle = document.getElementById('enable-rotate') as HTMLInputElement;
  const scaleToggle = document.getElementById('enable-scale') as HTMLInputElement;

  orientationSelect.addEventListener('change', () => {
    manipulator.setOrientation(orientationSelect.value as Orientation);
  });

  pivotSelect.addEventListener('change', () => {
    manipulator.setPivot(pivotSelect.value as Pivot);
  });

  const updateModes = () => {
    manipulator.enable({
      translate: translateToggle.checked,
      rotate: rotateToggle.checked,
      scale: scaleToggle.checked
    });
  };

  translateToggle.addEventListener('change', updateModes);
  rotateToggle.addEventListener('change', updateModes);
  scaleToggle.addEventListener('change', updateModes);
}

(async function init() {
  const viewer = createViewer();
  const entity = createBoxEntity(viewer);
  const target = toTargetLike(Cesium.Matrix4.toArray(entity.modelMatrix));
  const manipulator = new UniversalManipulator(viewer, {
    target,
    orientation: 'enu',
    pivot: 'origin',
    screenPixelRadius: 90,
    snap: {
      translateStep: 1,
      rotateStep: Cesium.Math.toRadians(5),
      scaleStep: 0.1
    }
  });

  viewer.scene.preRender.addEventListener(() => {
    applyMatrixToEntity(entity, target);
  });

  buildUi(manipulator);
})();
