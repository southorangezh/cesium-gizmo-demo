import { Axis, Mode } from '../types.js';
import { FrameState } from './FrameBuilder.js';
import { Vector3 } from '../math/Vector3.js';

interface HandleDescriptor {
  id: string;
  mode: Mode;
  axis?: Axis;
  type: 'axis' | 'plane' | 'ring' | 'uniform';
  color: any;
  highlightColor: any;
  activeColor: any;
  primitive: any;
}

const AXIS_COLOR: Record<Axis, any> = {
  x: () => Cesium.Color.RED,
  y: () => Cesium.Color.GREEN,
  z: () => Cesium.Color.BLUE
};

const ACTIVE_MULTIPLIER = 1.6;
const HOVER_MULTIPLIER = 1.2;

export interface GizmoSizeOptions {
  radius: number;
  minScale: number;
  maxScale: number;
}

export class GizmoPrimitive {
  private readonly scene: any;
  private readonly root: any;
  private readonly axisLines: any;
  private readonly points: any;
  private readonly rings: any;
  private readonly handles = new Map<string, HandleDescriptor>();
  private visible = true;
  private modeVisibility: Partial<Record<Mode, boolean>> = {
    translate: true,
    rotate: true,
    scale: true
  };

  constructor(scene: any) {
    this.scene = scene;
    this.root = new Cesium.PrimitiveCollection();
    this.axisLines = new Cesium.PolylineCollection();
    this.points = new Cesium.PointPrimitiveCollection();
    this.rings = new Cesium.PolylineCollection();

    this.root.add(this.axisLines);
    this.root.add(this.points);
    this.root.add(this.rings);
    this.scene.primitives.add(this.root);

    this.buildHandles();
    this.applyVisibility();
  }

  getHandle(id: string): HandleDescriptor | undefined {
    return this.handles.get(id);
  }

  getHandleIds(): string[] {
    return Array.from(this.handles.keys());
  }

  private buildHandles(): void {
    this.createTranslateHandles();
    this.createScaleHandles();
    this.createRotationRings();
  }

  private createTranslateHandles(): void {
    (['x', 'y', 'z'] as Axis[]).forEach((axis) => {
      const polyline = this.axisLines.add({
        positions: [Cesium.Cartesian3.ZERO, Cesium.Cartesian3.UNIT_X],
        width: 6,
        material: new Cesium.PolylineOutlineMaterialProperty({
          color: AXIS_COLOR[axis](),
          outlineWidth: 0,
          outlineColor: AXIS_COLOR[axis]()
        })
      });
      polyline.id = `translate-${axis}`;
      this.handles.set(polyline.id, {
        id: polyline.id,
        mode: 'translate',
        axis,
        type: 'axis',
        color: AXIS_COLOR[axis](),
        highlightColor: AXIS_COLOR[axis]().brighten(HOVER_MULTIPLIER, new Cesium.Color()),
        activeColor: AXIS_COLOR[axis]().brighten(ACTIVE_MULTIPLIER, new Cesium.Color()),
        primitive: polyline
      });
    });
  }

  private createScaleHandles(): void {
    (['x', 'y', 'z'] as Axis[]).forEach((axis) => {
      const point = this.points.add({
        position: Cesium.Cartesian3.ZERO,
        color: AXIS_COLOR[axis](),
        pixelSize: 14,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2
      });
      point.id = `scale-${axis}`;
      this.handles.set(point.id, {
        id: point.id,
        mode: 'scale',
        axis,
        type: 'axis',
        color: AXIS_COLOR[axis](),
        highlightColor: AXIS_COLOR[axis]().brighten(HOVER_MULTIPLIER, new Cesium.Color()),
        activeColor: AXIS_COLOR[axis]().brighten(ACTIVE_MULTIPLIER, new Cesium.Color()),
        primitive: point
      });
    });

    const uniform = this.points.add({
      position: Cesium.Cartesian3.ZERO,
      color: Cesium.Color.WHITE,
      pixelSize: 16,
      outlineColor: Cesium.Color.GRAY,
      outlineWidth: 2
    });
    uniform.id = 'scale-uniform';
    this.handles.set(uniform.id, {
      id: uniform.id,
      mode: 'scale',
      type: 'uniform',
      color: Cesium.Color.WHITE,
      highlightColor: Cesium.Color.WHITE.brighten(HOVER_MULTIPLIER, new Cesium.Color()),
      activeColor: Cesium.Color.WHITE.brighten(ACTIVE_MULTIPLIER, new Cesium.Color()),
      primitive: uniform
    });
  }

