import { ManipulableTarget, Pivot } from '../types.js';
import { Vector3 } from '../math/Vector3.js';
import { averageVectors, decomposeMatrix } from './utils.js';

export interface PivotContext {
  cursor?: Vector3;
}

export interface PivotResult {
  pivotPoint: Vector3;
  individual: boolean;
  perTarget?: Map<string, Vector3>;
}

export class PivotResolver {
  resolve(pivot: Pivot, targets: ManipulableTarget[], context: PivotContext = {}): PivotResult {
    switch (pivot) {
      case 'cursor':
        return {
          pivotPoint: context.cursor ? context.cursor.clone() : this.defaultPivot(targets),
          individual: false
        };
      case 'median':
        return { pivotPoint: this.medianPivot(targets), individual: false };
      case 'individual':
        return this.individualPivot(targets);
      case 'origin':
      default:
        return { pivotPoint: this.defaultPivot(targets), individual: false };
    }
  }

  private defaultPivot(targets: ManipulableTarget[]): Vector3 {
    if (targets.length === 0) {
      return new Vector3();
    }
    return decomposeMatrix(targets[0].matrix).translation.clone();
  }

  private medianPivot(targets: ManipulableTarget[]): Vector3 {
    if (targets.length === 0) {
      return new Vector3();
    }
    const centers = targets.map((t) => decomposeMatrix(t.matrix).translation);
    return averageVectors(centers);
  }

  private individualPivot(targets: ManipulableTarget[]): PivotResult {
    const perTarget = new Map<string, Vector3>();
    targets.forEach((target) => {
      perTarget.set(target.id, decomposeMatrix(target.matrix).translation.clone());
    });
    const pivotPoint = this.medianPivot(targets);
    return { pivotPoint, individual: true, perTarget };
  }
}
