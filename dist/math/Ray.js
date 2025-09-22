import { Vector3 } from './Vector3.js';
export class Ray {
    constructor(origin = new Vector3(), direction = new Vector3(0, 0, 1)) {
        this.origin = origin;
        this.direction = direction;
        this.direction = direction.clone().normalize();
    }
    at(t) {
        return this.origin.clone().add(this.direction.clone().multiplyScalar(t));
    }
    distanceToPoint(point) {
        const v1 = point.clone().subtract(this.origin);
        const proj = v1.clone().projectOnVector(this.direction);
        return v1.subtract(proj).length();
    }
    intersectPlane(planeNormal, planePoint) {
        const denom = planeNormal.dot(this.direction);
        if (Math.abs(denom) < 1e-8) {
            return undefined;
        }
        const t = planePoint.clone().subtract(this.origin).dot(planeNormal) / denom;
        if (t < 0) {
            return undefined;
        }
        return this.at(t);
    }
    projectOnAxis(axis) {
        const axisNormalized = axis.clone().normalize();
        const relative = this.origin.clone();
        const numerator = axisNormalized.dot(relative);
        const denominator = axisNormalized.dot(this.direction);
        if (Math.abs(denominator) < 1e-8) {
            return 0;
        }
        return numerator / denominator;
    }
}
