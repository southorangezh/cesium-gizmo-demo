import { CameraState } from './CameraState.js';
import { Axis, FrameState, HandleVisualState, Mode } from '../types.js';
import { Vector3 } from '../math/Vector3.js';

export type HandleType = 'axis' | 'plane' | 'ring' | 'center';

export interface HandleGeometry {
  id: string;
  mode: Mode;
  axis?: Axis;
  planeAxis?: [Axis, Axis];
  type: HandleType;
  color: string;
  start: Vector3;
  end?: Vector3;
  normal?: Vector3;
  radius?: number;
  active: boolean;
  highlighted: boolean;
  visible: boolean;
}

const AXIS_COLORS: Record<Axis, string> = {
  x: '#ff5555',
  y: '#55ff55',
  z: '#5599ff'
};

const MODE_ID_PREFIX: Record<Mode, string> = {
  translate: 'T',
  rotate: 'R',
  scale: 'S'
};

export class GizmoPrimitive {
  readonly handles: HandleGeometry[] = [];
  show = true;
  private scale = 1.0;

  constructor() {
    this.createDefaultHandles();
  }

  private createDefaultHandles(): void {
    for (const axis of ['x', 'y', 'z'] as Axis[]) {
      this.handles.push({
        id: `${MODE_ID_PREFIX.translate}-${axis}`,
        mode: 'translate',
        axis,
        type: 'axis',
        color: AXIS_COLORS[axis],
        start: new Vector3(),
        end: new Vector3(1, 0, 0),
        active: false,
        highlighted: false,
        visible: true
      });
    }
    for (const axis of ['x', 'y', 'z'] as Axis[]) {
      this.handles.push({
        id: `${MODE_ID_PREFIX.scale}-${axis}`,
        mode: 'scale',
        axis,
        type: 'axis',
        color: AXIS_COLORS[axis],
        start: new Vector3(),
        end: new Vector3(1, 0, 0),
        active: false,
        highlighted: false,
        visible: true
      });
    }
    const planes: Array<[Axis, Axis]> = [
      ['x', 'y'],
      ['y', 'z'],
      ['x', 'z']
    ];
    for (const planeAxis of planes) {
      this.handles.push({
        id: `${MODE_ID_PREFIX.translate}-plane-${planeAxis.join('')}`,
        mode: 'translate',
        planeAxis,
        type: 'plane',
        color: '#ffff55',
        start: new Vector3(),
        normal: new Vector3(0, 0, 1),
        active: false,
        highlighted: false,
        visible: true
      });
    }
    for (const axis of ['x', 'y', 'z'] as Axis[]) {
      this.handles.push({
        id: `${MODE_ID_PREFIX.rotate}-${axis}`,
        mode: 'rotate',
        axis,
        type: 'ring',
        color: AXIS_COLORS[axis],
        start: new Vector3(),
        normal: new Vector3(),
        radius: 1,
        active: false,
        highlighted: false,
        visible: true
      });
    }
    this.handles.push({
      id: `${MODE_ID_PREFIX.rotate}-view`,
      mode: 'rotate',
      type: 'ring',
      color: '#ffffff',
      start: new Vector3(),
      normal: new Vector3(),
      radius: 1.2,
      active: false,
      highlighted: false,
      visible: true
    });
    this.handles.push({
      id: `${MODE_ID_PREFIX.scale}-uniform`,
      mode: 'scale',
      type: 'center',
      color: '#ffffff',
      start: new Vector3(),
      radius: 0.2,
      active: false,
      highlighted: false,
      visible: true
    });
  }

  update(frame: FrameState, camera: CameraState, scale: number): void {
    this.scale = scale;
    for (const handle of this.handles) {
      if (!handle.visible) {
        continue;
      }
      handle.start = Vector3.clone(frame.origin, handle.start);
      switch (handle.type) {
        case 'axis':
          handle.end = this.computeAxisEnd(handle, frame);
          break;
        case 'plane':
          handle.normal = this.computePlaneNormal(handle, frame);
          break;
        case 'ring':
          handle.normal = this.computeRingNormal(handle, frame, camera);
          break;
        case 'center':
          handle.start = Vector3.clone(frame.origin, handle.start);
          break;
      }
    }
  }

  getScale(): number {
    return this.scale;
  }

  setVisualStates(states: HandleVisualState[]): void {
    for (const state of states) {
      const handle = this.handles.find((h) => h.id === state.id);
      if (handle) {
        handle.active = state.active;
        handle.highlighted = state.highlighted;
      }
    }
  }

  setModeVisibility(mode: Mode, visible: boolean): void {
    for (const handle of this.handles) {
      if (handle.mode === mode) {
        handle.visible = visible;
      }
    }
  }

  private computeAxisEnd(handle: HandleGeometry, frame: FrameState): Vector3 {
    if (!handle.axis) {
      return new Vector3();
    }
    const axisVector = Vector3.multiplyByScalar(frame.axes[handle.axis], this.scale, new Vector3());
    return Vector3.add(frame.origin, axisVector, new Vector3());
  }

  private computePlaneNormal(handle: HandleGeometry, frame: FrameState): Vector3 {
    if (!handle.planeAxis) {
      return new Vector3(0, 0, 1);
    }
    const axisA = frame.axes[handle.planeAxis[0]];
    const axisB = frame.axes[handle.planeAxis[1]];
    return Vector3.normalize(Vector3.cross(axisA, axisB, new Vector3()));
  }

  private computeRingNormal(handle: HandleGeometry, frame: FrameState, camera: CameraState): Vector3 {
    if (!handle.axis) {
      return Vector3.clone(camera.direction);
    }
    return frame.axes[handle.axis];
  }
}
