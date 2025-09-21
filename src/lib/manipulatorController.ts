import { FrameBuilder, Frame } from "./frameBuilder";
import { GizmoPrimitive } from "./gizmoPrimitive";
import { GizmoPicker, PickResult } from "./gizmoPicker";
import { PivotResolver } from "./pivotResolver";
import { Snapper } from "./snapper";
import { TransformSolver, Constraint } from "./transformSolver";
import {
  Axis,
  Mode,
  PointerState,
  TransformDelta,
  ManipulatorEventCallbacks,
  Orientation,
  Pivot,
  ManipulatorOptions,
  TargetLike,
  Cartesian3Like
} from "./types";
import { vec3FromLike } from "./math";

function cloneDelta(delta: TransformDelta): TransformDelta {
  return {
    translation: { ...delta.translation },
    rotation: { ...delta.rotation },
    scale: { ...delta.scale }
  };
}

export type ControllerState = "idle" | "hover" | "dragging";

interface ManipulatorRuntimeState {
  frame: Frame;
  pivot: Cartesian3Like;
  targets: TargetLike[];
  handle?: PickResult;
  pointer?: PointerState;
  constraint?: Constraint;
  mode?: Mode;
  delta?: TransformDelta;
}

export class ManipulatorController {
  private state: ControllerState = "idle";
  private frameBuilder = new FrameBuilder();
  private pivotResolver = new PivotResolver();
  private snapper = new Snapper();
  private transformSolver = new TransformSolver();
  private primitive: GizmoPrimitive;
  private picker: GizmoPicker;
  private callbacks: ManipulatorEventCallbacks;
  private orientation: Orientation = "global";
  private pivot: Pivot = "origin";
  private runtime: ManipulatorRuntimeState | undefined;
  private targets: TargetLike[] = [];

  constructor(options?: ManipulatorOptions & { callbacks?: ManipulatorEventCallbacks }) {
    this.primitive = new GizmoPrimitive({ size: options?.screenSize?.pixelRadius });
    this.picker = new GizmoPicker(this.primitive);
    this.callbacks = options?.callbacks || {};
    if (options?.orientation) this.orientation = options.orientation;
    if (options?.pivot) this.pivot = options.pivot;
    if (options?.snap) this.snapper.setConfig(options.snap);
    if (options?.target) this.setTarget(options.target);
  }

  setTarget(target: TargetLike | TargetLike[] | null) {
    if (!target) {
      this.targets = [];
    } else if (Array.isArray(target)) {
      this.targets = target;
    } else {
      this.targets = [target];
    }
    this.recomputeFrame();
  }

  setOrientation(orientation: Orientation) {
    this.orientation = orientation;
    this.recomputeFrame();
  }

  setPivot(pivot: Pivot) {
    this.pivot = pivot;
    this.recomputeFrame();
  }

  setSnap(config: Parameters<Snapper["setConfig"]>[0]) {
    this.snapper.setConfig(config);
  }

  private recomputeFrame() {
    const pivotResult = this.pivotResolver.resolve({ pivot: this.pivot, targets: this.targets });
    const frame = this.frameBuilder.build({ targets: pivotResult.targets, orientation: this.orientation });
    this.runtime = {
      frame,
      pivot: pivotResult.pivot,
      targets: pivotResult.targets
    };
  }

  pointerMove(position: Cartesian3Like, screen: { x: number; y: number }) {
    if (!this.runtime) return;
    if (this.state === "dragging" && this.runtime.pointer) {
      this.runtime.pointer.current = position;
      this.runtime.pointer.screenCurrent = screen;
      this.updateDragging();
      return;
    }
    const result = this.picker.pick(position);
    if (result) {
      this.state = "hover";
      this.runtime.handle = result;
    } else {
      this.state = "idle";
      this.runtime.handle = undefined;
    }
  }

  pointerDown(position: Cartesian3Like, screen: { x: number; y: number }) {
    if (!this.runtime || !this.runtime.handle) return;
    this.state = "dragging";
    const pointer: PointerState = {
      start: position,
      current: position,
      screenStart: screen,
      screenCurrent: screen
    };
    this.runtime.pointer = pointer;
    this.runtime.constraint = this.constraintForHandle(this.runtime.handle);
    this.runtime.mode = this.runtime.handle.mode;
    if (this.callbacks.onBegin) {
      this.callbacks.onBegin(this.runtime.handle.mode, this.runtime.handle);
    }
  }

  pointerUp(committed = true) {
    if (!this.runtime || this.state !== "dragging") return;
    this.state = "idle";
    if (this.callbacks.onEnd) {
      this.callbacks.onEnd(committed, this.runtime.delta || this.identityDelta());
    }
    this.runtime.pointer = undefined;
    this.runtime.delta = undefined;
    this.runtime.handle = undefined;
  }

  cancel() {
    this.pointerUp(false);
  }

  private updateDragging() {
    if (!this.runtime || !this.runtime.pointer || !this.runtime.constraint || !this.runtime.mode) return;
    const rawDelta = this.transformSolver.solve({
      mode: this.runtime.mode,
      constraint: this.runtime.constraint,
      pointer: this.runtime.pointer,
      frame: this.runtime.frame,
      frameBuilder: this.frameBuilder,
      pivot: vec3FromLike(this.runtime.pivot)
    });
    const snapped = this.snapper.apply({
      mode: this.runtime.mode,
      axis: this.runtime.handle?.axis,
      delta: cloneDelta(rawDelta),
      rawDelta: rawDelta
    });
    const delta = snapped.delta;
    this.runtime.delta = delta;
    if (this.callbacks.onUpdate) {
      this.callbacks.onUpdate(delta);
    }
  }

  private identityDelta(): TransformDelta {
    return {
      translation: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 }
    };
  }

  private constraintForHandle(handle: PickResult): Constraint {
    if (handle.id.endsWith("xy")) {
      return { type: "plane", axes: ["x", "y"] };
    }
    if (handle.id.endsWith("yz")) {
      return { type: "plane", axes: ["y", "z"] };
    }
    if (handle.id.endsWith("xz")) {
      return { type: "plane", axes: ["x", "z"] };
    }
    if (handle.id === "scale-uniform" || handle.id === "rotate-view") {
      return { type: "free" };
    }
    if (handle.axis) {
      return { type: "axis", axis: handle.axis };
    }
    return { type: "free" };
  }
}

