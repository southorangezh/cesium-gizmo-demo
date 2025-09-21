import { vec3, Vec3, vec3Add, vec3Scale, vec3ToLike } from "./math";
import type { Pivot, PivotResult, TargetLike } from "./types";

export interface PivotContext {
  pivot: Pivot;
  targets: TargetLike[];
  cursor?: Vec3;
}

function extractPosition(target: TargetLike): Vec3 {
  if ("matrix" in target && target.matrix) {
    return vec3(target.matrix[12], target.matrix[13], target.matrix[14]);
  }
  if ((target as any).position) {
    const p = (target as any).position;
    return vec3(p.x, p.y, p.z);
  }
  return vec3(0, 0, 0);
}

export class PivotResolver {
  resolve(context: PivotContext): PivotResult {
    if (!context.targets.length) {
      return { pivot: vec3ToLike(vec3(0, 0, 0)), targets: [] };
    }
    switch (context.pivot) {
      case "cursor":
        return {
          pivot: vec3ToLike(context.cursor ? context.cursor : extractPosition(context.targets[0])),
          targets: context.targets
        };
      case "individual":
        return { pivot: vec3ToLike(extractPosition(context.targets[0])), targets: context.targets };
      case "median": {
        const sum = context.targets.reduce<Vec3>((acc, t) => {
          return vec3Add(acc, extractPosition(t));
        }, vec3(0, 0, 0));
        const pivot = vec3Scale(sum, 1 / context.targets.length);
        return { pivot: vec3ToLike(pivot), targets: context.targets };
      }
      case "origin":
      default:
        return { pivot: vec3ToLike(extractPosition(context.targets[0])), targets: context.targets };
    }
  }
}

