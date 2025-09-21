import {
  Cartesian2,
  Cartesian3,
  Matrix4,
  Plane,
  Quaternion,
  Ray,
  defined,
} from 'cesium';
import type { Axis, DragContext, DragResult, Mode, TransformDelta } from './types';

const scratchPlane = new Plane(Cartesian3.UNIT_Z, 0);
const scratchVec = new Cartesian3();
const scratchVec2 = new Cartesian3();
const scratchQuat = new Quaternion();
const scratchRay = new Ray();

export interface SolverInit {
  frameMatrix: Matrix4;
  origin: Cartesian3;
}

export interface AxisDragState {
  mode: Mode;
  axis: Axis;
  startParam: number;
  axisDirection: Cartesian3;
  origin: Cartesian3;
  plane: Plane;
}

export interface PlaneDragState {
  mode: Mode;
  planeAxes: [Axis, Axis];
  origin: Cartesian3;
  plane: Plane;
  startPoint: Cartesian3;
}

export interface RotateDragState {
  axis: Axis | null;
  plane: Plane;
  startVector: Cartesian3;
}

export interface ScaleDragState {
  axis: Axis | null;
  origin: Cartesian3;
  plane: Plane;
  startDistance: number;
}

export type SolverState = AxisDragState | PlaneDragState | RotateDragState | ScaleDragState;

export interface PointerInfo {
  ray: Ray;
  screenPosition: Cartesian2;
}

export class TransformSolver {
  private state: SolverState | null = null;

  constructor(private readonly frame: Matrix4) {}

  begin(context: DragContext, pointer: PointerInfo, cameraDir: Cartesian3): void {
    if (context.mode === 'translate' && context.axis) {
      this.state = this.beginAxisTranslate(context.axis, pointer.ray, cameraDir);
    } else if (context.mode === 'translate' && context.planeAxes) {
      this.state = this.beginPlaneDrag(context.planeAxes, pointer.ray, cameraDir);
    } else if (context.mode === 'rotate') {
      this.state = this.beginRotate(context.axis ?? null, pointer.ray, cameraDir);
    } else if (context.mode === 'scale') {
      this.state = this.beginScale(context.axis ?? null, pointer.ray, cameraDir);
    }
  }

  update(pointer: PointerInfo): DragResult | null {
    if (!this.state) {
      return null;
    }
    if ((this.state as AxisDragState).axis) {
      const axisState = this.state as AxisDragState;
      const param = this.projectRayToAxis(pointer.ray, axisState.axisDirection, axisState.origin, axisState.plane);
      const deltaParam = param - axisState.startParam;
      const deltaVec = Cartesian3.multiplyByScalar(axisState.axisDirection, deltaParam, new Cartesian3());
      const delta = this.toTransformDelta('translate', deltaVec);
      return { mode: 'translate', axis: axisState.axis, delta };
    }
    if ((this.state as PlaneDragState).planeAxes) {
      const planeState = this.state as PlaneDragState;
      const point = this.rayPlaneIntersection(pointer.ray, planeState.plane);
      if (!point) {
        return null;
      }
      const delta = Cartesian3.subtract(point, planeState.startPoint, new Cartesian3());
      return { mode: 'translate', planeAxes: planeState.planeAxes, delta: this.toTransformDelta('translate', delta) };
    }
    if ((this.state as RotateDragState).plane) {
      const rotateState = this.state as RotateDragState;
      const point = this.rayPlaneIntersection(pointer.ray, rotateState.plane);
      if (!point) {
        return null;
      }
      const currentVec = Cartesian3.subtract(point, Matrix4.getTranslation(this.frame, new Cartesian3()), scratchVec);
      Cartesian3.normalize(currentVec, currentVec);
      const cross = Cartesian3.cross(rotateState.startVector, currentVec, scratchVec2);
      const dot = Cartesian3.dot(rotateState.startVector, currentVec);
      let angle = Math.atan2(Cartesian3.magnitude(cross), dot);
      const axis = rotateState.axis
        ? this.getAxisVector(rotateState.axis)
        : Cartesian3.normalize(cross, new Cartesian3());
      const quaternion = Quaternion.fromAxisAngle(axis, angle, scratchQuat);
      return { mode: 'rotate', axis: rotateState.axis ?? undefined, delta: this.toTransformDelta('rotate', quaternion) };
    }
    if ((this.state as ScaleDragState).plane) {
      const scaleState = this.state as ScaleDragState;
      const point = this.rayPlaneIntersection(pointer.ray, scaleState.plane);
      if (!point) {
        return null;
      }
      const vec = Cartesian3.subtract(point, scaleState.origin, scratchVec);
      const dir = scaleState.axis ? this.getAxisVector(scaleState.axis) : Cartesian3.normalize(vec, new Cartesian3());
      const distance = Cartesian3.dot(vec, dir);
      const factor = 1 + distance / Math.max(scaleState.startDistance, 1e-5);
      const scale = scaleState.axis
        ? new Cartesian3(
            scaleState.axis === 'x' ? factor : 1,
            scaleState.axis === 'y' ? factor : 1,
            scaleState.axis === 'z' ? factor : 1,
          )
        : new Cartesian3(factor, factor, factor);
      return { mode: 'scale', axis: scaleState.axis ?? undefined, delta: this.toTransformDelta('scale', scale) };
    }
    return null;
  }

