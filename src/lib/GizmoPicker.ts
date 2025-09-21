import { Cartesian2, defined, Scene, ScreenSpaceEventHandler, ScreenSpaceEventType } from 'cesium';
import type { HandleInfo } from './types';
import type { GizmoPrimitive } from './GizmoPrimitive';

export interface PickResult {
  handle: HandleInfo | null;
  position: Cartesian2;
}

export class GizmoPicker {
  private readonly handler: ScreenSpaceEventHandler;
  private handleInfo: HandleInfo[] = [];

  constructor(private readonly scene: Scene, private readonly primitive: GizmoPrimitive) {
    this.handler = new ScreenSpaceEventHandler(this.scene.canvas);
    this.handleInfo = primitive.getHandleInfo();
  }

  setActive(active: boolean): void {
    if (active) {
      this.handler.setInputAction(() => undefined, ScreenSpaceEventType.LEFT_DOWN);
    } else {
      this.handler.removeInputAction(ScreenSpaceEventType.LEFT_DOWN);
    }
  }

  pick(position: Cartesian2): HandleInfo | null {
    const picked = this.scene.drillPick(position, 5);
    if (!defined(picked) || picked.length === 0) {
      return null;
    }
    const hit = picked.find((result) => this.matchEntityId(result.id?.id ?? result.id?.name));
    if (!hit) {
      return null;
    }
    return this.handleInfo.find((handle) => this.matchEntityId(hit.id?.id ?? hit.id?.name) === handle.id) ?? null;
  }

  refresh(): void {
    this.handleInfo = this.primitive.getHandleInfo();
  }

  destroy(): void {
    this.handler.destroy();
  }

  private matchEntityId(entityId: string | undefined): string | null {
    if (!entityId) {
      return null;
    }
    return this.handleInfo.find((handle) => entityId.includes(handle.id))?.id ?? null;
  }
}
