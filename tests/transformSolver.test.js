import test from 'node:test';
import assert from 'node:assert/strict';
import { FrameBuilder } from '../src/lib/FrameBuilder.js';
import { TransformSolver } from '../src/lib/TransformSolver.js';
import { Snapper } from '../src/lib/Snapper.js';
import { Orientation, Axis, Mode, HandleType } from '../src/lib/constants.js';
import { Matrix4 } from '../src/math/Matrix4.js';
import { Vector3 } from '../src/math/Vector3.js';
import { Quaternion } from '../src/math/Quaternion.js';
import { Ray } from '../src/math/Ray.js';

const camera = {
  position: new Vector3(0, 0, 5),
  direction: new Vector3(0, 0, -1),
  up: new Vector3(0, 1, 0),
  right: new Vector3(1, 0, 0),
  fov: Math.PI / 3,
  viewportHeight: 1080
};

function buildSolver(targetMatrix) {
  const frameBuilder = new FrameBuilder(() => camera);
  frameBuilder.build(targetMatrix, Orientation.GLOBAL);
  const snapper = new Snapper();
  const solver = new TransformSolver(frameBuilder, snapper);
  return { solver, frameBuilder };
}

test('axis translation solver moves along x axis', () => {
  const targetMatrix = new Matrix4().identity();
  const { solver } = buildSolver(targetMatrix);
  const pivot = new Vector3(0, 0, 0);
  const startRay = new Ray(camera.position.clone(), new Vector3(0, 0, -1));
  const currentRay = new Ray(camera.position.clone(), new Vector3(0.4, 0, -1).normalize());
  const session = solver.beginSession({
    mode: Mode.TRANSLATE,
    axis: Axis.X,
    handleType: HandleType.AXIS,
    startRay,
    pivot,
    camera
  });
  const result = solver.updateSession(session, { currentRay });
  assert.ok(Math.abs(result.deltaPosition.x) > 1);
  assert.ok(Math.abs(result.deltaPosition.y) < 1e-6);
  assert.ok(Math.abs(result.deltaPosition.z) < 1e-6);
});

test('plane translation solver moves in plane', () => {
  const targetMatrix = new Matrix4().identity();
  const { solver } = buildSolver(targetMatrix);
  const pivot = new Vector3(0, 0, 0);
  const startRay = new Ray(camera.position.clone(), new Vector3(0, 0, -1));
  const currentRay = new Ray(camera.position.clone(), new Vector3(0.2, 0.3, -1).normalize());
  const session = solver.beginSession({
    mode: Mode.TRANSLATE,
    axis: 'xy',
    handleType: HandleType.PLANE,
    startRay,
    pivot,
    camera
  });
  const result = solver.updateSession(session, { currentRay });
  assert.ok(Math.abs(result.deltaPosition.z) < 1e-6);
});

test('rotation solver returns quaternion with expected angle', () => {
  const targetMatrix = new Matrix4().identity();
  const { solver } = buildSolver(targetMatrix);
  const pivot = new Vector3(0, 0, 0);
  const startRay = new Ray(camera.position.clone(), new Vector3(1, 0, -5).normalize());
  const currentRay = new Ray(camera.position.clone(), new Vector3(0, 1, -5).normalize());
  const session = solver.beginSession({
    mode: Mode.ROTATE,
    axis: Axis.Z,
    handleType: HandleType.RING,
    startRay,
    pivot,
    camera
  });
  const result = solver.updateSession(session, { currentRay });
  const angle = 2 * Math.acos(result.deltaRotation.w);
  assert.ok(Math.abs(angle) > 0.1);
});

test('scale solver returns uniform scale factor', () => {
  const targetMatrix = new Matrix4().identity();
  const { solver } = buildSolver(targetMatrix);
  const pivot = new Vector3(0, 0, 0);
  const startRay = new Ray(camera.position.clone(), new Vector3(0, 0, -1));
  const currentRay = new Ray(camera.position.clone(), new Vector3(0, 0, -1.2).normalize());
  const session = solver.beginSession({
    mode: Mode.SCALE,
    axis: null,
    handleType: HandleType.CENTER,
    startRay,
    pivot,
    camera
  });
  const result = solver.updateSession(session, { currentRay });
  assert.ok(Math.abs(result.deltaScale.x - result.deltaScale.y) < 1e-6);
  assert.ok(Math.abs(result.deltaScale.y - result.deltaScale.z) < 1e-6);
});
