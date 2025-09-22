import { Matrix4 } from '../math/Matrix4.js';
import { Quaternion } from '../math/Quaternion.js';
import { Vector3 } from '../math/Vector3.js';
export function decomposeMatrix(matrix) {
    const m = new Matrix4();
    m.elements = matrix.slice(0);
    const translation = new Vector3();
    const rotation = new Quaternion();
    const scale = new Vector3();
    m.decompose(translation, rotation, scale);
    return { translation, rotation, scale };
}
export function composeMatrix(trs) {
    const m = new Matrix4();
    m.compose(trs.translation, trs.rotation, trs.scale);
    return m.elements.slice(0);
}
export function averageVectors(vectors) {
    if (vectors.length === 0) {
        return new Vector3();
    }
    const sum = vectors.reduce((acc, v) => acc.add(v), new Vector3());
    return sum.divideScalar(vectors.length);
}
export function normalizeOrZero(vector) {
    const clone = vector.clone();
    const len = clone.length();
    if (len < 1e-8) {
        return new Vector3();
    }
    return clone.divideScalar(len);
}
