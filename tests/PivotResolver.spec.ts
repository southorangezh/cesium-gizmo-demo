import { describe, expect, it } from 'vitest';
import { Cartesian3, Matrix4, Quaternion } from 'cesium';
import { PivotResolver } from '../src/lib/PivotResolver';
import type { TargetLike } from '../src/lib/types';

class MockTarget implements TargetLike {
  constructor(private readonly matrix: Matrix4) {}

  getMatrix(): Matrix4 {
    return Matrix4.clone(this.matrix, new Matrix4());
  }

  setMatrix(matrix: Matrix4): void {
    this.matrix = Matrix4.clone(matrix, this.matrix);
  }

  getPosition(): Cartesian3 {
    return Matrix4.getTranslation(this.matrix, new Cartesian3());
  }

  getOrientation(): Quaternion | undefined {
    return Quaternion.IDENTITY;
  }
}

describe('PivotResolver', () => {
  it('returns origin pivot for single target', () => {
    const resolver = new PivotResolver();
    const target = new MockTarget(Matrix4.fromTranslation(new Cartesian3(1, 2, 3)));
    const result = resolver.resolve([target], 'origin');
    expect(result.pivot.x).toBeCloseTo(1);
    expect(result.individual).toBe(false);
  });

  it('computes median pivot for two targets', () => {
    const resolver = new PivotResolver();
    const targets = [
      new MockTarget(Matrix4.fromTranslation(new Cartesian3(0, 0, 0))),
      new MockTarget(Matrix4.fromTranslation(new Cartesian3(2, 0, 0))),
    ];
    const result = resolver.resolve(targets, 'median');
    expect(result.pivot.x).toBeCloseTo(1);
  });

  it('respects cursor pivot', () => {
    const resolver = new PivotResolver();
    const target = new MockTarget(Matrix4.fromTranslation(new Cartesian3(5, 5, 5)));
    resolver.setCursor(new Cartesian3(10, 0, 0));
    const result = resolver.resolve([target], 'cursor');
    expect(result.pivot.x).toBe(10);
  });
});
