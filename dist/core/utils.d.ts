import { Quaternion } from '../math/Quaternion.js';
import { Vector3 } from '../math/Vector3.js';
export interface TRS {
    translation: Vector3;
    rotation: Quaternion;
    scale: Vector3;
}
export declare function decomposeMatrix(matrix: readonly number[]): TRS;
export declare function composeMatrix(trs: TRS): number[];
export declare function averageVectors(vectors: Vector3[]): Vector3;
export declare function normalizeOrZero(vector: Vector3): Vector3;
