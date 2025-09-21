import { describe, expect, it } from 'vitest';
import {
  Cartesian2,
  Cartesian3,
  Matrix4,
  Quaternion,
  Ray,
} from 'cesium';
import { TransformSolver } from '../src/lib/TransformSolver';

function createRay(origin: Cartesian3, direction: Cartesian3): Ray {
  return new Ray(origin, direction);
}

describe('TransformSolver', () => {
  it('solves axis translation with minimal error', () => {
    const solver = new TransformSolver(Matrix4.IDENTITY);
    solver.begin(
      { mode: 'translate', axis: 'x' },
      { ray: createRay(new Cartesian3(0, 0, 5), new Cartesian3(0, 0, -1)), screenPosition: new Cartesian2(0, 0) },
      Cartesian3.UNIT_Z,
    );
    const result = solver.update({
      ray: createRay(new Cartesian3(2, 0, 5), new Cartesian3(0, 0, -1)),
      screenPosition: new Cartesian2(20, 0),
    });
    expect(result).not.toBeNull();
    expect(result!.delta.translation.x).toBeCloseTo(2, 5);
    expect(result!.delta.translation.y).toBeCloseTo(0, 5);
  });

  it('solves plane translation', () => {
    const solver = new TransformSolver(Matrix4.IDENTITY);
    solver.begin(
      { mode: 'translate', planeAxes: ['x', 'y'] },
      { ray: createRay(new Cartesian3(0, 0, 5), new Cartesian3(0, 0, -1)), screenPosition: new Cartesian2(0, 0) },
      Cartesian3.UNIT_Z,
    );
    const result = solver.update({
      ray: createRay(new Cartesian3(1, 1, 5), new Cartesian3(0, 0, -1)),
      screenPosition: new Cartesian2(10, 10),
    });
    expect(result).not.toBeNull();
    expect(result!.delta.translation.x).toBeCloseTo(1, 5);
    expect(result!.delta.translation.y).toBeCloseTo(1, 5);
  });

  it('solves axis rotation', () => {
    const solver = new TransformSolver(Matrix4.IDENTITY);
    solver.begin(
      { mode: 'rotate', axis: 'z' },
      { ray: createRay(new Cartesian3(1, 0, 5), new Cartesian3(0, 0, -1)), screenPosition: new Cartesian2(0, 0) },
      Cartesian3.UNIT_Z,
    );
    const result = solver.update({
      ray: createRay(new Cartesian3(0, 1, 5), new Cartesian3(0, 0, -1)),
      screenPosition: new Cartesian2(0, 0),
    });
    expect(result).not.toBeNull();
    const angle = 2 * Math.acos(result!.delta.rotation.w);
    expect(angle).toBeCloseTo(Math.PI / 2, 5);
  });

  it('solves uniform scaling', () => {
    const solver = new TransformSolver(Matrix4.IDENTITY);
    solver.begin(
      { mode: 'scale' },
      { ray: createRay(new Cartesian3(1, 0, 5), new Cartesian3(0, 0, -1)), screenPosition: new Cartesian2(0, 0) },
      Cartesian3.UNIT_Z,
    );
    const result = solver.update({
      ray: createRay(new Cartesian3(2, 0, 5), new Cartesian3(0, 0, -1)),
      screenPosition: new Cartesian2(0, 0),
    });
    expect(result).not.toBeNull();
    expect(result!.delta.scale.x).toBeGreaterThan(1);
    expect(result!.delta.scale.x).toBeCloseTo(result!.delta.scale.y, 5);
  });
});
