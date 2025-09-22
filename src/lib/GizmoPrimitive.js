import { Axis, Mode, HandleType, DEFAULT_COLORS } from './constants.js';
import { Vector3 } from '../math/Vector3.js';
import { Matrix4 } from '../math/Matrix4.js';

const HANDLE_DEFINITIONS = [
  { id: 'translate-x', mode: Mode.TRANSLATE, type: HandleType.AXIS, axis: Axis.X, priority: 3 },
  { id: 'translate-y', mode: Mode.TRANSLATE, type: HandleType.AXIS, axis: Axis.Y, priority: 3 },
  { id: 'translate-z', mode: Mode.TRANSLATE, type: HandleType.AXIS, axis: Axis.Z, priority: 3 },
  { id: 'translate-xy', mode: Mode.TRANSLATE, type: HandleType.PLANE, axis: 'xy', priority: 2 },
  { id: 'translate-yz', mode: Mode.TRANSLATE, type: HandleType.PLANE, axis: 'yz', priority: 2 },
  { id: 'translate-xz', mode: Mode.TRANSLATE, type: HandleType.PLANE, axis: 'xz', priority: 2 },
  { id: 'translate-screen', mode: Mode.TRANSLATE, type: HandleType.SCREEN, priority: 1 },
  { id: 'scale-x', mode: Mode.SCALE, type: HandleType.AXIS, axis: Axis.X, priority: 3 },
  { id: 'scale-y', mode: Mode.SCALE, type: HandleType.AXIS, axis: Axis.Y, priority: 3 },
  { id: 'scale-z', mode: Mode.SCALE, type: HandleType.AXIS, axis: Axis.Z, priority: 3 },
  { id: 'scale-uniform', mode: Mode.SCALE, type: HandleType.CENTER, axis: null, priority: 2 },
  { id: 'rotate-x', mode: Mode.ROTATE, type: HandleType.RING, axis: Axis.X, priority: 3 },
  { id: 'rotate-y', mode: Mode.ROTATE, type: HandleType.RING, axis: Axis.Y, priority: 3 },
  { id: 'rotate-z', mode: Mode.ROTATE, type: HandleType.RING, axis: Axis.Z, priority: 3 },
  { id: 'rotate-view', mode: Mode.ROTATE, type: HandleType.SCREEN, axis: null, priority: 2 }
];

function defaultHandleState(def, colors = DEFAULT_COLORS) {
  const color = def.axis ? colors[def.axis] || '#ffffff' : colors.highlight;
  return {
    id: def.id,
    mode: def.mode,
    type: def.type,
    axis: def.axis,
    priority: def.priority,
    color,
    baseColor: color,
    activeColor: colors.active,
    highlightColor: colors.highlight,
    visible: true,
    matrix: new Matrix4(),
    length: 1,
    radius: 0.1,
    thickness: 0.02,
    boundingSphere: { center: new Vector3(), radius: 1 }
  };
}

export class GizmoPrimitive {
  constructor(options = {}) {
    this.show = options.show ?? true;
    this.screenPixelRadius = options.screenPixelRadius || 96;
    this.minScale = options.minScale || 0.7;
    this.maxScale = options.maxScale || 2.5;
    this.colors = { ...DEFAULT_COLORS, ...(options.colors || {}) };
    this.handles = new Map();
    HANDLE_DEFINITIONS.forEach((def) => {
      this.handles.set(def.id, defaultHandleState(def, this.colors));
    });
    this._mode = Mode.TRANSLATE;
  }

  setMode(mode) {
    this._mode = mode;
  }

  setShow(show) {
    this.show = show;
  }

  getHandles() {
    return Array.from(this.handles.values()).filter((handle) => handle.visible && handle.mode === this._mode);
  }

  setHandleVisibility(filterFn) {
    this.handles.forEach((handle) => {
      handle.visible = filterFn(handle);
    });
  }

  setHighlight(handleId, state) {
    const handle = this.handles.get(handleId);
    if (!handle) return;
    if (state === 'active') {
      handle.color = handle.activeColor;
    } else if (state === 'hover') {
      handle.color = handle.highlightColor;
    } else {
      handle.color = handle.baseColor;
    }
  }

  update(frame, pivot, camera) {
    if (!frame) return;
    const distance = pivot.distanceTo(camera.position);
    const scale = this._computeScale(distance, camera);

    const baseMatrix = frame.matrix.clone();
    const handles = this.handles;

    const axisVectors = {
      [Axis.X]: frame.axes.x.clone(),
      [Axis.Y]: frame.axes.y.clone(),
      [Axis.Z]: frame.axes.z.clone()
    };

    handles.forEach((handle) => {
      if (handle.mode !== this._mode) return;
      const matrix = handle.matrix;
      matrix.identity();
      const position = pivot.clone();
      let axisVec = handle.axis ? axisVectors[handle.axis] : null;
      if (handle.mode === Mode.TRANSLATE) {
        handle.length = scale;
        if (handle.type === HandleType.AXIS && axisVec) {
          const end = position.clone().add(axisVec.clone().multiplyScalar(scale));
          handle.boundingSphere.center = position.clone().add(end).multiplyScalar(0.5);
          handle.boundingSphere.radius = scale * 0.6;
        } else if (handle.type === HandleType.PLANE) {
          handle.boundingSphere.center = position.clone();
          handle.boundingSphere.radius = scale * 0.7;
        } else if (handle.type === HandleType.SCREEN) {
          handle.boundingSphere.center = position.clone();
          handle.boundingSphere.radius = scale;
        }
      }

      if (handle.mode === Mode.SCALE) {
        handle.length = scale * 0.8;
        if (handle.type === HandleType.AXIS && axisVec) {
          const end = position.clone().add(axisVec.clone().multiplyScalar(handle.length));
          handle.boundingSphere.center = position.clone().add(end).multiplyScalar(0.5);
          handle.boundingSphere.radius = handle.length * 0.5;
        } else if (handle.type === HandleType.CENTER) {
          handle.boundingSphere.center = position.clone();
          handle.boundingSphere.radius = handle.length * 0.6;
        }
      }

      if (handle.mode === Mode.ROTATE) {
        const radius = scale * 1.1;
        handle.radius = radius;
        handle.boundingSphere.center = position.clone();
        handle.boundingSphere.radius = radius * 1.2;
      }
    });
  }

  _computeScale(distance, camera) {
    const fov = camera.fov || (Math.PI / 3);
    const height = 2 * Math.tan(fov / 2) * distance;
    const pixelSize = height / camera.viewportHeight;
    let scale = pixelSize * this.screenPixelRadius;
    scale = Math.max(this.minScale, Math.min(this.maxScale, scale));
    return scale;
  }
}
