import { Vector3 } from './Vector3.js';

export class Ray {
  origin: Vector3;
  direction: Vector3;

  constructor(origin = new Vector3(), direction = new Vector3(1, 0, 0)) {
    this.origin = Vector3.clone(origin);
    this.direction = Vector3.normalize(direction);
  }

  static getPoint(ray: Ray, distance: number, result = new Vector3()): Vector3 {
    result.x = ray.origin.x + ray.direction.x * distance;
    result.y = ray.origin.y + ray.direction.y * distance;
    result.z = ray.origin.z + ray.direction.z * distance;
    return result;
  }
}
