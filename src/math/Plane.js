import { Vector3 } from './Vector3.js';

export class Plane {
  constructor(normal = new Vector3(1, 0, 0), constant = 0) {
    this.normal = normal.clone().normalize();
    this.constant = constant;
  }

  setFromNormalAndCoplanarPoint(normal, point) {
    this.normal.copy(normal);
    this.constant = -point.dot(this.normal);
    return this;
  }

  distanceToPoint(point) {
    return this.normal.dot(point) + this.constant;
  }

  projectPoint(point, target = new Vector3()) {
    return target.copy(this.normal).multiplyScalar(-this.distanceToPoint(point)).add(point);
  }

  intersectLine(ray, target = new Vector3()) {
    return ray.intersectPlane(this, target);
  }

  static fromPointNormal(point, normal) {
    return new Plane().setFromNormalAndCoplanarPoint(normal, point);
  }
}
