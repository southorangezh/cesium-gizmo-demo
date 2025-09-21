import { vec3FromLike, vec3Sub, vec3Length, Vec3, vec3Dot, vec3Normalize } from "./math";
import type { Cartesian3Like, GizmoHandleHit, Mode } from "./types";
import { GizmoPrimitive, GizmoHandle } from "./gizmoPrimitive";

export interface PickResult extends GizmoHandleHit {
  distance: number;
}

export class GizmoPicker {
  constructor(private primitive: GizmoPrimitive) {}

  pick(worldPosition: Cartesian3Like): PickResult | undefined {
    const point = vec3FromLike(worldPosition);
    let best: PickResult | undefined;
    for (const handle of this.primitive.getHandles()) {
      const candidate = this.testHandle(point, handle);
      if (!candidate) continue;
      if (!best || candidate.priority > best.priority || (candidate.priority === best.priority && candidate.distance < best.distance)) {
        best = candidate;
      }
    }
    return best;
  }

  private testHandle(point: Vec3, handle: GizmoHandle): PickResult | undefined {
    const origin = handle.origin;
    const dir = vec3Normalize(handle.direction);
    const relative = vec3Sub(point, origin);
    const projection = vec3Dot(relative, dir);
    if (projection < 0 || projection > handle.length) {
      return undefined;
    }
    const closest = [origin[0] + dir[0] * projection, origin[1] + dir[1] * projection, origin[2] + dir[2] * projection] as Vec3;
    const distance = vec3Length(vec3Sub(point, closest));
    if (distance > handle.radius) {
      return undefined;
    }
    return {
      id: handle.id,
      mode: handle.mode,
      axis: handle.axis,
      priority: handle.priority,
      position: { x: closest[0], y: closest[1], z: closest[2] },
      distance
    };
  }
}

