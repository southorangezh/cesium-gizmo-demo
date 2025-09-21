export namespace Cesium {
  type Cartesian3Array = [number, number, number];

  export class Cartesian3 {
    constructor(x?: number, y?: number, z?: number);
    static ZERO: Cartesian3;
    static add(left: Cartesian3, right: Cartesian3, result?: Cartesian3): Cartesian3;
    static subtract(left: Cartesian3, right: Cartesian3, result?: Cartesian3): Cartesian3;
    static multiplyByScalar(cartesian: Cartesian3, scalar: number, result?: Cartesian3): Cartesian3;
    static normalize(cartesian: Cartesian3, result?: Cartesian3): Cartesian3;
    static cross(left: Cartesian3, right: Cartesian3, result?: Cartesian3): Cartesian3;
    static dot(left: Cartesian3, right: Cartesian3): number;
    static magnitude(cartesian: Cartesian3): number;
    static distance(left: Cartesian3, right: Cartesian3): number;
    static fromArray(array: Cartesian3Array, startingIndex?: number, result?: Cartesian3): Cartesian3;
    static toArray(cartesian: Cartesian3, result?: Cartesian3Array, startingIndex?: number): Cartesian3Array;
    static clone(cartesian: Cartesian3, result?: Cartesian3): Cartesian3;
    static fromElements(x: number, y: number, z: number, result?: Cartesian3): Cartesian3;
    x: number;
    y: number;
    z: number;
  }

  export class Quaternion {
    constructor(x?: number, y?: number, z?: number, w?: number);
    static fromAxisAngle(axis: Cartesian3, angle: number, result?: Quaternion): Quaternion;
    static multiply(left: Quaternion, right: Quaternion, result?: Quaternion): Quaternion;
    static normalize(quaternion: Quaternion, result?: Quaternion): Quaternion;
    static identity(): Quaternion;
    x: number;
    y: number;
    z: number;
    w: number;
  }

  export class Matrix3 {
    static fromQuaternion(quaternion: Quaternion, result?: Matrix3): Matrix3;
    static multiply(left: Matrix3, right: Matrix3, result?: Matrix3): Matrix3;
    static transpose(matrix: Matrix3, result?: Matrix3): Matrix3;
    static inverse(matrix: Matrix3, result?: Matrix3): Matrix3;
    static identity(): Matrix3;
  }

  export class Matrix4 {
    static fromRotationTranslation(rotation: Matrix3, translation: Cartesian3, result?: Matrix4): Matrix4;
    static fromTranslation(translation: Cartesian3, result?: Matrix4): Matrix4;
    static multiply(left: Matrix4, right: Matrix4, result?: Matrix4): Matrix4;
    static getTranslation(matrix: Matrix4, result?: Cartesian3): Cartesian3;
    static getRotation(matrix: Matrix4, result?: Matrix3): Matrix3;
    static multiplyByTranslation(matrix: Matrix4, translation: Cartesian3, result?: Matrix4): Matrix4;
    static multiplyByUniformScale(matrix: Matrix4, scale: number, result?: Matrix4): Matrix4;
    static multiplyByNonUniformScale(matrix: Matrix4, scale: Cartesian3, result?: Matrix4): Matrix4;
    static fromScale(scale: Cartesian3, result?: Matrix4): Matrix4;
    static identity(): Matrix4;
  }

  export class Transforms {
    static eastNorthUpToFixedFrame(origin: Cartesian3): Matrix4;
    static localFrameToFixedFrameGenerator(axis1: string, axis2: string): (origin: Cartesian3, result?: Matrix4) => Matrix4;
  }

  export class Viewer {
    scene: any;
  }

  export type Entity = {
    id: string;
    position?: Cartesian3;
    orientation?: Quaternion;
    modelMatrix?: Matrix4;
    parent?: Entity;
  };
}
