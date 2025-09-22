import { DragPayload, HandleHit, Mode, SnapConfig } from '../types.js';
import { GizmoPicker } from './GizmoPicker.js';
import { GizmoPrimitive } from './GizmoPrimitive.js';
import { FrameState } from './FrameBuilder.js';
import { TransformSolver } from './TransformSolver.js';
import { Vector3 } from '../math/Vector3.js';
import { SolverResult } from '../types.js';

export type ControllerEvent =
  | { type: 'hover'; handle?: HandleHit }
  | { type: 'drag-start'; handle: HandleHit; payload: DragPayload }
  | { type: 'drag-update'; handle: HandleHit; payload: DragPayload; result: SolverResult }
  | { type: 'drag-end'; handle: HandleHit; payload: DragPayload; result: SolverResult; cancelled: boolean };

interface ControllerState {
  frame?: FrameState;
  activeHandle?: HandleHit;
  payload?: DragPayload;
  result?: SolverResult;
  dragging: boolean;
}

export class ManipulatorController {
  private readonly scene: any;
  private readonly canvas: HTMLCanvasElement;
  private readonly picker: GizmoPicker;
  private readonly primitive: GizmoPrimitive;
  private readonly solver: TransformSolver;
  private readonly listeners = new Set<(event: ControllerEvent) => void>();
  private readonly snapConfigs: Partial<Record<Mode, SnapConfig>> = {};
  private enabled = true;
  private state: ControllerState = { dragging: false };

  constructor(scene: any, canvas: HTMLCanvasElement, picker: GizmoPicker, primitive: GizmoPrimitive, solver: TransformSolver) {
    this.scene = scene;
    this.canvas = canvas;
    this.picker = picker;
    this.primitive = primitive;
    this.solver = solver;

    this.pointerMove = this.pointerMove.bind(this);
    this.pointerDown = this.pointerDown.bind(this);
    this.pointerUp = this.pointerUp.bind(this);
    this.keyDown = this.keyDown.bind(this);

    canvas.addEventListener('pointermove', this.pointerMove);
    canvas.addEventListener('pointerdown', this.pointerDown);
    window.addEventListener('pointerup', this.pointerUp);
    window.addEventListener('keydown', this.keyDown);
  }

