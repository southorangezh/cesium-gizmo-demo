import { ManipulatorOptions, ManipulableTarget, Mode, Orientation, Pivot, SnapConfig } from './types.js';
import { FrameBuilder, FrameBuilderOptions, FrameState } from './core/FrameBuilder.js';
import { GizmoPrimitive, GizmoSizeOptions } from './core/GizmoPrimitive.js';
import { GizmoPicker } from './core/GizmoPicker.js';
import { ManipulatorController } from './core/ManipulatorController.js';
import { TransformSolver } from './core/TransformSolver.js';
import { Snapper } from './core/Snapper.js';
import { PivotResolver, PivotResult } from './core/PivotResolver.js';
import { HudOverlay } from './core/HudOverlay.js';
import { Vector3 } from './math/Vector3.js';
import { Matrix4 } from './math/Matrix4.js';
import { Quaternion } from './math/Quaternion.js';
import { decomposeMatrix } from './core/utils.js';

interface HistoryEntry {
  before: Map<string, number[]>;
  after: Map<string, number[]>;
}

interface SceneLike {
  canvas: HTMLCanvasElement;
  primitives: any;
  camera: any;
  postRender: { addEventListener: (fn: () => void) => void; removeEventListener: (fn: () => void) => void };
}

export class UniversalManipulator {
  show = true;

  private readonly scene: SceneLike;
  private readonly canvas: HTMLCanvasElement;
  private readonly container: HTMLElement;
  private readonly primitive: GizmoPrimitive;
  private readonly picker: GizmoPicker;
  private readonly controller: ManipulatorController;
  private readonly solver: TransformSolver;
  private readonly frameBuilder = new FrameBuilder();
  private readonly pivotResolver = new PivotResolver();
  private readonly hud: HudOverlay;
  private readonly snapper = new Snapper();

  private targets: ManipulableTarget[] = [];
  private orientation: Orientation = 'global';
  private pivot: Pivot = 'origin';
  private snapConfig: SnapConfig | undefined;
  private sizeOptions: GizmoSizeOptions = { radius: 1.5, minScale: 0.8, maxScale: 5000 };
  private cursor?: Vector3;
  private normal?: Vector3;
  private frame?: FrameState;
  private pivotResult?: PivotResult;
  private readonly history: HistoryEntry[] = [];
  private historyIndex = -1;
  private pendingInitial?: Map<string, number[]>;

  private readonly postRenderListener: () => void;

  constructor(viewerOrScene: any, options: ManipulatorOptions = {}) {
    this.scene = UniversalManipulator.resolveScene(viewerOrScene);
    this.canvas = this.scene.canvas;
    this.container = UniversalManipulator.resolveContainer(viewerOrScene);

    this.primitive = new GizmoPrimitive(this.scene);
    this.picker = new GizmoPicker(this.scene, this.primitive);
    this.solver = new TransformSolver({ snapper: this.snapper });
    this.controller = new ManipulatorController(this.scene, this.canvas, this.picker, this.primitive, this.solver);
    this.hud = new HudOverlay(this.container);

    this.postRenderListener = () => this.refresh();
    this.scene.postRender.addEventListener(this.postRenderListener);

    this.controller.on((event) => {
      switch (event.type) {
        case 'hover':
          if (event.handle) {
            this.hud.update({ mode: event.handle.mode, axis: event.handle.axis, active: false });
          } else {
            this.hud.update({ mode: 'translate', active: false });
          }
          break;
        case 'drag-start':
          this.captureInitialState();
          this.hud.update({ mode: event.handle.mode, axis: event.handle.axis, active: true });
          break;
        case 'drag-update':
          this.applyDelta(event.result, false);
          this.hud.update({
            mode: event.handle.mode,
            axis: event.handle.axis,
            deltaTranslation: event.result.deltaTranslation,
            deltaRotation: deltaEuler(event.result.deltaRotation),
            deltaScale: event.result.deltaScale,
            snap: undefined,
            active: true
          });
          break;
        case 'drag-end':
          if (event.cancelled) {
            this.restoreInitialState();
          } else {
            this.applyDelta(event.result, true);
            this.commitHistory();
          }
          this.hud.update({ mode: event.handle.mode, axis: event.handle.axis, active: false });
          break;
        default:
          break;
      }
    });

    if (options.target) {
      this.setTarget(options.target);
    }
    if (options.orientation) {
      this.setOrientation(options.orientation);
    }
    if (options.pivot) {
      this.setPivot(options.pivot);
    }
    if (options.snap) {
      this.setSnap(options.snap);
    }
    if (options.screenScale) {
      this.setSize(options.screenScale.radius ?? this.sizeOptions.radius, options.screenScale.minScale ?? this.sizeOptions.minScale, options.screenScale.maxScale ?? this.sizeOptions.maxScale);
    }
    this.setVisible(options.show ?? true);
  }

