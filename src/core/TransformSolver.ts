import { FrameState, TransformSession, TransformDelta, Axis } from './types.js';
import { Vector3 } from '../utils/math/Vector3.js';
import { Quaternion } from '../utils/math/Quaternion.js';
import { closestPointsBetweenRays, intersectRayPlane, Ray as MathRay } from '../utils/math/Ray.js';
import { Snapper } from './Snapper.js';

export interface BeginTransformOptions {
  session: TransformSession;
  frame: FrameState;
  startRay: MathRay;
  snapper: Snapper;
}

export interface UpdateTransformOptions {
  currentRay: MathRay;
  useFineSnap?: boolean;
}

interface BaseInternalSession {
  session: TransformSession;
  frame: FrameState;
  snapper: Snapper;
  startDelta: TransformDelta;
}

interface AxisTranslationSession extends BaseInternalSession {
  type: 'axis-translate';
  axis: Axis;
  pivot: Vector3;
  axisVector: Vector3;
  startParameter: number;
}

interface PlaneTranslationSession extends BaseInternalSession {
  type: 'plane-translate';
  axisU: Vector3;
  axisV: Vector3;
  pivot: Vector3;
  startPoint: Vector3;
}

interface RotationSession extends BaseInternalSession {
  type: 'axis-rotate' | 'view-rotate';
  axis: Vector3;
  pivot: Vector3;
  startVector: Vector3;
}

interface ScaleSession extends BaseInternalSession {
  type: 'axis-scale' | 'uniform-scale';
  axis?: Vector3;
  pivot: Vector3;
  startParameter?: number;
  planeNormal?: Vector3;
}

type InternalSession =
  | AxisTranslationSession
  | PlaneTranslationSession
  | RotationSession
  | ScaleSession;

function axisToVector(frame: FrameState, axis: Axis): Vector3 {
  const value = frame.axes[axis];
  return Vector3.fromArray(value).normalize();
}

function zeroDelta(): TransformDelta {
  return {
    translation: [0, 0, 0],
    rotation: [1, 0, 0, 0],
    scale: [1, 1, 1]
  };
}

export class TransformSolver {
  private current?: InternalSession;

  begin(options: BeginTransformOptions): void {
    const { session, frame, startRay, snapper } = options;
    const pivot = Vector3.fromArray(frame.pivot);

    if (session.mode === 'translate' && session.axis) {
      const axisVec = axisToVector(frame, session.axis);
      const axisRay: MathRay = { origin: pivot, direction: axisVec };
      const startInfo = closestPointsBetweenRays(startRay, axisRay);
      this.current = {
        type: 'axis-translate',
        session,
        frame,
        snapper,
        pivot,
        axis: session.axis,
        axisVector: axisVec,
        startParameter: startInfo.parameterB,
        startDelta: zeroDelta()
      };
      return;
    }

    if (session.mode === 'translate' && session.planeAxes) {
      const [axU, axV] = session.planeAxes;
      const axisU = axisToVector(frame, axU);
      const axisV = axisToVector(frame, axV);
      const planeNormal = axisU.cross(axisV).normalize();
      const startPoint = intersectRayPlane(startRay, pivot, planeNormal) ?? pivot;
      this.current = {
        type: 'plane-translate',
        session,
        frame,
        snapper,
        axisU,
        axisV,
        pivot,
        startPoint,
        startDelta: zeroDelta()
      };
      return;
    }

    if (session.mode === 'rotate' && session.axis) {
      const axisVec = axisToVector(frame, session.axis);
      const planeNormal = axisVec;
      const startPoint = intersectRayPlane(startRay, pivot, planeNormal) ?? pivot.add(axisVec);
      const startVector = startPoint.subtract(pivot).normalize();
      this.current = {
        type: 'axis-rotate',
        session,
        frame,
        snapper,
        axis: axisVec,
        pivot,
        startVector,
        startDelta: zeroDelta()
      };
      return;
    }

    if (session.mode === 'rotate' && session.viewNormal) {
      const normal = Vector3.fromArray(session.viewNormal).normalize();
      const startPoint = intersectRayPlane(startRay, pivot, normal) ?? pivot.add(normal);
      const startVector = startPoint.subtract(pivot).normalize();
      this.current = {
        type: 'view-rotate',
        session,
        frame,
        snapper,
        axis: normal,
        pivot,
        startVector,
        startDelta: zeroDelta()
      };
      return;
    }

    if (session.mode === 'scale' && session.axis) {
      const axisVec = axisToVector(frame, session.axis);
      const axisRay: MathRay = { origin: pivot, direction: axisVec };
      const startInfo = closestPointsBetweenRays(startRay, axisRay);
      this.current = {
        type: 'axis-scale',
        session,
        frame,
        snapper,
        axis: axisVec,
        pivot,
        startParameter: startInfo.parameterB,
        startDelta: zeroDelta()
      };
      return;
    }

    if (session.mode === 'scale' && session.uniformScale) {
      const axisX = axisToVector(frame, 'x');
      const axisY = axisToVector(frame, 'y');
      const normal = axisX.cross(axisY).normalize();
      const startPoint = intersectRayPlane(startRay, pivot, normal) ?? pivot.add(axisX);
      const startVector = startPoint.subtract(pivot);
      const startParameter = Math.max(1e-6, startVector.length());
      this.current = {
        type: 'uniform-scale',
        session,
        frame,
        snapper,
        pivot,
        startParameter,
        planeNormal: normal,
        startDelta: zeroDelta()
      };
      return;
    }

    throw new Error('Unsupported transform session');
  }

