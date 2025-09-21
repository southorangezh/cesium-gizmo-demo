import { CameraState } from './core/CameraState.js';
import { FrameBuilder } from './core/FrameBuilder.js';
import { GizmoPicker } from './core/GizmoPicker.js';
import { GizmoPrimitive } from './core/GizmoPrimitive.js';
import { HudOverlay } from './core/HudOverlay.js';
import { ManipulatorController, PointerModifiers } from './core/ManipulatorController.js';
import { PivotResolver } from './core/PivotResolver.js';
import { Snapper } from './core/Snapper.js';
import { TransformSolver } from './core/TransformSolver.js';
import { GizmoRenderer } from './core/GizmoRenderer.js';
import { Matrix3 } from './math/Matrix3.js';
import { Matrix4 } from './math/Matrix4.js';
import { Quaternion } from './math/Quaternion.js';
import { Vector2 } from './math/Vector2.js';
import { Vector3 } from './math/Vector3.js';
import {
  Axis,
  CursorProvider,
  DragContext,
  HudDisplayValues,
  ManipulatorOptions,
  ManipulatorSizeOptions,
  Mode,
  Orientation,
  Pivot,
  SnapStepConfig,
  TransformCommand,
  TransformDelta,
  TransformTarget
} from './types.js';

interface InternalTargetState {
  target: TransformTarget;
  initialMatrix: Matrix4;
  pivot: Vector3;
}

const DEFAULT_SIZE: ManipulatorSizeOptions = {
  screenPixelRadius: 120,
  minScale: 0.5,
  maxScale: 500
};

const DEFAULT_SNAP: SnapStepConfig = {
  translate: 0.5,
  rotate: (5 * Math.PI) / 180,
  scale: 0.05,
  fineModifier: 0.1,
  coarseModifier: 10
};

export interface UniversalManipulatorDependencies {
  camera: CameraState;
  container: HTMLElement;
  cursorProvider?: CursorProvider;
}

export class UniversalManipulator {
  show = true;
  private orientation: Orientation;
  private pivotMode: Pivot;
  private readonly primitive: GizmoPrimitive;
  private readonly picker: GizmoPicker;
  private readonly snapper: Snapper;
  private readonly solver: TransformSolver;
  private readonly frameBuilder: FrameBuilder;
  private readonly pivotResolver: PivotResolver;
  private readonly controller: ManipulatorController;
  private readonly hud: HudOverlay;
  private readonly renderer: GizmoRenderer;
  private readonly container: HTMLElement;
  private readonly camera: CameraState;
  private readonly enabledModes: Record<Mode, boolean> = {
    translate: true,
    rotate: true,
    scale: true
  };
  private targets: TransformTarget[] = [];
  private frameState: ReturnType<FrameBuilder['build']> | undefined;
  private sizeOptions: ManipulatorSizeOptions = { ...DEFAULT_SIZE };
  private pointerId: number | undefined;
  private pointerDown = false;
  private internalStates = new Map<string, InternalTargetState>();
  private undoStack: TransformCommand[] = [];
  private redoStack: TransformCommand[] = [];
  private activeHandleId: string | undefined;

  constructor(options: ManipulatorOptions, deps: UniversalManipulatorDependencies) {
    this.orientation = options.orientation ?? 'global';
    this.pivotMode = options.pivot ?? 'origin';
    this.container = deps.container;
    this.camera = deps.camera;
    this.primitive = new GizmoPrimitive();
    this.picker = new GizmoPicker(this.primitive);
    this.snapper = new Snapper(options.snap ?? DEFAULT_SNAP);
    this.solver = new TransformSolver(this.snapper);
    this.frameBuilder = new FrameBuilder();
    this.pivotResolver = new PivotResolver(deps.cursorProvider);
    this.controller = new ManipulatorController(this.picker, this.solver, {
      picker: this.picker,
      solver: this.solver,
      camera: this.camera,
      callbacks: {
        onHover: (pick) => this.handleHover(pick?.handleId),
        onDragStart: (context) => this.handleDragStart(context),
        onDrag: (context, delta, snapped) => this.handleDrag(context, delta, snapped),
        onDragEnd: (context, delta, committed) => this.handleDragEnd(context, delta, committed)
      }
    });
    this.hud = new HudOverlay(this.container);
    this.renderer = new GizmoRenderer(this.container, this.primitive);
    this.setSize(options.size ?? DEFAULT_SIZE);
    this.setTarget(options.target);
    this.updateModeVisibility(options);
    this.attachEventListeners();
    if (options.show === false) {
      this.setShow(false);
    }
  }

  setTarget(target: TransformTarget | TransformTarget[] | undefined): void {
    this.targets = !target ? [] : Array.isArray(target) ? target : [target];
    this.updateManipulator();
  }

  setOrientation(orientation: Orientation): void {
    this.orientation = orientation;
    this.updateManipulator();
  }

  setPivot(pivot: Pivot): void {
    this.pivotMode = pivot;
    this.updateManipulator();
  }

