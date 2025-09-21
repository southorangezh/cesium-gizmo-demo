import { ManipulatorController } from "./manipulatorController";
import type {
  ManipulatorOptions,
  ManipulatorEventCallbacks,
  Orientation,
  Pivot,
  TargetLike,
  Mode,
  SnapStepConfig,
  ScreenSizeOptions
} from "./types";

interface EnableFlags {
  translate: boolean;
  rotate: boolean;
  scale: boolean;
  freeTranslate: boolean;
  uniformScale: boolean;
  viewRotate: boolean;
}

export class UniversalManipulator {
  public show = true;
  private controller: ManipulatorController;
  private flags: EnableFlags = {
    translate: true,
    rotate: true,
    scale: true,
    freeTranslate: true,
    uniformScale: true,
    viewRotate: true
  };

  constructor(private options: ManipulatorOptions & { callbacks?: ManipulatorEventCallbacks } = {}) {
    this.controller = new ManipulatorController(options);
    if (options.enabledModes) {
      this.flags.translate = options.enabledModes.includes("translate");
      this.flags.rotate = options.enabledModes.includes("rotate");
      this.flags.scale = options.enabledModes.includes("scale");
    }
  }

  setTarget(target: TargetLike | TargetLike[] | null) {
    this.controller.setTarget(target);
  }

  setOrientation(orientation: Orientation) {
    this.controller.setOrientation(orientation);
  }

  setPivot(pivot: Pivot) {
    this.controller.setPivot(pivot);
  }

  enable(flags: Partial<EnableFlags>) {
    this.flags = { ...this.flags, ...flags };
  }

  setSnap(config: SnapStepConfig) {
    this.controller.setSnap(config);
  }

  setSize(screenPixelRadius: number, minScale: number, maxScale: number) {
    // Currently delegated to controller initialization; stub for future integration
    this.options.screenSize = { pixelRadius: screenPixelRadius, minScale, maxScale };
  }

  pointerMove(position: { x: number; y: number; z: number }, screen: { x: number; y: number }) {
    if (!this.show) return;
    this.controller.pointerMove(position, screen);
  }

  pointerDown(position: { x: number; y: number; z: number }, screen: { x: number; y: number }) {
    if (!this.show) return;
    this.controller.pointerDown(position, screen);
  }

  pointerUp(committed = true) {
    if (!this.show) return;
    this.controller.pointerUp(committed);
  }

  destroy() {
    this.show = false;
  }
}

