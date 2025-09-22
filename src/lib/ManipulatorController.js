import { Mode } from './constants.js';

export class ManipulatorController {
  constructor({ canvas, picker, solver, hud, onStart, onUpdate, onCommit, onCancel, createRay, getPivot, getCamera }) {
    this.canvas = canvas;
    this.picker = picker;
    this.solver = solver;
    this.hud = hud;
    this.onStart = onStart;
    this.onUpdate = onUpdate;
    this.onCommit = onCommit;
    this.onCancel = onCancel;
    this.createRay = createRay;
    this.getPivot = getPivot;
    this.getCamera = getCamera;

    this.state = 'idle';
    this.hoveredHandle = null;
    this.activeSession = null;
    this.modifiers = new Set();

    this._bind();
  }

  destroy() {
    this._unbind();
  }

  _bind() {
    this._mouseMove = (event) => this._handlePointerMove(event);
    this._mouseDown = (event) => this._handlePointerDown(event);
    this._mouseUp = (event) => this._handlePointerUp(event);
    this._keyDown = (event) => this._handleKeyDown(event);
    this._keyUp = (event) => this._handleKeyUp(event);

    this.canvas.addEventListener('pointermove', this._mouseMove);
    this.canvas.addEventListener('pointerdown', this._mouseDown);
    window.addEventListener('pointerup', this._mouseUp);
    window.addEventListener('keydown', this._keyDown);
    window.addEventListener('keyup', this._keyUp);
  }

  _unbind() {
    this.canvas.removeEventListener('pointermove', this._mouseMove);
    this.canvas.removeEventListener('pointerdown', this._mouseDown);
    window.removeEventListener('pointerup', this._mouseUp);
    window.removeEventListener('keydown', this._keyDown);
    window.removeEventListener('keyup', this._keyUp);
  }

  _handlePointerMove(event) {
    if (this.state === 'dragging') {
      this._updateDrag(event);
      return;
    }
    const ray = this.createRay(event);
    if (!ray) return;
    const hit = this.picker.pick(ray);
    if (hit && (!this.hoveredHandle || this.hoveredHandle.id !== hit.id)) {
      this.hoveredHandle = hit;
      this.hud.update({ mode: hit.mode, axis: hit.axis, delta: { position: { x: 0, y: 0, z: 0 }, rotation: 0, scale: { x: 1, y: 1, z: 1 } } });
    } else if (!hit) {
      this.hoveredHandle = null;
      this.hud.hide();
    }
  }

  _handlePointerDown(event) {
    if (event.button !== 0) return;
    const ray = this.createRay(event);
    if (!ray) return;
    const hit = this.picker.pick(ray);
    if (!hit) return;
    const pivot = this.getPivot();
    const camera = this.getCamera();
    this.state = 'dragging';
    this.hoveredHandle = hit;
    const session = this.solver.beginSession({
      mode: hit.mode,
      axis: hit.axis,
      handleType: hit.type,
      startRay: ray,
      pivot,
      camera
    });
    this.activeSession = session;
    this.onStart?.(session);
    event.preventDefault();
  }

  _updateDrag(event) {
    if (!this.activeSession) return;
    const ray = this.createRay(event);
    if (!ray) return;
    const result = this.solver.updateSession(this.activeSession, { currentRay: ray, modifiers: this.modifiers });
    this.hud.update({
      mode: this.activeSession.mode,
      axis: this.activeSession.axis,
      delta: {
        position: result.deltaPosition,
        rotation: this.activeSession.mode === Mode.ROTATE ? this.activeSession.accumulatedAngle : 0,
        scale: result.deltaScale
      }
    });
    this.onUpdate?.(result, this.activeSession);
  }

  _handlePointerUp(event) {
    if (event.button !== 0) return;
    if (this.state !== 'dragging') return;
    this.state = 'idle';
    this.hud.hide();
    if (this.onCommit && this.activeSession) {
      this.onCommit(this.activeSession);
    }
    this.activeSession = null;
  }

  _handleKeyDown(event) {
    if (event.code === 'Escape' && this.state === 'dragging') {
      this.hud.hide();
      this.state = 'idle';
      this.onCancel?.(this.activeSession);
      this.activeSession = null;
      return;
    }
    this.modifiers.add(event.code);
  }

  _handleKeyUp(event) {
    this.modifiers.delete(event.code);
  }
}
