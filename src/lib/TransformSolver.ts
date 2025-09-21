import {
  Cartesian3,
  Quaternion,
  Ray,
  defined,
  Math as CesiumMath
} from 'cesium';
import type { Axis, SolveRequest, SolveResponse, TransformDelta } from './types';
import { UniversalSnapper } from './Snapper';

const scratchAxis = new Cartesian3();
const scratchPlaneNormal = new Cartesian3();
const scratchVectorA = new Cartesian3();
const scratchVectorB = new Cartesian3();
const scratchQuaternion = new Quaternion();

export class TransformSolver {
  constructor(private readonly snapper: UniversalSnapper) {}

  solve(request: SolveRequest): SolveResponse {
    switch (request.mode) {
      case 'translate':
        return { delta: this.solveTranslate(request) };
      case 'rotate':
        return { delta: this.solveRotate(request) };
      case 'scale':
      default:
        return { delta: this.solveScale(request) };
    }
  }

  private solveTranslate(request: SolveRequest): TransformDelta {
    const translation = Cartesian3.clone(request.initialState.translation);
    const scale = Cartesian3.clone(request.initialState.scale);
    const rotation = Quaternion.clone(request.initialState.rotation);

    if (defined(request.axis)) {
      const axisVector = this.axisVector(request.axis, request.frame, scratchAxis);
      const start = projectRayToAxis(request.startPointer, request.pivot, axisVector);
      const current = projectRayToAxis(request.pointer, request.pivot, axisVector);
      let delta = current - start;
      delta = this.snapper.snapTranslation(delta, request.axis);
      Cartesian3.add(translation, Cartesian3.multiplyByScalar(axisVector, delta, new Cartesian3()), translation);
    } else if (request.plane) {
      const [a, b] = request.plane;
      const planeNormal = Cartesian3.normalize(
        Cartesian3.cross(
          this.axisVector(a, request.frame, scratchVectorA),
          this.axisVector(b, request.frame, scratchVectorB),
          scratchPlaneNormal
        ),
        scratchPlaneNormal
      );
      const startPoint = projectRayToPlane(request.startPointer, request.pivot, planeNormal);
      const currentPoint = projectRayToPlane(request.pointer, request.pivot, planeNormal);
      const deltaVector = Cartesian3.subtract(currentPoint, startPoint, new Cartesian3());
      Cartesian3.add(translation, deltaVector, translation);
    } else {
      const planeNormal = Cartesian3.normalize(request.cameraDirection, scratchPlaneNormal);
      const startPoint = projectRayToPlane(request.startPointer, request.pivot, planeNormal);
      const currentPoint = projectRayToPlane(request.pointer, request.pivot, planeNormal);
      const deltaVector = Cartesian3.subtract(currentPoint, startPoint, new Cartesian3());
      Cartesian3.add(translation, deltaVector, translation);
    }

    return { translation, rotation, scale };
  }

  private solveRotate(request: SolveRequest): TransformDelta {
    const translation = Cartesian3.clone(request.initialState.translation);
    const scale = Cartesian3.clone(request.initialState.scale);
    const rotation = Quaternion.clone(request.initialState.rotation);

    let axisVector: Cartesian3;
    let planeNormal: Cartesian3;
    if (defined(request.axis)) {
      axisVector = this.axisVector(request.axis, request.frame, scratchAxis);
      planeNormal = axisVector;
    } else {
      axisVector = Cartesian3.normalize(request.cameraDirection, scratchAxis);
      planeNormal = axisVector;
    }

    const startPoint = projectRayToPlane(request.startPointer, request.pivot, planeNormal, axisVector);
    const currentPoint = projectRayToPlane(request.pointer, request.pivot, planeNormal, axisVector);
    const startVector = Cartesian3.normalize(
      Cartesian3.subtract(startPoint, request.pivot, scratchVectorA),
      scratchVectorA
    );
    const currentVector = Cartesian3.normalize(
      Cartesian3.subtract(currentPoint, request.pivot, scratchVectorB),
      scratchVectorB
    );
    const angle = signedAngleBetween(startVector, currentVector, planeNormal);
    const snapped = this.snapper.snapRotation(angle, request.axis ?? 'view');
    const deltaQuaternion = Quaternion.fromAxisAngle(axisVector, snapped, scratchQuaternion);
    Quaternion.multiply(rotation, deltaQuaternion, rotation);

    return { translation, rotation, scale };
  }

