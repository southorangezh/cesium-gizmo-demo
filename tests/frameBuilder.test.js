import test from 'node:test';
import assert from 'node:assert/strict';
import { FrameBuilder } from '../src/lib/FrameBuilder.js';
import { Orientation } from '../src/lib/constants.js';
import { Matrix4 } from '../src/math/Matrix4.js';
import { Vector3 } from '../src/math/Vector3.js';
import { Quaternion } from '../src/math/Quaternion.js';

const camera = {
  direction: new Vector3(0, 0, -1),
  up: new Vector3(0, 1, 0),
  right: new Vector3(1, 0, 0)
};

test('global frame aligns axes to world', () => {
  const frameBuilder = new FrameBuilder(() => ({ ...camera }));
  const matrix = new Matrix4().identity();
  const frame = frameBuilder.build(matrix, Orientation.GLOBAL);
  assert.deepEqual(frame.axes.x.toArray(), [1, 0, 0]);
  assert.deepEqual(frame.axes.y.toArray(), [0, 1, 0]);
  assert.deepEqual(frame.axes.z.toArray(), [0, 0, 1]);
});

test('local frame uses object rotation', () => {
  const frameBuilder = new FrameBuilder(() => ({ ...camera }));
  const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2);
  const matrix = new Matrix4().compose(new Vector3(0, 0, 0), rotation, new Vector3(1, 1, 1));
  const frame = frameBuilder.build(matrix, Orientation.LOCAL);
  const x = frame.axes.x;
  assert.ok(Math.abs(x.x) < 1e-6);
  assert.ok(Math.abs(x.y - 1) < 1e-6);
});

test('ENU frame produces orthonormal basis', () => {
  const frameBuilder = new FrameBuilder(() => ({ ...camera }));
  const position = new Vector3(10, 10, 10);
  const matrix = new Matrix4().compose(position, new Quaternion(), new Vector3(1, 1, 1));
  const frame = frameBuilder.build(matrix, Orientation.ENU);
  const dot = frame.axes.x.dot(frame.axes.y);
  assert.ok(Math.abs(dot) < 1e-6);
});
