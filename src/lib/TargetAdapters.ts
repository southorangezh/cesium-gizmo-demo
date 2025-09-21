import {
  Cartographic,
  Cartesian3,
  JulianDate,
  Matrix3,
  Matrix4,
  Quaternion,
  Transforms,
} from 'cesium';
import type { Entity, Model } from 'cesium';
import type { TargetLike } from './types';

function matrixFromEntity(entity: Entity): Matrix4 {
  if (entity.orientation && entity.position) {
    const orientation = entity.orientation.getValue(JulianDate.now()) as Quaternion;
    const position = entity.position.getValue(JulianDate.now()) as Cartesian3;
    const rot = Matrix3.fromQuaternion(orientation, new Matrix3());
    const matrix = Matrix4.fromRotationTranslation(rot, position, new Matrix4());
    return matrix;
  }
  if ((entity as any).computeModelMatrix) {
    return (entity as any).computeModelMatrix(JulianDate.now(), new Matrix4());
  }
  throw new Error('Entity lacks orientation/position for matrix extraction');
}

function setMatrixOnEntity(entity: Entity, matrix: Matrix4): void {
  const translation = Matrix4.getTranslation(matrix, new Cartesian3());
  const rot = Matrix3.fromMatrix4(matrix, new Matrix3());
  const quaternion = Quaternion.fromRotationMatrix(rot, new Quaternion());
  entity.position = translation;
  entity.orientation = quaternion;
}

function matrixFromModel(model: Model): Matrix4 {
  return Matrix4.clone(model.modelMatrix, new Matrix4());
}

function setMatrixOnModel(model: Model, matrix: Matrix4): void {
  model.modelMatrix = Matrix4.clone(matrix, new Matrix4());
}

class EntityAdapter implements TargetLike {
  constructor(private readonly entity: Entity) {}

  getMatrix(): Matrix4 {
    return matrixFromEntity(this.entity);
  }

  setMatrix(matrix: Matrix4): void {
    setMatrixOnEntity(this.entity, matrix);
  }

  getPosition(): Cartesian3 {
    return Matrix4.getTranslation(this.getMatrix(), new Cartesian3());
  }

  getOrientation(): Quaternion | undefined {
    const orientation = this.entity.orientation?.getValue(JulianDate.now());
    return orientation ? Quaternion.clone(orientation as Quaternion, new Quaternion()) : undefined;
  }
}

class ModelAdapter implements TargetLike {
  constructor(private readonly model: Model) {}

  getMatrix(): Matrix4 {
    return matrixFromModel(this.model);
  }

  setMatrix(matrix: Matrix4): void {
    setMatrixOnModel(this.model, matrix);
  }

  getPosition(): Cartesian3 {
    return Matrix4.getTranslation(this.model.modelMatrix, new Cartesian3());
  }

  getOrientation(): Quaternion | undefined {
    const rotation = Matrix3.fromMatrix4(this.model.modelMatrix, new Matrix3());
    return Quaternion.fromRotationMatrix(rotation, new Quaternion());
  }
}

class MatrixTarget implements TargetLike {
  constructor(private matrix: Matrix4, private readonly setter: (matrix: Matrix4) => void) {}

  getMatrix(): Matrix4 {
    return Matrix4.clone(this.matrix, new Matrix4());
  }

  setMatrix(matrix: Matrix4): void {
    this.matrix = Matrix4.clone(matrix, this.matrix);
    this.setter(this.matrix);
  }

  getPosition(): Cartesian3 {
    return Matrix4.getTranslation(this.matrix, new Cartesian3());
  }

  getOrientation(): Quaternion | undefined {
    const rot = Matrix3.fromMatrix4(this.matrix, new Matrix3());
    return Quaternion.fromRotationMatrix(rot, new Quaternion());
  }
}

export function wrapTarget(target: Entity | Model | TargetLike): TargetLike {
  if ((target as TargetLike).getMatrix) {
    return target as TargetLike;
  }
  if ((target as Entity).entityCollection) {
    return new EntityAdapter(target as Entity);
  }
  if ((target as Model).modelMatrix) {
    return new ModelAdapter(target as Model);
  }
  throw new Error('Unsupported target type');
}

export function createMatrixTarget(matrix: Matrix4, setter: (matrix: Matrix4) => void): TargetLike {
  return new MatrixTarget(matrix, setter);
}

export function computeENUFrame(position: Cartesian3): Matrix4 {
  return Transforms.eastNorthUpToFixedFrame(position, undefined, new Matrix4());
}

export function cartesianToENU(origin: Cartesian3, point: Cartesian3): Cartesian3 {
  const enuFrame = computeENUFrame(origin);
  const inverse = Matrix4.inverse(enuFrame, new Matrix4());
  return Matrix4.multiplyByPoint(inverse, point, new Cartesian3());
}

export function enuToCartesian(origin: Cartesian3, enu: Cartesian3): Cartesian3 {
  const enuFrame = computeENUFrame(origin);
  return Matrix4.multiplyByPoint(enuFrame, enu, new Cartesian3());
}

export function averagePositions(positions: Cartesian3[]): Cartesian3 {
  const sum = positions.reduce((acc, p) => Cartesian3.add(acc, p, acc), new Cartesian3(0, 0, 0));
  Cartesian3.divideByScalar(sum, positions.length, sum);
  return sum;
}

export function cartesian3ToCartographic(point: Cartesian3): Cartographic {
  return Cartographic.fromCartesian(point, undefined, new Cartographic());
}
