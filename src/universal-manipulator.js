import { FrameBuilder } from './core/frame-builder.js';
import { PivotResolver } from './core/pivot-resolver.js';
import { Snapper, parseInputValue } from './core/snapper.js';
import { TransformSolver } from './core/transform-solver.js';
import { GizmoPrimitive } from './runtime/gizmo-primitive.js';
import { GizmoPicker } from './runtime/gizmo-picker.js';
import { ManipulatorController } from './runtime/manipulator-controller.js';
import { HudOverlay } from './runtime/hud-overlay.js';
import { vec3, scale as scaleVec, add } from './math/vec3.js';
import { fromAxisAngle } from './math/quaternion.js';

export class UniversalManipulator {
  constructor(viewer, options = {}) {
    this.viewer = viewer;
    this.snapper = new Snapper(options.snap || {});
    this.frameBuilder = new FrameBuilder(viewer.scene);
    this.pivotResolver = new PivotResolver();
    this.solver = new TransformSolver({ snapper: this.snapper });
    this.gizmo = new GizmoPrimitive(viewer);
    this.picker = new GizmoPicker(viewer.scene);
    this.hud = new HudOverlay(viewer.container);
    this.controller = new ManipulatorController({
      viewer,
      solver: this.solver,
      gizmo: this.gizmo,
      picker: this.picker,
      frameBuilder: this.frameBuilder,
      pivotResolver: this.pivotResolver,
      snapper: this.snapper,
    });
    this.controller.setCallbacks({
      onUpdate: (delta, handle) => this._onDelta(delta, handle),
      onComplete: () => this.hud.clearDelta(),
      onCancel: () => this.hud.clearDelta(),
    });
    this.hud.setHandlers({
      onSubmit: (value) => this._applyInput(value),
      onCancel: () => this.hud.clearDelta(),
    });
    this.show = true;
    if (options.target) {
      this.setTarget(options.target);
    }
    if (options.orientation) {
      this.setOrientation(options.orientation);
    }
    if (options.pivot) {
      this.setPivot(options.pivot);
    }
    if (options.enable) {
      Object.entries(options.enable).forEach(([mode, enabled]) => this.enable(mode, enabled));
    }
    if (options.snap) {
      this.setSnap(options.snap);
    }
    if (options.size) {
      this.setSize(options.size);
    }
    this._lastHandle = null;
  }

  setTarget(target) {
    this.controller.setTargets(target);
  }

  setOrientation(orientation) {
    this.controller.setOrientation(orientation);
  }

  setPivot(pivot) {
    this.controller.setPivot(pivot);
  }

  enable(mode, enabled = true) {
    this.controller.enable(mode, enabled);
  }

  setSnap(config) {
    this.controller.setSnap(config);
  }

  setSize(size) {
    this.gizmo.setSize(size);
  }

  set show(value) {
    this._show = value;
    this.gizmo.setVisible(value);
    this.hud.root.style.display = value ? 'block' : 'none';
  }

  get show() {
    return this._show;
  }

  _onDelta(delta, handle) {
    if (handle) {
      this._lastHandle = handle;
    }
    this.hud.showDelta(delta);
  }

  _applyInput(text) {
    if (!this._lastHandle) {
      return;
    }
    const parsed = parseInputValue(text, this._unitForHandle(this._lastHandle));
    const basis = this.controller.frame ? this.controller.frame.basis : null;
    const delta = { translation: null, rotation: null, scale: null };
    if (this._lastHandle.mode === 'translate' && basis) {
      if (this._lastHandle.axis) {
        const dir = basis[this._lastHandle.axis];
        delta.translation = scaleVec(dir, parsed.value);
      } else if (this._lastHandle.axisPair) {
        const dirA = basis[this._lastHandle.axisPair[0]];
        const dirB = basis[this._lastHandle.axisPair[1]];
        const move = add(scaleVec(dirA, parsed.value), scaleVec(dirB, parsed.value));
        delta.translation = move;
      }
    } else if (this._lastHandle.mode === 'rotate' && basis) {
      const dir = this._lastHandle.axis ? basis[this._lastHandle.axis] : this.viewer.camera.direction;
      delta.rotation = fromAxisAngle(dir, parsed.value);
    } else if (this._lastHandle.mode === 'scale') {
      const factorValue = parsed.unit === '%' ? 1 + parsed.value : parsed.value;
      if (this._lastHandle.type === 'uniform') {
        delta.scale = vec3(factorValue, factorValue, factorValue);
      } else if (basis && this._lastHandle.axis) {
        const scaleVector = vec3(1, 1, 1);
        scaleVector[this._lastHandle.axis] = factorValue;
        delta.scale = scaleVector;
      }
    }
    if (delta.translation || delta.rotation || delta.scale) {
      this.controller.applyDeltaDirect(delta);
    }
    this.hud.clearDelta();
  }

  _unitForHandle(handle) {
    if (!handle) return 'm';
    if (handle.mode === 'rotate') {
      return '°';
    }
    if (handle.mode === 'scale') {
      return '%';
    }
    return 'm';
  }

  destroy() {
    this.controller.destroy();
    this.gizmo.destroy();
    this.hud.destroy();
  }
}