  on(listener: (event: ControllerEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setFrame(frame: FrameState): void {
    this.state.frame = frame;
  }

  setSnapConfig(mode: Mode, config?: SnapConfig): void {
    if (config) {
      this.snapConfigs[mode] = config;
    } else {
      delete this.snapConfigs[mode];
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  destroy(): void {
    this.canvas.removeEventListener('pointermove', this.pointerMove);
    this.canvas.removeEventListener('pointerdown', this.pointerDown);
    window.removeEventListener('pointerup', this.pointerUp);
    window.removeEventListener('keydown', this.keyDown);
  }

  private pointerMove(event: PointerEvent): void {
    if (!this.enabled) {
      return;
    }

    const position = this.windowPosition(event);
    if (!this.state.dragging) {
      const hit = this.picker.pick({ windowPosition: position });
      this.emit({ type: 'hover', handle: hit });
      this.primitive.highlight(hit?.id, hit ? 'hover' : 'none');
      return;
    }

    if (!this.state.activeHandle || !this.state.payload || !this.state.frame) {
      return;
    }

    const updatedPayload = this.computePayload(this.state.activeHandle, this.state.frame, position, this.state.payload.initialRay.origin);
    if (!updatedPayload) {
      return;
    }

    this.state.payload = updatedPayload;
    const snap = this.snapConfigs[this.state.activeHandle.mode];
    const result = this.solver.solve(this.state.frame, updatedPayload, snap, {
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey
    });
    this.state.result = result;
    this.emit({ type: 'drag-update', handle: this.state.activeHandle, payload: updatedPayload, result });
  }

  private pointerDown(event: PointerEvent): void {
    if (!this.enabled) {
      return;
    }

    if (!this.state.frame) {
      return;
    }

    const position = this.windowPosition(event);
    const hit = this.picker.pick({ windowPosition: position });
    if (!hit) {
      return;
    }

    const payload = this.computePayload(hit, this.state.frame, position);
    if (!payload) {
      return;
    }

    this.state = {
      ...this.state,
      activeHandle: hit,
      payload,
      dragging: true
    };
    this.primitive.highlight(hit.id, 'active');
    this.emit({ type: 'drag-start', handle: hit, payload });
    event.preventDefault();
  }

  private keyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.state.dragging) {
      this.finishDrag(true, event);
    }
  }

  private pointerUp(event: PointerEvent): void {
    this.finishDrag(false, event);
  }

  private finishDrag(cancelled: boolean, event?: PointerEvent | KeyboardEvent): void {
    if (!this.state.dragging) {
      return;
    }

    const { activeHandle, payload, result } = this.state;
    this.state = { dragging: false };
    this.primitive.highlight(undefined, 'none');

    if (activeHandle && payload) {
      const ctrlKey = event instanceof PointerEvent ? event.ctrlKey : event?.ctrlKey ?? false;
      const shiftKey = event instanceof PointerEvent ? event.shiftKey : event?.shiftKey ?? false;
      const finalResult = result ?? this.solver.solve(this.state.frame!, payload, this.snapConfigs[activeHandle.mode], {
        ctrlKey,
        shiftKey
      });
      this.emit({ type: 'drag-end', handle: activeHandle, payload, result: finalResult, cancelled });
    }
  }

  private emit(event: ControllerEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  private windowPosition(event: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: rect.height - (event.clientY - rect.top)
    };
  }

  private computePayload(handle: HandleHit, frame: FrameState, position: { x: number; y: number }, initial?: { x: number; y: number; z: number }): DragPayload | undefined {
    const camera = this.scene.camera;
    const pickRay = camera.getPickRay(new Cesium.Cartesian2(position.x, position.y));
    if (!pickRay) {
      return undefined;
    }
    const rayOrigin = vectorFromCartesian(pickRay.origin);
    const rayDirection = vectorFromCartesian(pickRay.direction).normalize();
    const cameraDirection = vectorFromCartesian(camera.direction).normalize();

    const intersection = this.intersect(handle, frame, rayOrigin, rayDirection, cameraDirection, initial);
    if (!intersection) {
      return undefined;
    }

    return {
      mode: handle.mode,
      axis: handle.axis,
      planeNormal: intersection.planeNormal,
      initialRay: initial
        ? { origin: initial, direction: { x: rayDirection.x, y: rayDirection.y, z: rayDirection.z } }
        : { origin: intersection.point, direction: { x: rayDirection.x, y: rayDirection.y, z: rayDirection.z } },
      currentRay: { origin: intersection.point, direction: { x: rayDirection.x, y: rayDirection.y, z: rayDirection.z } }
    };
  }

  private intersect(
    handle: HandleHit,
    frame: FrameState,
    rayOrigin: Vector3,
    rayDirection: Vector3,
    cameraDirection: Vector3,
    initial?: { x: number; y: number; z: number }
  ): { point: { x: number; y: number; z: number }; planeNormal?: { x: number; y: number; z: number } } | undefined {
    const axisVector = handle.axis ? frame.axes[handle.axis].clone().normalize() : undefined;
    const origin = frame.origin.clone();

    if (handle.mode === 'translate' || handle.mode === 'scale') {
      if (axisVector) {
        let planeNormal = axisVector.clone().cross(cameraDirection).cross(axisVector);
        if (planeNormal.length() < 1e-6) {
          planeNormal = frame.axes.y.clone().cross(axisVector);
        }
        if (planeNormal.length() < 1e-6) {
          planeNormal = frame.axes.z.clone().cross(axisVector);
        }
        planeNormal.normalize();
        const t = intersectRayPlane(rayOrigin, rayDirection, origin, planeNormal);
        if (t === undefined) {
          return undefined;
        }
        const point = rayOrigin.clone().add(rayDirection.clone().multiplyScalar(t));
        return { point: toValues(point), planeNormal: toValues(planeNormal) };
      }
      // uniform scale / free translate fallback to plane facing camera
      const planeNormal = cameraDirection.clone().normalize();
      const t = intersectRayPlane(rayOrigin, rayDirection, origin, planeNormal);
      if (t === undefined) {
        return undefined;
      }
      const point = rayOrigin.clone().add(rayDirection.clone().multiplyScalar(t));
      return { point: toValues(point), planeNormal: toValues(planeNormal) };
    }

    if (handle.mode === 'rotate') {
      const normal = axisVector ?? cameraDirection.clone().normalize();
      const t = intersectRayPlane(rayOrigin, rayDirection, origin, normal);
      if (t === undefined) {
        return undefined;
      }
      const point = rayOrigin.clone().add(rayDirection.clone().multiplyScalar(t));
      return { point: toValues(point), planeNormal: toValues(normal) };
    }

    return undefined;
  }
}

function toValues(vector: Vector3) {
  return { x: vector.x, y: vector.y, z: vector.z };
}

function vectorFromCartesian(cartesian: any): Vector3 {
  return new Vector3(cartesian.x, cartesian.y, cartesian.z);
}

function intersectRayPlane(rayOrigin: Vector3, rayDirection: Vector3, planePoint: Vector3, planeNormal: Vector3): number | undefined {
  const denom = planeNormal.dot(rayDirection);
  if (Math.abs(denom) < 1e-6) {
    return undefined;
  }
  const t = planePoint.clone().subtract(rayOrigin).dot(planeNormal) / denom;
  if (t < 0) {
    return undefined;
  }
  return t;
}
