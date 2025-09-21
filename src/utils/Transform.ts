import { Matrix3 } from '../math/Matrix3.js';
import { Matrix4 } from '../math/Matrix4.js';
import { Quaternion } from '../math/Quaternion.js';
import { Vector3 } from '../math/Vector3.js';
import { TransformDelta } from '../types.js';

export function createIdentityDelta(): TransformDelta {
  return {
    translation: new Vector3(0, 0, 0),
    rotation: Quaternion.identity(),
    scale: new Vector3(1, 1, 1)
  };
}

export function composeTransform(delta: TransformDelta, base: Matrix4, result = new Matrix4()): Matrix4 {
  const translation = base.getTranslation(new Vector3());
  const scale = base.getScale(new Vector3());
  const rotationMatrix = base.getRotation(new Matrix3());
  const baseRotation = Quaternion.fromRotationMatrix(rotationMatrix);

  const combinedTranslation = Vector3.add(translation, delta.translation, new Vector3());
  const combinedRotation = Quaternion.multiply(delta.rotation, baseRotation, new Quaternion());
  const combinedScale = new Vector3(scale.x * delta.scale.x, scale.y * delta.scale.y, scale.z * delta.scale.z);

  return Matrix4.fromTranslationRotationScale(combinedTranslation, combinedRotation, combinedScale, result);
}

export function decomposeMatrix(matrix: Matrix4): { translation: Vector3; rotation: Quaternion; scale: Vector3 } {
  const translation = matrix.getTranslation(new Vector3());
  const scale = matrix.getScale(new Vector3());
  const rotationMatrix = matrix.getRotation(new Matrix3());
  // Remove scaling from rotation matrix
  rotationMatrix.elements[0] /= scale.x;
  rotationMatrix.elements[1] /= scale.x;
  rotationMatrix.elements[2] /= scale.x;
  rotationMatrix.elements[3] /= scale.y;
  rotationMatrix.elements[4] /= scale.y;
  rotationMatrix.elements[5] /= scale.y;
  rotationMatrix.elements[6] /= scale.z;
  rotationMatrix.elements[7] /= scale.z;
  rotationMatrix.elements[8] /= scale.z;
  const rotation = Quaternion.fromRotationMatrix(rotationMatrix);
  return { translation, rotation, scale };
}
