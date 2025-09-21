import { Cartesian2, type Scene } from 'cesium';
import { HANDLE_DEFINITIONS } from './GizmoPrimitive';
import type { HandleHit } from './types';

const scratchPosition = new Cartesian2();

export class GizmoPicker {
  private readonly handleMap = new Map<string, HandleHit>();

  constructor(private readonly scene: Scene) {
    for (const handle of HANDLE_DEFINITIONS) {
      this.handleMap.set(handle.id, {
        id: handle.id,
        mode: handle.mode,
        axis: handle.axis,
        plane: handle.plane,
        priority: handle.priority,
        windowPosition: { x: 0, y: 0 }
      });
    }
  }

  pick(windowPosition: Cartesian2): HandleHit | undefined {
    scratchPosition.x = windowPosition.x;
    scratchPosition.y = windowPosition.y;
    const pick = this.scene.pick(scratchPosition);
    const id = pick?.id;
    if (!id) {
      return undefined;
    }
    const handle = this.handleMap.get(String(id));
    if (!handle) {
      return undefined;
    }
    handle.windowPosition = { x: windowPosition.x, y: windowPosition.y };
    return handle;
  }
}
