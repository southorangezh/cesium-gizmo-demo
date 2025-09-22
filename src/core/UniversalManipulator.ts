import {
  ManipulatorOptions,
  Mode,
  Orientation,
  Pivot,
  TargetLike,
  TransformDelta,
  HandleHit,
  FrameState,
  TransformSession,
  CursorState
} from './types.js';
import { GizmoPrimitive } from './GizmoPrimitive.js';
import { GizmoPicker } from './GizmoPicker.js';
import { ManipulatorController } from './ManipulatorController.js';
import { TransformSolver } from './TransformSolver.js';
import { Snapper } from './Snapper.js';
import { PivotResolver } from './PivotResolver.js';
import { FrameBuilder } from './FrameBuilder.js';
import { HudOverlay } from './HudOverlay.js';
import { CommandStack } from './CommandStack.js';
import { Vector3 } from '../utils/math/Vector3.js';
import { Quaternion } from '../utils/math/Quaternion.js';
import { Matrix4 } from '../utils/math/Matrix4.js';

interface TargetAdapter {
  source: TargetLike;
  getMatrix(): Matrix4;
  applyMatrix(matrix: Matrix4): void;
}

interface ActiveDragState {
  frame: FrameState;
  startMatrices: Matrix4[];
  pivotPerTarget: Array<[number, number, number]>;
}

function zeroDelta(): TransformDelta {
  return {
    translation: [0, 0, 0],
    rotation: [1, 0, 0, 0],
    scale: [1, 1, 1]
  };
}

export class UniversalManipulator {
  private viewer: any;
  private gizmo: GizmoPrimitive;
  private picker: GizmoPicker;
  private snapper: Snapper;
  private solver: TransformSolver;
  private hud: HudOverlay;
  private controller: ManipulatorController;
  private commandStack = new CommandStack();
  private adapters: TargetAdapter[] = [];
  private orientation: Orientation = 'global';
  private pivot: Pivot = 'origin';
  private enableTranslate = true;
  private enableRotate = true;
  private enableScale = true;
  private screenPixelRadius = 80;
  private minScale = 1;
  private maxScale = 1000;
  private show = true;
  private activeDrag?: ActiveDragState;
  private lastDelta: TransformDelta = zeroDelta();
  private cursor?: CursorState;

  constructor(viewer: any, options: ManipulatorOptions = {}) {
    this.viewer = viewer;
    this.orientation = options.orientation ?? this.orientation;
    this.pivot = options.pivot ?? this.pivot;
    this.enableTranslate = options.enableTranslate ?? true;
    this.enableRotate = options.enableRotate ?? true;
    this.enableScale = options.enableScale ?? true;
    this.screenPixelRadius = options.screenPixelRadius ?? this.screenPixelRadius;
    this.minScale = options.minScale ?? this.minScale;
    this.maxScale = options.maxScale ?? this.maxScale;
    this.snapper = new Snapper(options.snap ?? {});
    this.gizmo = new GizmoPrimitive({
      viewer,
      screenPixelRadius: this.screenPixelRadius,
      minScale: this.minScale,
      maxScale: this.maxScale
    });
    this.gizmo.setModeVisibility({
      translate: this.enableTranslate,
      rotate: this.enableRotate,
      scale: this.enableScale
    });
    this.picker = new GizmoPicker({ viewer, gizmo: this.gizmo });
    this.solver = new TransformSolver();
    this.hud = new HudOverlay();
    this.controller = new ManipulatorController({
      viewer,
      gizmo: this.gizmo,
      picker: this.picker,
      solver: this.solver,
      hud: this.hud,
      snapper: this.snapper,
      createDragContext: (handle) => this.createDragContext(handle),
      onDragDelta: (delta) => this.applyDelta(delta, false),
      onDragEnd: (delta, cancelled) => this.finishDrag(delta, cancelled)
    });
    if (options.target) {
      this.setTarget(options.target);
    }
  }

  set showManipulator(value: boolean) {
    this.show = value;
    this.gizmo.setShow(value);
  }

  setTarget(target: TargetLike | TargetLike[]): void {
    const array = Array.isArray(target) ? target : [target];
    this.adapters = array.map((item) => this.createAdapter(item));
    this.updateFrame();
  }

