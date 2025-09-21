import { Cartesian3, Matrix3, Matrix4, Quaternion, type Viewer } from 'cesium';
import type {
  HandleHit,
  ManipulatorOptions,
  Orientation,
  Pivot,
  PointerInfo,
  TransformDelta,
  TransformState,
  TransformTarget
} from './types';
import { GizmoPrimitive } from './GizmoPrimitive';
import { GizmoPicker } from './GizmoPicker';
import { HudOverlay } from './HudOverlay';
import { ManipulatorController } from './ManipulatorController';
import { FrameBuilder } from './FrameBuilder';
import { PivotResolver } from './PivotResolver';
import { UniversalSnapper } from './Snapper';
import { TransformSolver } from './TransformSolver';

const DEFAULT_SIZE = {
  screenPixelRadius: 90,
  minScale: 0.5,
  maxScale: 200
};

const scratchMatrix = new Matrix4();
const scratchTranslation = new Cartesian3();
const scratchScale = new Cartesian3();
const scratchRotationMatrix = new Matrix3();
const scratchQuaternion = new Quaternion();

interface DragState {
  handle: HandleHit;
  startPointer: PointerInfo;
  initialManipulatorState: TransformState;
  targetStates: TransformState[];
}

export class UniversalManipulator {
  show = true;
  private readonly gizmo: GizmoPrimitive;
  private readonly picker: GizmoPicker;
  private readonly controller: ManipulatorController;
  private readonly frameBuilder = new FrameBuilder();
  private readonly pivotResolver = new PivotResolver();
  private readonly snapper: UniversalSnapper;
  private readonly solver: TransformSolver;
  private readonly hud: HudOverlay;
  private orientation: Orientation = 'global';
  private pivot: Pivot = 'origin';
  private sizeConfig = DEFAULT_SIZE;
  private targets: TransformTarget[] = [];
  private dragState?: DragState;
  private currentPivot = new Cartesian3();
  private currentDelta: TransformDelta = {
    translation: new Cartesian3(),
    rotation: Quaternion.IDENTITY,
    scale: new Cartesian3(1, 1, 1)
  };

  constructor(private readonly viewer: Viewer, options: ManipulatorOptions = {}) {
    const scene = viewer.scene;
    this.gizmo = new GizmoPrimitive(scene);
    this.picker = new GizmoPicker(scene);
    this.snapper = new UniversalSnapper(options.snap);
    this.solver = new TransformSolver(this.snapper);
    this.hud = new HudOverlay({ container: viewer.container });
    this.controller = new ManipulatorController(scene, this.picker, {
      onHover: (hit) => this.onHover(hit),
      onDragStart: (hit, pointer) => this.onDragStart(hit, pointer),
      onDragMove: (pointer) => this.onDragMove(pointer),
      onDragEnd: (pointer) => this.onDragEnd(pointer),
      onCancel: () => this.onCancel()
    });

    if (options.orientation) {
      this.orientation = options.orientation;
    }
    if (options.pivot) {
      this.pivot = options.pivot;
    }
    if (options.size) {
      this.sizeConfig = options.size;
    }
    if (options.target) {
      this.setTarget(options.target);
    }
  }

  private get scene() {
    return this.viewer.scene;
  }

  setTarget(target: TransformTarget | TransformTarget[]): void {
    this.targets = Array.isArray(target) ? target : target ? [target] : [];
    this.refresh();
  }

  setOrientation(orientation: Orientation): void {
    this.orientation = orientation;
    this.refresh();
  }

  setPivot(pivot: Pivot): void {
    this.pivot = pivot;
    this.refresh();
  }

  enable(): void {
    // Placeholder for API parity; specific toggles handled externally.
  }

  setSnap(config: ManipulatorOptions['snap']): void {
    this.snapper.applyConfig(config);
  }

  setSize(screenPixelRadius: number, minScale: number, maxScale: number): void {
    this.sizeConfig = { screenPixelRadius, minScale, maxScale };
    this.refresh();
  }

  destroy(): void {
    this.gizmo.destroy();
    this.controller.destroy();
  }

  private refresh(): void {
    if (!this.show || this.targets.length === 0) {
      this.gizmo.show = false;
      return;
    }
    const pivotResult = this.pivotResolver.resolve({ pivot: this.pivot, targets: this.targets });
    this.currentPivot = pivotResult.origin;
    const frame = this.frameBuilder.build({
      orientation: this.orientation,
      pivot: this.currentPivot,
      camera: this.scene.camera,
      targets: this.targets
    });
    const scale = this.computeScreenScale();
    this.gizmo.show = true;
    this.gizmo.update(frame, scale);
  }

