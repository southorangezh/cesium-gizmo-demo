import { Quaternion } from './Quaternion.js';
import { Vector3 } from './Vector3.js';
export declare class Matrix4 {
    elements: number[];
    constructor();
    static identity(): Matrix4;
    clone(): Matrix4;
    copy(matrix: Matrix4): Matrix4;
    makeTranslation(x: number, y: number, z: number): Matrix4;
    makeScale(x: number, y: number, z: number): Matrix4;
    makeRotationFromQuaternion(q: Quaternion): Matrix4;
    compose(position: Vector3, quaternion: Quaternion, scale: Vector3): Matrix4;
    multiply(matrix: Matrix4): Matrix4;
    premultiply(matrix: Matrix4): Matrix4;
    multiplyMatrices(a: Matrix4, b: Matrix4): Matrix4;
    invert(): Matrix4;
    determinant(): number;
    decompose(position: Vector3, quaternion: Quaternion, scale: Vector3): void;
}
