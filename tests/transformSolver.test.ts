import test from 'node:test';
import assert from 'node:assert/strict';
import { TransformSolver } from '../src/core/TransformSolver.js';
import { Snapper } from '../src/core/Snapper.js';
import { Matrix4 } from '../src/math/Matrix4.js';
import { Quaternion } from '../src/math/Quaternion.js';
import { Vector3 } from '../src/math/Vector3.js';
import { createPerspectiveCamera } from '../src/core/CameraState.js';
import { SnapRuntimeOptions, DragContext, FrameState, Mode, Axis } from '../src/types.js';
import { Ray } from '../src/math/Ray.js';

function createFrame(): FrameState {
  const origin = new Vector3(0, 0, 0);
  const axes = {
    x: new Vector3(1, 0, 0),
    y: new Vector3(0, 1, 0),
    z: new Vector3(0, 0, 1)
  };
  const matrix = Matrix4.fromColumns(axes.x, axes.y, axes.z, origin, new Matrix4());
  const inverse = matrix.clone(new Matrix4()).invert();
  return { origin, axes, matrix, inverse };
}

const snapOptions: SnapRuntimeOptions = {
  enabled: false,
  fineModifierActive: false,
  coarseModifierActive: false
};

function createContext(mode: Mode, axis?: Axis, planeAxis?: [Axis, Axis]): DragContext {
  const frame = createFrame();
  return {
    mode,
    axis,
    planeAxis,
    handleId: planeAxis ? `${mode}-${planeAxis.join('')}` : axis ? `${mode}-${axis}` : `${mode}-free`,
    startPointer: { x: 0, y: 0 },
    startRayOrigin: new Vector3(),
    startRayDirection: new Vector3(),
    startMatrix: Matrix4.identity(),
    pivotWorld: new Vector3(0, 0, 0),
    frame,
    currentDelta: {
      translation: new Vector3(),
      rotation: Quaternion.identity(),
      scale: new Vector3(1, 1, 1)
    }
  };
}

test('TransformSolver resolves axis translation', () => {
  const solver = new TransformSolver(new Snapper());
  const frame = createFrame();
  const camera = createPerspectiveCamera({
    position: new Vector3(0, 0, 10),
    lookAt: new Vector3(0, 0, 0),
    viewportWidth: 800,
    viewportHeight: 600,
    aspect: 800 / 600
  });
  const startRay = new Ray(new Vector3(0, 0, 10), new Vector3(0, 0, -1));
  const context = createContext('translate', 'x');
  solver.beginDrag({
    mode: 'translate',
    axis: 'x',
    frame,
    pivotWorld: new Vector3(0, 0, 0),
    startRay,
    camera,
    snapOptions
  });
  const newDirection = Vector3.normalize(new Vector3(2, 0, -10));
  const newRay = new Ray(new Vector3(0, 0, 10), newDirection);
  const delta = solver.updateDrag(context, { currentRay: newRay, snapOptions });
  assert.ok(Math.abs(delta.translation.x + 2) < 1e-5);
  assert.ok(Math.abs(delta.translation.y) < 1e-5);
});

test('TransformSolver resolves plane translation on XY', () => {
  const solver = new TransformSolver(new Snapper());
  const frame = createFrame();
  const camera = createPerspectiveCamera({
    position: new Vector3(0, 0, 10),
    lookAt: new Vector3(0, 0, 0),
    viewportWidth: 800,
    viewportHeight: 600,
    aspect: 800 / 600
  });
  const pivot = new Vector3(0, 0, 0);
  const startRay = new Ray(new Vector3(0, 0, 10), new Vector3(0, 0, -1));
  solver.beginDrag({
    mode: 'translate',
    planeAxis: ['x', 'y'],
    frame,
    pivotWorld: pivot,
    startRay,
    camera,
    snapOptions
  });
  const context = createContext('translate', undefined, ['x', 'y']);
  const newDirection = Vector3.normalize(new Vector3(1, 1, -5));
  const newRay = new Ray(new Vector3(0, 0, 10), newDirection);
  const delta = solver.updateDrag(context, { currentRay: newRay, snapOptions });
  const startPoint = intersectRayPlane(startRay, pivot, new Vector3(0, 0, 1));
  const newPoint = intersectRayPlane(newRay, pivot, new Vector3(0, 0, 1));
  const expected = Vector3.subtract(newPoint, startPoint, new Vector3());
  assert.ok(Math.abs(delta.translation.x - expected.x) < 1e-5);
  assert.ok(Math.abs(delta.translation.y - expected.y) < 1e-5);
  assert.ok(Math.abs(delta.translation.z - expected.z) < 1e-5);
});

test('TransformSolver resolves rotation around Z', () => {
  const solver = new TransformSolver(new Snapper());
  const frame = createFrame();
  const camera = createPerspectiveCamera({
    position: new Vector3(0, 0, 10),
    lookAt: new Vector3(0, 0, 0),
    viewportWidth: 800,
    viewportHeight: 600,
    aspect: 800 / 600
  });
  const startRay = new Ray(new Vector3(0, 0, 10), Vector3.normalize(new Vector3(1, 0, -10)));
  solver.beginDrag({
    mode: 'rotate',
    axis: 'z',
    frame,
    pivotWorld: new Vector3(0, 0, 0),
    startRay,
    camera,
    snapOptions
  });
  const context = createContext('rotate', 'z');
  const newRay = new Ray(new Vector3(0, 0, 10), Vector3.normalize(new Vector3(0, 1, -10)));
  const delta = solver.updateDrag(context, { currentRay: newRay, snapOptions });
  const euler = delta.rotation.toEuler(new Vector3());
  assert.ok(Math.abs(euler.z - Math.PI / 2) < 0.1);
});