  private createRotationRings(): void {
    const axes: Array<Axis | 'view'> = ['x', 'y', 'z', 'view'];
    axes.forEach((axis) => {
      const polyline = this.rings.add({
        positions: [],
        width: 3,
        material: new Cesium.PolylineOutlineMaterialProperty({
          color: axis === 'view' ? Cesium.Color.WHITE : AXIS_COLOR[axis as Axis](),
          outlineWidth: 0,
          outlineColor: axis === 'view' ? Cesium.Color.WHITE : AXIS_COLOR[axis as Axis]()
        })
      });
      const id = axis === 'view' ? 'rotate-view' : `rotate-${axis}`;
      polyline.id = id;
      const baseColor = axis === 'view' ? Cesium.Color.WHITE : AXIS_COLOR[axis as Axis]();
      this.handles.set(id, {
        id,
        mode: 'rotate',
        axis: axis === 'view' ? undefined : (axis as Axis),
        type: 'ring',
        color: baseColor,
        highlightColor: baseColor.brighten(HOVER_MULTIPLIER, new Cesium.Color()),
        activeColor: baseColor.brighten(ACTIVE_MULTIPLIER, new Cesium.Color()),
        primitive: polyline
      });
    });
  }

  update(frame: FrameState, size: GizmoSizeOptions, cameraPosition: Vector3): void {
    const scale = this.computeScale(frame.origin, cameraPosition, size);
    this.updateTranslateHandles(frame, scale);
    this.updateScaleHandles(frame, scale);
    this.updateRotationRings(frame, scale, cameraPosition);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.applyVisibility();
  }

  setModeEnabled(mode: Mode, enabled: boolean): void {
    this.modeVisibility[mode] = enabled;
    this.handles.forEach((handle) => {
      if (handle.mode === mode) {
        if (handle.primitive.show !== undefined) {
          handle.primitive.show = enabled;
        }
        if (handle.primitive.material) {
          handle.primitive.material.show = enabled;
        }
      }
    });
  }

  highlight(handleId: string | undefined, state: 'none' | 'hover' | 'active'): void {
    this.handles.forEach((handle) => {
      const material = handle.primitive.material ?? handle.primitive;
      const color = this.resolveColor(handle, handle.id === handleId ? state : 'none');
      if (handle.type === 'ring' || handle.type === 'axis') {
        if (material && material.color) {
          material.color = color;
        }
        if (handle.primitive.color) {
          handle.primitive.color = color;
        }
      } else if (handle.type === 'uniform') {
        handle.primitive.color = color;
      }
    });
  }

  destroy(): void {
    if (!this.root.isDestroyed()) {
      this.scene.primitives.remove(this.root);
      this.root.destroy();
    }
    this.handles.clear();
  }

  private applyVisibility(): void {
    this.root.show = this.visible;
  }

  private updateTranslateHandles(frame: FrameState, scale: number): void {
    (['x', 'y', 'z'] as Axis[]).forEach((axis) => {
      const handle = this.handles.get(`translate-${axis}`);
      if (!handle) {
        return;
      }
      const direction = frame.axes[axis].clone().normalize();
      const start = frame.origin.clone();
      const end = frame.origin.clone().add(direction.multiplyScalar(scale));
      handle.primitive.positions = [toCartesian(start), toCartesian(end)];
    });
  }

