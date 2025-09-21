import {
  Cartesian3,
  Matrix4,
  Quaternion,
  Viewer,
} from 'cesium';
import { GizmoPrimitive } from './GizmoPrimitive';
import { GizmoPicker } from './GizmoPicker';
import { ManipulatorController } from './ManipulatorController';
import { FrameBuilder } from './FrameBuilder';
import { PivotResolver } from './PivotResolver';
import { Snapper } from './Snapper';
import { HudOverlay } from './HudOverlay';
import {
  type DragResult,
  type ManipulatorOptions,
  type ManipulatorTarget,
  type Orientation,
  type Pivot,
  type TargetLike,
  type TransformDelta,
  type Mode,
} from './types';
import { wrapTarget } from './TargetAdapters';

interface TargetTransform {
  translation: Cartesian3;
  rotation: Quaternion;
  scale: Cartesian3;
}

const scratchTranslation = new Cartesian3();
const scratchRotation = new Quaternion();
const scratchScale = new Cartesian3();
const scratchRelative = new Cartesian3();
const scratchVec = new Cartesian3();

export class UniversalManipulator {
  show = true;

  private targets: TargetLike[] = [];
  private orientation: Orientation = 'global';
  private pivot: Pivot = 'origin';
  private readonly primitive: GizmoPrimitive;
  private readonly picker: GizmoPicker;
  private readonly controller: ManipulatorController;
  private readonly frameBuilder: FrameBuilder;
  private readonly pivotResolver = new PivotResolver();
  private readonly snapper = new Snapper();
  private readonly hud: HudOverlay;
  private startTransforms: TargetTransform[] = [];
  private currentMode: Mode | null = null;
  private currentPivot = new Cartesian3();
  private individualPivot = false;
  private scenePreRender: (() => void) | null = null;

  constructor(private readonly viewer: Viewer, options?: ManipulatorOptions) {
    this.primitive = new GizmoPrimitive(viewer);
    this.picker = new GizmoPicker(viewer.scene, this.primitive);
    this.controller = new ManipulatorController(viewer, this.primitive, this.picker);
    this.frameBuilder = new FrameBuilder(viewer.camera);
    this.hud = new HudOverlay(viewer.container);
    this.controller.onDragStart((result) => this.onDragStart(result));
    this.controller.onDragUpdate((result) => this.onDragUpdate(result));
    this.controller.onDragEnd(() => this.onDragEnd());
    if (options?.target) {
      this.setTarget(options.target);
    }
    if (options?.orientation) {
      this.orientation = options.orientation;
    }
    if (options?.pivot) {
      this.pivot = options.pivot;
    }
    if (options?.snap) {
      this.snapper.setStepConfig(options.snap);
    }
    if (options?.cursorPosition) {
      this.pivotResolver.setCursor(options.cursorPosition);
    }
    if (options?.size) {
      this.screenSizeOptions = {
        screenPixelRadius: options.size.screenPixelRadius ?? 84,
        minScale: options.size.minScale ?? 0.8,
        maxScale: options.size.maxScale ?? 3.5,
      };
    }
    this.attachSceneListener();
  }

  private screenSizeOptions = {
    screenPixelRadius: 84,
    minScale: 0.8,
    maxScale: 3.5,
  };