  enable(options: Partial<Record<Mode, boolean>>): void {
    for (const key of Object.keys(options) as Mode[]) {
      const value = options[key];
      if (typeof value === 'boolean') {
        this.enabledModes[key] = value;
        this.primitive.setModeVisibility(key, value);
      }
    }
  }

  setSnap(stepConfig?: SnapStepConfig): void {
    this.snapper.setConfig(stepConfig ?? DEFAULT_SNAP);
  }

  setSize(size: ManipulatorSizeOptions): void {
    this.sizeOptions = { ...DEFAULT_SIZE, ...size };
    this.updateManipulator();
  }

  setShow(visible: boolean): void {
    this.show = visible;
    this.primitive.show = visible;
    this.hud.setVisible(visible);
    this.renderer.render(this.camera);
  }

  undo(): void {
    const command = this.undoStack.pop();
    if (!command) {
      return;
    }
    this.applyMatrixToTarget(command.id, command.before);
    this.redoStack.push(command);
    this.updateManipulator();
  }

  redo(): void {
    const command = this.redoStack.pop();
    if (!command) {
      return;
    }
    this.applyMatrixToTarget(command.id, command.after);
    this.undoStack.push(command);
    this.updateManipulator();
  }

  destroy(): void {
    this.container.removeEventListener('pointerdown', this.onPointerDown);
    this.container.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
    this.hud.destroy();
    this.renderer.destroy();
  }

  private updateModeVisibility(options: ManipulatorOptions): void {
    if (options.enableTranslate === false) {
      this.enabledModes.translate = false;
      this.primitive.setModeVisibility('translate', false);
    }
    if (options.enableRotate === false) {
      this.enabledModes.rotate = false;
      this.primitive.setModeVisibility('rotate', false);
    }
    if (options.enableScale === false) {
      this.enabledModes.scale = false;
      this.primitive.setModeVisibility('scale', false);
    }
  }

