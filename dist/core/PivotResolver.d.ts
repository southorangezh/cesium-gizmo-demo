import { ManipulableTarget, Pivot } from '../types.js';
import { Vector3 } from '../math/Vector3.js';
export interface PivotContext {
    cursor?: Vector3;
}
export interface PivotResult {
    pivotPoint: Vector3;
    individual: boolean;
    perTarget?: Map<string, Vector3>;
}
export declare class PivotResolver {
    resolve(pivot: Pivot, targets: ManipulableTarget[], context?: PivotContext): PivotResult;
    private defaultPivot;
    private medianPivot;
    private individualPivot;
}
