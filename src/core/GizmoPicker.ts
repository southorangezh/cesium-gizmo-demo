import { CameraState } from './CameraState.js';
import { GizmoPrimitive, HandleGeometry } from './GizmoPrimitive.js';
import { PickResult } from '../types.js';
import { Vector2 } from '../math/Vector2.js';
import { Vector3 } from '../math/Vector3.js';
import { projectToScreen, ScreenPoint } from './projection.js';

const AXIS_PICK_THRESHOLD = 12;
const PLANE_PICK_THRESHOLD = 20;
const RING_PICK_THRESHOLD = 15;

export class GizmoPicker {
  constructor(private readonly primitive: GizmoPrimitive) {}

  pick(camera: CameraState, pointer: Vector2): PickResult | undefined {
    if (!this.primitive.show) {
      return undefined;
    }
    let best: PickResult | undefined;
    for (const handle of this.primitive.handles) {
      if (!handle.visible) {
        continue;
      }
      const result = this.testHandle(camera, handle, pointer);
      if (!result) {
        continue;
      }
      if (!best || result.distance < best.distance) {
        best = result;
      }
    }
    return best;
  }

  private testHandle(camera: CameraState, handle: HandleGeometry, pointer: Vector2): PickResult | undefined {
    switch (handle.type) {
      case 'axis':
        return this.testAxisHandle(camera, handle, pointer);
      case 'plane':
        return this.testPlaneHandle(camera, handle, pointer);
      case 'ring':
        return this.testRingHandle(camera, handle, pointer);
      case 'center':
        return this.testCenterHandle(camera, handle, pointer);
      default:
        return undefined;
    }
  }

  private testAxisHandle(camera: CameraState, handle: HandleGeometry, pointer: Vector2): PickResult | undefined {
    if (!handle.end) {
      return undefined;
    }
    const start = projectToScreen(camera, handle.start);
    const end = projectToScreen(camera, handle.end);
    if (!start || !end) {
      return undefined;
    }
    const distance = distancePointToSegment(pointer, start, end);
    if (distance > AXIS_PICK_THRESHOLD) {
      return undefined;
    }
    return {
      handleId: handle.id,
      mode: handle.mode,
      axis: handle.axis,
      distance,
      screenPosition: { x: start.x, y: start.y }
    };
  }

  private testPlaneHandle(camera: CameraState, handle: HandleGeometry, pointer: Vector2): PickResult | undefined {
    const center = projectToScreen(camera, handle.start);
    if (!center) {
      return undefined;
    }
    const radius = this.primitive.getScale() * 25;
    const distance = Math.hypot(pointer.x - center.x, pointer.y - center.y);
    if (distance > radius + PLANE_PICK_THRESHOLD) {
      return undefined;
    }
    return {
      handleId: handle.id,
      mode: handle.mode,
      planeAxis: handle.planeAxis,
      distance,
      screenPosition: { x: center.x, y: center.y }
    };
  }

  private testRingHandle(camera: CameraState, handle: HandleGeometry, pointer: Vector2): PickResult | undefined {
    if (!handle.normal || !handle.radius) {
      return undefined;
    }
    const center = projectToScreen(camera, handle.start);
    if (!center) {
      return undefined;
    }
    const ringPointWorld = Vector3.add(handle.start, Vector3.multiplyByScalar(handle.normal, this.primitive.getScale() * handle.radius, new Vector3()), new Vector3());
    const ringPointScreen = projectToScreen(camera, ringPointWorld);
    if (!ringPointScreen) {
      return undefined;
    }
    const radius = Math.hypot(ringPointScreen.x - center.x, ringPointScreen.y - center.y);
    const distance = Math.abs(Math.hypot(pointer.x - center.x, pointer.y - center.y) - radius);
    if (distance > RING_PICK_THRESHOLD) {
      return undefined;
    }
    return {
      handleId: handle.id,
      mode: handle.mode,
      axis: handle.axis,
      distance,
      screenPosition: { x: center.x, y: center.y }
    };
  }

  private testCenterHandle(camera: CameraState, handle: HandleGeometry, pointer: Vector2): PickResult | undefined {
    const center = projectToScreen(camera, handle.start);
    if (!center) {
      return undefined;
    }
    const radius = this.primitive.getScale() * 15;
    const distance = Math.hypot(pointer.x - center.x, pointer.y - center.y);
    if (distance > radius) {
      return undefined;
    }
    return {
      handleId: handle.id,
      mode: handle.mode,
      distance,
      screenPosition: { x: center.x, y: center.y }
    };
  }
}

function distancePointToSegment(point: Vector2, start: ScreenPoint, end: ScreenPoint): number {
  const vx = end.x - start.x;
  const vy = end.y - start.y;
  const wx = point.x - start.x;
  const wy = point.y - start.y;
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) {
    return Math.hypot(point.x - end.x, point.y - end.y);
  }
  const b = c1 / c2;
  const pbx = start.x + b * vx;
  const pby = start.y + b * vy;
  return Math.hypot(point.x - pbx, point.y - pby);
}
