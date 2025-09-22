import { vec3, normalize, cross, dot, subtract, add, scale as scaleVec } from '../math/vec3.js';
import { basisFromMatrix, invert, rotationMatrixFromQuaternion, composeMatrix } from '../math/matrix4.js';
import { fromCesium as quatFromCesium } from '../math/quaternion.js';

const WORLD_X = vec3(1, 0, 0);
const WORLD_Y = vec3(0, 1, 0);
const WORLD_Z = vec3(0, 0, 1);

function ensureTargetMatrix(target) {
  if (!target) {
    return null;
  }
  if (Array.isArray(target.matrix)) {
    return target.matrix;
  }
  if (typeof target.getMatrix === 'function') {
    return target.getMatrix();
  }
  if (Array.isArray(target)) {
    return target;
  }
  return target;
}

function getCameraVectors(camera) {
  if (!camera) {
    return { right: WORLD_X, up: WORLD_Y, direction: WORLD_Z };
  }
  const right = camera.right ? normalize(camera.right) : WORLD_X;
  const up = camera.up ? normalize(camera.up) : WORLD_Y;
  const direction = camera.direction ? normalize(camera.direction) : WORLD_Z;
  return { right, up, direction };
}

function buildNormalBasis(normal, referenceUp = WORLD_Y) {
  const n = normalize(normal);
  let tangent = cross(referenceUp, n);
  if (dot(tangent, tangent) < 1e-6) {
    tangent = cross(WORLD_X, n);
    if (dot(tangent, tangent) < 1e-6) {
      tangent = cross(WORLD_Z, n);
    }
  }
  tangent = normalize(tangent);
  const bitangent = normalize(cross(n, tangent));
  return { x: tangent, y: bitangent, z: n };
}

function eastNorthUpBasis(origin) {
  const Cesium = globalThis.Cesium;
  if (Cesium && Cesium.Transforms && Cesium.Matrix4) {
    const matrix = Cesium.Transforms.eastNorthUpToFixedFrame(
      new Cesium.Cartesian3(origin.x, origin.y, origin.z)
    );
    const basis = {
      x: vec3(matrix[0], matrix[1], matrix[2]),
      y: vec3(matrix[4], matrix[5], matrix[6]),
      z: vec3(matrix[8], matrix[9], matrix[10]),
    };
    return {
      basis,
      matrix,
      inverse: invert(matrix),
    };
  }
  // fallback using cross products relative to world up
  const up = normalize(origin);
  const tangent = normalize(cross(WORLD_Z, up));
  const bitangent = normalize(cross(up, tangent));
  const matrix = composeMatrix(origin, { x: 0, y: 0, z: 0, w: 1 }, vec3(1, 1, 1));
  return { basis: { x: tangent, y: bitangent, z: up }, matrix, inverse: invert(matrix) };
}

export class FrameBuilder {
  constructor(scene) {
    this.scene = scene;
  }

  build(options) {
    const {
      orientation = 'global',
      pivot = vec3(0, 0, 0),
      target,
      camera,
      normal,
    } = options;

    const targetMatrix = ensureTargetMatrix(target);
    let basis;
    let matrix;

    if (orientation === 'global') {
      basis = { x: WORLD_X, y: WORLD_Y, z: WORLD_Z };
      matrix = composeMatrix(pivot, { x: 0, y: 0, z: 0, w: 1 }, vec3(1, 1, 1));
    } else if (orientation === 'local' && targetMatrix) {
      basis = basisFromMatrix(targetMatrix);
      matrix = composeMatrix(pivot, quatFromCesium({ x: 0, y: 0, z: 0, w: 1 }), vec3(1, 1, 1));
    } else if (orientation === 'view') {
      const cameraVectors = getCameraVectors(camera || (this.scene ? this.scene.camera : null));
      basis = {
        x: cameraVectors.right,
        y: cameraVectors.up,
        z: cameraVectors.direction,
      };
      matrix = composeMatrix(pivot, { x: 0, y: 0, z: 0, w: 1 }, vec3(1, 1, 1));
    } else if (orientation === 'enu') {
      const enu = eastNorthUpBasis(pivot);
      basis = enu.basis;
      matrix = enu.matrix;
    } else if (orientation === 'normal' && normal) {
      basis = buildNormalBasis(normal);
      matrix = composeMatrix(pivot, { x: 0, y: 0, z: 0, w: 1 }, vec3(1, 1, 1));
    } else if (orientation === 'gimbal' && targetMatrix) {
      basis = basisFromMatrix(targetMatrix);
      matrix = composeMatrix(pivot, { x: 0, y: 0, z: 0, w: 1 }, vec3(1, 1, 1));
    } else if (targetMatrix) {
      basis = basisFromMatrix(targetMatrix);
      matrix = composeMatrix(pivot, { x: 0, y: 0, z: 0, w: 1 }, vec3(1, 1, 1));
    } else {
      basis = { x: WORLD_X, y: WORLD_Y, z: WORLD_Z };
      matrix = composeMatrix(pivot, { x: 0, y: 0, z: 0, w: 1 }, vec3(1, 1, 1));
    }

    const inverse = invert(matrix);

    return {
      orientation,
      origin: pivot,
      basis,
      matrix,
      inverse,
    };
  }
}