  private attachEventListeners(): void {
    this.container.addEventListener('pointerdown', this.onPointerDown);
    this.container.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('keydown', this.onKeyDown);
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (!this.show || !this.frameState) {
      return;
    }
    this.pointerId = event.pointerId;
    this.pointerDown = true;
    this.container.setPointerCapture(event.pointerId);
    const position = this.toLocalPosition(event);
    this.controller.setFrame(this.frameState);
    this.controller.handlePointerDown(position, this.toModifiers(event));
    event.preventDefault();
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.show || !this.frameState) {
      return;
    }
    const position = this.toLocalPosition(event);
    this.controller.setFrame(this.frameState);
    this.controller.handlePointerMove(position, this.toModifiers(event));
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (!this.pointerDown) {
      return;
    }
    const position = this.toLocalPosition(event);
    this.controller.handlePointerUp(position, this.toModifiers(event));
    if (this.pointerId !== undefined) {
      try {
        this.container.releasePointerCapture(this.pointerId);
      } catch (error) {
        // ignore
      }
    }
    this.pointerDown = false;
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.controller.cancelDrag();
    } else if (event.key === 'z' && (event.ctrlKey || event.metaKey)) {
      this.undo();
    } else if (event.key === 'y' && (event.ctrlKey || event.metaKey)) {
      this.redo();
    }
  };

  private handleHover(handleId: string | undefined): void {
    const states = this.primitive.handles.map((handle) => ({
      id: handle.id,
      mode: handle.mode,
      axis: handle.axis,
      active: handle.id === this.activeHandleId,
      highlighted: handle.id === handleId
    }));
    this.primitive.setVisualStates(states);
  }

  private handleDragStart(context: DragContext): void {
    if (!this.frameState) {
      return;
    }
    this.internalStates.clear();
    this.activeHandleId = context.handleId;
    const perTargetPivot = this.pivotResolver.resolvePerTargetPivot(this.pivotMode, this.targets, context.pivotWorld);
    for (const target of this.targets) {
      const before = target.getMatrix();
      const pivot = perTargetPivot.get(target.id) ?? context.pivotWorld;
      this.internalStates.set(target.id, {
        target,
        initialMatrix: before,
        pivot: pivot
      });
    }
    this.handleHover(context.handleId);
  }

  private handleDrag(context: DragContext, delta: TransformDelta, snapped: boolean): void {
    if (!this.frameState) {
      return;
    }
    for (const state of this.internalStates.values()) {
      const matrix = this.applyDelta(state.initialMatrix, delta, state.pivot, this.frameState);
      state.target.setMatrix(matrix);
    }
    context.currentDelta = delta;
    const hudValues = this.buildHudValues(context, delta, snapped);
    this.hud.update(hudValues);
    this.renderer.render(this.camera);
  }

  private handleDragEnd(context: DragContext, delta: TransformDelta, committed: boolean): void {
    if (committed) {
      for (const state of this.internalStates.values()) {
        const after = state.target.getMatrix();
        this.undoStack.push({ id: state.target.id, before: state.initialMatrix, after });
      }
      this.redoStack = [];
    } else {
      for (const state of this.internalStates.values()) {
        state.target.setMatrix(state.initialMatrix);
      }
    }
    this.internalStates.clear();
    this.activeHandleId = undefined;
    this.handleHover(undefined);
    this.updateManipulator();
  }

  private buildHudValues(context: DragContext, delta: TransformDelta, snapped: boolean): HudDisplayValues {
    const frame = context.frame;
    const translationLocal = new Vector3(
      Vector3.dot(delta.translation, frame.axes.x),
      Vector3.dot(delta.translation, frame.axes.y),
      Vector3.dot(delta.translation, frame.axes.z)
    );
    const rotationEuler = delta.rotation.toEuler(new Vector3());
    const axisLabel = context.axis ? context.axis.toUpperCase() : context.planeAxis ? context.planeAxis.join('').toUpperCase() : 'FREE';
    return {
      mode: context.mode,
      axisLabel,
      deltaTranslation: translationLocal,
      deltaRotation: rotationEuler,
      deltaScale: delta.scale,
      snapped
    };
  }

  private applyDelta(baseMatrix: Matrix4, delta: TransformDelta, pivot: Vector3, frame: ReturnType<FrameBuilder['build']>): Matrix4 {
    const translationMatrix = this.translationMatrix(delta.translation);
    const pivotMatrix = this.translationMatrix(pivot);
    const pivotInverseMatrix = this.translationMatrix(Vector3.multiplyByScalar(pivot, -1, new Vector3()));
    const rotationMatrix = this.rotationMatrix(delta.rotation);
    const scaleMatrix = this.scaleMatrix(delta.scale, frame);

    const combined = multiplyMatrices(
      translationMatrix,
      multiplyMatrices(
        pivotMatrix,
        multiplyMatrices(
          rotationMatrix,
          multiplyMatrices(scaleMatrix, multiplyMatrices(pivotInverseMatrix, baseMatrix))
        )
      )
    );
    return combined;
  }

  private translationMatrix(offset: Vector3): Matrix4 {
    const matrix = Matrix4.identity();
    const e = matrix.elements;
    e[12] = offset.x;
    e[13] = offset.y;
    e[14] = offset.z;
    return matrix;
  }

  private rotationMatrix(quaternion: Quaternion): Matrix4 {
    const matrix3 = quaternion.toMatrix3(new Matrix3());
    const matrix = Matrix4.identity();
    const e = matrix.elements;
    const m = matrix3.elements;
    e[0] = m[0]; e[1] = m[1]; e[2] = m[2];
    e[4] = m[3]; e[5] = m[4]; e[6] = m[5];
    e[8] = m[6]; e[9] = m[7]; e[10] = m[8];
    return matrix;
  }

  private scaleMatrix(scale: Vector3, frame: ReturnType<FrameBuilder['build']>): Matrix4 {
    if (Math.abs(scale.x - 1) < 1e-6 && Math.abs(scale.y - 1) < 1e-6 && Math.abs(scale.z - 1) < 1e-6) {
      return Matrix4.identity();
    }
    const scaleMatrix = Matrix4.identity();
    const e = scaleMatrix.elements;
    e[0] = scale.x;
    e[5] = scale.y;
    e[10] = scale.z;
    const worldScale = frame.matrix.clone(new Matrix4()).multiply(scaleMatrix).multiply(frame.inverse);
    return worldScale;
  }

  private applyMatrixToTarget(targetId: string, matrix: Matrix4): void {
    const target = this.targets.find((t) => t.id === targetId);
    if (target) {
      target.setMatrix(matrix);
    }
  }

  private updateManipulator(): void {
    if (!this.show || this.targets.length === 0) {
      this.primitive.show = false;
      return;
    }
    const pivot = this.pivotResolver.resolveManipulatorPivot(this.pivotMode, this.targets);
    const frame = this.frameBuilder.build({
      orientation: this.orientation,
      pivot,
      targets: this.targets,
      camera: this.camera
    });
    this.frameState = frame;
    const scale = this.computeScreenScale(pivot);
    this.primitive.update(frame, this.camera, scale);
    this.controller.setFrame(frame);
    this.primitive.show = true;
    this.renderer.render(this.camera);
  }

  private computeScreenScale(pivot: Vector3): number {
    const distance = Vector3.distance(this.camera.position, pivot);
    const worldHeight = 2 * distance * Math.tan(this.camera.fov / 2);
    const pixelsPerMeter = this.camera.viewportHeight / Math.max(worldHeight, 1e-6);
    const desired = this.sizeOptions.screenPixelRadius / Math.max(pixelsPerMeter, 1e-6);
    return clamp(desired, this.sizeOptions.minScale, this.sizeOptions.maxScale);
  }

  private toLocalPosition(event: PointerEvent): Vector2 {
    const rect = this.container.getBoundingClientRect();
    return new Vector2(event.clientX - rect.left, event.clientY - rect.top);
  }

  private toModifiers(event: PointerEvent | KeyboardEvent): PointerModifiers {
    return {
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey ?? false,
      metaKey: event.metaKey ?? false
    };
  }
}

function multiplyMatrices(a: Matrix4, b: Matrix4): Matrix4 {
  return a.multiply(b, new Matrix4());
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
