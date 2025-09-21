import {
  BillboardCollection,
  Cartesian3,
  Color,
  Matrix3,
  PolylineCollection,
  type Scene
} from 'cesium';
import type { Axis, Frame, Mode } from './types';

interface HandleDefinition {
  id: string;
  mode: Mode;
  axis?: Axis;
  plane?: [Axis, Axis];
  color: Color;
  type: 'axis' | 'plane' | 'uniform' | 'ring';
  priority: number;
}

const AXIS_COLORS: Record<Axis, Color> = {
  x: Color.RED,
  y: Color.LIME,
  z: Color.BLUE
};

export const HANDLE_DEFINITIONS: HandleDefinition[] = [
  { id: 'translate-x', mode: 'translate', axis: 'x', color: AXIS_COLORS.x, type: 'axis', priority: 3 },
  { id: 'translate-y', mode: 'translate', axis: 'y', color: AXIS_COLORS.y, type: 'axis', priority: 3 },
  { id: 'translate-z', mode: 'translate', axis: 'z', color: AXIS_COLORS.z, type: 'axis', priority: 3 },
  { id: 'translate-xy', mode: 'translate', plane: ['x', 'y'], color: Color.YELLOW.withAlpha(0.4), type: 'plane', priority: 2 },
  { id: 'translate-xz', mode: 'translate', plane: ['x', 'z'], color: Color.CYAN.withAlpha(0.4), type: 'plane', priority: 2 },
  { id: 'translate-yz', mode: 'translate', plane: ['y', 'z'], color: Color.MAGENTA.withAlpha(0.4), type: 'plane', priority: 2 },
  { id: 'scale-x', mode: 'scale', axis: 'x', color: AXIS_COLORS.x, type: 'axis', priority: 3 },
  { id: 'scale-y', mode: 'scale', axis: 'y', color: AXIS_COLORS.y, type: 'axis', priority: 3 },
  { id: 'scale-z', mode: 'scale', axis: 'z', color: AXIS_COLORS.z, type: 'axis', priority: 3 },
  { id: 'scale-uniform', mode: 'scale', color: Color.WHITE, type: 'uniform', priority: 4 },
  { id: 'rotate-x', mode: 'rotate', axis: 'x', color: AXIS_COLORS.x.withAlpha(0.7), type: 'ring', priority: 1 },
  { id: 'rotate-y', mode: 'rotate', axis: 'y', color: AXIS_COLORS.y.withAlpha(0.7), type: 'ring', priority: 1 },
  { id: 'rotate-z', mode: 'rotate', axis: 'z', color: AXIS_COLORS.z.withAlpha(0.7), type: 'ring', priority: 1 },
  { id: 'rotate-view', mode: 'rotate', color: Color.WHITE.withAlpha(0.8), type: 'ring', priority: 0 }
];

const scratchMatrix3 = new Matrix3();
const scratchX = new Cartesian3();
const scratchY = new Cartesian3();
const scratchZ = new Cartesian3();

export class GizmoPrimitive {
  readonly handles = HANDLE_DEFINITIONS;
  private readonly polylines: PolylineCollection;
  private readonly billboards: BillboardCollection;
  private readonly polylineHandles: HandleDefinition[] = [];
  private readonly billboardHandles: HandleDefinition[] = [];
  private showInternal = true;
  private hoveredId?: string;
  private activeId?: string;
  private scale = 1.0;
  private frame?: Frame;

  constructor(private readonly scene: Scene) {
    this.polylines = new PolylineCollection({ scene });
    this.billboards = new BillboardCollection({ scene });
    this.scene.primitives.add(this.polylines);
    this.scene.primitives.add(this.billboards);
    this.createHandles();
  }

  get show(): boolean {
    return this.showInternal;
  }

  set show(value: boolean) {
    this.showInternal = value;
    this.polylines.show = value;
    this.billboards.show = value;
  }

  update(frame: Frame, scale: number): void {
    this.frame = frame;
    this.scale = scale;
    this.updateGeometry();
  }

  highlight(hoveredId?: string, activeId?: string): void {
    this.hoveredId = hoveredId;
    this.activeId = activeId;
    this.refreshColors();
  }

  destroy(): void {
    this.scene.primitives.remove(this.polylines);
    this.scene.primitives.remove(this.billboards);
    this.polylines.destroy();
    this.billboards.destroy();
  }

  private createHandles(): void {
    for (const handle of HANDLE_DEFINITIONS) {
      if (handle.type === 'axis' || handle.type === 'ring') {
        this.polylines.add({
          positions: [new Cartesian3(), new Cartesian3(0, 0, 1)],
          width: handle.type === 'ring' ? 2 : 4,
          id: handle.id,
          material: handle.color,
          show: true
        });
        this.polylineHandles.push(handle);
      } else {
        this.billboards.add({
          id: handle.id,
          color: handle.color,
          pixelOffset: new Cartesian3(),
          show: true,
          width: 12,
          height: 12,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        });
        this.billboardHandles.push(handle);
      }
    }
  }