  setTarget(target: ManipulableTarget | ManipulableTarget[]): void {
    this.targets = Array.isArray(target) ? target.slice() : [target];
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

  enable(modes: Partial<Record<Mode, boolean>>): void {
    (Object.keys(modes) as Mode[]).forEach((mode) => {
      const enabled = modes[mode];
      if (typeof enabled === 'boolean') {
        this.primitive.setModeEnabled(mode, enabled);
      }
      if (this.snapConfig) {
        this.controller.setSnapConfig(mode, this.snapConfig);
      }
    });
  }

  setSnap(config: SnapConfig): void {
    this.snapConfig = config;
    (['translate', 'rotate', 'scale'] as Mode[]).forEach((mode) => {
      this.controller.setSnapConfig(mode, config);
    });
  }

  setSize(radius: number, minScale: number, maxScale: number): void {
    this.sizeOptions = { radius, minScale, maxScale };
    this.refresh();
  }

  setVisible(visible: boolean): void {
    this.show = visible;
    this.primitive.setVisible(visible);
    this.refresh();
  }

  setCursor(position: Vector3): void {
    this.cursor = position.clone();
    this.refresh();
  }

  setNormal(normal: Vector3): void {
    this.normal = normal.clone();
    this.refresh();
  }

  undo(): void {
    if (this.historyIndex < 0) {
      return;
    }
    const entry = this.history[this.historyIndex];
    this.historyIndex -= 1;
    this.applyMatrixMap(entry.before);
  }

  redo(): void {
    if (this.historyIndex >= this.history.length - 1) {
      return;
    }
    this.historyIndex += 1;
    const entry = this.history[this.historyIndex];
    this.applyMatrixMap(entry.after);
  }

  destroy(): void {
    this.scene.postRender.removeEventListener(this.postRenderListener);
    this.controller.destroy();
    this.primitive.destroy();
    this.hud.destroy();
  }

  private refresh(): void {
    if (this.targets.length === 0) {
      this.primitive.setVisible(false);
      return;
    }
    this.primitive.setVisible(this.show);
    this.pivotResult = this.pivotResolver.resolve(this.pivot, this.targets, { cursor: this.cursor });
    const pivotPoint = this.pivotResult.pivotPoint;
    const frameOptions: FrameBuilderOptions = {
      targets: this.targets,
      orientation: this.orientation,
      pivot: this.pivot,
      pivotPoint,
      camera: {
        position: vectorFromCartesian(this.scene.camera.positionWC ?? this.scene.camera.position),
        direction: vectorFromCartesian(this.scene.camera.direction),
        up: vectorFromCartesian(this.scene.camera.up)
      },
      normal: this.normal
    };
    this.frame = this.frameBuilder.build(frameOptions);
    this.controller.setFrame(this.frame);

    const cameraPosition = vectorFromCartesian(this.scene.camera.positionWC ?? this.scene.camera.position);
    this.primitive.update(this.frame, this.sizeOptions, cameraPosition);
  }

  private captureInitialState(): void {
    const map = new Map<string, number[]>();
    this.targets.forEach((target) => {
      map.set(target.id, target.matrix.slice());
    });
    this.pendingInitial = map;
  }

  private restoreInitialState(): void {
    if (!this.pendingInitial) {
      return;
    }
    this.applyMatrixMap(this.pendingInitial);
    this.pendingInitial = undefined;
  }

  private commitHistory(): void {
    if (!this.pendingInitial) {
      return;
    }
    const after = new Map<string, number[]>();
    this.targets.forEach((target) => after.set(target.id, target.matrix.slice()));
    const entry: HistoryEntry = { before: this.pendingInitial, after };
    this.history.splice(this.historyIndex + 1);
    this.history.push(entry);
    this.historyIndex = this.history.length - 1;
    this.pendingInitial = undefined;
  }

  private applyMatrixMap(map: Map<string, number[]>): void {
    this.targets.forEach((target) => {
      const matrix = map.get(target.id);
      if (matrix) {
        target.matrix = matrix.slice();
      }
    });
    this.refresh();
  }

  private applyDelta(result: ReturnType<TransformSolver['solve']>, commit: boolean): void {
    if (!this.frame || !this.pivotResult || !this.pendingInitial) {
      return;
    }

    const pivotPoint = this.pivotResult.pivotPoint;
    const deltaTranslation = new Vector3(result.deltaTranslation.x, result.deltaTranslation.y, result.deltaTranslation.z);
    const deltaRotation = new Quaternion(result.deltaRotation.x, result.deltaRotation.y, result.deltaRotation.z, result.deltaRotation.w);
    const deltaScale = result.deltaScale;

    this.targets.forEach((target) => {
      const initialMatrix = this.pendingInitial!.get(target.id);
      if (!initialMatrix) {
        return;
      }
      const trs = decomposeMatrix(initialMatrix);
      const pivotForTarget = this.pivotResult!.individual && this.pivotResult!.perTarget?.get(target.id)
        ? this.pivotResult!.perTarget!.get(target.id)!
        : pivotPoint;

      const relative = trs.translation.clone().subtract(pivotForTarget);
      const local = new Vector3(
        relative.dot(this.frame!.axes.x),
        relative.dot(this.frame!.axes.y),
        relative.dot(this.frame!.axes.z)
      );
      local.x *= deltaScale.x;
      local.y *= deltaScale.y;
      local.z *= deltaScale.z;

      let worldRelative = this.frame!.axes.x.clone().multiplyScalar(local.x)
        .add(this.frame!.axes.y.clone().multiplyScalar(local.y))
        .add(this.frame!.axes.z.clone().multiplyScalar(local.z));
      worldRelative = deltaRotation.rotateVector(worldRelative);

      const position = pivotForTarget.clone().add(worldRelative).add(deltaTranslation);

      const rotation = deltaRotation.clone().multiply(trs.rotation.clone()).normalize();
      const scale = trs.scale.clone();
      scale.x *= deltaScale.x;
      scale.y *= deltaScale.y;
      scale.z *= deltaScale.z;

      const matrix = new Matrix4().compose(position, rotation, scale);
      target.matrix = matrix.elements.slice();
    });

    if (commit) {
      this.refresh();
    }
  }

  private static resolveScene(viewerOrScene: any): SceneLike {
    if (viewerOrScene.scene) {
      return viewerOrScene.scene;
    }
    return viewerOrScene as SceneLike;
  }

  private static resolveContainer(viewerOrScene: any): HTMLElement {
    if (viewerOrScene.container) {
      return viewerOrScene.container as HTMLElement;
    }
    if (viewerOrScene.canvas && viewerOrScene.canvas.parentElement) {
      return viewerOrScene.canvas.parentElement as HTMLElement;
    }
    throw new Error('Unable to determine container element for manipulator HUD');
  }
}

function vectorFromCartesian(cartesian: any): Vector3 {
  return new Vector3(cartesian.x, cartesian.y, cartesian.z);
}

function deltaEuler(quaternion: { x: number; y: number; z: number; w: number }): { x: number; y: number; z: number } {
  const q = new Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w).normalize();
  const matrix = new Matrix4().makeRotationFromQuaternion(q);
  const m = matrix.elements;
  let x: number;
  let y: number;
  let z: number;
  if (Math.abs(m[6]) < 0.99999) {
    y = Math.asin(-m[6]);
    x = Math.atan2(m[7], m[8]);
    z = Math.atan2(m[4], m[0]);
  } else {
    y = Math.asin(-m[6]);
    x = Math.atan2(-m[9], m[5]);
    z = 0;
  }
  return { x, y, z };
}
