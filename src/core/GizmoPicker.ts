import { HandleHit, Mode } from '../types.js';
import { GizmoPrimitive } from './GizmoPrimitive.js';

export interface GizmoPickOptions {
  windowPosition: { x: number; y: number };
}

export class GizmoPicker {
  private readonly scene: any;
  private readonly primitive: GizmoPrimitive;

  constructor(scene: any, primitive: GizmoPrimitive) {
    this.scene = scene;
    this.primitive = primitive;
  }

  pick(options: GizmoPickOptions): HandleHit | undefined {
    const picked = this.scene.pick(new Cesium.Cartesian2(options.windowPosition.x, options.windowPosition.y));
    if (!picked || !picked.id) {
      return undefined;
    }

    const id = picked.id.id ?? picked.id;
    const handle = this.primitive.getHandle(id);
    if (!handle) {
      return undefined;
    }

    return {
      id: handle.id,
      mode: handle.mode,
      axis: handle.axis,
      type: handle.type,
      priority: this.priority(handle.mode, handle.type),
      screenPosition: options.windowPosition
    };
  }

  private priority(mode: Mode, type: HandleHit['type']): number {
    const base = mode === 'translate' ? 100 : mode === 'rotate' ? 80 : 60;
    const typeWeight = type === 'axis' ? 3 : type === 'ring' ? 2 : 1;
    return base + typeWeight;
  }
}
