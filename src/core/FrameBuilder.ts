import { Matrix3 } from '../math/Matrix3.js';
import { Matrix4 } from '../math/Matrix4.js';
import { Quaternion } from '../math/Quaternion.js';
import { Vector3 } from '../math/Vector3.js';
import { Orientation, FrameState, TransformTarget } from '../types.js';
import { enuAxes } from '../utils/Geodesy.js';
import { CameraState } from './CameraState.js';

const scratchMatrix = new Matrix4();

export interface FrameBuilderOptions {
  orientation: Orientation;
  pivot: Vector3;
  targets: TransformTarget[];
  camera: CameraState;
  normal?: Vector3;
}

export class FrameBuilder {
  build(options: FrameBuilderOptions): FrameState {
    const axes = this.buildAxes(options);
    const matrix = Matrix4.fromColumns(axes.x, axes.y, axes.z, options.pivot, new Matrix4());
    const inverse = matrix.clone(new Matrix4()).invert();
    return { origin: options.pivot, axes, matrix, inverse };
  }

  private buildAxes({ orientation, targets, camera, normal, pivot }: FrameBuilderOptions): FrameState['axes'] {
    switch (orientation) {
      case 'global':
        return {
          x: new Vector3(1, 0, 0),
          y: new Vector3(0, 1, 0),
          z: new Vector3(0, 0, 1)
        };
      case 'local':
        return this.fromTargetOrientation(targets[0]);
      case 'view':
        return this.fromView(camera);
      case 'enu':
        return this.fromEnu(pivot);
      case 'normal':
        return this.fromNormal(targets[0], normal, camera);
      case 'gimbal':
        return this.fromGimbal(targets[0], camera);
      default:
        return {
          x: new Vector3(1, 0, 0),
          y: new Vector3(0, 1, 0),
          z: new Vector3(0, 0, 1)
        };
    }
  }

  private fromTargetOrientation(target: TransformTarget): FrameState['axes'] {
    const matrix = target.getMatrix();
    const rotation = matrix.getRotation(new Matrix3());
    const e = rotation.elements;
    return {
      x: Vector3.normalize(new Vector3(e[0], e[1], e[2])),
      y: Vector3.normalize(new Vector3(e[3], e[4], e[5])),
      z: Vector3.normalize(new Vector3(e[6], e[7], e[8]))
    };
  }

  private fromView(camera: CameraState): FrameState['axes'] {
    return {
      x: Vector3.clone(camera.right),
      y: Vector3.clone(camera.up),
      z: Vector3.clone(camera.direction)
    };
  }

  private fromEnu(pivot: Vector3): FrameState['axes'] {
    const { east, north, up } = enuAxes(pivot);
    return {
      x: east,
      y: north,
      z: up
    };
  }

  private fromNormal(target: TransformTarget, normal: Vector3 | undefined, camera: CameraState): FrameState['axes'] {
    const baseAxes = this.fromTargetOrientation(target);
    const referenceNormal = normal ? Vector3.normalize(normal, new Vector3()) : baseAxes.z;
    const viewDir = camera.direction;
    const tangent = Vector3.normalize(Vector3.cross(referenceNormal, viewDir, new Vector3()));
    if (Vector3.magnitudeSquared(tangent) < 1e-6) {
      // fallback to base axes to avoid degeneracy
      return baseAxes;
    }
    const bitangent = Vector3.normalize(Vector3.cross(referenceNormal, tangent, new Vector3()));
    return {
      x: tangent,
      y: bitangent,
      z: referenceNormal
    };
  }

  private fromGimbal(target: TransformTarget, camera: CameraState): FrameState['axes'] {
    const matrix = target.getMatrix();
    const orientation = Quaternion.fromRotationMatrix(matrix.getRotation(new Matrix3()));
    const euler = orientation.toEuler(new Vector3());
    const yawOnly = Quaternion.fromEuler(euler.z, 0, 0); // yaw around up axis
    const yawAxes = this.axesFromQuaternion(yawOnly);
    // Align roll axis with camera up projection to reduce gimbal lock
    const projectedUp = Vector3.projectOnPlane(camera.up, yawAxes.z, new Vector3());
    if (Vector3.magnitudeSquared(projectedUp) > 1e-6) {
      const xAxis = Vector3.normalize(Vector3.cross(projectedUp, yawAxes.z, new Vector3()));
      const yAxis = Vector3.normalize(Vector3.cross(yawAxes.z, xAxis, new Vector3()));
      return { x: xAxis, y: yAxis, z: yawAxes.z };
    }
    return yawAxes;
  }

  private axesFromQuaternion(q: Quaternion): FrameState['axes'] {
    const matrix = q.toMatrix3(new Matrix3());
    const e = matrix.elements;
    return {
      x: Vector3.normalize(new Vector3(e[0], e[1], e[2])),
      y: Vector3.normalize(new Vector3(e[3], e[4], e[5])),
      z: Vector3.normalize(new Vector3(e[6], e[7], e[8]))
    };
  }
}
