import { Mode, Axis, HandleType } from './constants.js';
import { Vector3 } from '../math/Vector3.js';
import { Plane } from '../math/Plane.js';
import { Quaternion } from '../math/Quaternion.js';
import { Matrix4 } from '../math/Matrix4.js';

function safePlaneNormal(preferred, fallback) {
  const normal = preferred.clone();
  if (normal.length() < 1e-5) {
    return fallback.clone().normalize();
  }
  return normal.normalize();
}

function rayPlaneIntersection(ray, plane) {
  const point = plane.intersectLine(ray);
  if (!point) {
    // fallback: use closest point
    const projection = plane.projectPoint(ray.origin.clone());
    return projection;
  }
  return point;
}

export class TransformSolver {
  constructor(frameBuilder, snapper) {
    this.frameBuilder = frameBuilder;
    this.snapper = snapper;
  }

  beginSession({ mode, axis, handleType, startRay, pivot, camera }) {
    const frame = this.frameBuilder.getCurrentFrame();
    if (!frame) throw new Error('Frame must be built before starting a session');
    const state = {
      mode,
      axis,
      handleType,
      frame,
      pivot: pivot.clone(),
      camera,
      startRay,
      startPoint: null,
      reference: null,
      accumulatedAngle: 0,
      lastAngle: 0
    };

    switch (mode) {
      case Mode.TRANSLATE:
        this._prepareTranslateSession(state);
        break;
      case Mode.ROTATE:
        this._prepareRotateSession(state);
        break;
      case Mode.SCALE:
        this._prepareScaleSession(state);
        break;
      default:
        throw new Error(`Unsupported mode ${mode}`);
    }
    return state;
  }

  updateSession(state, { currentRay, modifiers = new Set() }) {
    switch (state.mode) {
      case Mode.TRANSLATE:
        return this._solveTranslate(state, currentRay, modifiers);
      case Mode.ROTATE:
        return this._solveRotate(state, currentRay, modifiers);
      case Mode.SCALE:
        return this._solveScale(state, currentRay, modifiers);
      default:
        throw new Error(`Unsupported mode ${state.mode}`);
    }
  }

  _prepareTranslateSession(state) {
    const { axis, handleType, frame, startRay, pivot, camera } = state;
    const axisVector = axis ? frame.axes[axis] || frame.axes[axis.toLowerCase?.()] : null;
    const cameraDir = camera?.direction?.clone()?.normalize() || new Vector3(0, 0, -1);

    if (handleType === HandleType.AXIS) {
      const worldAxis = frame.axes[axis];
      const candidates = [
        worldAxis.clone().cross(cameraDir),
        worldAxis.clone().cross(camera.up || frame.axes[Axis.Y]),
        worldAxis.clone().cross(camera.right || frame.axes[Axis.Z])
      ];
      let planeNormal = candidates.find((candidate) => candidate.length() > 1e-4 && Math.abs(candidate.dot(cameraDir)) > 1e-4);
      if (!planeNormal) {
        planeNormal = candidates.find((candidate) => candidate.length() > 1e-4) || frame.axes[Axis.Z].clone();
      }
      planeNormal = safePlaneNormal(planeNormal, frame.axes[Axis.Z]);
      const plane = Plane.fromPointNormal(pivot, planeNormal);
      state.reference = { plane, worldAxis };
      state.startPoint = rayPlaneIntersection(startRay, plane);
    } else if (handleType === HandleType.PLANE) {
      const axes = state.handleAxes || this._axesForPlane(axis, frame);
      const planeNormal = axes.u.clone().cross(axes.v).normalize();
      const plane = Plane.fromPointNormal(pivot, planeNormal);
      state.reference = { plane, axes };
      state.startPoint = rayPlaneIntersection(startRay, plane);
    } else if (handleType === HandleType.SCREEN || !handleType) {
      const planeNormal = cameraDir.clone().negate();
      const plane = Plane.fromPointNormal(pivot, planeNormal);
      state.reference = { plane };
      state.startPoint = rayPlaneIntersection(startRay, plane);
    }
  }

  _prepareRotateSession(state) {
    const { axis, handleType, frame, startRay, pivot, camera } = state;
    let rotationAxis;
    if (handleType === HandleType.RING) {
      rotationAxis = frame.axes[axis];
    } else {
      rotationAxis = camera?.direction?.clone()?.normalize() || frame.axes[Axis.Z];
    }
    const plane = Plane.fromPointNormal(pivot, rotationAxis.clone());
    const startPoint = rayPlaneIntersection(startRay, plane);
    const startVector = startPoint.clone().subtract(pivot).normalize();
    state.reference = { rotationAxis, plane, startVector };
    state.startPoint = startPoint;
    state.lastAngle = 0;
    state.accumulatedAngle = 0;
  }