test('TransformSolver resolves view-aligned rotation', () => {
  const solver = new TransformSolver(new Snapper());
  const frame = createFrame();
  const camera = createPerspectiveCamera({
    position: new Vector3(0, 0, 10),
    lookAt: new Vector3(0, 0, 0),
    viewportWidth: 800,
    viewportHeight: 600,
    aspect: 800 / 600
  });
  const pivot = new Vector3(0, 0, 0);
  const startRay = new Ray(new Vector3(0, 0, 10), Vector3.normalize(new Vector3(1, 0, -10)));
  solver.beginDrag({
    mode: 'rotate',
    frame,
    pivotWorld: pivot,
    startRay,
    camera,
    snapOptions
  });
  const context = createContext('rotate');
  const newRay = new Ray(new Vector3(0, 0, 10), Vector3.normalize(new Vector3(0, 1, -10)));
  const delta = solver.updateDrag(context, { currentRay: newRay, snapOptions });
  const signed = extractSignedAngle(delta.rotation, camera.direction);
  assert.ok(Math.abs(signed + Math.PI / 2) < 0.1);
});

test('TransformSolver resolves uniform scale', () => {
  const solver = new TransformSolver(new Snapper());
  const frame = createFrame();
  const camera = createPerspectiveCamera({
    position: new Vector3(0, 0, 10),
    lookAt: new Vector3(0, 0, 0),
    viewportWidth: 800,
    viewportHeight: 600,
    aspect: 800 / 600
  });
  const startRay = new Ray(new Vector3(0, 0, 10), new Vector3(0, 0, -1));
  solver.beginDrag({
    mode: 'scale',
    frame,
    pivotWorld: new Vector3(0, 0, 0),
    startRay,
    camera,
    snapOptions
  });
  const context = createContext('scale', 'x');
  const newRay = new Ray(new Vector3(0, 0, 10), new Vector3(0, 0, -1));
  const delta = solver.updateDrag(context, { currentRay: newRay, snapOptions });
  assert.ok(Math.abs(delta.scale.x - 1) < 1e-5);
});

test('TransformSolver resolves negative axis scale', () => {
  const solver = new TransformSolver(new Snapper());
  const frame = createFrame();
  const camera = createPerspectiveCamera({
    position: new Vector3(0, 0, 10),
    lookAt: new Vector3(0, 0, 0),
    viewportWidth: 800,
    viewportHeight: 600,
    aspect: 800 / 600
  });
  const pivot = new Vector3(0, 0, 0);
  const startRay = new Ray(new Vector3(0, 0, 10), new Vector3(0, 0, -1));
  solver.beginDrag({
    mode: 'scale',
    axis: 'x',
    frame,
    pivotWorld: pivot,
    startRay,
    camera,
    snapOptions
  });
  const context = createContext('scale', 'x');
  const newDirection = Vector3.normalize(new Vector3(3, 0, -10));
  const newRay = new Ray(new Vector3(0, 0, 10), newDirection);
  const delta = solver.updateDrag(context, { currentRay: newRay, snapOptions });
  const startParam = projectRayToAxis(startRay, pivot, frame.axes.x);
  const currentParam = projectRayToAxis(newRay, pivot, frame.axes.x);
  const expectedScale = 1 + (currentParam - startParam);
  assert.ok(delta.scale.x < 0);
  assert.ok(Math.abs(delta.scale.x - expectedScale) < 1e-5);
});

function intersectRayPlane(ray: Ray, pointOnPlane: Vector3, planeNormal: Vector3): Vector3 {
  const denom = Vector3.dot(planeNormal, ray.direction);
  if (Math.abs(denom) < 1e-8) {
    return new Vector3(pointOnPlane.x, pointOnPlane.y, pointOnPlane.z);
  }
  const diff = Vector3.subtract(pointOnPlane, ray.origin, new Vector3());
  const t = Vector3.dot(planeNormal, diff) / denom;
  const offset = Vector3.multiplyByScalar(ray.direction, t, new Vector3());
  return Vector3.add(ray.origin, offset, new Vector3());
}

function extractSignedAngle(quaternion: Quaternion, referenceAxis: Vector3): number {
  const sinHalf = Math.sqrt(quaternion.x * quaternion.x + quaternion.y * quaternion.y + quaternion.z * quaternion.z);
  if (sinHalf < 1e-8) {
    return 0;
  }
  const axis = Vector3.normalize(new Vector3(quaternion.x, quaternion.y, quaternion.z));
  let angle = 2 * Math.atan2(sinHalf, quaternion.w);
  if (Vector3.dot(axis, referenceAxis) < 0) {
    angle = -angle;
  }
  return angle;
}

function projectRayToAxis(ray: Ray, origin: Vector3, axis: Vector3): number {
  const w0 = Vector3.subtract(ray.origin, origin, new Vector3());
  const a = Vector3.dot(axis, axis);
  const b = Vector3.dot(axis, ray.direction);
  const c = Vector3.dot(ray.direction, ray.direction);
  const d = Vector3.dot(axis, w0);
  const e = Vector3.dot(ray.direction, w0);
  const denom = a * c - b * b;
  if (Math.abs(denom) < 1e-12) {
    return Vector3.dot(axis, w0);
  }
  return (b * e - c * d) / denom;
}