  update(options: UpdateTransformOptions): TransformDelta {
    if (!this.current) {
      return zeroDelta();
    }
    const { currentRay, useFineSnap } = options;

    switch (this.current.type) {
      case 'axis-translate':
        return this.updateAxisTranslate(this.current, currentRay, !!useFineSnap);
      case 'plane-translate':
        return this.updatePlaneTranslate(this.current, currentRay, !!useFineSnap);
      case 'axis-rotate':
        return this.updateAxisRotate(this.current, currentRay, !!useFineSnap);
      case 'view-rotate':
        return this.updateViewRotate(this.current, currentRay, !!useFineSnap);
      case 'axis-scale':
        return this.updateAxisScale(this.current, currentRay, !!useFineSnap);
      case 'uniform-scale':
        return this.updateUniformScale(this.current, currentRay, !!useFineSnap);
      default:
        return zeroDelta();
    }
  }

  end(): void {
    this.current = undefined;
  }

  private updateAxisTranslate(
    session: AxisTranslationSession,
    currentRay: MathRay,
    useFine: boolean
  ): TransformDelta {
    const axisRay: MathRay = { origin: session.pivot, direction: session.axisVector };
    const info = closestPointsBetweenRays(currentRay, axisRay);
    const deltaParam = info.parameterB - session.startParameter;
    const snapped = session.snapper.snapTranslation(deltaParam, useFine);
    const deltaVec = session.axisVector.multiplyByScalar(snapped);
    return {
      translation: deltaVec.toArray(),
      rotation: [1, 0, 0, 0],
      scale: [1, 1, 1]
    };
  }

  private updatePlaneTranslate(
    session: PlaneTranslationSession,
    currentRay: MathRay,
    useFine: boolean
  ): TransformDelta {
    const planeNormal = session.axisU.cross(session.axisV).normalize();
    const hit = intersectRayPlane(currentRay, session.pivot, planeNormal) ?? session.startPoint;
    const delta = hit.subtract(session.startPoint);
    const uScalar = delta.dot(session.axisU);
    const vScalar = delta.dot(session.axisV);
    const snappedU = session.snapper.snapTranslation(uScalar, useFine);
    const snappedV = session.snapper.snapTranslation(vScalar, useFine);
    const deltaVec = session.axisU.multiplyByScalar(snappedU).add(session.axisV.multiplyByScalar(snappedV));
    return {
      translation: deltaVec.toArray(),
      rotation: [1, 0, 0, 0],
      scale: [1, 1, 1]
    };
  }

