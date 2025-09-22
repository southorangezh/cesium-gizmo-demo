import { Orientation, TargetLike, FrameState, CameraInfo } from './types.js';
import { Matrix4 } from '../utils/math/Matrix4.js';
import { Quaternion } from '../utils/math/Quaternion.js';
import { Vector3 } from '../utils/math/Vector3.js';
import { eastNorthUp } from '../utils/geodesy.js';

export interface FrameBuilderOptions {
  orientation: Orientation;
  targets: TargetLike[];
  pivot: [number, number, number];
  camera?: CameraInfo;
  surfaceNormal?: [number, number, number];
}

function basisFromQuaternion(q: Quaternion): { x: Vector3; y: Vector3; z: Vector3 } {
  const matrix = q.toMatrix3();
  const x = new Vector3(matrix[0], matrix[3], matrix[6]).normalize();
  const y = new Vector3(matrix[1], matrix[4], matrix[7]).normalize();
  const z = new Vector3(matrix[2], matrix[5], matrix[8]).normalize();
  return { x, y, z };
}

function defaultTargetMatrix(target: TargetLike): Matrix4 {
  if (target.matrix) {
    return Matrix4.fromArray(target.matrix);
  }
  const position = target.position ? Vector3.fromArray(target.position) : Vector3.zero();
  const rotation = target.rotation
    ? new Quaternion(target.rotation[0], target.rotation[1], target.rotation[2], target.rotation[3])
    : Quaternion.identity();
  const scale = target.scale ? Vector3.fromArray(target.scale) : new Vector3(1, 1, 1);
  return Matrix4.fromTranslationRotationScale(position, rotation, scale);
}

function ensureOrthonormal(x: Vector3, y: Vector3, z: Vector3): { x: Vector3; y: Vector3; z: Vector3 } {
  const zNorm = z.normalize();
  const xOrtho = Vector3.rejectFromVector(x, zNorm).normalize();
  const yOrtho = zNorm.cross(xOrtho).normalize();
  return { x: xOrtho, y: yOrtho, z: zNorm };
}

export class FrameBuilder {
  constructor(private options: FrameBuilderOptions) {}

  build(): FrameState {
    const pivot = Vector3.fromArray(this.options.pivot);
    const orientation = this.options.orientation;
    const targets = this.options.targets;
    const camera = this.options.camera;
    const normal = this.options.surfaceNormal
      ? Vector3.fromArray(this.options.surfaceNormal).normalize()
      : undefined;

    let axes: { x: Vector3; y: Vector3; z: Vector3 };

    switch (orientation) {
      case 'global':
        axes = {
          x: new Vector3(1, 0, 0),
          y: new Vector3(0, 1, 0),
          z: new Vector3(0, 0, 1)
        };
        break;
      case 'local': {
        const primary = targets[0];
        const matrix = defaultTargetMatrix(primary);
        const rotation = matrix.getRotation();
        axes = basisFromQuaternion(rotation);
        break;
      }
      case 'view': {
        if (!camera) {
          throw new Error('View orientation requires camera info');
        }
        axes = {
          x: Vector3.fromArray(camera.right).normalize(),
          y: Vector3.fromArray(camera.up).normalize(),
          z: Vector3.fromArray(camera.direction).multiplyByScalar(-1).normalize()
        };
        break;
      }
      case 'enu': {
        const basis = eastNorthUp(pivot);
        axes = {
          x: basis.east,
          y: basis.north,
          z: basis.up
        };
        break;
      }
      case 'normal': {
        if (!normal) {
          throw new Error('Normal orientation requires surface normal');
        }
        const upReference = camera
          ? Vector3.fromArray(camera.up).normalize()
          : new Vector3(0, 0, 1);
        let xAxis = upReference.cross(normal);
        if (xAxis.length() < 1e-6) {
          xAxis = new Vector3(1, 0, 0).cross(normal);
        }
        const zAxis = normal.normalize();
        const yAxis = zAxis.cross(xAxis).normalize();
        axes = ensureOrthonormal(xAxis, yAxis, zAxis);
        break;
      }
      case 'gimbal': {
        const primary = targets[0];
        const matrix = defaultTargetMatrix(primary);
        const rotation = matrix.getRotation();
        const localBasis = basisFromQuaternion(rotation);
        const up = camera
          ? Vector3.fromArray(camera.up).normalize()
          : eastNorthUp(pivot).up;
        let xAxis = Vector3.rejectFromVector(localBasis.x, up);
        if (xAxis.length() < 1e-6) {
          xAxis = Vector3.rejectFromVector(localBasis.y, up);
        }
        if (xAxis.length() < 1e-6) {
          xAxis = new Vector3(1, 0, 0);
        }
        const zAxis = localBasis.z;
        const yAxis = zAxis.cross(xAxis).normalize();
        axes = ensureOrthonormal(xAxis, yAxis, zAxis);
        break;
      }
      default:
        axes = {
          x: new Vector3(1, 0, 0),
          y: new Vector3(0, 1, 0),
          z: new Vector3(0, 0, 1)
        };
        break;
    }

    const matrix = new Matrix4([
      axes.x.x, axes.y.x, axes.z.x, 0,
      axes.x.y, axes.y.y, axes.z.y, 0,
      axes.x.z, axes.y.z, axes.z.z, 0,
      pivot.x, pivot.y, pivot.z, 1
    ]);

    return {
      pivot: pivot.toArray(),
      axes: {
        x: axes.x.toArray(),
        y: axes.y.toArray(),
        z: axes.z.toArray()
      },
      matrix: matrix.elements
    };
  }
}
