export declare class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    static fromArray(array: readonly number[], offset?: number): Vector3;
    clone(): Vector3;
    set(x: number, y: number, z: number): Vector3;
    copy(v: Vector3): Vector3;
    add(v: Vector3): Vector3;
    addScaledVector(v: Vector3, scale: number): Vector3;
    subtract(v: Vector3): Vector3;
    multiplyScalar(scale: number): Vector3;
    divideScalar(scale: number): Vector3;
    dot(v: Vector3): number;
    cross(v: Vector3): Vector3;
    lengthSquared(): number;
    length(): number;
    normalize(): Vector3;
    distanceTo(v: Vector3): number;
    distanceToSquared(v: Vector3): number;
    applyMatrix3(m: readonly number[]): Vector3;
    applyMatrix4(m: readonly number[]): Vector3;
    projectOnVector(vector: Vector3): Vector3;
    projectOnPlane(normal: Vector3): Vector3;
    angleTo(v: Vector3): number;
    equals(v: Vector3, epsilon?: number): boolean;
    toArray(out?: number[], offset?: number): number[];
}
