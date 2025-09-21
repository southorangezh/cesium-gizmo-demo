import {
  Cartesian2,
  Cartesian3,
  Ray,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  type Scene
} from 'cesium';
import type { GizmoPicker } from './GizmoPicker';
import type { HandleHit, PointerInfo } from './types';

export interface ManipulatorCallbacks {
  onHover(hit?: HandleHit): void;
  onDragStart(hit: HandleHit, pointer: PointerInfo): void;
  onDragMove(pointer: PointerInfo): void;
  onDragEnd(pointer: PointerInfo): void;
  onCancel(): void;
}

const scratchPosition = new Cartesian2();
const scratchRay = new Ray(new Cartesian3(), new Cartesian3());

export class ManipulatorController {
  private readonly handler: ScreenSpaceEventHandler;
  private activeHandle?: HandleHit;
  private dragging = false;

  constructor(
    private readonly scene: Scene,
    private readonly picker: GizmoPicker,
    private readonly callbacks: ManipulatorCallbacks
  ) {
    this.handler = new ScreenSpaceEventHandler(scene.canvas);
    this.bind();
  }

  destroy(): void {
    this.handler.destroy();
  }

  private bind(): void {
    this.handler.setInputAction((movement) => {
      const position = movement.endPosition ?? movement.position;
      if (!position) {
        return;
      }
      const pointer = this.createPointer(position);
      if (!pointer) {
        return;
      }
      if (this.dragging) {
        this.callbacks.onDragMove(pointer);
        this.scene.requestRender();
        return;
      }
      const hit = this.picker.pick(position);
      this.callbacks.onHover(hit);
    }, ScreenSpaceEventType.MOUSE_MOVE);

    this.handler.setInputAction((position) => {
      if (!position) {
        return;
      }
      const pointer = this.createPointer(position.position);
      if (!pointer) {
        return;
      }
      const hit = this.picker.pick(position.position);
      if (!hit) {
        this.callbacks.onHover(undefined);
        return;
      }
      this.dragging = true;
      this.activeHandle = hit;
      this.callbacks.onDragStart(hit, pointer);
      this.scene.requestRender();
    }, ScreenSpaceEventType.LEFT_DOWN);

    this.handler.setInputAction((position) => {
      if (!this.dragging) {
        return;
      }
      const pointer = this.createPointer(position.position);
      if (!pointer) {
        return;
      }
      this.dragging = false;
      this.callbacks.onDragEnd(pointer);
      this.activeHandle = undefined;
      this.scene.requestRender();
    }, ScreenSpaceEventType.LEFT_UP);

    const cancel = () => {
      if (!this.dragging) {
        return;
      }
      this.dragging = false;
      this.callbacks.onCancel();
      this.activeHandle = undefined;
      this.scene.requestRender();
    };

    this.handler.setInputAction(cancel, ScreenSpaceEventType.RIGHT_DOWN);
    this.handler.setInputAction(cancel, ScreenSpaceEventType.MIDDLE_DOWN);
  }

  private createPointer(position: Cartesian2): PointerInfo | undefined {
    scratchPosition.x = position.x;
    scratchPosition.y = position.y;
    const ray = this.scene.camera.getPickRay(scratchPosition, scratchRay);
    if (!ray) {
      return undefined;
    }
    return {
      rayOrigin: Cartesian3.clone(ray.origin),
      rayDirection: Cartesian3.clone(ray.direction),
      windowPosition: { x: position.x, y: position.y }
    };
  }
}
