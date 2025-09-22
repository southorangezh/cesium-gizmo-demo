import assert from 'node:assert/strict';
import { TransformSolver } from '../src/core/transform-solver.js';
import { Snapper } from '../src/core/snapper.js';
import { vec3 } from '../src/math/vec3.js';

function createFrame() {
  return {
    basis: {
      x: { x: 1, y: 0, z: 0 },
      y: { x: 0, y: 1, z: 0 },
      z: { x: 0, y: 0, z: 1 },
    },
    origin: vec3(0, 0, 0),
  };
}

function createRay(origin, direction) {
  return { origin, direction };
}

function almostEqual(a, b, eps = 1e-5) {
  return Math.abs(a - b) < eps;
}

function runTranslationAxisTest() {
  const solver = new TransformSolver({ snapper: new Snapper() });
  const frame = createFrame();
  const pivot = vec3(0, 0, 0);
  const initialRay = createRay({ x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: -1 });
  const session = solver.beginSession({
    mode: 'translate',
    axis: 'x',
    frame,
    pivot,
    initialRay,
    camera: { direction: { x: 0, y: 0, z: -1 } },
  });
  const updateRay = createRay({ x: 1, y: 0, z: 5 }, { x: 0, y: 0, z: -1 });
  const delta = solver.update(session, updateRay, {});
  assert.ok(almostEqual(delta.translation.x, 1));
  assert.ok(almostEqual(delta.translation.y, 0));
  assert.ok(almostEqual(delta.translation.z, 0));
}

function runTranslationPlaneTest() {
  const solver = new TransformSolver({ snapper: new Snapper() });
  const frame = createFrame();
  const pivot = vec3(0, 0, 0);
  const initialRay = createRay({ x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: -1 });
  const session = solver.beginSession({
    mode: 'translate',
    axisPair: ['x', 'y'],
    frame,
    pivot,
    initialRay,
    camera: { direction: { x: 0, y: 0, z: -1 } },
  });
  const updateRay = createRay({ x: 2, y: 3, z: 5 }, { x: 0, y: 0, z: -1 });
  const delta = solver.update(session, updateRay, {});
  assert.ok(almostEqual(delta.translation.x, 2));
  assert.ok(almostEqual(delta.translation.y, 3));
  assert.ok(almostEqual(delta.translation.z, 0));
}

function runRotationAxisTest() {
  const solver = new TransformSolver({ snapper: new Snapper() });
  const frame = createFrame();
  const pivot = vec3(0, 0, 0);
  const initialRay = createRay({ x: 1, y: 0, z: 5 }, { x: 0, y: 0, z: -1 });
  const session = solver.beginSession({
    mode: 'rotate',
    axis: 'z',
    frame,
    pivot,
    initialRay,
    camera: { direction: { x: 0, y: 0, z: -1 } },
  });
  const updateRay = createRay({ x: 0, y: 1, z: 5 }, { x: 0, y: 0, z: -1 });
  const delta = solver.update(session, updateRay, {});
  const angle = 2 * Math.acos(delta.rotation.w);
  assert.ok(almostEqual(angle, Math.PI / 2));
}

function runScaleAxisTest() {
  const solver = new TransformSolver({ snapper: new Snapper() });
  const frame = createFrame();
  const pivot = vec3(0, 0, 0);
  const initialRay = createRay({ x: 1, y: 0, z: 5 }, { x: 0, y: 0, z: -1 });
  const session = solver.beginSession({
    mode: 'scale',
    axis: 'x',
    frame,
    pivot,
    initialRay,
    camera: { direction: { x: 0, y: 0, z: -1 } },
  });
  const updateRay = createRay({ x: 2, y: 0, z: 5 }, { x: 0, y: 0, z: -1 });
  const delta = solver.update(session, updateRay, {});
  assert.ok(almostEqual(delta.scale.x, 1 + 1));
}

function runScaleUniformTest() {
  const solver = new TransformSolver({ snapper: new Snapper() });
  const frame = createFrame();
  const pivot = vec3(0, 0, 0);
  const initialRay = createRay({ x: 1, y: 0, z: 5 }, { x: 0, y: 0, z: -1 });
  const session = solver.beginSession({
    mode: 'scale',
    frame,
    pivot,
    initialRay,
    camera: { direction: { x: 0, y: 0, z: -1 } },
  });
  const updateRay = createRay({ x: 2, y: 0, z: 5 }, { x: 0, y: 0, z: -1 });
  const delta = solver.update(session, updateRay, {});
  assert.ok(delta.scale.x > 1);
  assert.ok(delta.scale.y > 1);
  assert.ok(delta.scale.z > 1);
}

runTranslationAxisTest();
runTranslationPlaneTest();
runRotationAxisTest();
runScaleAxisTest();
runScaleUniformTest();

console.log('All tests passed.');
