import { Ray } from '../math/Ray.js';
import { Plane } from '../math/Plane.js';
import { Quaternion } from '../math/Quaternion.js';
import { Vector3 } from '../math/Vector3.js';
import { Axis, DragContext, FrameState, Mode, SnapRuntimeOptions, TransformDelta } from '../types.js';
import { createIdentityDelta } from '../utils/Transform.js';
import { Snapper } from './Snapper.js';
import { CameraState } from './CameraState.js';

interface DragComputationState {
  mode: Mode;
  axis?: Axis;
  planeAxis?: [Axis, Axis];
  axisDirection?: Vector3;
  planeAxes?: [Vector3, Vector3];
  planeNormal?: Vector3;
  startParam?: number;
  startPoint?: Vector3;
  startVector?: Vector3;
  startRadius?: number;
}

const axisMap: Record<Axis, (frame: FrameState) => Vector3> = {
  x: (frame) => frame.axes.x,
  y: (frame) => frame.axes.y,
  z: (frame) => frame.axes.z
};

export interface DragStartOptions {
  mode: Mode;
  axis?: Axis;
  planeAxis?: [Axis, Axis];
  frame: FrameState;
  pivotWorld: Vector3;
  startRay: Ray;
  camera: CameraState;
  snapOptions: SnapRuntimeOptions;
}

export interface DragUpdateOptions {
  currentRay: Ray;
  snapOptions: SnapRuntimeOptions;
}

export class TransformSolver {
  private computationState: DragComputationState | undefined;

  constructor(private readonly snapper: Snapper) {}

  beginDrag(options: DragStartOptions): DragComputationState {
    const { mode, axis, planeAxis, frame, pivotWorld, startRay, camera } = options;
    const state: DragComputationState = { mode, axis, planeAxis };
    switch (mode) {
      case 'translate':
        if (axis) {
          state.axisDirection = axisMap[axis](frame);
          state.startParam = this.projectRayToAxis(startRay, pivotWorld, state.axisDirection);
        } else if (planeAxis) {
          state.planeAxes = [axisMap[planeAxis[0]](frame), axisMap[planeAxis[1]](frame)];
          state.planeNormal = Vector3.normalize(Vector3.cross(state.planeAxes[0], state.planeAxes[1], new Vector3()));
          state.startPoint = this.intersectRayWithPlane(startRay, pivotWorld, state.planeNormal) ?? pivotWorld;
        } else {
          // free translate in view plane
          const planeNormal = camera.direction;
          state.planeNormal = planeNormal;
          const axisX = frame.axes.x;
          const axisY = frame.axes.y;
          state.planeAxes = [axisX, axisY];
          state.startPoint = this.intersectRayWithPlane(startRay, pivotWorld, planeNormal) ?? pivotWorld;
        }
        break;
      case 'rotate':
        state.axisDirection = axis ? axisMap[axis](frame) : camera.direction;
        state.planeNormal = state.axisDirection;
        state.startPoint = this.intersectRayWithPlane(startRay, pivotWorld, state.axisDirection) ?? pivotWorld;
        state.startVector = Vector3.normalize(Vector3.subtract(state.startPoint, pivotWorld, new Vector3()));
        break;
      case 'scale':
        if (axis) {
          state.axisDirection = axisMap[axis](frame);
          state.startParam = this.projectRayToAxis(startRay, pivotWorld, state.axisDirection);
        } else {
          const viewNormal = camera.direction;
          state.planeNormal = viewNormal;
          state.startPoint = this.intersectRayWithPlane(startRay, pivotWorld, viewNormal) ?? pivotWorld;
          state.startRadius = Math.max(1e-6, Vector3.magnitude(Vector3.subtract(state.startPoint, pivotWorld, new Vector3())));
        }
        break;
    }
    this.computationState = state;
    return state;
  }

  updateDrag(context: DragContext, options: DragUpdateOptions): TransformDelta {
    if (!this.computationState) {
      throw new Error('Drag has not been initialized');
    }
    const { currentRay, snapOptions } = options;
    switch (this.computationState.mode) {
      case 'translate':
        return this.computeTranslationDelta(context, currentRay, snapOptions);
      case 'rotate':
        return this.computeRotationDelta(context, currentRay, snapOptions);
      case 'scale':
        return this.computeScaleDelta(context, currentRay, snapOptions);
      default:
        return createIdentityDelta();
    }
  }

