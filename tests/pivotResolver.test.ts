import test from 'node:test';
import assert from 'node:assert/strict';
import { PivotResolver } from '../src/core/PivotResolver.js';
import { MatrixTransformTarget } from '../src/core/targets/MatrixTransformTarget.js';
import { Matrix4 } from '../src/math/Matrix4.js';
import { Quaternion } from '../src/math/Quaternion.js';
import { Vector3 } from '../src/math/Vector3.js';

function createMatrix(x: number, y: number, z: number): Matrix4 {
  return Matrix4.fromTranslationRotationScale(new Vector3(x, y, z), Quaternion.identity(), new Vector3(1, 1, 1));
}

test('PivotResolver computes median pivot', () => {
  const targets = [
    new MatrixTransformTarget(createMatrix(0, 0, 0)),
    new MatrixTransformTarget(createMatrix(10, 0, 0))
  ];
  const resolver = new PivotResolver();
  const pivot = resolver.resolveManipulatorPivot('median', targets);
  assert.deepEqual(Vector3.toArray(pivot), [5, 0, 0]);
});

test('PivotResolver median per target map uses shared pivot', () => {
  const targets = [
    new MatrixTransformTarget(createMatrix(0, 0, 0)),
    new MatrixTransformTarget(createMatrix(4, 0, 0))
  ];
  const resolver = new PivotResolver();
  const manipPivot = resolver.resolveManipulatorPivot('median', targets);
  const map = resolver.resolvePerTargetPivot('median', targets, manipPivot);
  for (const pivot of map.values()) {
    assert.deepEqual(Vector3.toArray(pivot), Vector3.toArray(manipPivot));
  }
});

test('PivotResolver individual uses object origin', () => {
  const targets = [
    new MatrixTransformTarget(createMatrix(0, 0, 0)),
    new MatrixTransformTarget(createMatrix(4, 0, 0))
  ];
  const resolver = new PivotResolver();
  const manipPivot = resolver.resolveManipulatorPivot('individual', targets);
  const map = resolver.resolvePerTargetPivot('individual', targets, manipPivot);
  assert.deepEqual(Vector3.toArray(map.get(targets[0].id)!), [0, 0, 0]);
  assert.deepEqual(Vector3.toArray(map.get(targets[1].id)!), [4, 0, 0]);
});
