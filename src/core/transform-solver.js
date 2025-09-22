import { vec3, add, subtract, scale, dot, cross, normalize, projectScalarOnVector, almostZero } from '../math/vec3.js';
import { fromAxisAngle } from '../math/quaternion.js';

function normalizeAxis(axis, frame) {
  if (!axis) {
    return null;
  }
  const dir = frame && frame.basis ? frame.basis[axis] : null;
  return dir ? normalize(dir) : null;
}

function planeNormalForAxes(axisA, axisB, frame) {
  if (!frame || !frame.basis) {
    return null;
  }
  const a = frame.basis[axisA];
  const b = frame.basis[axisB];
  return normalize(cross(a, b));
}

function intersectRayPlane(ray, planePoint, planeNormal) {
  const denom = dot(ray.direction, planeNormal);
  if (Math.abs(denom) < 1e-6) {
    return null;
  }
  const t = dot(subtract(planePoint, ray.origin), planeNormal) / denom;
  if (!isFinite(t)) {
    return null;
  }
  return add(ray.origin, scale(ray.direction, t));
}

function closestPointParameterOnAxis(ray, axisPoint, axisDir) {
  const r = ray.direction;
  const p0 = ray.origin;
  const u = axisDir;
  const w0 = subtract(p0, axisPoint);
  const a = dot(r, r);
  const b = dot(r, u);
  const c = dot(u, u);
  const d = dot(r, w0);
  const e = dot(u, w0);
  const denom = a * c - b * b;
  if (Math.abs(denom) < 1e-6) {
    return 0;
  }
  const sc = (b * e - c * d) / denom;
  const tc = (a * e - b * d) / denom;
  return tc;
}

function signedAngleBetween(a, b, normal) {
  const crossVec = cross(a, b);
  const sin = dot(normalize(crossVec), normalize(normal));
  const cos = dot(normalize(a), normalize(b));
  return Math.atan2(sin, cos);
}

export class TransformSolver {
  constructor({ snapper } = {}) {
    this.snapper = snapper;
    this.mouseDeadZone = 1; // pixels
  }

  beginSession(options) {
    const {
      mode,
      axis,
      axisPair,
      frame,
      pivot,
      initialRay,
      camera,
      modifiers = {},
    } = options;

    const axisDir = axis ? normalizeAxis(axis, frame) : null;
    const planeNormal = axisPair ? planeNormalForAxes(axisPair[0], axisPair[1], frame) : null;

    let initialScalar = 0;
    let initialPoint = null;

    if (mode === 'translate') {
      if (axisDir) {
        initialScalar = closestPointParameterOnAxis(initialRay, pivot, axisDir);
      } else if (planeNormal) {
        initialPoint = intersectRayPlane(initialRay, pivot, planeNormal);
      } else {
        const viewNormal = camera && camera.direction ? normalize(camera.direction) : frame.basis.z;
        initialPoint = intersectRayPlane(initialRay, pivot, viewNormal);
      }
    } else if (mode === 'rotate') {
      const normal = axisDir || (camera && camera.direction ? normalize(camera.direction) : frame.basis.z);
      initialPoint = intersectRayPlane(initialRay, pivot, normal);
      if (!initialPoint) {
        // fallback: offset pivot slightly along normal
        initialPoint = add(pivot, normal);
      }
    } else if (mode === 'scale') {
      if (axisDir) {
        initialScalar = closestPointParameterOnAxis(initialRay, pivot, axisDir);
      } else {
        const viewNormal = camera && camera.direction ? normalize(camera.direction) : frame.basis.z;
        initialPoint = intersectRayPlane(initialRay, pivot, viewNormal);
      }
    }

    return {
      mode,
      axis,
      axisDir,
      axisPair,
      planeNormal,
      frame,
      pivot,
      initialScalar,
      initialPoint,
      camera,
      modifiers,
      lastAngle: 0,
      accumulatedAngle: 0,
    };
  }

  update(session, ray, modifiers = {}) {
    if (!session) {
      return null;
    }
    const { mode } = session;
    if (mode === 'translate') {
      return this.updateTranslate(session, ray, modifiers);
    }
    if (mode === 'rotate') {
      return this.updateRotate(session, ray, modifiers);
    }
    if (mode === 'scale') {
      return this.updateScale(session, ray, modifiers);
    }
    return null;
  }

