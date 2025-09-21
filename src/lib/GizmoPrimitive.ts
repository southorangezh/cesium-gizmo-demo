import {
  Cartesian3,
  Color,
  CustomDataSource,
  Entity,
  JulianDate,
  PolygonHierarchy,
  PolylineGlowMaterialProperty,
  Viewer,
} from 'cesium';
import type { Axis, HandleInfo, HandleType, Mode } from './types';
import type { Frame } from './FrameBuilder';

interface HandleDefinition {
  id: string;
  type: HandleType;
  mode: Mode;
  axis?: Axis;
  planeAxes?: [Axis, Axis];
  entity: Entity;
}

const AXIS_COLORS: Record<Axis, Color> = {
  x: Color.RED,
  y: Color.LIME,
  z: Color.CYAN,
};

const ACTIVE_MULTIPLIER = 1.6;

export class GizmoPrimitive {
  private readonly dataSource: CustomDataSource;
  private readonly handles: HandleDefinition[] = [];
  private highlighted: string | null = null;
  private active: string | null = null;
  private readonly scratch = new Cartesian3();

  constructor(private readonly viewer: Viewer) {
    this.dataSource = new CustomDataSource('universal-manipulator');
    void this.viewer.dataSources.add(this.dataSource);
    this.createHandles();
  }

  getEntities(): Entity[] {
    return this.handles.map((h) => h.entity);
  }

  update(frame: Frame, screenScale: number): void {
    for (const handle of this.handles) {
      switch (handle.type) {
        case 'translate-axis':
          this.updateAxisHandle(handle, frame, screenScale);
          break;
        case 'translate-plane':
          this.updatePlaneHandle(handle, frame, screenScale);
          break;
        case 'rotate-axis':
          this.updateRotateHandle(handle, frame, screenScale);
          break;
        case 'rotate-view':
          this.updateViewHandle(handle, frame, screenScale);
          break;
        case 'scale-axis':
          this.updateScaleAxisHandle(handle, frame, screenScale);
          break;
        case 'scale-uniform':
          this.updateScaleUniformHandle(handle, frame, screenScale);
          break;
        case 'translate-free':
          this.updateTranslateFreeHandle(handle, frame, screenScale);
          break;
      }
    }
  }

  setShow(show: boolean): void {
    this.dataSource.show = show;
  }

  getHandle(id: string): HandleDefinition | undefined {
    return this.handles.find((h) => h.id === id);
  }

  setHighlight(handleId: string | null, active: boolean): void {
    if (active) {
      this.active = handleId;
    } else {
      this.highlighted = handleId;
    }
    this.refreshColors();
  }

  getHandleInfo(): HandleInfo[] {
    return this.handles.map((h) => ({
      id: h.id,
      type: h.type,
      mode: h.mode,
      axis: h.axis,
      planeAxes: h.planeAxes,
      priority: this.priorityForHandle(h.type),
      screenPosition: null,
    }));
  }

  destroy(): void {
    void this.viewer.dataSources.remove(this.dataSource, true);
  }

  private createHandles(): void {
    this.handles.push(
      ...(['x', 'y', 'z'] as Axis[]).map((axis) => ({
        id: `translate-axis-${axis}`,
        type: 'translate-axis' as HandleType,
        mode: 'translate' as Mode,
        axis,
        entity: this.createPolylineEntity(AXIS_COLORS[axis]),
      })),
    );
    this.handles.push(
      ...(
        [
          { axes: ['x', 'y'] as [Axis, Axis], color: Color.YELLOW },
          { axes: ['y', 'z'] as [Axis, Axis], color: Color.AQUA },
          { axes: ['x', 'z'] as [Axis, Axis], color: Color.MAGENTA },
        ]
      ).map(({ axes, color }, index) => ({
        id: `translate-plane-${axes.join('')}`,
        type: 'translate-plane' as HandleType,
        mode: 'translate' as Mode,
        planeAxes: axes,
        entity: this.createPolygonEntity(color.withAlpha(0.2)),
      })),
    );
    this.handles.push({
      id: 'translate-free',
      type: 'translate-free',
      mode: 'translate',
      entity: this.createSphereEntity(Color.WHITE.withAlpha(0.3), 0.15),
    });
    this.handles.push(
      ...(['x', 'y', 'z'] as Axis[]).map((axis) => ({
        id: `rotate-axis-${axis}`,
        type: 'rotate-axis' as HandleType,
        mode: 'rotate' as Mode,
        axis,
        entity: this.createRingEntity(AXIS_COLORS[axis]),
      })),
    );
    this.handles.push({
      id: 'rotate-view',
      type: 'rotate-view',
      mode: 'rotate',
      entity: this.createRingEntity(Color.WHITE),
    });
    this.handles.push(
      ...(['x', 'y', 'z'] as Axis[]).map((axis) => ({
        id: `scale-axis-${axis}`,
        type: 'scale-axis' as HandleType,
        mode: 'scale' as Mode,
        axis,
        entity: this.createBoxEntity(AXIS_COLORS[axis]),
      })),
    );
    this.handles.push({
      id: 'scale-uniform',
      type: 'scale-uniform',
      mode: 'scale',
      entity: this.createBoxEntity(Color.WHITE),
    });
  }

