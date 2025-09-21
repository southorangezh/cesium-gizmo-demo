import { GizmoPicker } from './GizmoPicker.js';
import { TransformSolver } from './TransformSolver.js';
import { CameraState } from './CameraState.js';
import { FrameState, DragContext, PickResult, TransformDelta, SnapRuntimeOptions } from '../types.js';
import { Vector2 } from '../math/Vector2.js';
import { Vector3 } from '../math/Vector3.js';
import { Ray } from '../math/Ray.js';
import { createIdentityDelta } from '../utils/Transform.js';

export interface PointerModifiers {
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

export interface ControllerCallbacks {
  onHover?(pick: PickResult | undefined): void;
  onDragStart?(context: DragContext): void;
  onDrag?(context: DragContext, delta: TransformDelta, snapped: boolean): void;
  onDragEnd?(context: DragContext, delta: TransformDelta, committed: boolean): void;
}

export interface ManipulatorControllerOptions {
  picker: GizmoPicker;
  solver: TransformSolver;
  camera: CameraState;
  callbacks?: ControllerCallbacks;
  snapEnabled?: boolean;
}

export class ManipulatorController {
  private camera: CameraState;
  private frame: FrameState | undefined;
  private hover: PickResult | undefined;
  private activeContext: DragContext | undefined;
  private snapEnabled: boolean;
  private callbacks?: ControllerCallbacks;

  constructor(private readonly picker: GizmoPicker, private readonly solver: TransformSolver, options: ManipulatorControllerOptions) {
    this.camera = options.camera;
    this.snapEnabled = options.snapEnabled ?? true;
    this.callbacks = options.callbacks;
  }

  setCamera(camera: CameraState): void {
    this.camera = camera;
  }

  setFrame(frame: FrameState): void {
    this.frame = frame;
  }

  setSnapEnabled(enabled: boolean): void {
    this.snapEnabled = enabled;
  }

  handlePointerMove(position: Vector2, modifiers: PointerModifiers): void {
    if (!this.frame) {
      return;
    }
    if (this.activeContext) {
      this.updateDrag(position, modifiers);
      return;
    }
    const pick = this.picker.pick(this.camera, position);
    if (pick?.handleId !== this.hover?.handleId) {
      this.hover = pick;
      this.callbacks?.onHover?.(pick);
    }
  }

  handlePointerDown(position: Vector2, modifiers: PointerModifiers): void {
    if (!this.frame) {
      return;
    }
    if (this.activeContext) {
      return;
    }
    const pick = this.picker.pick(this.camera, position) ?? this.hover;
    if (!pick) {
      return;
    }
    const ray = this.computePickRay(position);
    const context: DragContext = {
      mode: pick.mode,
      axis: pick.axis,
      planeAxis: pick.planeAxis,
      handleId: pick.handleId,
      startPointer: { x: position.x, y: position.y },
      startRayOrigin: ray.origin,
      startRayDirection: ray.direction,
      startMatrix: this.frame.matrix.clone(),
      pivotWorld: Vector3.clone(this.frame.origin),
      frame: this.frame,
      currentDelta: createIdentityDelta()
    };
    const snapOptions = this.buildSnapOptions(modifiers);
    this.solver.beginDrag({
      mode: pick.mode,
      axis: pick.axis,
      planeAxis: pick.planeAxis,
      frame: this.frame,
      pivotWorld: Vector3.clone(this.frame.origin),
      startRay: ray,
      camera: this.camera,
      snapOptions
    });
    this.activeContext = context;
    this.callbacks?.onDragStart?.(context);
  }

  handlePointerUp(position: Vector2, modifiers: PointerModifiers, committed = true): void {
    if (!this.activeContext) {
      return;
    }
    this.updateDrag(position, modifiers);
    const context = this.activeContext;
    const delta = context.currentDelta;
    this.callbacks?.onDragEnd?.(context, delta, committed);
    this.activeContext = undefined;
  }

  cancelDrag(): void {
    if (!this.activeContext) {
      return;
    }
    const context = this.activeContext;
    const delta = context.currentDelta;
    this.callbacks?.onDragEnd?.(context, delta, false);
    this.activeContext = undefined;
  }

  private updateDrag(position: Vector2, modifiers: PointerModifiers): void {
    if (!this.activeContext || !this.frame) {
      return;
    }
    const ray = this.computePickRay(position);
    const snapOptions = this.buildSnapOptions(modifiers);
    const delta = this.solver.updateDrag(this.activeContext, { currentRay: ray, snapOptions });
    this.activeContext.currentDelta = delta;
    this.callbacks?.onDrag?.(this.activeContext, delta, snapOptions.enabled);
  }

  private computePickRay(position: Vector2): Ray {
    const ndcX = (2 * position.x) / this.camera.viewportWidth - 1;
    const ndcY = 1 - (2 * position.y) / this.camera.viewportHeight;
    const tanFov = Math.tan(this.camera.fov / 2);
    const dir = Vector3.normalize(
      Vector3.add(
        Vector3.add(
          Vector3.multiplyByScalar(this.camera.right, ndcX * tanFov * this.camera.aspect, new Vector3()),
          Vector3.multiplyByScalar(this.camera.up, ndcY * tanFov, new Vector3()),
          new Vector3()
        ),
        this.camera.direction,
        new Vector3()
      )
    );
    return new Ray(this.camera.position, dir);
  }

  private buildSnapOptions(modifiers: PointerModifiers): SnapRuntimeOptions {
    return {
      enabled: this.snapEnabled,
      fineModifierActive: modifiers.shiftKey,
      coarseModifierActive: modifiers.ctrlKey || modifiers.metaKey
    };
  }
}
