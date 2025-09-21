import { Vector3 } from './Vector3.js';
import { Ray } from './Ray.js';

export class Plane {
  normal: Vector3;
  distance: number;

  constructor(normal = new Vector3(0, 1, 0), distance = 0) {
    this.normal = Vector3.normalize(normal);
    this.distance = distance;
  }

  static fromPointNormal(point: Vector3, normal: Vector3, result = new Plane()): Plane {
    const normalized = Vector3.normalize(normal, new Vector3());
    result.normal = normalized;
    result.distance = Vector3.dot(normalized, point);
    return result;
  }

  static intersectRay(ray: Ray, plane: Plane): Vector3 | undefined {
    const denom = Vector3.dot(plane.normal, ray.direction);
    if (Math.abs(denom) < 1e-10) {
      return undefined;
    }
    const t = (plane.distance - Vector3.dot(plane.normal, ray.origin)) / denom;
    if (t < 0) {
      return undefined;
    }
    return Ray.getPoint(ray, t, new Vector3());
  }
}
