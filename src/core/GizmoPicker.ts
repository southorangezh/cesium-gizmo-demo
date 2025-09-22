import { GizmoPrimitive } from './GizmoPrimitive.js';
import { HandleHit } from './types.js';

const PRIORITY: Record<string, number> = {
  'translate-axis': 3,
  'scale-axis': 3,
  'rotate-axis': 2,
  'translate-plane': 1,
  'rotate-view': 1,
  'scale-uniform': 2
};

function getCesium(): any {
  const Cesium = (globalThis as any).Cesium;
  if (!Cesium) {
    throw new Error('Cesium global is required for GizmoPicker');
  }
  return Cesium;
}

interface GizmoPickerOptions {
  viewer: any;
  gizmo: GizmoPrimitive;
}

export class GizmoPicker {
  private viewer: any;
  private gizmo: GizmoPrimitive;
  private handleMap = new Map<any, ReturnType<GizmoPrimitive['getHandleDefinitions']>[number]>();

  constructor(options: GizmoPickerOptions) {
    this.viewer = options.viewer;
    this.gizmo = options.gizmo;
    this.syncHandles();
  }

  private syncHandles(): void {
    this.handleMap.clear();
    this.gizmo.getHandleDefinitions().forEach((handle) => {
      this.handleMap.set(handle.entity, handle);
      if (handle.entity && handle.entity.id) {
        this.handleMap.set(handle.entity.id, handle);
      }
    });
  }

  pick(windowPosition: { x: number; y: number }): HandleHit | undefined {
    const Cesium = getCesium();
    const picked = this.viewer.scene.pick(windowPosition);
    if (!picked) {
      return undefined;
    }
    const handle = this.handleMap.get(picked.id) || this.handleMap.get(picked.primitive) || this.handleMap.get(picked);
    if (!handle) {
      return undefined;
    }
    return {
      id: handle.id,
      mode: handle.mode,
      axis: handle.axis,
      planeAxes: handle.planeAxes,
      uniformScale: handle.uniformScale,
      priority: PRIORITY[handle.type] || 0,
      screenPosition: windowPosition
    };
  }
}