  setCursor(cursor: CursorState): void {
    this.cursor = cursor;
    this.updateFrame();
  }

  setOrientation(orientation: Orientation): void {
    this.orientation = orientation;
    this.updateFrame();
  }

  setPivot(pivot: Pivot): void {
    this.pivot = pivot;
    this.updateFrame();
  }

  enable(options: Partial<Record<Mode, boolean>>): void {
    if (typeof options.translate === 'boolean') {
      this.enableTranslate = options.translate;
    }
    if (typeof options.rotate === 'boolean') {
      this.enableRotate = options.rotate;
    }
    if (typeof options.scale === 'boolean') {
      this.enableScale = options.scale;
    }
    this.gizmo.setModeVisibility({
      translate: this.enableTranslate,
      rotate: this.enableRotate,
      scale: this.enableScale
    });
  }

  setSnap(config: ManipulatorOptions['snap']): void {
    if (config) {
      this.snapper.updateConfig(config);
    }
  }

  setSize(screenPixelRadius: number, minScale?: number, maxScale?: number): void {
    this.screenPixelRadius = screenPixelRadius;
    if (minScale !== undefined) this.minScale = minScale;
    if (maxScale !== undefined) this.maxScale = maxScale;
    this.gizmo.updateSize({
      screenPixelRadius: this.screenPixelRadius,
      minScale: this.minScale,
      maxScale: this.maxScale
    });
    this.updateFrame();
  }

  destroy(): void {
    this.controller.destroy();
    this.gizmo.destroy();
    this.hud.destroy();
  }

  private createAdapter(target: TargetLike): TargetAdapter {
    const toMatrix = (input: TargetLike): Matrix4 => {
      if (input.matrix) {
        return Matrix4.fromArray(input.matrix);
      }
      const position = input.position ? Vector3.fromArray(input.position) : Vector3.zero();
      const rotation = input.rotation
        ? new Quaternion(input.rotation[0], input.rotation[1], input.rotation[2], input.rotation[3])
        : Quaternion.identity();
      const scale = input.scale ? Vector3.fromArray(input.scale) : new Vector3(1, 1, 1);
      return Matrix4.fromTranslationRotationScale(position, rotation, scale);
    };

    return {
      source: target,
      getMatrix: () => toMatrix(target),
      applyMatrix: (matrix: Matrix4) => {
        target.matrix = [...matrix.elements];
        const translation = matrix.getTranslation();
        const rotation = matrix.getRotation();
        const scale = matrix.getScale();
        target.position = translation.toArray();
        target.rotation = [rotation.w, rotation.x, rotation.y, rotation.z];
        target.scale = scale.toArray();
      }
    };
  }

  private updateFrame(): void {
    if (this.adapters.length === 0) {
      return;
    }
    const frame = this.computeFrame();
    this.gizmo.setFrame(frame);
  }

  private computeFrame(): FrameState {
    const targets = this.adapters.map((adapter) => ({ matrix: adapter.getMatrix().elements }));
    const pivotResolver = this.createPivotResolver();
    const pivotResult = pivotResolver.resolve(this.pivot, targets);
    const cameraInfo = this.getCameraInfo();
    const frameBuilder = new FrameBuilder({
      orientation: this.orientation,
      targets,
      pivot: pivotResult.pivot,
      camera: cameraInfo
    });
    return frameBuilder.build();
  }

  private getCameraInfo() {
    const camera = this.viewer.camera;
    const direction = camera.directionWC || camera.direction;
    const up = camera.upWC || camera.up;
    const right = camera.rightWC || camera.right;
    const position = camera.positionWC || camera.position;
    return {
      position: [position.x, position.y, position.z] as [number, number, number],
      direction: [direction.x, direction.y, direction.z] as [number, number, number],
      up: [up.x, up.y, up.z] as [number, number, number],
      right: [right.x, right.y, right.z] as [number, number, number]
    };
  }