  _prepareScaleSession(state) {
    const { axis, handleType, frame, startRay, pivot, camera } = state;
    const cameraDir = camera?.direction?.clone()?.normalize() || new Vector3(0, 0, -1);
    if (handleType === HandleType.AXIS) {
      const worldAxis = frame.axes[axis];
      const planeNormal = safePlaneNormal(worldAxis.clone().cross(cameraDir), frame.axes[Axis.Z]);
      const plane = Plane.fromPointNormal(pivot, planeNormal);
      state.reference = { plane, worldAxis };
      state.startPoint = rayPlaneIntersection(startRay, plane);
    } else if (handleType === HandleType.CENTER) {
      const planeNormal = cameraDir.clone().negate();
      const plane = Plane.fromPointNormal(pivot, planeNormal);
      state.reference = { plane };
      state.startPoint = rayPlaneIntersection(startRay, plane);
    }
  }

  _solveTranslate(state, currentRay, modifiers) {
    const { startPoint, reference, pivot } = state;
    const currentPoint = rayPlaneIntersection(currentRay, reference.plane);
    const delta = currentPoint.clone().subtract(startPoint);
    if (reference.worldAxis) {
      const axis = reference.worldAxis.clone().normalize();
      const magnitude = delta.dot(axis);
      const snapped = this.snapper.snapTranslate(magnitude, modifiers);
      return {
        deltaPosition: axis.multiplyScalar(snapped),
        deltaRotation: Quaternion.identity(),
        deltaScale: new Vector3(1, 1, 1)
      };
    }
    const snappedDelta = new Vector3(
      this.snapper.snapTranslate(delta.x, modifiers),
      this.snapper.snapTranslate(delta.y, modifiers),
      this.snapper.snapTranslate(delta.z, modifiers)
    );
    return {
      deltaPosition: snappedDelta,
      deltaRotation: Quaternion.identity(),
      deltaScale: new Vector3(1, 1, 1)
    };
  }

  _solveRotate(state, currentRay, modifiers) {
    const { pivot, reference } = state;
    const currentPoint = rayPlaneIntersection(currentRay, reference.plane);
    const currentVector = currentPoint.clone().subtract(pivot).normalize();
    const rotationAxis = reference.rotationAxis.clone().normalize();

    const cross = reference.startVector.clone().cross(currentVector);
    const dot = reference.startVector.dot(currentVector);
    let angle = Math.atan2(cross.dot(rotationAxis), dot);
    if (Number.isNaN(angle)) angle = 0;

    const snappedAngle = this.snapper.snapRotate(angle, modifiers);
    state.lastAngle = snappedAngle;
    state.accumulatedAngle = snappedAngle;

    const quat = new Quaternion().setFromAxisAngle(rotationAxis, snappedAngle).normalize();
    return {
      deltaPosition: new Vector3(0, 0, 0),
      deltaRotation: quat,
      deltaScale: new Vector3(1, 1, 1)
    };
  }

  _solveScale(state, currentRay, modifiers) {
    const { startPoint, reference, pivot } = state;
    const currentPoint = rayPlaneIntersection(currentRay, reference.plane);
    const delta = currentPoint.clone().subtract(startPoint);

    if (reference.worldAxis) {
      const axis = reference.worldAxis.clone().normalize();
      const initial = startPoint.clone().subtract(pivot);
      const projectedStart = initial.dot(axis);
      const projectedCurrent = currentPoint.clone().subtract(pivot).dot(axis);
      const deltaScalar = projectedCurrent - projectedStart;
      const snapped = this.snapper.snapScale(deltaScalar, modifiers);
      const scaleFactor = 1 + snapped / Math.max(Math.abs(projectedStart), 1e-6);
      const result = new Vector3(1, 1, 1);
      if (state.axis === Axis.X) result.x = scaleFactor;
      if (state.axis === Axis.Y) result.y = scaleFactor;
      if (state.axis === Axis.Z) result.z = scaleFactor;
      return {
        deltaPosition: new Vector3(0, 0, 0),
        deltaRotation: Quaternion.identity(),
        deltaScale: result
      };
    }

    const initialRadius = startPoint.clone().subtract(pivot).length();
    const currentRadius = currentPoint.clone().subtract(pivot).length();
    let factor = 1;
    if (initialRadius > 1e-6) {
      factor = currentRadius / initialRadius;
    }
    const snappedFactor = this.snapper.snapScale(factor, modifiers);
    return {
      deltaPosition: new Vector3(0, 0, 0),
      deltaRotation: Quaternion.identity(),
      deltaScale: new Vector3(snappedFactor, snappedFactor, snappedFactor)
    };
  }

  _axesForPlane(axis, frame) {
    switch (axis) {
      case 'xy':
        return { u: frame.axes.x.clone(), v: frame.axes.y.clone() };
      case 'yz':
        return { u: frame.axes.y.clone(), v: frame.axes.z.clone() };
      case 'xz':
        return { u: frame.axes.x.clone(), v: frame.axes.z.clone() };
      default:
        return { u: frame.axes.x.clone(), v: frame.axes.y.clone() };
    }
  }
}
