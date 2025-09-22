import { FrameState, Axis, Mode } from './types.js';
import { Vector3 } from '../utils/math/Vector3.js';

type HandleType =
  | 'translate-axis'
  | 'translate-plane'
  | 'rotate-axis'
  | 'rotate-view'
  | 'scale-axis'
  | 'scale-uniform';

interface HandleDefinition {
  id: string;
  type: HandleType;
  mode: Mode;
  axis?: Axis;
  planeAxes?: [Axis, Axis];
  uniformScale?: boolean;
  color: string;
  entity: any;
}

interface GizmoPrimitiveOptions {
  viewer: any;
  screenPixelRadius: number;
  minScale: number;
  maxScale: number;
}

function getCesium(): any {
  const Cesium = (globalThis as any).Cesium;
  if (!Cesium) {
    throw new Error('Cesium global is required for GizmoPrimitive');
  }
  return Cesium;
}

function axisVector(frame: FrameState, axis: Axis): Vector3 {
  const arr = frame.axes[axis];
  return Vector3.fromArray(arr).normalize();
}

function toCartesian(array: [number, number, number]): any {
  const Cesium = getCesium();
  return new Cesium.Cartesian3(array[0], array[1], array[2]);
}

function computeScale(options: GizmoPrimitiveOptions, frame: FrameState): number {
  const Cesium = getCesium();
  const viewer = options.viewer;
  const pivot = toCartesian(frame.pivot);
  const camera = viewer.camera;
  const position = camera.positionWC || camera.position;
  const distance = Cesium.Cartesian3.distance(position, pivot);
  let fovy = camera.frustum && camera.frustum.fovy ? camera.frustum.fovy : camera.frustum.fov;
  if (!fovy) {
    fovy = Cesium.Math.toRadians(60);
  }
  const canvasHeight = viewer.scene.canvas.height || 1080;
  const metersPerPixel = (2 * distance * Math.tan(fovy / 2)) / canvasHeight;
  const raw = metersPerPixel * options.screenPixelRadius;
  return Cesium.Math.clamp(raw, options.minScale, options.maxScale);
}

function generateCirclePoints(
  pivot: Vector3,
  axis: Vector3,
  radius: number,
  segments: number
): any[] {
  const Cesium = getCesium();
  const normalized = axis.normalize();
  let reference = Math.abs(normalized.x) < 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
  reference = Vector3.rejectFromVector(reference, normalized).normalize();
  const binormal = normalized.cross(reference).normalize();
  const points: any[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const dir = reference.multiplyByScalar(Math.cos(angle)).add(binormal.multiplyByScalar(Math.sin(angle)));
    const position = pivot.add(dir.multiplyByScalar(radius));
    points.push(new Cesium.Cartesian3(position.x, position.y, position.z));
  }
  return points;
}

export class GizmoPrimitive {
  private viewer: any;
  private options: GizmoPrimitiveOptions;
  private handles: HandleDefinition[] = [];
  private frame?: FrameState;
  private show = true;
  private highlightId?: string;
  private activeId?: string;
  private modeVisibility: Record<Mode, boolean> = {
    translate: true,
    rotate: true,
    scale: true
  };

  constructor(options: GizmoPrimitiveOptions) {
    this.viewer = options.viewer;
    this.options = options;
    this.createHandles();
  }