  setTarget(target: ManipulatorTarget): void {
    this.targets = Array.isArray(target) ? target.map((t) => wrapTarget(t as any)) : [wrapTarget(target as any)];
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

  enable(): void {
    this.show = true;
    this.primitive.setShow(true);
  }

  disable(): void {
    this.show = false;
    this.primitive.setShow(false);
  }

  setCursorPosition(position: Cartesian3): void {
    this.pivotResolver.setCursor(position);
    this.updateFrame();
  }

  setSnap(config: Partial<{ translation: number; rotation: number; scale: number }>): void {
    this.snapper.setStepConfig(config);
  }

  setSize(screenPixelRadius: number, minScale: number, maxScale: number): void {
    this.screenSizeOptions = { screenPixelRadius, minScale, maxScale };
  }

  destroy(): void {
    this.controller.destroy();
    this.picker.destroy();
    this.primitive.destroy();
    this.hud.destroy();
    if (this.scenePreRender) {
      this.viewer.scene.preRender.removeEventListener(this.scenePreRender);
    }
  }

  private attachSceneListener(): void {
    this.scenePreRender = () => {
      if (!this.show || this.targets.length === 0) {
        return;
      }
      this.updateFrame();
    };
    this.viewer.scene.preRender.addEventListener(this.scenePreRender);
  }

  private updateFrame(): void {
    if (this.targets.length === 0) {
      return;
    }
    const pivotContext = this.pivotResolver.resolve(this.targets, this.pivot);
    this.currentPivot = pivotContext.pivot;
    this.individualPivot = pivotContext.individual;
    const frame = this.frameBuilder.build(this.targets, this.orientation, pivotContext.pivot);
    this.controller.setFrame(frame);
    const scale = this.computeScreenScale(pivotContext.pivot);
    this.primitive.update(frame, scale);
  }

  private computeScreenScale(position: Cartesian3): number {
    const camera = this.viewer.camera;
    const distance = Cartesian3.distance(camera.positionWC, position);
    const fov = camera.frustum.fov ?? camera.frustum.fovy ?? (60 * Math.PI) / 180;
    const pixelScale = (2 * distance * Math.tan(fov / 2)) / this.viewer.canvas.clientHeight;
    const scale = pixelScale * (this.screenSizeOptions.screenPixelRadius / 100);
    return Math.max(this.screenSizeOptions.minScale, Math.min(this.screenSizeOptions.maxScale, scale));
  }

  private onDragStart(result: DragResult): void {
    this.currentMode = result.mode;
    this.startTransforms = this.targets.map((target) => this.decompose(target.getMatrix()));
    this.hud.show(result.mode, {
      translation: new Cartesian3(0, 0, 0),
      rotation: new Quaternion(0, 0, 0, 1),
      scale: new Cartesian3(1, 1, 1),
    });
  }

  private onDragUpdate(result: DragResult): void {
    if (!this.currentMode) {
      return;
    }
    const snapState = this.controller.getSnapState();
    let delta = result.delta;
    if (result.mode === 'translate') {
      delta = {
        translation: this.snapper.applyTranslation(result.delta.translation, snapState),
        rotation: result.delta.rotation,
        scale: result.delta.scale,
      };
    } else if (result.mode === 'rotate') {
      delta = {
        translation: result.delta.translation,
        rotation: this.snapper.applyRotation(result.delta.rotation, snapState),
        scale: result.delta.scale,
      };
    } else if (result.mode === 'scale') {
      delta = {
        translation: result.delta.translation,
        rotation: result.delta.rotation,
        scale: this.snapper.applyScale(result.delta.scale, snapState),
      };
    }
    this.applyDelta(delta, result.mode);
    this.hud.show(result.mode, delta);
  }

  private onDragEnd(): void {
    this.currentMode = null;
    this.hud.hide();
  }

  private applyDelta(delta: TransformDelta, mode: Mode): void {
    this.targets.forEach((target, index) => {
      const start = this.startTransforms[index];
      const translation = Cartesian3.clone(start.translation, new Cartesian3());
      const rotation = Quaternion.clone(start.rotation, new Quaternion());
      const scale = Cartesian3.clone(start.scale, new Cartesian3());
      const pivot = this.individualPivot ? start.translation : this.currentPivot;
      if (mode === 'translate') {
        Cartesian3.add(translation, delta.translation, translation);
      } else if (mode === 'rotate') {
        const relative = Cartesian3.subtract(translation, pivot, scratchRelative);
        const rotated = Quaternion.multiplyByVector(delta.rotation, relative, scratchVec);
        Cartesian3.add(pivot, rotated, translation);
        Quaternion.multiply(delta.rotation, rotation, rotation);
      } else if (mode === 'scale') {
        const relative = Cartesian3.subtract(translation, pivot, scratchRelative);
        const scaled = new Cartesian3(relative.x * delta.scale.x, relative.y * delta.scale.y, relative.z * delta.scale.z);
        Cartesian3.add(pivot, scaled, translation);
        scale.x *= delta.scale.x;
        scale.y *= delta.scale.y;
        scale.z *= delta.scale.z;
      }
      const matrix = Matrix4.fromTranslationQuaternionRotationScale(translation, rotation, scale, new Matrix4());
      target.setMatrix(matrix);
    });
  }

  private decompose(matrix: Matrix4): TargetTransform {
    Matrix4.decompose(matrix, scratchTranslation, scratchRotation, scratchScale);
    return {
      translation: Cartesian3.clone(scratchTranslation, new Cartesian3()),
      rotation: Quaternion.clone(scratchRotation, new Quaternion()),
      scale: Cartesian3.clone(scratchScale, new Cartesian3()),
    };
  }
}