  private beginAxisTranslate(axis: Axis, ray: Ray, cameraDir: Cartesian3): AxisDragState {
    const axisDirection = this.getAxisVector(axis);
    const origin = Matrix4.getTranslation(this.frame, new Cartesian3());
    const planeNormal = Cartesian3.normalize(Cartesian3.cross(axisDirection, cameraDir, new Cartesian3()), new Cartesian3());
    if (Cartesian3.magnitude(planeNormal) < 1e-5) {
      Cartesian3.cross(axisDirection, Cartesian3.UNIT_Z, planeNormal);
      if (Cartesian3.magnitude(planeNormal) < 1e-5) {
        Cartesian3.cross(axisDirection, Cartesian3.UNIT_X, planeNormal);
      }
      Cartesian3.normalize(planeNormal, planeNormal);
    }
    const plane = Plane.fromPointNormal(origin, planeNormal, scratchPlane);
    const startPoint = this.rayPlaneIntersection(ray, plane);
    const startParam = startPoint
      ? Cartesian3.dot(Cartesian3.subtract(startPoint, origin, scratchVec), axisDirection)
      : 0;
    return { mode: 'translate', axis, startParam, axisDirection, origin, plane };
  }

  private beginPlaneDrag(axes: [Axis, Axis], ray: Ray, cameraDir: Cartesian3): PlaneDragState {
    const origin = Matrix4.getTranslation(this.frame, new Cartesian3());
    const axisA = this.getAxisVector(axes[0]);
    const axisB = this.getAxisVector(axes[1]);
    const normal = Cartesian3.normalize(Cartesian3.cross(axisA, axisB, new Cartesian3()), new Cartesian3());
    const plane = Plane.fromPointNormal(origin, normal, scratchPlane);
    const startPoint = this.rayPlaneIntersection(ray, plane) ?? Cartesian3.clone(origin, new Cartesian3());
    return { mode: 'translate', planeAxes: axes, origin, plane, startPoint };
  }

  private beginRotate(axis: Axis | null, ray: Ray, cameraDir: Cartesian3): RotateDragState {
    const origin = Matrix4.getTranslation(this.frame, new Cartesian3());
    const axisVec = axis ? this.getAxisVector(axis) : Cartesian3.normalize(cameraDir, new Cartesian3());
    const plane = Plane.fromPointNormal(origin, axisVec, scratchPlane);
    const point = this.rayPlaneIntersection(ray, plane) ?? Cartesian3.clone(origin, new Cartesian3());
    const startVector = Cartesian3.subtract(point, origin, new Cartesian3());
    Cartesian3.normalize(startVector, startVector);
    return { axis, plane, startVector };
  }

  private beginScale(axis: Axis | null, ray: Ray, cameraDir: Cartesian3): ScaleDragState {
    const origin = Matrix4.getTranslation(this.frame, new Cartesian3());
    const axisVec = axis ? this.getAxisVector(axis) : Cartesian3.normalize(cameraDir, new Cartesian3());
    const plane = Plane.fromPointNormal(origin, axisVec, scratchPlane);
    const point = this.rayPlaneIntersection(ray, plane) ?? Cartesian3.clone(origin, new Cartesian3());
    const startDistance = Cartesian3.magnitude(Cartesian3.subtract(point, origin, new Cartesian3()));
    return { axis, origin, plane, startDistance };
  }

  private getAxisVector(axis: Axis): Cartesian3 {
    const columnIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    return Matrix4.getColumn(this.frame, columnIndex, new Cartesian3());
  }

  private toTransformDelta(mode: Mode, value: Cartesian3 | Quaternion): TransformDelta {
    if (mode === 'translate') {
      return {
        translation: value as Cartesian3,
        rotation: Quaternion.IDENTITY,
        scale: new Cartesian3(1, 1, 1),
      };
    }
    if (mode === 'rotate') {
      return {
        translation: Cartesian3.ZERO,
        rotation: value as Quaternion,
        scale: new Cartesian3(1, 1, 1),
      };
    }
    return {
      translation: Cartesian3.ZERO,
      rotation: Quaternion.IDENTITY,
      scale: value as Cartesian3,
    };
  }

  private projectRayToAxis(ray: Ray, axisDirection: Cartesian3, origin: Cartesian3, plane: Plane): number {
    const point = this.rayPlaneIntersection(ray, plane);
    if (!point) {
      return 0;
    }
    const v = Cartesian3.subtract(point, origin, scratchVec);
    return Cartesian3.dot(v, axisDirection);
  }

  private rayPlaneIntersection(ray: Ray, plane: Plane): Cartesian3 | null {
    const result = Plane.getRayPlaneIntersection(ray, plane, new Cartesian3());
    return defined(result) ? result : null;
  }
}
