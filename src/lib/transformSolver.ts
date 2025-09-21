import {
  vec3FromLike,
  vec3Sub,
  vec3ToLike,
  vec3,
  vec3Normalize,
  vec3Dot,
  vec3Scale,
  quatFromAxisAngle,
  quatNormalize,
  quatToLike,
  Vec3
} from "./math";
import type { Axis, Mode, PointerState, TransformDelta } from "./types";
import type { FrameBuilder, Frame } from "./frameBuilder";

export type Constraint =
  | { type: "axis"; axis: Axis }
  | { type: "plane"; axes: [Axis, Axis] }
  | { type: "free" };

export interface SolveOptions {
  mode: Mode;
  constraint: Constraint;
  pointer: PointerState;
  frame: Frame;
  frameBuilder: FrameBuilder;
  pivot: Vec3;
}

const AXIS_VECTOR: Record<Axis, Vec3> = {
  x: vec3(1, 0, 0),
  y: vec3(0, 1, 0),
  z: vec3(0, 0, 1)
};

export class TransformSolver {
  solve(options: SolveOptions): TransformDelta {
    const { mode } = options;
    if (mode === "translate") {
      return this.solveTranslate(options);
    }
    if (mode === "rotate") {
      return this.solveRotate(options);
    }
    if (mode === "scale") {
      return this.solveScale(options);
    }
    return this.emptyDelta();
  }

  private solveTranslate(options: SolveOptions): TransformDelta {
    const { pointer, constraint, frame, frameBuilder, pivot } = options;
    if (!pointer.start || !pointer.current) {
      return this.emptyDelta();
    }
    const startWorld = vec3FromLike(pointer.start);
    const currentWorld = vec3FromLike(pointer.current);
    const startLocal = frameBuilder.worldToLocal(frame, startWorld);
    const currentLocal = frameBuilder.worldToLocal(frame, currentWorld);
    let deltaLocal = vec3Sub(currentLocal, startLocal);

    if (constraint.type === "axis") {
      const axisVec = AXIS_VECTOR[constraint.axis];
      const magnitude = vec3Dot(deltaLocal, axisVec);
      deltaLocal = vec3Scale(axisVec, magnitude);
    } else if (constraint.type === "plane") {
      const [a1, a2] = constraint.axes;
      const keep = new Set([a1, a2]);
      const values: Vec3 = [deltaLocal[0], deltaLocal[1], deltaLocal[2]];
      if (!keep.has("x")) values[0] = 0;
      if (!keep.has("y")) values[1] = 0;
      if (!keep.has("z")) values[2] = 0;
      deltaLocal = values;
    }

    const deltaWorld = frameBuilder.directionLocalToWorld(frame, deltaLocal);
    return {
      translation: vec3ToLike(deltaWorld),
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 }
    };
  }

  private solveScale(options: SolveOptions): TransformDelta {
    const { pointer, constraint, frame, frameBuilder } = options;
    if (!pointer.start || !pointer.current) {
      return this.emptyDelta();
    }
    const startWorld = vec3FromLike(pointer.start);
    const currentWorld = vec3FromLike(pointer.current);
    const pivotLocal = frameBuilder.worldToLocal(frame, pivot);
    const startLocal = frameBuilder.worldToLocal(frame, startWorld);
    const currentLocal = frameBuilder.worldToLocal(frame, currentWorld);
    const deltaLocal = vec3Sub(currentLocal, startLocal);
    let scale = [1, 1, 1] as Vec3;
    if (constraint.type === "axis") {
      const axisVec = AXIS_VECTOR[constraint.axis];
      const movement = vec3Dot(deltaLocal, axisVec);
      const sign = movement >= 0 ? 1 : -1;
      const factor = 1 + Math.abs(movement) / Math.max(1e-6, vec3Dot(axisVec, axisVec));
      if (constraint.axis === "x") scale = [factor * sign, 1, 1];
      if (constraint.axis === "y") scale = [1, factor * sign, 1];
      if (constraint.axis === "z") scale = [1, 1, factor * sign];
    } else {
      const distStart = Math.max(1e-6, Math.hypot(startLocal[0] - pivotLocal[0], startLocal[1] - pivotLocal[1], startLocal[2] - pivotLocal[2]));
      const distCurrent = Math.max(1e-6, Math.hypot(currentLocal[0] - pivotLocal[0], currentLocal[1] - pivotLocal[1], currentLocal[2] - pivotLocal[2]));
      const factor = distCurrent / distStart;
      scale = [factor, factor, factor];
    }
    return {
      translation: vec3ToLike(vec3(0, 0, 0)),
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: vec3ToLike(scale)
    };
  }

  private solveRotate(options: SolveOptions): TransformDelta {
    const { pointer, constraint, frame, frameBuilder, pivot } = options;
    if (!pointer.start || !pointer.current) {
      return this.emptyDelta();
    }
    const startWorld = vec3FromLike(pointer.start);
    const currentWorld = vec3FromLike(pointer.current);
    const origin = pivot;
    const startDir = vec3Normalize(vec3Sub(startWorld, origin));
    const currentDir = vec3Normalize(vec3Sub(currentWorld, origin));
    let axis: Vec3 = AXIS_VECTOR.x;
    if (constraint.type === "axis") {
      axis = frame.axes[constraint.axis];
    } else if (constraint.type === "plane") {
      const planeNormal = constraint.axes.includes("x") && constraint.axes.includes("y") ? frame.axes.z : constraint.axes.includes("y") && constraint.axes.includes("z") ? frame.axes.x : frame.axes.y;
      axis = planeNormal;
    } else if (constraint.type === "free") {
      axis = vec3Normalize(vec3Sub(frameBuilder.directionLocalToWorld(frame, vec3(0, 0, 1)), vec3(0, 0, 0)));
    }
    const angle = Math.acos(Math.max(-1, Math.min(1, vec3Dot(startDir, currentDir))));
    const quaternion = quatNormalize(quatFromAxisAngle(axis, angle));
    return {
      translation: vec3ToLike(vec3(0, 0, 0)),
      rotation: quatToLike(quaternion),
      scale: { x: 1, y: 1, z: 1 }
    };
  }

  private emptyDelta(): TransformDelta {
    return {
      translation: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 }
    };
  }
}