  private updateGeometry(): void {
    if (!this.frame) {
      return;
    }
    const orientation = Matrix3.fromColumns(
      Cartesian3.normalize(this.frame.axes.x, scratchX),
      Cartesian3.normalize(this.frame.axes.y, scratchY),
      Cartesian3.normalize(this.frame.axes.z, scratchZ),
      scratchMatrix3
    );
    for (let i = 0; i < this.polylines.length; i++) {
      const polyline = this.polylines.get(i);
      const handle = this.polylineHandles[i];
      if (!handle) {
        continue;
      }
      if (handle.type === 'axis') {
        const direction = axisVector(handle.axis!, orientation, new Cartesian3());
        const endPoint = Cartesian3.add(
          this.frame.origin,
          Cartesian3.multiplyByScalar(direction, this.scale, new Cartesian3()),
          new Cartesian3()
        );
        polyline.positions = [Cartesian3.clone(this.frame.origin), endPoint];
      } else if (handle.type === 'ring') {
        polyline.positions = buildCirclePoints(
          this.frame.origin,
          orientation,
          handle.axis,
          this.scale * (handle.id === 'rotate-view' ? 1.4 : 1.1)
        );
      }
    }

    for (let i = 0; i < this.billboards.length; i++) {
      const billboard = this.billboards.get(i);
      const handle = this.billboardHandles[i];
      if (!billboard) {
        continue;
      }
      const scale = this.scale * 0.7;
      if (handle.type === 'plane' && handle.plane) {
        const [a, b] = handle.plane;
        const offset = Cartesian3.add(
          this.frame.origin,
          Cartesian3.add(
            Cartesian3.multiplyByScalar(axisVector(a, orientation, new Cartesian3()), scale * 0.6, new Cartesian3()),
            Cartesian3.multiplyByScalar(axisVector(b, orientation, new Cartesian3()), scale * 0.6, new Cartesian3()),
            new Cartesian3()
          ),
          new Cartesian3()
        );
        billboard.position = offset;
        billboard.width = this.scale * 10;
        billboard.height = this.scale * 10;
      } else if (handle.type === 'uniform') {
        billboard.position = Cartesian3.clone(this.frame.origin);
        billboard.width = this.scale * 12;
        billboard.height = this.scale * 12;
      }
    }
    this.refreshColors();
  }

  private refreshColors(): void {
    for (let i = 0; i < this.polylines.length; i++) {
      const polyline = this.polylines.get(i);
      const handle = this.polylineHandles[i];
      if (!handle) {
        continue;
      }
      const color = getStatefulColor(handle, this.hoveredId, this.activeId);
      polyline.material = color;
    }
    for (let i = 0; i < this.billboards.length; i++) {
      const billboard = this.billboards.get(i);
      const handle = this.billboardHandles[i];
      if (!billboard) {
        continue;
      }
      const color = getStatefulColor(handle, this.hoveredId, this.activeId);
      billboard.color = color;
    }
  }
}

function axisVector(axis: Axis | undefined, orientation: Matrix3, result: Cartesian3): Cartesian3 {
  switch (axis) {
    case 'x':
      return Matrix3.getColumn(orientation, 0, result);
    case 'y':
      return Matrix3.getColumn(orientation, 1, result);
    case 'z':
    default:
      return Matrix3.getColumn(orientation, 2, result);
  }
}

function buildCirclePoints(origin: Cartesian3, orientation: Matrix3, axis: Axis | undefined, radius: number): Cartesian3[] {
  const points: Cartesian3[] = [];
  const segments = 64;
  let localX: Cartesian3;
  let localY: Cartesian3;
  switch (axis) {
    case 'x':
      localX = Matrix3.getColumn(orientation, 1, new Cartesian3());
      localY = Matrix3.getColumn(orientation, 2, new Cartesian3());
      break;
    case 'y':
      localX = Matrix3.getColumn(orientation, 0, new Cartesian3());
      localY = Matrix3.getColumn(orientation, 2, new Cartesian3());
      break;
    case 'z':
    default:
      localX = Matrix3.getColumn(orientation, 0, new Cartesian3());
      localY = Matrix3.getColumn(orientation, 1, new Cartesian3());
      break;
  }
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const point = Cartesian3.add(
      origin,
      Cartesian3.add(
        Cartesian3.multiplyByScalar(localX, Math.cos(angle) * radius, new Cartesian3()),
        Cartesian3.multiplyByScalar(localY, Math.sin(angle) * radius, new Cartesian3()),
        new Cartesian3()
      ),
      new Cartesian3()
    );
    points.push(point);
  }
  return points;
}

function getStatefulColor(handle: HandleDefinition, hoveredId?: string, activeId?: string): Color {
  if (handle.id === activeId) {
    return handle.color.withAlpha(1.0);
  }
  if (handle.id === hoveredId) {
    return handle.color.withAlpha(Math.min(1.0, handle.color.alpha + 0.2));
  }
  return handle.color;
}
