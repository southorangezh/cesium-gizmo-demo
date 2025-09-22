import { Vector3 } from './Vector3.js';
export declare class Quaternion {
    x: number;
    y: number;
    z: number;
    w: number;
    constructor(x?: number, y?: number, z?: number, w?: number);
    static identity(): Quaternion;
    static fromAxisAngle(axis: Vector3, angle: number): Quaternion;
    clone(): Quaternion;
    set(x: number, y: number, z: number, w: number): Quaternion;
    copy(q: Quaternion): Quaternion;
    multiply(q: Quaternion): Quaternion;
    premultiply(q: Quaternion): Quaternion;
    normalize(): Quaternion;
    inverse(): Quaternion;
    conjugate(): Quaternion;
    rotateVector(vector: Vector3): Vector3;
    toMatrix3(): number[];
    setFromRotationMatrix(matrix: readonly number[]): Quaternion;
    toAxisAngle(): {
        axis: Vector3;
        angle: number;
    };
    slerp(q: Quaternion, t: number): Quaternion;
}