  private computeScreenScale(): number {
    const camera = this.scene.camera;
    const canvas = this.scene.canvas;
    const distance = Cartesian3.distance(camera.positionWC, this.currentPivot);
    const frustum: any = camera.frustum;
    const fov = frustum.fovy ?? frustum.fov ?? Math.PI / 3;
    const height = 2 * Math.max(distance, 1e-3) * Math.tan(fov / 2);
    const pixelsPerMeter = canvas.height / Math.max(height, 1e-3);
    const desiredScale = this.sizeConfig.screenPixelRadius / pixelsPerMeter;
    return Math.min(Math.max(desiredScale, this.sizeConfig.minScale), this.sizeConfig.maxScale);
  }

  private onHover(hit?: HandleHit): void {
    this.gizmo.highlight(hit?.id, this.dragState?.handle.id);
    this.scene.requestRender();
  }

  private onDragStart(hit: HandleHit, pointer: PointerInfo): void {
    this.dragState = {
      handle: hit,
      startPointer: pointer,
      initialManipulatorState: this.createManipulatorState(),
      targetStates: this.targets.map((target) => this.decomposeTarget(target))
    };
    this.gizmo.highlight(hit.id, hit.id);
    this.scene.requestRender();
  }

  private onDragMove(pointer: PointerInfo): void {
    if (!this.dragState) {
      return;
    }
    const frame = this.frameBuilder.build({
      orientation: this.orientation,
      pivot: this.currentPivot,
      camera: this.scene.camera,
      targets: this.targets
    });
    const solveResult = this.solver.solve({
      mode: this.dragState.handle.mode,
      axis: this.dragState.handle.axis,
      plane: this.dragState.handle.plane,
      frame,
      pivot: this.currentPivot,
      pointer,
      startPointer: this.dragState.startPointer,
      snapper: this.snapper,
      initialState: this.dragState.initialManipulatorState,
      cameraDirection: Cartesian3.clone(this.scene.camera.direction)
    });
    this.currentDelta = solveResult.delta;
    this.applyDeltaToTargets(solveResult.delta);
    this.hud.show(this.dragState.handle.mode, solveResult.delta);
    this.refresh();
    this.scene.requestRender();
  }

  private onDragEnd(pointer: PointerInfo): void {
    if (!this.dragState) {
      return;
    }
    this.hud.hide();
    this.gizmo.highlight(undefined, undefined);
    this.dragState = undefined;
    this.refresh();
  }

  private onCancel(): void {
    if (!this.dragState) {
      return;
    }
    for (let i = 0; i < this.targets.length; i++) {
      const target = this.targets[i];
      const state = this.dragState.targetStates[i];
      if (!target || !state) {
        continue;
      }
      target.setMatrix(state.matrix);
      target.commit?.(state.matrix);
    }
    this.hud.hide();
    this.dragState = undefined;
    this.refresh();
  }

  private applyDeltaToTargets(delta: TransformDelta): void {
    if (!this.dragState) {
      return;
    }
    for (let i = 0; i < this.targets.length; i++) {
      const target = this.targets[i];
      const initial = this.dragState.targetStates[i];
      if (!target || !initial) {
        continue;
      }
      const translation = Cartesian3.add(initial.translation, delta.translation, new Cartesian3());
      const rotation = Quaternion.multiply(delta.rotation, initial.rotation, new Quaternion());
      const scale = new Cartesian3(
        initial.scale.x * delta.scale.x,
        initial.scale.y * delta.scale.y,
        initial.scale.z * delta.scale.z
      );
      const matrix = Matrix4.fromTranslationQuaternionRotationScale(translation, rotation, scale, new Matrix4());
      target.setMatrix(matrix);
      target.commit?.(matrix);
    }
  }

  private createManipulatorState(): TransformState {
    return {
      translation: new Cartesian3(0, 0, 0),
      rotation: Quaternion.IDENTITY,
      scale: new Cartesian3(1, 1, 1),
      matrix: Matrix4.IDENTITY
    };
  }

  private decomposeTarget(target: TransformTarget): TransformState {
    const matrix = target.getMatrix(new Matrix4());
    Matrix4.getTranslation(matrix, scratchTranslation);
    Matrix4.getMatrix3(matrix, scratchRotationMatrix);
    const scale = Matrix3.getScale(scratchRotationMatrix, scratchScale);
    const rotationMatrix = Matrix3.clone(scratchRotationMatrix, new Matrix3());
    const rotation = Quaternion.fromRotationMatrix(rotationMatrix, scratchQuaternion);
    return {
      translation: Cartesian3.clone(scratchTranslation),
      rotation: Quaternion.clone(rotation),
      scale: Cartesian3.clone(scale),
      matrix: Matrix4.clone(matrix, new Matrix4())
    };
  }
}