  private createPolylineEntity(color: Color): Entity {
    const entity = this.dataSource.entities.add({
      polyline: {
        positions: [Cartesian3.ZERO, Cartesian3.UNIT_X],
        width: 3,
        material: new PolylineGlowMaterialProperty({ color }),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    entity.show = true;
    return entity;
  }

  private createPolygonEntity(color: Color): Entity {
    const entity = this.dataSource.entities.add({
      polygon: {
        hierarchy: new PolygonHierarchy([Cartesian3.ZERO, Cartesian3.UNIT_X, Cartesian3.UNIT_Y]),
        material: color,
        outline: true,
        outlineColor: color.withAlpha(0.5),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    return entity;
  }

  private createRingEntity(color: Color): Entity {
    const entity = this.dataSource.entities.add({
      polyline: {
        positions: this.circlePositions(1),
        width: 2,
        material: new PolylineGlowMaterialProperty({ color }),
        loop: true,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    return entity;
  }

  private createBoxEntity(color: Color, size = 0.15): Entity {
    return this.dataSource.entities.add({
      box: {
        dimensions: new Cartesian3(size, size, size),
        material: color,
        outline: true,
        outlineColor: Color.WHITE.withAlpha(0.3),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
  }

  private createSphereEntity(color: Color, radius: number): Entity {
    return this.dataSource.entities.add({
      ellipsoid: {
        radii: new Cartesian3(radius, radius, radius),
        material: color,
        outline: true,
        outlineColor: Color.WHITE.withAlpha(0.3),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
  }

  private updateAxisHandle(handle: HandleDefinition, frame: Frame, scale: number): void {
    const axis = handle.axis!;
    const direction = frame.axes[axis];
    const origin = frame.origin;
    const length = scale * 2.4;
    const end = Cartesian3.add(origin, Cartesian3.multiplyByScalar(direction, length, new Cartesian3()), new Cartesian3());
    handle.entity.polyline!.positions = [origin, end];
  }

  private updatePlaneHandle(handle: HandleDefinition, frame: Frame, scale: number): void {
    const [a, b] = handle.planeAxes!;
    const origin = frame.origin;
    const axisA = Cartesian3.multiplyByScalar(frame.axes[a], scale, new Cartesian3());
    const axisB = Cartesian3.multiplyByScalar(frame.axes[b], scale, new Cartesian3());
    const p0 = origin;
    const p1 = Cartesian3.add(origin, axisA, new Cartesian3());
    const p2 = Cartesian3.add(origin, Cartesian3.add(axisA, axisB, new Cartesian3()), new Cartesian3());
    const p3 = Cartesian3.add(origin, axisB, new Cartesian3());
    handle.entity.polygon!.hierarchy = new PolygonHierarchy([p0, p1, p2, p3]);
  }

  private updateRotateHandle(handle: HandleDefinition, frame: Frame, scale: number): void {
    const axis = handle.axis!;
    const radius = scale * 2.6;
    handle.entity.polyline!.positions = this.circleInPlane(frame.origin, frame.axes[axis], radius);
  }

  private updateViewHandle(handle: HandleDefinition, frame: Frame, scale: number): void {
    const cameraDir = Cartesian3.normalize(this.viewer.camera.directionWC, new Cartesian3());
    const radius = scale * 3;
    handle.entity.polyline!.positions = this.circleInPlane(frame.origin, cameraDir, radius);
  }

  private updateScaleAxisHandle(handle: HandleDefinition, frame: Frame, scale: number): void {
    const axis = handle.axis!;
    const direction = frame.axes[axis];
    const origin = frame.origin;
    const length = scale * 2.2;
    const center = Cartesian3.add(origin, Cartesian3.multiplyByScalar(direction, length, new Cartesian3()), new Cartesian3());
    handle.entity.position = center;
    handle.entity.box!.dimensions = new Cartesian3(scale * 0.5, scale * 0.5, scale * 0.5);
  }

  private updateScaleUniformHandle(handle: HandleDefinition, frame: Frame, scale: number): void {
    handle.entity.position = Cartesian3.clone(frame.origin, new Cartesian3());
    handle.entity.box!.dimensions = new Cartesian3(scale * 0.7, scale * 0.7, scale * 0.7);
  }

  private updateTranslateFreeHandle(handle: HandleDefinition, frame: Frame, scale: number): void {
    handle.entity.position = Cartesian3.clone(frame.origin, new Cartesian3());
    handle.entity.ellipsoid!.radii = new Cartesian3(scale * 0.4, scale * 0.4, scale * 0.4);
  }

  private circlePositions(radius: number, segments = 48): Cartesian3[] {
    const positions: Cartesian3[] = [];
    for (let i = 0; i < segments; i += 1) {
      const angle = (i / segments) * Math.PI * 2;
      positions.push(new Cartesian3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0));
    }
    positions.push(positions[0]);
    return positions;
  }

  private circleInPlane(origin: Cartesian3, normal: Cartesian3, radius: number, segments = 64): Cartesian3[] {
    const positions: Cartesian3[] = [];
    const arbitrary = Math.abs(Cartesian3.dot(normal, Cartesian3.UNIT_Z)) > 0.9 ? Cartesian3.UNIT_X : Cartesian3.UNIT_Z;
    const tangent = Cartesian3.normalize(Cartesian3.cross(normal, arbitrary, new Cartesian3()), new Cartesian3());
    const bitangent = Cartesian3.normalize(Cartesian3.cross(normal, tangent, new Cartesian3()), new Cartesian3());
    for (let i = 0; i <= segments; i += 1) {
      const angle = (i / segments) * Math.PI * 2;
      const offset = Cartesian3.add(
        Cartesian3.multiplyByScalar(tangent, Math.cos(angle) * radius, new Cartesian3()),
        Cartesian3.multiplyByScalar(bitangent, Math.sin(angle) * radius, new Cartesian3()),
        new Cartesian3(),
      );
      positions.push(Cartesian3.add(origin, offset, new Cartesian3()));
    }
    return positions;
  }

  private refreshColors(): void {
    for (const handle of this.handles) {
      const isActive = this.active === handle.id;
      const isHighlighted = this.highlighted === handle.id;
      const factor = isActive ? ACTIVE_MULTIPLIER : isHighlighted ? 1.2 : 1;
      const color = handle.axis ? AXIS_COLORS[handle.axis] : Color.WHITE;
      switch (handle.type) {
        case 'translate-axis':
          handle.entity.polyline!.material = new PolylineGlowMaterialProperty({ color: color.withAlpha(factor > 1 ? 1 : 0.9), glowPower: 0.2 * factor });
          handle.entity.polyline!.width = 3 * factor;
          break;
        case 'rotate-axis':
        case 'rotate-view':
          handle.entity.polyline!.material = new PolylineGlowMaterialProperty({ color: color.withAlpha(factor > 1 ? 1 : 0.9), glowPower: 0.15 * factor });
          handle.entity.polyline!.width = 2.2 * factor;
          break;
        case 'scale-axis':
        case 'scale-uniform':
          handle.entity.box!.material = color.withAlpha(0.9);
          handle.entity.box!.outlineWidth = isActive ? 3 : 1;
          break;
        case 'translate-plane':
          handle.entity.polygon!.material = color.withAlpha(isActive ? 0.35 : 0.2);
          break;
        case 'translate-free':
          handle.entity.ellipsoid!.material = Color.WHITE.withAlpha(isActive ? 0.6 : 0.3);
          break;
      }
    }
  }

  private priorityForHandle(type: HandleType): number {
    switch (type) {
      case 'translate-axis':
      case 'scale-axis':
        return 3;
      case 'translate-plane':
        return 2;
      case 'rotate-axis':
        return 4;
      case 'rotate-view':
        return 1;
      default:
        return 1;
    }
  }
}
