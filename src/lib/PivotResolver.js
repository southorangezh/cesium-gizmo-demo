import { Pivot } from './constants.js';
import { Vector3 } from '../math/Vector3.js';
import { Matrix4 } from '../math/Matrix4.js';

function extractPosition(matrix) {
  const m = matrix instanceof Matrix4 ? matrix : new Matrix4().copy(matrix);
  return new Vector3(m.elements[12], m.elements[13], m.elements[14]);
}

function ensureArray(target) {
  return Array.isArray(target) ? target : [target];
}

export class PivotResolver {
  constructor() {
    this.cursorPosition = new Vector3();
  }

  setCursor(position) {
    this.cursorPosition.copy(position);
  }

  resolve(target, pivotMode = Pivot.ORIGIN) {
    const targets = ensureArray(target);
    if (targets.length === 0) {
      throw new Error('No target provided');
    }
    const origins = targets.map((t) => extractPosition(t.matrix || t));

    switch (pivotMode) {
      case Pivot.ORIGIN:
        return {
          worldPivot: origins[0].clone(),
          perTarget: origins.map((origin) => origin.clone())
        };
      case Pivot.MEDIAN: {
        const sum = origins.reduce((acc, v) => acc.add(v), new Vector3());
        const center = sum.divideScalar(origins.length);
        return {
          worldPivot: center,
          perTarget: origins.map(() => center.clone())
        };
      }
      case Pivot.CURSOR:
        return {
          worldPivot: this.cursorPosition.clone(),
          perTarget: origins.map(() => this.cursorPosition.clone())
        };
      case Pivot.INDIVIDUAL:
        return {
          worldPivot: null,
          perTarget: origins.map((origin) => origin.clone())
        };
      default:
        throw new Error(`Unknown pivot mode ${pivotMode}`);
    }
  }
}