  private createDragContext(handle: HandleHit): { session: TransformSession; frame: FrameState } | undefined {
    if (this.adapters.length === 0) {
      return undefined;
    }
    const frame = this.computeFrame();
    const session: TransformSession = {
      mode: handle.mode
    };
    if (handle.axis) {
      session.axis = handle.axis;
    }
    if (handle.planeAxes) {
      session.planeAxes = handle.planeAxes;
    }
    if (handle.uniformScale) {
      session.uniformScale = handle.uniformScale;
    }
    if (handle.id === 'rotate-view') {
      const camera = this.viewer.camera;
      const dir = camera.directionWC || camera.direction;
      session.viewNormal = [dir.x, dir.y, dir.z];
    }

    const pivotResolver = this.createPivotResolver();
    const targets = this.adapters.map((adapter) => ({ matrix: adapter.getMatrix().elements }));
    const pivotResult = pivotResolver.resolve(this.pivot, targets);
    const pivots: Array<[number, number, number]> = pivotResult.perTarget
      ? pivotResult.perTarget.map((entry) => entry.pivot)
      : targets.map(() => pivotResult.pivot);
    this.activeDrag = {
      frame,
      startMatrices: this.adapters.map((adapter) => adapter.getMatrix()),
      pivotPerTarget: pivots
    };
    return { session, frame };
  }

  private applyDelta(delta: TransformDelta, commit: boolean): void {
    if (!this.activeDrag) {
      return;
    }
    const rotation = new Quaternion(delta.rotation[0], delta.rotation[1], delta.rotation[2], delta.rotation[3]).normalize();
    const translation = Vector3.fromArray(delta.translation);
    const scale = Vector3.fromArray(delta.scale);

    this.adapters.forEach((adapter, index) => {
      const startMatrix = this.activeDrag!.startMatrices[index];
      const pivotArray = this.activeDrag!.pivotPerTarget[index];
      const pivot = Vector3.fromArray(pivotArray);
      const newMatrix = this.composeDelta(startMatrix, translation, rotation, scale, pivot);
      adapter.applyMatrix(newMatrix);
      if (!commit) {
        // reset start matrices for continuous updates to avoid drift
        this.activeDrag!.startMatrices[index] = startMatrix;
      }
    });

    this.lastDelta = delta;
    this.updateFrame();
  }

  private composeDelta(
    startMatrix: Matrix4,
    translation: Vector3,
    rotation: Quaternion,
    scale: Vector3,
    pivot: Vector3
  ): Matrix4 {
    const translationMatrix = Matrix4.fromTranslationRotationScale(translation, Quaternion.identity(), new Vector3(1, 1, 1));
    const pivotMatrix = Matrix4.fromTranslationRotationScale(pivot, Quaternion.identity(), new Vector3(1, 1, 1));
    const invPivotMatrix = Matrix4.fromTranslationRotationScale(pivot.multiplyByScalar(-1), Quaternion.identity(), new Vector3(1, 1, 1));
    const rotationMatrix = Matrix4.fromTranslationRotationScale(Vector3.zero(), rotation, new Vector3(1, 1, 1));
    const scaleMatrix = Matrix4.fromTranslationRotationScale(Vector3.zero(), Quaternion.identity(), scale);
    const deltaMatrix = translationMatrix
      .multiply(pivotMatrix)
      .multiply(rotationMatrix)
      .multiply(scaleMatrix)
      .multiply(invPivotMatrix);
    return deltaMatrix.multiply(startMatrix);
  }

  private finishDrag(delta: TransformDelta, cancelled: boolean): void {
    if (!this.activeDrag) {
      return;
    }
    if (cancelled) {
      this.restoreStartMatrices();
    } else {
      this.applyDelta(delta, true);
      this.commandStack.push({ targets: this.adapters.map((adapter) => adapter.source), delta });
    }
    this.activeDrag = undefined;
    this.lastDelta = zeroDelta();
    this.updateFrame();
  }

  private restoreStartMatrices(): void {
    if (!this.activeDrag) return;
    this.adapters.forEach((adapter, index) => {
      const matrix = this.activeDrag!.startMatrices[index];
      adapter.applyMatrix(matrix);
    });
  }

  private createPivotResolver(): PivotResolver {
    if (this.cursor) {
      const position = Vector3.fromArray(this.cursor.position);
      return new PivotResolver({ position });
    }
    return new PivotResolver();
  }
}
