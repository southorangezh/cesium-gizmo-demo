import { Vector3 } from './Vector3.js';

export class Ray {
  constructor(origin = new Vector3(), direction = new Vector3(0, 0, -1)) {
    this.origin = origin;
    this.direction = direction.clone().normalize();
  }

  at(t, target = new Vector3()) {
    return target.copy(this.direction).multiplyScalar(t).add(this.origin);
  }

  distanceToPoint(point) {
    const v1 = point.clone().subtract(this.origin);
    const t = v1.dot(this.direction);
    if (t < 0) {
      return this.origin.distanceTo(point);
    }
    return this.at(t, v1).distanceTo(point);
  }

  intersectPlane(plane, target = new Vector3()) {
    const denominator = plane.normal.dot(this.direction);

    if (Math.abs(denominator) < 1e-6) {
      if (plane.distanceToPoint(this.origin) === 0) {
        return target.copy(this.origin);
      }
      return null;
    }

    const t = -(this.origin.dot(plane.normal) + plane.constant) / denominator;

    if (t < 0) {
      return null;
    }

    return this.at(t, target);
  }

  projectOnPlane(plane) {
    const target = new Vector3();
    const intersection = this.intersectPlane(plane, target);
    if (!intersection) return null;
    return intersection;
  }
}