  private computeTranslationDelta(context: DragContext, ray: Ray, snapOptions: SnapRuntimeOptions): TransformDelta {
    const state = this.computationState!;
    const delta = createIdentityDelta();
    if (state.axisDirection && typeof state.startParam === 'number') {
      const currentParam = this.projectRayToAxis(ray, context.pivotWorld, state.axisDirection);
      let value = currentParam - state.startParam;
      value = this.snapper.snapTranslation(value, snapOptions);
      delta.translation = Vector3.multiplyByScalar(state.axisDirection, value);
      return delta;
    }
    if (state.planeAxes && state.planeNormal && state.startPoint) {
      const point = this.intersectRayWithPlane(ray, context.pivotWorld, state.planeNormal) ?? state.startPoint;
      const diff = Vector3.subtract(point, state.startPoint, new Vector3());
      const axisA = state.planeAxes[0];
      const axisB = state.planeAxes[1];
      let scalarA = Vector3.dot(diff, axisA);
      let scalarB = Vector3.dot(diff, axisB);
      scalarA = this.snapper.snapTranslation(scalarA, snapOptions);
      scalarB = this.snapper.snapTranslation(scalarB, snapOptions);
      const contributionA = Vector3.multiplyByScalar(axisA, scalarA, new Vector3());
      const contributionB = Vector3.multiplyByScalar(axisB, scalarB, new Vector3());
      delta.translation = Vector3.add(contributionA, contributionB, new Vector3());
      return delta;
    }
    return delta;
  }

  private computeRotationDelta(context: DragContext, ray: Ray, snapOptions: SnapRuntimeOptions): TransformDelta {
    const state = this.computationState!;
    const delta = createIdentityDelta();
    if (!state.axisDirection || !state.startVector) {
      return delta;
    }
    const point = this.intersectRayWithPlane(ray, context.pivotWorld, state.axisDirection) ?? context.pivotWorld;
    const vector = Vector3.subtract(point, context.pivotWorld, new Vector3());
    if (Vector3.magnitudeSquared(vector) < 1e-12) {
      delta.rotation = Quaternion.identity();
      return delta;
    }
    const currentVector = Vector3.normalize(vector, new Vector3());
    const angle = this.signedAngle(state.startVector, currentVector, state.axisDirection);
    const snapped = this.snapper.snapRotation(angle, snapOptions);
    delta.rotation = Quaternion.fromAxisAngle(state.axisDirection, snapped);
    return delta;
  }

  private computeScaleDelta(context: DragContext, ray: Ray, snapOptions: SnapRuntimeOptions): TransformDelta {
    const state = this.computationState!;
    const delta = createIdentityDelta();
    if (state.axisDirection && typeof state.startParam === 'number') {
      const currentParam = this.projectRayToAxis(ray, context.pivotWorld, state.axisDirection);
      const deltaParam = currentParam - state.startParam;
      const snapped = this.snapper.snapScale(1 + deltaParam, snapOptions, 1);
      const scaleVector = new Vector3(1, 1, 1);
      switch (state.axis) {
        case 'x':
          scaleVector.x = snapped;
          break;
        case 'y':
          scaleVector.y = snapped;
          break;
        case 'z':
          scaleVector.z = snapped;
          break;
      }
      delta.scale = scaleVector;
      return delta;
    }
    if (state.startPoint && state.startRadius) {
      const point = this.intersectRayWithPlane(ray, context.pivotWorld, state.planeNormal ?? context.frame.axes.z) ?? state.startPoint;
      const currentRadius = Math.max(1e-6, Vector3.magnitude(Vector3.subtract(point, context.pivotWorld, new Vector3())));
      const raw = currentRadius / state.startRadius;
      const snapped = this.snapper.snapScale(raw, snapOptions, 1);
      delta.scale = new Vector3(snapped, snapped, snapped);
      return delta;
    }
    return delta;
  }

  private projectRayToAxis(ray: Ray, origin: Vector3, axis: Vector3): number {
    const w0 = Vector3.subtract(ray.origin, origin, new Vector3());
    const a = Vector3.dot(axis, axis);
    const b = Vector3.dot(axis, ray.direction);
    const c = Vector3.dot(ray.direction, ray.direction);
    const d = Vector3.dot(axis, w0);
    const e = Vector3.dot(ray.direction, w0);
    const denom = a * c - b * b;
    if (Math.abs(denom) < 1e-12) {
      return Vector3.dot(axis, w0);
    }
    return (b * e - c * d) / denom;
  }

  private intersectRayWithPlane(ray: Ray, pointOnPlane: Vector3, planeNormal: Vector3): Vector3 | undefined {
    const plane = Plane.fromPointNormal(pointOnPlane, planeNormal);
    return Plane.intersectRay(ray, plane);
  }

  private signedAngle(from: Vector3, to: Vector3, axis: Vector3): number {
    const dot = Vector3.dot(from, to);
    const cross = Vector3.cross(from, to, new Vector3());
    const angle = Math.atan2(Vector3.dot(cross, axis), dot);
    return angle;
  }
}