  private updateAxisRotate(
    session: RotationSession,
    currentRay: MathRay,
    useFine: boolean
  ): TransformDelta {
    const planeNormal = session.axis;
    const hit = intersectRayPlane(currentRay, session.pivot, planeNormal) ?? session.pivot.add(session.startVector);
    const currentVector = hit.subtract(session.pivot).normalize();
    const angle = this.computeSignedAngle(session.startVector, currentVector, session.axis);
    const snapped = session.snapper.snapRotation(angle, useFine);
    const quaternion = Quaternion.fromAxisAngle(session.axis, snapped).normalize();
    return {
      translation: [0, 0, 0],
      rotation: [quaternion.w, quaternion.x, quaternion.y, quaternion.z],
      scale: [1, 1, 1]
    };
  }

  private updateViewRotate(
    session: RotationSession,
    currentRay: MathRay,
    useFine: boolean
  ): TransformDelta {
    const hit = intersectRayPlane(currentRay, session.pivot, session.axis) ?? session.pivot.add(session.startVector);
    const currentVector = hit.subtract(session.pivot).normalize();
    const angle = this.computeSignedAngle(session.startVector, currentVector, session.axis);
    const snapped = session.snapper.snapRotation(angle, useFine);
    const quaternion = Quaternion.fromAxisAngle(session.axis, snapped).normalize();
    return {
      translation: [0, 0, 0],
      rotation: [quaternion.w, quaternion.x, quaternion.y, quaternion.z],
      scale: [1, 1, 1]
    };
  }

  private updateAxisScale(
    session: ScaleSession,
    currentRay: MathRay,
    useFine: boolean
  ): TransformDelta {
    if (!session.axis || session.startParameter === undefined) {
      return zeroDelta();
    }
    const axisRay: MathRay = { origin: session.pivot, direction: session.axis };
    const info = closestPointsBetweenRays(currentRay, axisRay);
    const deltaParam = info.parameterB - session.startParameter;
    const snapped = session.snapper.snapScale(deltaParam, useFine);
    const factor = Math.max(1e-4, 1 + snapped);
    const scale: [number, number, number] = [1, 1, 1];
    const axisIndex = this.axisIndexFromVector(session.axis, session.frame);
    scale[axisIndex] = factor;
    return {
      translation: [0, 0, 0],
      rotation: [1, 0, 0, 0],
      scale
    };
  }

  private updateUniformScale(
    session: ScaleSession,
    currentRay: MathRay,
    useFine: boolean
  ): TransformDelta {
    if (session.startParameter === undefined || !session.planeNormal) {
      return zeroDelta();
    }
    const planeNormal = session.planeNormal;
    const hit = intersectRayPlane(currentRay, session.pivot, planeNormal) ?? session.pivot;
    const distance = hit.subtract(session.pivot).length();
    const delta = distance - session.startParameter;
    const snapped = session.snapper.snapScale(delta, useFine);
    const factor = Math.max(1e-4, 1 + snapped);
    return {
      translation: [0, 0, 0],
      rotation: [1, 0, 0, 0],
      scale: [factor, factor, factor]
    };
  }

  private computeSignedAngle(a: Vector3, b: Vector3, axis: Vector3): number {
    const cross = a.cross(b);
    const dot = a.dot(b);
    const angle = Math.atan2(cross.length(), dot);
    const sign = Math.sign(cross.dot(axis));
    return angle * (sign === 0 ? 1 : sign);
  }

  private axisIndexFromVector(axis: Vector3, frame: FrameState): 0 | 1 | 2 {
    const axes: [Vector3, Vector3, Vector3] = [
      Vector3.fromArray(frame.axes.x),
      Vector3.fromArray(frame.axes.y),
      Vector3.fromArray(frame.axes.z)
    ];
    let bestIndex: 0 | 1 | 2 = 0;
    let bestDot = -Infinity;
    axes.forEach((candidate, index) => {
      const dot = Math.abs(candidate.normalize().dot(axis.normalize()));
      if (dot > bestDot) {
        bestDot = dot;
        bestIndex = index as 0 | 1 | 2;
      }
    });
    return bestIndex;
  }
}
