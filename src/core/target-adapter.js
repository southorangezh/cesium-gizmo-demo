import { composeMatrix, decompose } from '../math/matrix4.js';
import { toCesium as toCartesian } from '../math/vec3.js';
import { toCesium as toQuaternion } from '../math/quaternion.js';

export function readMatrix(target, scene) {
  const Cesium = globalThis.Cesium;
  if (!target) {
    return null;
  }
  if (Array.isArray(target.matrix)) {
    return target.matrix;
  }
  if (typeof target.getMatrix === 'function') {
    return target.getMatrix();
  }
  if (target.modelMatrix) {
    return [...target.modelMatrix];
  }
  if (target.position && target.orientation && Cesium) {
    const translation = { x: target.position.x, y: target.position.y, z: target.position.z };
    const rotation = { x: target.orientation.x, y: target.orientation.y, z: target.orientation.z, w: target.orientation.w };
    const scale = { x: 1, y: 1, z: 1 };
    return composeMatrix(translation, rotation, scale);
  }
  if (Cesium && Cesium.Entity && target instanceof Cesium.Entity) {
    const time = scene ? scene.clock.currentTime : Cesium.JulianDate.now();
    const matrix = target.computeModelMatrix(time, new Cesium.Matrix4());
    return Array.from(matrix);
  }
  return null;
}

export function writeMatrix(target, matrix) {
  const Cesium = globalThis.Cesium;
  if (!target) {
    return;
  }
  if (typeof target.setMatrix === 'function') {
    target.setMatrix(matrix);
    return;
  }
  if (Array.isArray(target.matrix)) {
    target.matrix = matrix;
    return;
  }
  if (target.modelMatrix) {
    if (Cesium && Cesium.Matrix4) {
      target.modelMatrix = Cesium.Matrix4.fromArray(matrix);
    } else {
      target.modelMatrix = matrix;
    }
    return;
  }
  if (target.position && target.orientation && Cesium) {
    const { translation, rotation } = decompose(matrix);
    target.position = toCartesian(translation);
    target.orientation = toQuaternion(rotation);
  }
}
