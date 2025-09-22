import { Vector3 } from '../math/Vector3.js';
import { averageVectors, decomposeMatrix } from './utils.js';
export class PivotResolver {
    resolve(pivot, targets, context = {}) {
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
    defaultPivot(targets) {
        if (targets.length === 0) {
            return new Vector3();
        }
        return decomposeMatrix(targets[0].matrix).translation.clone();
    }
    medianPivot(targets) {
        if (targets.length === 0) {
            return new Vector3();
        }
        const centers = targets.map((t) => decomposeMatrix(t.matrix).translation);
        return averageVectors(centers);
    }
    individualPivot(targets) {
        const perTarget = new Map();
        targets.forEach((target) => {
            perTarget.set(target.id, decomposeMatrix(target.matrix).translation.clone());
        });
        const pivotPoint = this.medianPivot(targets);
        return { pivotPoint, individual: true, perTarget };
    }
}
