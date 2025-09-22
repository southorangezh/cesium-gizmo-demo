import { Vector3 } from './Vector3.js';

export class Ray {
  constructor(public origin: Vector3 = new Vector3(), public direction: Vector3 = new Vector3(0, 0, 1)) {
    this.direction = direction.clone().normalize();
  }

  at(t: number): Vector3 {
    return this.origin.clone().add(this.direction.clone().multiplyScalar(t));
  }

  distanceToPoint(point: Vector3): number {
    const v1 = point.clone().subtract(this.origin);
    const proj = v1.clone().projectOnVector(this.direction);
    return v1.subtract(proj).length();
  }

  intersectPlane(planeNormal: Vector3, planePoint: Vector3): Vector3 | undefined {
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

  projectOnAxis(axis: Vector3): number {
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
