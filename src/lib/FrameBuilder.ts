import {
  Cartesian3,
  Matrix3,
  Matrix4,
  Quaternion,
  Transforms,
  defined,
  type Camera
} from 'cesium';
import type { Frame, Orientation, TransformTarget } from './types';

const scratchMatrix3 = new Matrix3();
const scratchMatrix4 = new Matrix4();
const scratchQuaternion = new Quaternion();
const scratchX = new Cartesian3();
const scratchY = new Cartesian3();
const scratchZ = new Cartesian3();

export interface FrameBuildOptions {
  orientation: Orientation;
  pivot: Cartesian3;
  camera: Camera;
  targets: TransformTarget[];
  normalHint?: Cartesian3;
}

export class FrameBuilder {
  build(options: FrameBuildOptions): Frame {
    switch (options.orientation) {
      case 'global':
        return this.buildGlobal(options.pivot);
      case 'local':
        return this.buildLocal(options.targets[0]);
      case 'view':
        return this.buildView(options.camera, options.pivot);
      case 'enu':
        return this.buildENU(options.pivot);
      case 'normal':
        return this.buildNormal(options);
      case 'gimbal':
      default:
        return this.buildGimbal(options);
    }
  }

  private buildGlobal(origin: Cartesian3): Frame {
    const matrix = Matrix4.IDENTITY;
    return {
      origin: Cartesian3.clone(origin),
      axes: {
        x: Cartesian3.clone(Cartesian3.UNIT_X),
        y: Cartesian3.clone(Cartesian3.UNIT_Y),
        z: Cartesian3.clone(Cartesian3.UNIT_Z)
      },
      matrix
    };
  }

  private buildLocal(target: TransformTarget): Frame {
    const matrix = target.getMatrix(scratchMatrix4);
    Matrix4.getTranslation(matrix, scratchX);
    Matrix4.getMatrix3(matrix, scratchMatrix3);
    Matrix3.getColumn(scratchMatrix3, 0, scratchX);
    Matrix3.getColumn(scratchMatrix3, 1, scratchY);
    Matrix3.getColumn(scratchMatrix3, 2, scratchZ);
    return {
      origin: Cartesian3.clone(Matrix4.getTranslation(matrix, new Cartesian3())),
      axes: {
        x: Cartesian3.clone(scratchX),
        y: Cartesian3.clone(scratchY),
        z: Cartesian3.clone(scratchZ)
      },
      matrix: Matrix4.clone(matrix, new Matrix4())
    };
  }

  private buildView(camera: Camera, pivot: Cartesian3): Frame {
    const right = Cartesian3.clone(camera.right, scratchX);
    const up = Cartesian3.clone(camera.up, scratchY);
    const direction = Cartesian3.clone(camera.direction, scratchZ);
    const matrix = Matrix4.fromRotationTranslation(
      Matrix3.fromColumns(right, up, Cartesian3.negate(direction, new Cartesian3()), scratchMatrix3),
      pivot,
      new Matrix4()
    );
    return {
      origin: Cartesian3.clone(pivot),
      axes: { x: Cartesian3.clone(right), y: Cartesian3.clone(up), z: Cartesian3.clone(direction) },
      matrix
    };
  }

  private buildENU(pivot: Cartesian3): Frame {
    const matrix = Transforms.eastNorthUpToFixedFrame(pivot, undefined, new Matrix4());
    Matrix4.getMatrix3(matrix, scratchMatrix3);
    Matrix3.getColumn(scratchMatrix3, 0, scratchX);
    Matrix3.getColumn(scratchMatrix3, 1, scratchY);
    Matrix3.getColumn(scratchMatrix3, 2, scratchZ);
    return {
      origin: Cartesian3.clone(pivot),
      axes: {
        x: Cartesian3.clone(scratchX),
        y: Cartesian3.clone(scratchY),
        z: Cartesian3.clone(scratchZ)
      },
      matrix
    };
  }

  private buildNormal(options: FrameBuildOptions): Frame {
    const normal = options.normalHint ?? this.estimateNormal(options.targets);
    if (!defined(normal)) {
      return this.buildGlobal(options.pivot);
    }
    const zAxis = Cartesian3.normalize(normal, new Cartesian3());
    const cameraRight = Cartesian3.normalize(Cartesian3.cross(options.camera.direction, zAxis, new Cartesian3()), new Cartesian3());
    const yAxis = Cartesian3.normalize(Cartesian3.cross(zAxis, cameraRight, new Cartesian3()), new Cartesian3());
    const xAxis = Cartesian3.normalize(Cartesian3.cross(yAxis, zAxis, new Cartesian3()), new Cartesian3());
    const matrix = Matrix4.fromRotationTranslation(
      Matrix3.fromColumns(xAxis, yAxis, zAxis, scratchMatrix3),
      options.pivot,
      new Matrix4()
    );
    return {
      origin: Cartesian3.clone(options.pivot),
      axes: { x: xAxis, y: yAxis, z: zAxis },
      matrix
    };
  }

  private buildGimbal(options: FrameBuildOptions): Frame {
    const primary = this.buildLocal(options.targets[0]);
    const cameraDir = Cartesian3.normalize(options.camera.direction, new Cartesian3());
    const yawAxis = Cartesian3.UNIT_Z;
    const yaw = Quaternion.fromAxisAngle(yawAxis, Math.atan2(cameraDir.x, cameraDir.y), scratchQuaternion);
    const rotation = Matrix3.fromQuaternion(yaw, scratchMatrix3);
    const gimbalMatrix = Matrix4.fromRotationTranslation(rotation, primary.origin, new Matrix4());
    Matrix3.getColumn(rotation, 0, scratchX);
    Matrix3.getColumn(rotation, 1, scratchY);
    Matrix3.getColumn(rotation, 2, scratchZ);
    return {
      origin: Cartesian3.clone(primary.origin),
      axes: { x: Cartesian3.clone(scratchX), y: Cartesian3.clone(scratchY), z: Cartesian3.clone(scratchZ) },
      matrix: gimbalMatrix
    };
  }

  private estimateNormal(targets: TransformTarget[]): Cartesian3 | undefined {
    const target = targets[0];
    if (!target) {
      return undefined;
    }
    const matrix = target.getMatrix(scratchMatrix4);
    Matrix4.getMatrix3(matrix, scratchMatrix3);
    Matrix3.getColumn(scratchMatrix3, 2, scratchZ);
    return Cartesian3.clone(Cartesian3.normalize(scratchZ, scratchZ));
  }
}
