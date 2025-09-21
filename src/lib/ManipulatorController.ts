import {
  Cartesian2,
  Cartesian3,
  Ray,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Viewer,
} from 'cesium';
import type { DragContext, DragResult, HandleInfo } from './types';
import type { GizmoPicker } from './GizmoPicker';
import type { GizmoPrimitive } from './GizmoPrimitive';
import { TransformSolver } from './TransformSolver';
import type { SnapState } from './Snapper';
import type { Frame } from './FrameBuilder';

export type DragCallback = (result: DragResult) => void;

export class ManipulatorController {
  private readonly handler: ScreenSpaceEventHandler;
  private hoverHandle: HandleInfo | null = null;
  private activeHandle: HandleInfo | null = null;
  private solver: TransformSolver | null = null;
  private frame: Frame | null = null;
  private dragging = false;
  private readonly onDragStartCallbacks = new Set<DragCallback>();
  private readonly onDragUpdateCallbacks = new Set<DragCallback>();
  private readonly onDragEndCallbacks = new Set<DragCallback>();
  private snapState: SnapState = { enabled: false, fine: false, coarse: false };
  private readonly keydownHandler: (ev: KeyboardEvent) => void;
  private readonly keyupHandler: (ev: KeyboardEvent) => void;

  constructor(
    private readonly viewer: Viewer,
    private readonly primitive: GizmoPrimitive,
    private readonly picker: GizmoPicker,
  ) {
    this.handler = new ScreenSpaceEventHandler(this.viewer.scene.canvas);
    this.handler.setInputAction((movement) => this.handleMove(movement.endPosition), ScreenSpaceEventType.MOUSE_MOVE);
    this.handler.setInputAction((click) => this.handleDown(click.position), ScreenSpaceEventType.LEFT_DOWN);
    this.handler.setInputAction(() => this.handleUp(), ScreenSpaceEventType.LEFT_UP);
    this.keydownHandler = (ev) => this.handleKey(ev, true);
    this.keyupHandler = (ev) => this.handleKey(ev, false);
    window.addEventListener('keydown', this.keydownHandler);
    window.addEventListener('keyup', this.keyupHandler);
  }

  setFrame(frame: Frame): void {
    this.frame = frame;
    this.solver = new TransformSolver(frame.matrix);
  }

  getSnapState(): SnapState {
    return { ...this.snapState };
  }

  onDragStart(cb: DragCallback): () => void {
    this.onDragStartCallbacks.add(cb);
    return () => this.onDragStartCallbacks.delete(cb);
  }

  onDragUpdate(cb: DragCallback): () => void {
    this.onDragUpdateCallbacks.add(cb);
    return () => this.onDragUpdateCallbacks.delete(cb);
  }

  onDragEnd(cb: DragCallback): () => void {
    this.onDragEndCallbacks.add(cb);
    return () => this.onDragEndCallbacks.delete(cb);
  }

  destroy(): void {
    this.handler.destroy();
    window.removeEventListener('keydown', this.keydownHandler);
    window.removeEventListener('keyup', this.keyupHandler);
  }

  private handleMove(position: Cartesian2): void {
    if (this.dragging) {
      this.updateDrag(position);
      return;
    }
    const handle = this.picker.pick(position);
    if (handle?.id !== this.hoverHandle?.id) {
      this.hoverHandle = handle;
      this.primitive.setHighlight(handle?.id ?? null, false);
    }
  }

  private handleDown(position: Cartesian2): void {
    const handle = this.picker.pick(position);
    if (!handle || !this.frame || !this.solver) {
      return;
    }
    this.hoverHandle = handle;
    this.activeHandle = handle;
    this.primitive.setHighlight(handle.id, true);
    const context: DragContext = {
      mode: handle.mode,
      axis: handle.axis,
      planeAxes: handle.planeAxes,
    };
    const ray = this.viewer.camera.getPickRay(position, new Ray());
    this.solver.begin(context, { ray, screenPosition: position }, this.viewer.camera.directionWC);
    this.dragging = true;
    this.emit(this.onDragStartCallbacks, {
      mode: context.mode,
      axis: context.axis,
      planeAxes: context.planeAxes,
      delta: {
        translation: new Cartesian3(0, 0, 0),
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: new Cartesian3(1, 1, 1),
      },
    });
  }

  private handleUp(): void {
    if (!this.dragging || !this.activeHandle) {
      return;
    }
    this.emit(this.onDragEndCallbacks, {
      mode: this.activeHandle.mode,
      axis: this.activeHandle.axis,
      planeAxes: this.activeHandle.planeAxes,
      delta: {
        translation: new Cartesian3(0, 0, 0),
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: new Cartesian3(1, 1, 1),
      },
    });
    this.primitive.setHighlight(null, true);
    this.dragging = false;
    this.activeHandle = null;
  }

  private updateDrag(position: Cartesian2): void {
    if (!this.solver || !this.activeHandle) {
      return;
    }
    const ray = this.viewer.camera.getPickRay(position, new Ray());
    const result = this.solver.update({ ray, screenPosition: position });
    if (!result) {
      return;
    }
    this.emit(this.onDragUpdateCallbacks, result);
  }

  private emit(callbacks: Set<DragCallback>, result: DragResult): void {
    callbacks.forEach((cb) => cb(result));
  }

  private handleKey(event: KeyboardEvent, down: boolean): void {
    if (event.key === 'Control') {
      this.snapState.fine = down;
    }
    if (event.key === 'Shift') {
      this.snapState.coarse = down;
    }
    if (event.key === 'Alt') {
      this.snapState.enabled = down;
    }
  }
}
