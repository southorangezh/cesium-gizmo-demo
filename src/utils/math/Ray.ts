import { Vector3 } from './Vector3.js';

export interface Ray {
  origin: Vector3;
  direction: Vector3;
}

export function closestPointsBetweenRays(
  rayA: Ray,
  rayB: Ray
): { pointA: Vector3; pointB: Vector3; distance: number; parameterA: number; parameterB: number } {
  const p13 = rayA.origin.subtract(rayB.origin);
  const d1 = rayA.direction.normalize();
  const d2 = rayB.direction.normalize();

  const d1343 = p13.dot(d2);
  const d4321 = d2.dot(d1);
  const d1321 = p13.dot(d1);
  const d4343 = d2.dot(d2);
  const d2121 = d1.dot(d1);

  const denom = d2121 * d4343 - d4321 * d4321;
  if (Math.abs(denom) < 1e-8) {
    return {
      pointA: rayA.origin,
      pointB: rayB.origin,
      distance: p13.length(),
      parameterA: 0,
      parameterB: 0
    };
  }

  const numer = d1343 * d4321 - d1321 * d4343;

  const mua = numer / denom;
  const mub = (d1343 + d4321 * mua) / d4343;

  const pointA = rayA.origin.add(d1.multiplyByScalar(mua));
  const pointB = rayB.origin.add(d2.multiplyByScalar(mub));

  return {
    pointA,
    pointB,
    distance: Vector3.distance(pointA, pointB),
    parameterA: mua,
    parameterB: mub
  };
}

export function intersectRayPlane(ray: Ray, planePoint: Vector3, planeNormal: Vector3): Vector3 | undefined {
  const denom = planeNormal.dot(ray.direction);
  if (Math.abs(denom) < 1e-8) {
    return undefined;
  }
  const t = planePoint.subtract(ray.origin).dot(planeNormal) / denom;
  return ray.origin.add(ray.direction.multiplyByScalar(t));
}
