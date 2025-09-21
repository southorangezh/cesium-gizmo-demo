import {
  quatNormalize,
  quatToMatrix3,
  vec3,
  vec3Normalize,
  matrix3MultiplyVec3,
  VEC3_ZERO,
  Vec3,
  Quat,
  vec3FromLike,
  vec3ToLike,
  quatFromLike
} from "./math";
import type { Orientation, TargetLike, Cartesian3Like } from "./types";

export interface Frame {
  origin: Vec3;
  axes: Record<string, Vec3>;
  matrix: number[][];
}

export interface FrameBuilderContext {
  targets: TargetLike[];
  orientation: Orientation;
  viewQuaternion?: Quat;
  normal?: Vec3;
  enuUp?: Vec3;
}

function defaultAxes(): Record<string, Vec3> {
  return {
    x: vec3(1, 0, 0),
    y: vec3(0, 1, 0),
    z: vec3(0, 0, 1)
  };
}

function targetOrigin(targets: TargetLike[]): Vec3 {
  if (!targets.length) {
    return VEC3_ZERO;
  }
  const accum = targets.reduce<Vec3>((acc, t) => {
    if (t.matrix && t.matrix.length >= 16) {
      const m = t.matrix;
      return [acc[0] + m[12], acc[1] + m[13], acc[2] + m[14]];
    }
    if (t.position) {
      const p = t.position;
      return [acc[0] + p.x, acc[1] + p.y, acc[2] + p.z];
    }
    return acc;
  }, vec3(0, 0, 0));
  return vec3(accum[0] / targets.length, accum[1] / targets.length, accum[2] / targets.length);
}

function matrixFromQuaternion(q: Quat | undefined): number[][] {
  if (!q) return [vec3(1, 0, 0), vec3(0, 1, 0), vec3(0, 0, 1)];
  return quatToMatrix3(quatNormalize(q));
}

function axesFromMatrix(matrix: number[][]): Record<string, Vec3> {
  return {
    x: vec3(matrix[0][0], matrix[1][0], matrix[2][0]),
    y: vec3(matrix[0][1], matrix[1][1], matrix[2][1]),
    z: vec3(matrix[0][2], matrix[1][2], matrix[2][2])
  };
}

export class FrameBuilder {
  build(context: FrameBuilderContext): Frame {
    const origin = targetOrigin(context.targets);
    let axes = defaultAxes();

    switch (context.orientation) {
      case "global":
        axes = defaultAxes();
        break;
      case "local": {
        const first = context.targets[0];
        if (first && first.matrix) {
          const rotation = [
            [first.matrix[0], first.matrix[4], first.matrix[8]],
            [first.matrix[1], first.matrix[5], first.matrix[9]],
            [first.matrix[2], first.matrix[6], first.matrix[10]]
          ];
          axes = axesFromMatrix(rotation);
        }
        break;
      }
      case "view": {
        const matrix = matrixFromQuaternion(context.viewQuaternion);
        axes = axesFromMatrix(matrix);
        break;
      }
      case "enu": {
        const up = context.enuUp || vec3(0, 0, 1);
        const east = vec3Normalize(vec3(-up[1], up[0], 0));
        const north = vec3Normalize(vec3(up[1] * east[2] - up[2] * east[1], up[2] * east[0] - up[0] * east[2], up[0] * east[1] - up[1] * east[0]));
        axes = {
          x: east,
          y: north,
          z: vec3Normalize(up)
        };
        break;
      }
      case "normal": {
        const normal = context.normal || vec3(0, 0, 1);
        const zAxis = vec3Normalize(normal);
        const ref = Math.abs(zAxis[2]) < 0.9 ? vec3(0, 0, 1) : vec3(0, 1, 0);
        const xAxis = vec3Normalize([
          zAxis[1] * ref[2] - zAxis[2] * ref[1],
          zAxis[2] * ref[0] - zAxis[0] * ref[2],
          zAxis[0] * ref[1] - zAxis[1] * ref[0]
        ]);
        const yAxis = vec3Normalize([
          zAxis[1] * xAxis[2] - zAxis[2] * xAxis[1],
          zAxis[2] * xAxis[0] - zAxis[0] * xAxis[2],
          zAxis[0] * xAxis[1] - zAxis[1] * xAxis[0]
        ]);
        axes = { x: xAxis, y: yAxis, z: zAxis };
        break;
      }
      case "gimbal": {
        const first = context.targets[0];
        let matrix = matrixFromQuaternion(context.viewQuaternion);
        if (first && first.matrix) {
          matrix = [
            [first.matrix[0], first.matrix[4], first.matrix[8]],
            [first.matrix[1], first.matrix[5], first.matrix[9]],
            [first.matrix[2], first.matrix[6], first.matrix[10]]
          ];
        }
        axes = axesFromMatrix(matrix);
        break;
      }
      default:
        axes = defaultAxes();
    }

    return {
      origin,
      axes,
      matrix: [axes.x, axes.y, axes.z]
    };
  }

  localToWorld(frame: Frame, local: Vec3): Vec3 {
    const worldX = matrix3MultiplyVec3(frame.matrix, vec3(local[0], 0, 0));
    const worldY = matrix3MultiplyVec3(frame.matrix, vec3(0, local[1], 0));
    const worldZ = matrix3MultiplyVec3(frame.matrix, vec3(0, 0, local[2]));
    return [
      frame.origin[0] + worldX[0] + worldY[0] + worldZ[0],
      frame.origin[1] + worldX[1] + worldY[1] + worldZ[1],
      frame.origin[2] + worldX[2] + worldY[2] + worldZ[2]
    ];
  }

  directionLocalToWorld(frame: Frame, direction: Vec3): Vec3 {
    return [
      frame.axes.x[0] * direction[0] + frame.axes.y[0] * direction[1] + frame.axes.z[0] * direction[2],
      frame.axes.x[1] * direction[0] + frame.axes.y[1] * direction[1] + frame.axes.z[1] * direction[2],
      frame.axes.x[2] * direction[0] + frame.axes.y[2] * direction[1] + frame.axes.z[2] * direction[2]
    ];
  }

  worldToLocal(frame: Frame, world: Vec3): Vec3 {
    const relative = [world[0] - frame.origin[0], world[1] - frame.origin[1], world[2] - frame.origin[2]];
    const x = relative[0] * frame.axes.x[0] + relative[1] * frame.axes.x[1] + relative[2] * frame.axes.x[2];
    const y = relative[0] * frame.axes.y[0] + relative[1] * frame.axes.y[1] + relative[2] * frame.axes.y[2];
    const z = relative[0] * frame.axes.z[0] + relative[1] * frame.axes.z[1] + relative[2] * frame.axes.z[2];
    return vec3(x, y, z);
  }
}

export function frameOriginLike(frame: Frame): Cartesian3Like {
  return vec3ToLike(frame.origin);
}

