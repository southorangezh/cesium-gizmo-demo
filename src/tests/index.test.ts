import test from 'node:test';
import assert from 'node:assert/strict';
import { FrameBuilder } from '../core/FrameBuilder.js';
import { PivotResolver } from '../core/PivotResolver.js';
import { TransformSolver } from '../core/TransformSolver.js';
import { Snapper } from '../core/Snapper.js';
import { Vector3 } from '../math/Vector3.js';
import { Quaternion } from '../math/Quaternion.js';
import { ManipulableTarget } from '../types.js';

const frameBuilder = new FrameBuilder();
const snapper = new Snapper();
const solver = new TransformSolver({ snapper });

const identityTarget: ManipulableTarget = {
  id: 'test',
  matrix: [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]
};

function buildFrame() {
  const pivotResolver = new PivotResolver();
  const pivot = pivotResolver.resolve('origin', [identityTarget]);
  return frameBuilder.build({
    targets: [identityTarget],
    orientation: 'global',
    pivot: 'origin',
    pivotPoint: pivot.pivotPoint,
    camera: {
      position: new Vector3(10, 10, 10),
      direction: new Vector3(-1, -1, -1).normalize(),
      up: new Vector3(0, 0, 1)
    }
  });
}

test('TransformSolver translates along axis', () => {
  const frame = buildFrame();
  const payload = {
    mode: 'translate' as const,
    axis: 'x' as const,
    initialRay: { origin: { x: 0, y: 0, z: 0 }, direction: { x: 1, y: 0, z: 0 } },
    currentRay: { origin: { x: 5, y: 0, z: 0 }, direction: { x: 1, y: 0, z: 0 } }
  };
  const result = solver.solve(frame, payload, { enabled: true, translate: 0.1 });
  assert.ok(Math.abs(result.deltaTranslation.x - 5) < 1e-5);
  assert.ok(Math.abs(result.deltaTranslation.y) < 1e-5);
  assert.ok(Math.abs(result.deltaTranslation.z) < 1e-5);
});

test('TransformSolver rotates around Z axis', () => {
  const frame = buildFrame();
  const payload = {
    mode: 'rotate' as const,
    axis: 'z' as const,
    initialRay: { origin: { x: 1, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 1 } },
    currentRay: { origin: { x: 0, y: 1, z: 0 }, direction: { x: 0, y: 0, z: 1 } }
  };
  const result = solver.solve(frame, payload, { enabled: false });
  const { axis, angle } = new Quaternion(result.deltaRotation.x, result.deltaRotation.y, result.deltaRotation.z, result.deltaRotation.w).toAxisAngle();
  assert.ok(Math.abs(angle - Math.PI / 2) < 1e-5);
  assert.ok(axis.equals(new Vector3(0, 0, 1)));
});

test('TransformSolver scales along axis', () => {
  const frame = buildFrame();
  const payload = {
    mode: 'scale' as const,
    axis: 'x' as const,
    initialRay: { origin: { x: 1, y: 0, z: 0 }, direction: { x: 1, y: 0, z: 0 } },
    currentRay: { origin: { x: 2, y: 0, z: 0 }, direction: { x: 1, y: 0, z: 0 } }
  };
  const result = solver.solve(frame, payload, { enabled: false });
  assert.ok(Math.abs(result.deltaScale.x - 2) < 1e-5);
  assert.ok(Math.abs(result.deltaScale.y - 1) < 1e-5);
  assert.ok(Math.abs(result.deltaScale.z - 1) < 1e-5);
});

test('TransformSolver scales uniformly', () => {
  const frame = buildFrame();
  const payload = {
    mode: 'scale' as const,
    initialRay: { origin: { x: 1, y: 0, z: 0 }, direction: { x: 1, y: 0, z: 0 } },
    currentRay: { origin: { x: 2, y: 0, z: 0 }, direction: { x: 1, y: 0, z: 0 } }
  };
  const result = solver.solve(frame, payload, { enabled: false });
  assert.ok(Math.abs(result.deltaScale.x - 2) < 1e-5);
  assert.ok(Math.abs(result.deltaScale.y - 2) < 1e-5);
  assert.ok(Math.abs(result.deltaScale.z - 2) < 1e-5);
});

test('FrameBuilder generates ENU frame near equator', () => {
  const target: ManipulableTarget = {
    id: 'enu',
    matrix: [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      6378137, 0, 0, 1
    ]
  };
  const pivotResolver = new PivotResolver();
  const pivot = pivotResolver.resolve('origin', [target]);
  const frame = frameBuilder.build({
    targets: [target],
    orientation: 'enu',
    pivot: 'origin',
    pivotPoint: pivot.pivotPoint,
    camera: {
      position: new Vector3(6378137 + 1000, 0, 1000),
      direction: new Vector3(-1, 0, -0.2).normalize(),
      up: new Vector3(0, 0, 1)
    }
  });
  const east = frame.axes.x.clone().normalize();
  const north = frame.axes.y.clone().normalize();
  const up = frame.axes.z.clone().normalize();
  assert.ok(Math.abs(up.dot(new Vector3(1, 0, 0)) - 1) < 0.01);
  assert.ok(Math.abs(east.dot(up)) < 1e-3);
  const cross = east.clone().cross(north.clone()).normalize();
  assert.ok(cross.equals(up, 1e-2));
});
