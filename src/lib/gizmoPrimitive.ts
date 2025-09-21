import type { Axis, Mode } from "./types";
import { vec3, Vec3, vec3ToLike } from "./math";

export interface GizmoHandle {
  id: string;
  mode: Mode;
  axis?: Axis;
  origin: Vec3;
  direction: Vec3;
  length: number;
  radius: number;
  priority: number;
}

export interface GizmoPrimitiveOptions {
  size: number;
  minScale: number;
  maxScale: number;
}

const DEFAULT_SIZE = 120;

export class GizmoPrimitive {
  private handles: GizmoHandle[] = [];
  private options: GizmoPrimitiveOptions;
  private highlighted?: string;
  private active?: string;

  constructor(options?: Partial<GizmoPrimitiveOptions>) {
    this.options = {
      size: options?.size ?? DEFAULT_SIZE,
      minScale: options?.minScale ?? 0.6,
      maxScale: options?.maxScale ?? 2.4
    };
    this.buildHandles();
  }

  setOptions(options: Partial<GizmoPrimitiveOptions>) {
    this.options = { ...this.options, ...options };
  }

  setHighlighted(id?: string) {
    this.highlighted = id;
  }

  setActive(id?: string) {
    this.active = id;
  }

  getHandles(): GizmoHandle[] {
    return this.handles;
  }

  private buildHandles() {
    const size = this.options.size;
    const makeAxisHandle = (axis: Axis, mode: Mode, priority: number): GizmoHandle => {
      const direction = axis === "x" ? vec3(1, 0, 0) : axis === "y" ? vec3(0, 1, 0) : vec3(0, 0, 1);
      return {
        id: `${mode}-${axis}`,
        mode,
        axis,
        origin: vec3(0, 0, 0),
        direction,
        length: size,
        radius: size * 0.05,
        priority
      };
    };

    const handles: GizmoHandle[] = [];
    (["x", "y", "z"] as Axis[]).forEach((axis) => {
      handles.push(makeAxisHandle(axis, "translate", 3));
      handles.push(makeAxisHandle(axis, "rotate", 2));
      handles.push(makeAxisHandle(axis, "scale", 1));
    });
    handles.push({
      id: "translate-xy",
      mode: "translate",
      origin: vec3(0, 0, 0),
      direction: vec3(1, 1, 0),
      length: size * 0.8,
      radius: size * 0.05,
      priority: 2
    });
    handles.push({
      id: "translate-yz",
      mode: "translate",
      origin: vec3(0, 0, 0),
      direction: vec3(0, 1, 1),
      length: size * 0.8,
      radius: size * 0.05,
      priority: 2
    });
    handles.push({
      id: "translate-xz",
      mode: "translate",
      origin: vec3(0, 0, 0),
      direction: vec3(1, 0, 1),
      length: size * 0.8,
      radius: size * 0.05,
      priority: 2
    });
    handles.push({
      id: "scale-uniform",
      mode: "scale",
      origin: vec3(0, 0, 0),
      direction: vec3(1, 1, 1),
      length: size * 0.4,
      radius: size * 0.1,
      priority: 4
    });
    handles.push({
      id: "rotate-view",
      mode: "rotate",
      origin: vec3(0, 0, 0),
      direction: vec3(0, 0, 1),
      length: size,
      radius: size * 0.02,
      priority: 5
    });
    this.handles = handles;
  }
}

