import { vec3, add, subtract, scale as scaleVec, toCesium as toCartesian } from '../math/vec3.js';
import { multiply as multiplyQuat, rotateVector } from '../math/quaternion.js';
import { composeMatrix, decompose } from '../math/matrix4.js';
import { readMatrix, writeMatrix } from '../core/target-adapter.js';

export class ManipulatorController {
  constructor({ viewer, solver, gizmo, picker, frameBuilder, pivotResolver, snapper }) {
    this.viewer = viewer;
    this.scene = viewer.scene;
    this.solver = solver;
    this.gizmo = gizmo;
    this.picker = picker;
    this.frameBuilder = frameBuilder;
    this.pivotResolver = pivotResolver;
    this.snapper = snapper;
    this.targets = [];
    this.pivotMode = 'origin';
    this.orientation = 'global';
    this.mode = 'translate';
    this.enabled = { translate: true, rotate: true, scale: true };
    this.handler = null;
    this.session = null;
    this.frame = null;
    this.pivotPoint = vec3(0, 0, 0);
    this.onUpdate = () => {};
    this.onComplete = () => {};
    this.onCancel = () => {};
    this._preRenderListener = this.scene.preRender.addEventListener(() => this._updateGizmo());
    this.attach();
  }

  attach() {
    const Cesium = globalThis.Cesium;
    if (!Cesium) {
      throw new Error('Cesium is required for ManipulatorController.');
    }
    if (this.handler) {
      this.handler.destroy();
    }
    this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas);
    this.handler.setInputAction((movement) => this._onMouseMove(movement.endPosition), Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    this.handler.setInputAction((click) => this._onLeftDown(click.position), Cesium.ScreenSpaceEventType.LEFT_DOWN);
    this.handler.setInputAction(() => this._onLeftUp(), Cesium.ScreenSpaceEventType.LEFT_UP);
    this.handler.setInputAction(() => this._cancelInteraction(), Cesium.ScreenSpaceEventType.RIGHT_DOWN);
  }

  detach() {
    if (this.handler) {
      this.handler.destroy();
      this.handler = null;
    }
    if (this._preRenderListener) {
      this.scene.preRender.removeEventListener(this._preRenderListener);
      this._preRenderListener = null;
    }
  }

  destroy() {
    this.detach();
  }

  setTargets(targets) {
    this.targets = Array.isArray(targets) ? targets : [targets];
    this._updatePivot();
  }

  setOrientation(orientation) {
    this.orientation = orientation;
    this._updatePivot();
  }

  setPivot(mode) {
    this.pivotMode = mode;
    this._updatePivot();
  }

  enable(mode, enabled) {
    this.enabled[mode] = enabled;
  }

  setCallbacks({ onUpdate, onComplete, onCancel }) {
    this.onUpdate = onUpdate || this.onUpdate;
    this.onComplete = onComplete || this.onComplete;
    this.onCancel = onCancel || this.onCancel;
  }

  setMode(mode) {
    this.mode = mode;
  }

  setSnap(config) {
    if (this.snapper) {
      this.snapper.setConfig(config);
    }
  }

  _updatePivot() {
    const pivotInfo = this.pivotResolver.resolve({ targets: this.targets, pivot: this.pivotMode });
    this.pivotPoint = pivotInfo.pivot || pivotInfo.perTarget[0] || vec3(0, 0, 0);
    this.frame = this.frameBuilder.build({
      orientation: this.orientation,
      pivot: this.pivotPoint,
      target: this.targets[0] ? readMatrix(this.targets[0], this.scene) : null,
      camera: this.viewer.camera,
    });
    this._updateGizmo();
  }

  _computePixelScale() {
    const Cesium = globalThis.Cesium;
    if (!Cesium || !this.frame) {
      return 1;
    }
    const camera = this.viewer.camera;
    const origin = toCartesian(this.frame.origin);
    const distance = Cesium.Cartesian3.distance(camera.positionWC, origin);
    const canvasHeight = this.viewer.canvas.height || 1;
    const fov = camera.frustum.fovy || camera.frustum.fov || Math.PI / 3;
    return (2 * distance * Math.tan(fov / 2)) / canvasHeight;
  }

  _updateGizmo() {
    if (!this.frame || !this.gizmo) {
      return;
    }
    const scale = this._computePixelScale();
    this.gizmo.update(this.frame, scale);
  }

  _onMouseMove(position) {
    if (!position) {
      return;
    }
    if (this.session) {
      this._drag(position);
      return;
    }
    const hit = this.picker.pick(position);
    if (hit && this.enabled[hit.mode]) {
      this.gizmo.highlight(hit.id);
    } else {
      this.gizmo.highlight(null);
    }
  }

  _onLeftDown(position) {
    if (!position) {
      return;
    }
    const hit = this.picker.pick(position);
    if (!hit || !this.enabled[hit.mode]) {
      this.gizmo.activate(null);
      return;
    }
    const ray = this.viewer.camera.getPickRay(position);
    const session = this.solver.beginSession({
      mode: hit.mode,
      axis: hit.axis,
      axisPair: hit.axisPair,
      frame: this.frame,
      pivot: this.pivotPoint,
      initialRay: { origin: ray.origin, direction: ray.direction },
      camera: this.viewer.camera,
    });
    session.handle = hit;
    this.session = session;
    this.gizmo.activate(hit.id);
  }

  _onLeftUp() {
    if (!this.session) {
      return;
    }
    this.onComplete(this.session.handle);
    this.session = null;
    this.gizmo.activate(null);
    this.gizmo.clearStates();
    this._updatePivot();
  }

  _cancelInteraction() {
    if (!this.session) {
      return;
    }
    this.onCancel(this.session.handle);
    this.session = null;
    this.gizmo.clearStates();
    this._updatePivot();
  }

  _drag(position) {
    const ray = this.viewer.camera.getPickRay(position);
    const delta = this.solver.update(this.session, { origin: ray.origin, direction: ray.direction }, position.modifiers || {});
    if (!delta) {
      return;
    }
    this._applyDelta(delta);
    this.onUpdate(delta, this.session.handle);
  }

  _applyDelta(delta) {
    for (const target of this.targets) {
      let matrix = readMatrix(target, this.scene);
      if (!matrix) continue;
      const { translation, rotation, scale } = decompose(matrix);
      let newTranslation = translation;
      let newRotation = rotation;
      let newScale = scale;

      if (delta.translation) {
        newTranslation = add(newTranslation, delta.translation);
      }
      if (delta.rotation) {
        const relative = subtract(newTranslation, this.pivotPoint);
        const rotatedRelative = rotateVector(delta.rotation, relative);
        newTranslation = add(this.pivotPoint, rotatedRelative);
        newRotation = multiplyQuat(delta.rotation, newRotation);
      }
      if (delta.scale) {
        const relative = subtract(newTranslation, this.pivotPoint);
        const scaledRelative = vec3(
          relative.x * delta.scale.x,
          relative.y * delta.scale.y,
          relative.z * delta.scale.z
        );
        newTranslation = add(this.pivotPoint, scaledRelative);
        newScale = vec3(newScale.x * delta.scale.x, newScale.y * delta.scale.y, newScale.z * delta.scale.z);
      }

      const newMatrix = composeMatrix(newTranslation, newRotation, newScale);
      writeMatrix(target, newMatrix);
    }
  }

  applyDeltaDirect(delta) {
    this._applyDelta(delta);
    this.onUpdate(delta, this.session ? this.session.handle : null);
    this.onComplete(this.session ? this.session.handle : null);
    this._updatePivot();
  }
}
