import { GizmoPrimitive } from './GizmoPrimitive.js';
import { GizmoPicker } from './GizmoPicker.js';
import { TransformSolver } from './TransformSolver.js';
import { HandleHit, TransformDelta, FrameState, TransformSession } from './types.js';
import { HudOverlay } from './HudOverlay.js';
import { Vector3 } from '../utils/math/Vector3.js';
import { Snapper } from './Snapper.js';

interface DragContext {
  session: TransformSession;
  frame: FrameState;
}

export interface ManipulatorControllerOptions {
  viewer: any;
  gizmo: GizmoPrimitive;
  picker: GizmoPicker;
  solver: TransformSolver;
  hud: HudOverlay;
  snapper: Snapper;
  createDragContext(handle: HandleHit): DragContext | undefined;
  onDragDelta(delta: TransformDelta): void;
  onDragEnd(delta: TransformDelta, cancelled: boolean): void;
}

function zeroDelta(): TransformDelta {
  return {
    translation: [0, 0, 0],
    rotation: [1, 0, 0, 0],
    scale: [1, 1, 1]
  };
}

function getCesium(): any {
  const Cesium = (globalThis as any).Cesium;
  if (!Cesium) {
    throw new Error('Cesium global is required for ManipulatorController');
  }
  return Cesium;
}

export class ManipulatorController {
  private viewer: any;
  private gizmo: GizmoPrimitive;
  private picker: GizmoPicker;
  private solver: TransformSolver;
  private hud: HudOverlay;
  private snapper: Snapper;
  private createDragContext: (handle: HandleHit) => DragContext | undefined;
  private onDragDelta: (delta: TransformDelta) => void;
  private onDragEnd: (delta: TransformDelta, cancelled: boolean) => void;
  private handler: any;
  private state: 'idle' | 'hover' | 'dragging' = 'idle';
  private activeHandle?: HandleHit;
  private dragContext?: DragContext;
  private currentDelta: TransformDelta = zeroDelta();
  private fineSnap = false;
  private cancelRequested = false;

  constructor(options: ManipulatorControllerOptions) {
    this.viewer = options.viewer;
    this.gizmo = options.gizmo;
    this.picker = options.picker;
    this.solver = options.solver;
    this.hud = options.hud;
    this.snapper = options.snapper;
    this.createDragContext = options.createDragContext;
    this.onDragDelta = options.onDragDelta;
    this.onDragEnd = options.onDragEnd;
    this.handler = new (getCesium().ScreenSpaceEventHandler)(this.viewer.scene.canvas);
    this.bindEvents();
    this.bindKeyboard();
  }

  private bindEvents(): void {
    const Cesium = getCesium();
    this.handler.setInputAction((movement: any) => this.onMouseMove(movement.endPosition), Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    this.handler.setInputAction((click: any) => this.onLeftDown(click.position), Cesium.ScreenSpaceEventType.LEFT_DOWN);
    this.handler.setInputAction((click: any) => this.onLeftUp(click.position), Cesium.ScreenSpaceEventType.LEFT_UP);
    this.handler.setInputAction(() => this.cancelDrag(), Cesium.ScreenSpaceEventType.RIGHT_DOWN);
    window.addEventListener('mouseup', () => {
      if (this.state === 'dragging') {
        this.onLeftUp(undefined);
      }
    });
  }

  private bindKeyboard(): void {
    window.addEventListener('keydown', (ev) => {
      if (ev.key === 'Shift') {
        this.fineSnap = true;
      }
      if (ev.key === 'Escape') {
        this.cancelDrag();
      }
    });
    window.addEventListener('keyup', (ev) => {
      if (ev.key === 'Shift') {
        this.fineSnap = false;
      }
    });
  }

  private onMouseMove(position: any): void {
    if (!position) return;
    if (this.state === 'dragging' && this.dragContext) {
      const ray = this.getPickRay(position);
      if (!ray) return;
      const delta = this.solver.update({ currentRay: ray, useFineSnap: this.fineSnap });
      this.currentDelta = delta;
      this.hud.update(delta, this.dragContext.session.mode);
      this.onDragDelta(delta);
      return;
    }

    const handle = this.picker.pick(position);
    if (handle && (!this.activeHandle || handle.id !== this.activeHandle.id)) {
      this.activeHandle = handle;
      this.gizmo.setHighlight(handle.id, false);
      this.state = 'hover';
    } else if (!handle && this.state !== 'dragging') {
      this.activeHandle = undefined;
      this.gizmo.setHighlight(undefined, false);
      this.state = 'idle';
    }
  }

  private onLeftDown(position: any): void {
    if (!position) return;
    if (!this.activeHandle) {
      const handle = this.picker.pick(position);
      if (!handle) return;
      this.activeHandle = handle;
    }
    if (!this.activeHandle) return;
    const context = this.createDragContext(this.activeHandle);
    if (!context) return;
    const ray = this.getPickRay(position);
    if (!ray) return;
    this.dragContext = context;
    this.state = 'dragging';
    this.gizmo.setHighlight(this.activeHandle.id, true);
    this.solver.begin({
      session: context.session,
      frame: context.frame,
      startRay: ray,
      snapper: this.snapper
    });
    this.currentDelta = zeroDelta();
    this.hud.update(this.currentDelta, context.session.mode);
  }

  private onLeftUp(position: any | undefined): void {
    if (this.state !== 'dragging') return;
    this.state = 'idle';
    this.gizmo.setHighlight(undefined, false);
    this.hud.hide();
    this.solver.end();
    this.onDragEnd(this.currentDelta, this.cancelRequested);
    this.cancelRequested = false;
    this.currentDelta = zeroDelta();
    this.dragContext = undefined;
  }

  private cancelDrag(): void {
    if (this.state === 'dragging') {
      this.cancelRequested = true;
      this.onLeftUp(undefined);
    }
  }

  private getPickRay(position: any): { origin: Vector3; direction: Vector3 } | undefined {
    const Cesium = getCesium();
    const ray = this.viewer.camera.getPickRay(position);
    if (!ray) return undefined;
    return {
      origin: new Vector3(ray.origin.x, ray.origin.y, ray.origin.z),
      direction: new Vector3(ray.direction.x, ray.direction.y, ray.direction.z).normalize()
    };
  }

  destroy(): void {
    this.handler.destroy();
    this.hud.hide();
  }
}
