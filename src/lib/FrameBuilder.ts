import {
  Cartesian3,
  Matrix3,
  Matrix4,
  Quaternion,
  Transforms,
  HeadingPitchRoll,
} from 'cesium';
import type { Orientation, TargetLike } from './types';
import { computeENUFrame } from './TargetAdapters';

export interface Frame {
  origin: Cartesian3;
  matrix: Matrix4;
  rotation: Matrix3;
  quaternion: Quaternion;
  axes: { x: Cartesian3; y: Cartesian3; z: Cartesian3 };
}

const scratchMatrix3 = new Matrix3();
const scratchQuat = new Quaternion();
const scratchAxisX = new Cartesian3();
const scratchAxisY = new Cartesian3();
const scratchAxisZ = new Cartesian3();

export class FrameBuilder {
  constructor(private readonly camera: { positionWC: Cartesian3; directionWC: Cartesian3; upWC: Cartesian3 }) {}

  build(target: TargetLike[], orientation: Orientation, pivot: Cartesian3): Frame {
    switch (orientation) {
      case 'global':
        return this.buildGlobal(pivot);
      case 'local':
        return this.buildLocal(target, pivot);
      case 'view':
        return this.buildView(pivot);
      case 'enu':
        return this.buildENU(pivot);
      case 'normal':
        return this.buildNormal(target, pivot);
      case 'gimbal':
        return this.buildGimbal(target, pivot);
      default:
        return this.buildGlobal(pivot);
    }
  }

  private buildGlobal(pivot: Cartesian3): Frame {
    const matrix = Matrix4.IDENTITY;
    const rotation = Matrix3.IDENTITY;
    const quaternion = Quaternion.IDENTITY;
    return this.makeFrame(pivot, matrix, rotation, quaternion);
  }

  private buildLocal(target: TargetLike[], pivot: Cartesian3): Frame {
    const firstOrientation = target[0]?.getOrientation();
    if (!firstOrientation) {
      return this.buildGlobal(pivot);
    }
    const rotation = Matrix3.fromQuaternion(firstOrientation, new Matrix3());
    const matrix = Matrix4.fromRotationTranslation(rotation, pivot, new Matrix4());
    const quaternion = Quaternion.clone(firstOrientation, new Quaternion());
    return this.makeFrame(pivot, matrix, rotation, quaternion);
  }

  private buildView(pivot: Cartesian3): Frame {
    const direction = Cartesian3.normalize(this.camera.directionWC, new Cartesian3());
    const up = Cartesian3.normalize(this.camera.upWC, new Cartesian3());
    const right = Cartesian3.cross(direction, up, new Cartesian3());
    Cartesian3.cross(up, direction, up);
    const rotation = new Matrix3(
      right.x,
      right.y,
      right.z,
      up.x,
      up.y,
      up.z,
      direction.x,
      direction.y,
      direction.z,
    );
    const matrix = Matrix4.fromRotationTranslation(rotation, pivot, new Matrix4());
    const quaternion = Quaternion.fromRotationMatrix(rotation, new Quaternion());
    return this.makeFrame(pivot, matrix, rotation, quaternion);
  }

  private buildENU(pivot: Cartesian3): Frame {
    const matrix = computeENUFrame(pivot);
    const rotation = Matrix4.getMatrix3(matrix, scratchMatrix3);
    const quaternion = Quaternion.fromRotationMatrix(rotation, new Quaternion());
    return this.makeFrame(pivot, matrix, rotation, quaternion);
  }

  private buildNormal(target: TargetLike[], pivot: Cartesian3): Frame {
    const orientation = target[0]?.getOrientation();
    if (!orientation) {
      return this.buildENU(pivot);
    }
    const rotation = Matrix3.fromQuaternion(orientation, new Matrix3());
    const zAxis = Matrix3.getColumn(rotation, 2, scratchAxisZ);
    const enu = computeENUFrame(pivot);
    const enuRot = Matrix4.getMatrix3(enu, scratchMatrix3);
    const up = Matrix3.getColumn(enuRot, 2, scratchAxisY);
    const dot = Cartesian3.dot(zAxis, up);
    if (Math.abs(dot) > 0.99) {
      return this.buildENU(pivot);
    }
    const xAxis = Cartesian3.normalize(Cartesian3.cross(up, zAxis, scratchAxisX), scratchAxisX);
    const yAxis = Cartesian3.normalize(Cartesian3.cross(zAxis, xAxis, scratchAxisY), scratchAxisY);
    const rotationNormal = new Matrix3(
      xAxis.x,
      xAxis.y,
      xAxis.z,
      yAxis.x,
      yAxis.y,
      yAxis.z,
      zAxis.x,
      zAxis.y,
      zAxis.z,
    );
    const matrix = Matrix4.fromRotationTranslation(rotationNormal, pivot, new Matrix4());
    const quaternion = Quaternion.fromRotationMatrix(rotationNormal, new Quaternion());
    return this.makeFrame(pivot, matrix, rotationNormal, quaternion);
  }

  private buildGimbal(target: TargetLike[], pivot: Cartesian3): Frame {
    const orientation = target[0]?.getOrientation();
    if (!orientation) {
      return this.buildGlobal(pivot);
    }
    const hpr = HeadingPitchRoll.fromQuaternion(orientation, new HeadingPitchRoll());
    const rotation = Matrix3.fromHeadingPitchRoll(hpr, new Matrix3());
    const matrix = Matrix4.fromRotationTranslation(rotation, pivot, new Matrix4());
    const quaternion = Quaternion.fromRotationMatrix(rotation, new Quaternion());
    return this.makeFrame(pivot, matrix, rotation, quaternion);
  }

  private makeFrame(origin: Cartesian3, matrix: Matrix4, rotation: Matrix3, quaternion: Quaternion): Frame {
    const x = Matrix3.getColumn(rotation, 0, scratchAxisX);
    const y = Matrix3.getColumn(rotation, 1, scratchAxisY);
    const z = Matrix3.getColumn(rotation, 2, scratchAxisZ);
    return {
      origin: Cartesian3.clone(origin, new Cartesian3()),
      matrix: Matrix4.clone(matrix, new Matrix4()),
      rotation: Matrix3.clone(rotation, new Matrix3()),
      quaternion: Quaternion.clone(quaternion, new Quaternion()),
      axes: {
        x: Cartesian3.clone(x, new Cartesian3()),
        y: Cartesian3.clone(y, new Cartesian3()),
        z: Cartesian3.clone(z, new Cartesian3()),
      },
    };
  }
}