  private solveScale(request: SolveRequest): TransformDelta {
    const translation = Cartesian3.clone(request.initialState.translation);
    const scale = Cartesian3.clone(request.initialState.scale);
    const rotation = Quaternion.clone(request.initialState.rotation);

    if (defined(request.axis)) {
      const axisVector = this.axisVector(request.axis, request.frame, scratchAxis);
      const start = projectRayToAxis(request.startPointer, request.pivot, axisVector);
      const current = projectRayToAxis(request.pointer, request.pivot, axisVector);
      const delta = current - start;
      const factor = this.snapper.snapScale(1 + delta, request.axis);
      applyAxisScale(scale, request.axis, factor);
    } else {
      const planeNormal = Cartesian3.normalize(request.cameraDirection, scratchPlaneNormal);
      const startPoint = projectRayToPlane(request.startPointer, request.pivot, planeNormal);
      const currentPoint = projectRayToPlane(request.pointer, request.pivot, planeNormal);
      const startDistance = Cartesian3.magnitude(Cartesian3.subtract(startPoint, request.pivot, scratchVectorA));
      const currentDistance = Cartesian3.magnitude(Cartesian3.subtract(currentPoint, request.pivot, scratchVectorB));
      if (startDistance > 0) {
        const factor = this.snapper.snapScale(currentDistance / startDistance, 'uniform');
        scale.x *= factor;
        scale.y *= factor;
        scale.z *= factor;
      }
    }

    return { translation, rotation, scale };
  }

  private axisVector(axis: Axis, frame: SolveRequest['frame'], result: Cartesian3): Cartesian3 {
    switch (axis) {
      case 'x':
        return Cartesian3.normalize(frame.axes.x, result);
      case 'y':
        return Cartesian3.normalize(frame.axes.y, result);
      case 'z':
      default:
        return Cartesian3.normalize(frame.axes.z, result);
    }
  }
}

function applyAxisScale(scale: Cartesian3, axis: Axis, value: number): void {
  switch (axis) {
    case 'x':
      scale.x *= value;
      break;
    case 'y':
      scale.y *= value;
      break;
    case 'z':
      scale.z *= value;
      break;
  }
}

function projectRayToAxis(pointer: SolveRequest['pointer'], pivot: Cartesian3, axis: Cartesian3): number {
  const ray = new Ray(pointer.rayOrigin, pointer.rayDirection);
  const axisRay = new Ray(pivot, axis);
  return closestPointParameter(axisRay, ray);
}

function projectRayToPlane(
  pointer: SolveRequest['pointer'],
  pivot: Cartesian3,
  normal: Cartesian3,
  axisHint?: Cartesian3
): Cartesian3 {
  const ray = new Ray(pointer.rayOrigin, pointer.rayDirection);
  const planeDistance = -Cartesian3.dot(normal, pivot);
  const denominator = Cartesian3.dot(normal, ray.direction);
  if (Math.abs(denominator) < CesiumMath.EPSILON6) {
    if (axisHint) {
      return Cartesian3.add(pivot, axisHint, new Cartesian3());
    }
    return Cartesian3.clone(pivot);
  }
  const t = -(Cartesian3.dot(normal, ray.origin) + planeDistance) / denominator;
  const point = Cartesian3.add(ray.origin, Cartesian3.multiplyByScalar(ray.direction, t, new Cartesian3()), new Cartesian3());
  return point;
}

function signedAngleBetween(a: Cartesian3, b: Cartesian3, normal: Cartesian3): number {
  const cross = Cartesian3.cross(a, b, new Cartesian3());
  const dot = Cartesian3.dot(a, b);
  const angle = Math.atan2(Cartesian3.magnitude(cross), dot);
  const sign = Math.sign(Cartesian3.dot(cross, normal));
  return angle * (sign === 0 ? 1 : sign);
}

function closestPointParameter(axis: Ray, ray: Ray): number {
  const w0 = Cartesian3.subtract(axis.origin, ray.origin, new Cartesian3());
  const a = Cartesian3.dot(axis.direction, axis.direction);
  const b = Cartesian3.dot(axis.direction, ray.direction);
  const c = Cartesian3.dot(ray.direction, ray.direction);
  const d = Cartesian3.dot(axis.direction, w0);
  const e = Cartesian3.dot(ray.direction, w0);
  const denominator = a * c - b * b;
  if (Math.abs(denominator) < CesiumMath.EPSILON6) {
    return 0;
  }
  return (b * e - c * d) / denominator;
}