  private createHandles(): void {
    const Cesium = getCesium();
    const dataSource = new Cesium.CustomDataSource('gizmo');
    this.viewer.dataSources.add(dataSource);

    const addHandle = (definition: Omit<HandleDefinition, 'entity'>) => {
      const entity = dataSource.entities.add({
        id: definition.id,
        show: this.show && this.modeVisibility[definition.mode]
      });
      const handle: HandleDefinition = { ...definition, entity };
      this.handles.push(handle);
    };

    const axisIds: Axis[] = ['x', 'y', 'z'];

    axisIds.forEach((axis) => {
      addHandle({
        id: `translate-axis-${axis}`,
        type: 'translate-axis',
        mode: 'translate',
        axis,
        color: axis,
        planeAxes: undefined,
        uniformScale: false
      });
      addHandle({
        id: `rotate-axis-${axis}`,
        type: 'rotate-axis',
        mode: 'rotate',
        axis,
        color: axis,
        planeAxes: undefined,
        uniformScale: false
      });
      addHandle({
        id: `scale-axis-${axis}`,
        type: 'scale-axis',
        mode: 'scale',
        axis,
        color: axis,
        planeAxes: undefined,
        uniformScale: false
      });
    });

    addHandle({
      id: 'translate-plane-xy',
      type: 'translate-plane',
      mode: 'translate',
      planeAxes: ['x', 'y'],
      color: 'xy',
      uniformScale: false
    });
    addHandle({
      id: 'translate-plane-yz',
      type: 'translate-plane',
      mode: 'translate',
      planeAxes: ['y', 'z'],
      color: 'yz',
      uniformScale: false
    });
    addHandle({
      id: 'translate-plane-xz',
      type: 'translate-plane',
      mode: 'translate',
      planeAxes: ['x', 'z'],
      color: 'xz',
      uniformScale: false
    });

    addHandle({
      id: 'rotate-view',
      type: 'rotate-view',
      mode: 'rotate',
      color: 'white',
      uniformScale: false
    });

    addHandle({
      id: 'scale-uniform',
      type: 'scale-uniform',
      mode: 'scale',
      color: 'white',
      uniformScale: true
    });
  }

  setShow(show: boolean): void {
    this.show = show;
    this.updateVisibility();
  }

  setFrame(frame: FrameState): void {
    this.frame = frame;
    this.updateGeometry();
  }

  updateSize(params: { screenPixelRadius?: number; minScale?: number; maxScale?: number }): void {
    this.options = {
      ...this.options,
      screenPixelRadius: params.screenPixelRadius ?? this.options.screenPixelRadius,
      minScale: params.minScale ?? this.options.minScale,
      maxScale: params.maxScale ?? this.options.maxScale
    };
    if (this.frame) {
      this.updateGeometry();
    }
  }

  setModeVisibility(visibility: Partial<Record<Mode, boolean>>): void {
    this.modeVisibility = {
      ...this.modeVisibility,
      ...visibility
    } as Record<Mode, boolean>;
    this.updateVisibility();
  }

  setHighlight(handleId?: string, active = false): void {
    this.highlightId = handleId;
    this.activeId = active ? handleId : this.activeId;
    this.applyVisualState();
  }

  private applyVisualState(): void {
    const Cesium = getCesium();
    this.handles.forEach((handle) => {
      const baseColor = this.resolveColor(handle.color, handle.axis);
      let color = baseColor;
      if (handle.id === this.activeId) {
        color = this.getActiveColor(baseColor);
      } else if (handle.id === this.highlightId) {
        color = this.getHoverColor(baseColor);
      }
      if (handle.entity.polyline) {
        handle.entity.polyline.material = color;
      }
      if (handle.entity.polygon) {
        const alphaColor = this.withAlpha(color, 0.3);
        handle.entity.polygon.material = alphaColor;
        handle.entity.polygon.outline = true;
        handle.entity.polygon.outlineColor = color;
      }
      if (handle.entity.ellipse) {
        handle.entity.ellipse.material = this.withAlpha(color, 0.4);
        handle.entity.ellipse.outline = true;
        handle.entity.ellipse.outlineColor = color;
      }
      if (handle.entity.point) {
        handle.entity.point.color = color;
      }
    });
  }

