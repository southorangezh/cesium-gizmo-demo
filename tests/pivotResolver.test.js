import test from 'node:test';
import assert from 'node:assert/strict';
import { PivotResolver } from '../src/lib/PivotResolver.js';
import { Pivot } from '../src/lib/constants.js';
import { Matrix4 } from '../src/math/Matrix4.js';
import { Vector3 } from '../src/math/Vector3.js';
import { Quaternion } from '../src/math/Quaternion.js';

function makeMatrix(position) {
  return new Matrix4().compose(position, new Quaternion(), new Vector3(1, 1, 1));
}

test('median pivot averages centers', () => {
  const resolver = new PivotResolver();
  const targets = [
    { matrix: makeMatrix(new Vector3(1, 0, 0)) },
    { matrix: makeMatrix(new Vector3(-1, 0, 0)) }
  ];
  const result = resolver.resolve(targets, Pivot.MEDIAN);
  assert.equal(result.worldPivot.x, 0);
});

test('cursor pivot uses cursor position', () => {
  const resolver = new PivotResolver();
  resolver.setCursor(new Vector3(5, 5, 5));
  const targets = [{ matrix: makeMatrix(new Vector3(0, 0, 0)) }];
  const result = resolver.resolve(targets, Pivot.CURSOR);
  assert.equal(result.worldPivot.x, 5);
});
