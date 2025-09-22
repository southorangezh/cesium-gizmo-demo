import { Vector3 } from './Vector3.js';
export declare class Ray {
    origin: Vector3;
    direction: Vector3;
    constructor(origin?: Vector3, direction?: Vector3);
    at(t: number): Vector3;
    distanceToPoint(point: Vector3): number;
    intersectPlane(planeNormal: Vector3, planePoint: Vector3): Vector3 | undefined;
    projectOnAxis(axis: Vector3): number;
}