  private updateGeometry(): void {
    if (!this.frame) return;
    const Cesium = getCesium();
    const scale = computeScale(this.options, this.frame);
    const pivot = Vector3.fromArray(this.frame.pivot);

    this.handles.forEach((handle) => {
      switch (handle.type) {
        case 'translate-axis': {
          const axisVec = axisVector(this.frame!, handle.axis!);
          const end = pivot.add(axisVec.multiplyByScalar(scale));
          handle.entity.polyline = {
            positions: [toCartesian(pivot.toArray()), toCartesian(end.toArray())],
            width: 4,
            material: this.resolveColor(handle.color, handle.axis)
          };
          handle.entity.polyline.clampToGround = false;
          handle.entity.polyline.depthFailMaterial = this.resolveColor(handle.color, handle.axis);
          break;
        }
        case 'translate-plane': {
          const axisU = axisVector(this.frame!, handle.planeAxes![0]);
          const axisV = axisVector(this.frame!, handle.planeAxes![1]);
          const corners = [
            pivot,
            pivot.add(axisU.multiplyByScalar(scale * 0.6)),
            pivot.add(axisU.multiplyByScalar(scale * 0.6)).add(axisV.multiplyByScalar(scale * 0.6)),
            pivot.add(axisV.multiplyByScalar(scale * 0.6))
          ];
          const color = this.resolveColor(handle.color, handle.axis);
          handle.entity.polygon = {
            hierarchy: new Cesium.PolygonHierarchy(corners.map((c) => toCartesian(c.toArray()))),
            material: this.withAlpha(color, 0.2),
            perPositionHeight: true,
            outline: true,
            outlineColor: color
          };
          break;
        }
        case 'rotate-axis': {
          const axisVec = axisVector(this.frame!, handle.axis!);
          const points = generateCirclePoints(pivot, axisVec, scale * 0.85, 64);
          handle.entity.polyline = {
            positions: points,
            width: 2,
            material: this.resolveColor(handle.color, handle.axis)
          };
          break;
        }
        case 'rotate-view': {
          const axisVec = axisVector(this.frame!, 'z');
          const points = generateCirclePoints(pivot, axisVec, scale * 1.1, 96);
          handle.entity.polyline = {
            positions: points,
            width: 2,
            material: this.resolveColor('white')
          };
          break;
        }
        case 'scale-axis': {
          const axisVec = axisVector(this.frame!, handle.axis!);
          const end = pivot.add(axisVec.multiplyByScalar(scale));
          handle.entity.polyline = {
            positions: [toCartesian(pivot.toArray()), toCartesian(end.toArray())],
            width: 3,
            material: this.resolveColor(handle.color, handle.axis)
          };
          const boxPosition = pivot.add(axisVec.multiplyByScalar(scale * 1.05));
          handle.entity.point = {
            pixelSize: 12,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            color: this.resolveColor(handle.color, handle.axis)
          };
          handle.entity.position = toCartesian(boxPosition.toArray());
          break;
        }
        case 'scale-uniform': {
          handle.entity.point = {
            pixelSize: 14,
            color: this.resolveColor('white'),
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          };
          handle.entity.position = toCartesian(pivot.toArray());
          break;
        }
      }
    });

    this.applyVisualState();
    this.updateVisibility();
  }

  destroy(): void {
    const Cesium = getCesium();
    const dataSource = this.viewer.dataSources.getByName('gizmo')[0];
    if (dataSource) {
      this.viewer.dataSources.remove(dataSource);
    }
  }

  getHandleDefinitions(): HandleDefinition[] {
    return this.handles;
  }

  private resolveColor(color: string, axis?: Axis): any {
    const Cesium = getCesium();
    if (axis === 'x') return Cesium.Color.RED;
    if (axis === 'y') return Cesium.Color.LIME;
    if (axis === 'z') return Cesium.Color.CYAN;
    if (color === 'white') return Cesium.Color.WHITE;
    if (color === 'xy') return Cesium.Color.fromBytes(255, 255, 255, 180);
    if (color === 'yz') return Cesium.Color.fromBytes(255, 255, 255, 180);
    if (color === 'xz') return Cesium.Color.fromBytes(255, 255, 255, 180);
    return Cesium.Color.WHITE;
  }

  private updateVisibility(): void {
    this.handles.forEach((handle) => {
      handle.entity.show = this.show && this.modeVisibility[handle.mode];
    });
  }

  private withAlpha(color: any, alpha: number): any {
    if (color.withAlpha) {
      return color.withAlpha(alpha);
    }
    const Cesium = getCesium();
    return new Cesium.Color(color.red, color.green, color.blue, alpha);
  }

  private getHoverColor(baseColor: any): any {
    const Cesium = getCesium();
    const alpha = typeof baseColor.alpha === 'number' ? baseColor.alpha : 1;
    return Cesium.Color.YELLOW.withAlpha ? Cesium.Color.YELLOW.withAlpha(alpha) : Cesium.Color.YELLOW;
  }

  private getActiveColor(baseColor: any): any {
    const Cesium = getCesium();
    const alpha = typeof baseColor.alpha === 'number' ? baseColor.alpha : 1;
    return Cesium.Color.ORANGE.withAlpha ? Cesium.Color.ORANGE.withAlpha(alpha) : Cesium.Color.ORANGE;
  }
}
