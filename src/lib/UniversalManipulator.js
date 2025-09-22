import { DEFAULT_OPTIONS, Mode, Orientation, Pivot } from './constants.js';
import { GizmoPrimitive } from './GizmoPrimitive.js';
import { GizmoPicker } from './GizmoPicker.js';
import { FrameBuilder } from './FrameBuilder.js';
import { TransformSolver } from './TransformSolver.js';
import { Snapper } from './Snapper.js';
import { PivotResolver } from './PivotResolver.js';
import { HudOverlay } from './HudOverlay.js';
import { ManipulatorController } from './ManipulatorController.js';
import { Vector3 } from '../math/Vector3.js';
import { Matrix4 } from '../math/Matrix4.js';
import { Quaternion } from '../math/Quaternion.js';

function ensureMatrix(target) {
  if (target instanceof Matrix4) return target;
  if (target.matrix instanceof Matrix4) return target.matrix;
  if (Array.isArray(target)) {
    const m = new Matrix4();
    m.elements = target.slice(0, 16);
    return m;
  }
  if (typeof target.getMatrix === 'function') {
    return target.getMatrix();
  }
  if (target.modelMatrix instanceof Matrix4) return target.modelMatrix;
  throw new Error('Target does not provide a matrix');
}

function writeMatrix(target, matrix) {
  if (target instanceof Matrix4) {
    target.copy(matrix);
  } else if (target.matrix instanceof Matrix4) {
    target.matrix.copy(matrix);
  } else if (typeof target.setMatrix === 'function') {
    target.setMatrix(matrix);
  } else if (target.modelMatrix instanceof Matrix4) {
    target.modelMatrix.copy(matrix);
  }
}

export class UniversalManipulator {
  constructor(options = {}) {
    this.scene = options.scene;
    this.canvas = options.canvas;
    if (!this.canvas) {
      throw new Error('canvas is required');
    }
    this.cameraProvider = options.getCamera || (() => options.camera);
    this.createRay = options.createRay;
    if (!this.createRay) {
      throw new Error('createRay callback is required');
    }
    this.overlayContainer = options.overlayContainer || document.body;

    this.options = {
      ...DEFAULT_OPTIONS,
      ...options
    };

    this.targets = [];
    this.mode = this.options.mode || Mode.TRANSLATE;
    this.orientation = this.options.orientation || Orientation.GLOBAL;
    this.pivotMode = this.options.pivot || Pivot.ORIGIN;
    this.enableFlags = { ...DEFAULT_OPTIONS.enable, ...(options.enable || {}) };

    this.gizmo = new GizmoPrimitive({
      screenPixelRadius: this.options.size?.screenPixelRadius,
      minScale: this.options.size?.minScale,
      maxScale: this.options.size?.maxScale,
      colors: this.options.colors
    });
    this.picker = new GizmoPicker(this.gizmo);
    this.frameBuilder = new FrameBuilder(() => this._getCamera());
    this.snapper = new Snapper(this.options.snap);
    this.solver = new TransformSolver(this.frameBuilder, this.snapper);
    this.pivotResolver = new PivotResolver();
    this.hud = new HudOverlay(this.overlayContainer);

    this.accumulatedDelta = {
      position: new Vector3(),
      rotation: Quaternion.identity(),
      scale: new Vector3(1, 1, 1)
    };

    this._cameraSnapshot = null;
    this._currentPivot = new Vector3();
    this._perTargetPivot = [];
    this._initialStates = [];

    this.controller = new ManipulatorController({
      canvas: this.canvas,
      picker: this.picker,
      solver: this.solver,
      hud: this.hud,
      createRay: this.createRay,
      getPivot: () => this._currentPivot.clone(),
      getCamera: () => this._cameraSnapshot,
      onStart: (session) => this._onSessionStart(session),
      onUpdate: (result, session) => this._applyDelta(result, session),
      onCommit: () => this._commitDelta(),
      onCancel: () => this._cancelDelta()
    });
  }

  setTarget(target) {
    this.targets = Array.isArray(target) ? target : [target];
    this._updateFrame();
  }

  setOrientation(orientation) {
    this.orientation = orientation;
    this._updateFrame();
  }

  setPivot(pivotMode) {
    this.pivotMode = pivotMode;
    this._updatePivot();
  }

  enable(mode, value) {
    this.enableFlags[mode] = value;
    if (!value && this.mode === mode) {
      const available = Object.keys(this.enableFlags).find((key) => this.enableFlags[key]);
      if (available) this.mode = available;
    }
  }