  private updateScaleHandles(frame: FrameState, scale: number): void {
    const uniform = this.handles.get('scale-uniform');
    if (uniform) {
      uniform.primitive.position = toCartesian(frame.origin);
      uniform.primitive.pixelSize = Math.max(12, scale * 8);
    }

    (['x', 'y', 'z'] as Axis[]).forEach((axis) => {
      const handle = this.handles.get(`scale-${axis}`);
      if (!handle) {
        return;
      }
      const direction = frame.axes[axis].clone().normalize();
      const position = frame.origin.clone().add(direction.multiplyScalar(scale));
      handle.primitive.position = toCartesian(position);
      handle.primitive.pixelSize = Math.max(12, scale * 6);
    });
  }

  private updateRotationRings(frame: FrameState, scale: number, cameraPosition: Vector3): void {
    const segments = 64;
    const radius = scale * 1.2;

    (['x', 'y', 'z'] as Axis[]).forEach((axis) => {
      const handle = this.handles.get(`rotate-${axis}`);
      if (!handle) {
        return;
      }
      const axisVector = frame.axes[axis].clone().normalize();
      const basis = this.rotationBasis(axisVector, frame, axis);
      const positions = [] as any[];
      for (let i = 0; i <= segments; i += 1) {
        const t = (i / segments) * Math.PI * 2;
        const radial = basis.u.clone().multiplyScalar(Math.cos(t)).add(basis.v.clone().multiplyScalar(Math.sin(t)));
        const point = frame.origin.clone().add(radial.multiplyScalar(radius));
        positions.push(toCartesian(point));
      }
      handle.primitive.positions = positions;
    });

    const viewHandle = this.handles.get('rotate-view');
    if (viewHandle) {
      const viewDir = cameraPosition.clone().subtract(frame.origin).normalize();
      const basis = this.rotationBasis(viewDir, frame, 'z');
      const positions = [] as any[];
      for (let i = 0; i <= segments; i += 1) {
        const t = (i / segments) * Math.PI * 2;
        const radial = basis.u.clone().multiplyScalar(Math.cos(t)).add(basis.v.clone().multiplyScalar(Math.sin(t)));
        const point = frame.origin.clone().add(radial.multiplyScalar(radius * 1.1));
        positions.push(toCartesian(point));
      }
      viewHandle.primitive.positions = positions;
    }
  }

  private rotationBasis(axis: Vector3, frame: FrameState, fallbackAxis: Axis | 'view'): { u: Vector3; v: Vector3 } {
    let u: Vector3;
    let v: Vector3;
    if (fallbackAxis === 'x') {
      u = frame.axes.y.clone().normalize();
      v = frame.axes.z.clone().normalize();
    } else if (fallbackAxis === 'y') {
      u = frame.axes.x.clone().normalize();
      v = frame.axes.z.clone().normalize();
    } else {
      u = frame.axes.x.clone().normalize();
      v = frame.axes.y.clone().normalize();
    }

    u = u.projectOnPlane(axis);
    if (u.length() < 1e-6) {
      u = frame.axes.y.clone().projectOnPlane(axis);
    }
    u.normalize();
    v = axis.clone().cross(u).normalize();
    return { u, v };
  }

  private computeScale(origin: Vector3, cameraPosition: Vector3, size: GizmoSizeOptions): number {
    const distance = origin.distanceTo(cameraPosition);
    const base = size.radius;
    const scale = Math.min(Math.max(distance * 0.1, size.minScale), size.maxScale);
    return Math.max(base, scale);
  }

  private resolveColor(handle: HandleDescriptor, state: 'none' | 'hover' | 'active') {
    switch (state) {
      case 'hover':
        return handle.highlightColor;
      case 'active':
        return handle.activeColor;
      default:
        return handle.color;
    }
  }
}

function toCartesian(vector: Vector3): any {
  return new Cesium.Cartesian3(vector.x, vector.y, vector.z);
}