  updateTranslate(session, ray, modifiers) {
    const { axisDir, planeNormal, pivot } = session;
    if (axisDir) {
      const scalar = closestPointParameterOnAxis(ray, pivot, axisDir);
      let delta = scalar - session.initialScalar;
      if (this.snapper) {
        delta = this.snapper.applyTranslation(delta, modifiers);
      }
      const deltaVec = scale(axisDir, delta);
      return { translation: deltaVec, rotation: null, scale: null, deltaScalar: delta };
    }
    const normal = planeNormal || (session.camera && session.camera.direction ? normalize(session.camera.direction) : session.frame.basis.z);
    const point = intersectRayPlane(ray, pivot, normal);
    if (!point || !session.initialPoint) {
      return { translation: vec3(0, 0, 0), rotation: null, scale: null, deltaScalar: 0 };
    }
    let deltaVec = subtract(point, session.initialPoint);
    if (this.snapper) {
      const scalar = this.snapper.applyTranslation(dot(deltaVec, normal), modifiers);
      deltaVec = add(deltaVec, scale(normal, scalar - dot(deltaVec, normal)));
    }
    return { translation: deltaVec, rotation: null, scale: null, deltaScalar: dot(deltaVec, normal) };
  }

  updateRotate(session, ray, modifiers) {
    const normal = session.axisDir || (session.camera && session.camera.direction ? normalize(session.camera.direction) : session.frame.basis.z);
    const point = intersectRayPlane(ray, session.pivot, normal);
    if (!point) {
      return { translation: null, rotation: null, scale: null, deltaScalar: 0 };
    }
    const initialVector = subtract(session.initialPoint, session.pivot);
    const currentVector = subtract(point, session.pivot);
    if (almostZero(initialVector) || almostZero(currentVector)) {
      return { translation: null, rotation: null, scale: null, deltaScalar: 0 };
    }
    let angle = signedAngleBetween(initialVector, currentVector, normal);
    const total = session.accumulatedAngle + angle - session.lastAngle;
    session.lastAngle = angle;
    session.accumulatedAngle = total;
    let snapped = total;
    if (this.snapper) {
      snapped = this.snapper.applyRotation(total, modifiers);
    }
    const delta = snapped - session.accumulatedAngle;
    session.accumulatedAngle = snapped;
    const quaternion = fromAxisAngle(normalize(normal), snapped);
    return { translation: null, rotation: quaternion, scale: null, deltaScalar: snapped };
  }

  updateScale(session, ray, modifiers) {
    const { axisDir, pivot } = session;
    if (axisDir) {
      const scalar = closestPointParameterOnAxis(ray, pivot, axisDir);
      let delta = scalar - session.initialScalar;
      let factor = 1 + delta;
      if (this.snapper) {
        const snapped = this.snapper.applyScale(delta, modifiers);
        factor = 1 + snapped;
        delta = snapped;
      }
      const scaleVec3 = vec3(1, 1, 1);
      scaleVec3.x += axisDir.x !== 0 ? delta : 0;
      scaleVec3.y += axisDir.y !== 0 ? delta : 0;
      scaleVec3.z += axisDir.z !== 0 ? delta : 0;
      return { translation: null, rotation: null, scale: scaleVec3, deltaScalar: factor };
    }
    const normal = session.camera && session.camera.direction ? normalize(session.camera.direction) : session.frame.basis.z;
    const point = intersectRayPlane(ray, pivot, normal);
    if (!point || !session.initialPoint) {
      return { translation: null, rotation: null, scale: vec3(1, 1, 1), deltaScalar: 1 };
    }
    const initialVec = subtract(session.initialPoint, pivot);
    const currentVec = subtract(point, pivot);
    const initialDist = Math.hypot(initialVec.x, initialVec.y, initialVec.z);
    const currentDist = Math.hypot(currentVec.x, currentVec.y, currentVec.z);
    let factor = initialDist !== 0 ? currentDist / initialDist : 1;
    if (!isFinite(factor) || factor === 0) {
      factor = 1;
    }
    if (this.snapper) {
      const snapped = this.snapper.applyScale(factor - 1, modifiers);
      factor = 1 + snapped;
    }
    return { translation: null, rotation: null, scale: vec3(factor, factor, factor), deltaScalar: factor };
  }
}