  setMode(mode) {
    if (!this.enableFlags[mode]) throw new Error(`Mode ${mode} disabled`);
    this.mode = mode;
    this.gizmo.setMode(mode);
  }

  setSnap(stepConfig) {
    this.snapper.update(stepConfig);
  }

  setSize(screenPixelRadius, minScale, maxScale) {
    this.gizmo.screenPixelRadius = screenPixelRadius;
    this.gizmo.minScale = minScale;
    this.gizmo.maxScale = maxScale;
  }

  setShow(value) {
    this.gizmo.setShow(value);
  }

  updateCursor(position) {
    this.pivotResolver.setCursor(position);
    if (this.pivotMode === Pivot.CURSOR) {
      this._updatePivot();
    }
  }

  destroy() {
    this.controller.destroy();
  }

  _getCamera() {
    const camera = this.cameraProvider?.();
    if (!camera) throw new Error('Camera provider returned null');
    return camera;
  }

  _updateFrame() {
    if (this.targets.length === 0) return;
    const primaryMatrix = ensureMatrix(this.targets[0]);
    this._updatePivot();
    this._cameraSnapshot = this._getCamera();
    const options = {};
    if (this.orientation === Orientation.NORMAL) {
      options.normal = this.options.normal || new Vector3(0, 0, 1);
    }
    const frame = this.frameBuilder.build(primaryMatrix, this.orientation, options);
    this.gizmo.setMode(this.mode);
    this.gizmo.update(frame, this._currentPivot, this._cameraSnapshot);
  }

  _updatePivot() {
    if (this.targets.length === 0) return;
    const pivotInfo = this.pivotResolver.resolve(this.targets.map((t) => ({ matrix: ensureMatrix(t) })), this.pivotMode);
    this._currentPivot = pivotInfo.worldPivot ? pivotInfo.worldPivot.clone() : ensureMatrix(this.targets[0]).getPosition(new Vector3());
    this._perTargetPivot = pivotInfo.perTarget;
  }

  _onSessionStart(session) {
    this._initialStates = this.targets.map((target, index) => {
      const matrix = ensureMatrix(target).clone();
      const position = new Vector3();
      const rotation = new Quaternion();
      const scale = new Vector3();
      matrix.decompose(position, rotation, scale);
      return { matrix, position, rotation, scale };
    });
    this._sessionPivot = this._perTargetPivot.map((pivot) => pivot.clone());
    this._cameraSnapshot = this._getCamera();
  }

  _applyDelta(result, session) {
    const { deltaPosition, deltaRotation, deltaScale } = result;
    this.accumulatedDelta.position.copy(deltaPosition);
    this.accumulatedDelta.rotation.copy(deltaRotation);
    this.accumulatedDelta.scale.copy(deltaScale);

    this.targets.forEach((target, index) => {
      const initial = this._initialStates[index];
      const pivot = this._sessionPivot[index] || this._currentPivot;
      const pivotVec = pivot.clone();

      const relative = initial.position.clone().subtract(pivotVec);
      const scaledRelative = new Vector3(
        relative.x * deltaScale.x,
        relative.y * deltaScale.y,
        relative.z * deltaScale.z
      );
      const rotatedRelative = scaledRelative.clone().applyQuaternion(deltaRotation);
      const position = pivotVec.clone().add(rotatedRelative).add(deltaPosition);

      const rotation = deltaRotation.clone().multiply(initial.rotation).normalize();
      const scale = new Vector3(
        initial.scale.x * deltaScale.x,
        initial.scale.y * deltaScale.y,
        initial.scale.z * deltaScale.z
      );

      const updated = new Matrix4().compose(position, rotation, scale);
      writeMatrix(target, updated);
    });
  }

  _commitDelta() {
    this.accumulatedDelta.position.set(0, 0, 0);
    this.accumulatedDelta.rotation = Quaternion.identity();
    this.accumulatedDelta.scale.set(1, 1, 1);
    this._updateFrame();
  }

  _cancelDelta() {
    this._initialStates.forEach((state, index) => {
      writeMatrix(this.targets[index], state.matrix);
    });
    this.accumulatedDelta.position.set(0, 0, 0);
    this.accumulatedDelta.rotation = Quaternion.identity();
    this.accumulatedDelta.scale.set(1, 1, 1);
    this._updateFrame();
  }
}
