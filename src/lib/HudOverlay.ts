import { Math as CesiumMath } from 'cesium';
import type { Mode, TransformDelta } from './types';

export interface HudOptions {
  container: HTMLElement;
}

export class HudOverlay {
  private readonly root: HTMLDivElement;
  private readonly header: HTMLDivElement;
  private readonly body: HTMLDivElement;

  constructor(options: HudOptions) {
    this.root = document.createElement('div');
    this.root.style.position = 'absolute';
    this.root.style.top = '12px';
    this.root.style.right = '12px';
    this.root.style.padding = '12px 16px';
    this.root.style.borderRadius = '8px';
    this.root.style.background = 'rgba(15, 21, 32, 0.8)';
    this.root.style.backdropFilter = 'blur(6px)';
    this.root.style.color = '#ffffff';
    this.root.style.fontSize = '13px';
    this.root.style.fontWeight = '500';
    this.root.style.pointerEvents = 'none';
    this.root.style.minWidth = '160px';
    this.root.style.transition = 'opacity 120ms ease';

    this.header = document.createElement('div');
    this.header.style.fontSize = '12px';
    this.header.style.opacity = '0.8';

    this.body = document.createElement('div');
    this.body.style.marginTop = '6px';
    this.body.style.lineHeight = '18px';

    this.root.append(this.header, this.body);
    options.container.append(this.root);
    this.hide();
  }

  show(mode: Mode, delta: TransformDelta): void {
    this.header.textContent = `Mode: ${mode}`;
    const translation = `ΔT: ${formatMeters(delta.translation.x)} / ${formatMeters(delta.translation.y)} / ${formatMeters(delta.translation.z)}`;
    const rotation = `ΔR: ${formatAngle(delta.rotation)}`;
    const scale = `ΔS: ${delta.scale.x.toFixed(3)} / ${delta.scale.y.toFixed(3)} / ${delta.scale.z.toFixed(3)}`;
    this.body.innerHTML = `${translation}<br/>${rotation}<br/>${scale}`;
    this.root.style.opacity = '1';
  }

  hide(): void {
    this.root.style.opacity = '0';
  }
}

function formatMeters(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000) {
    return `${(value / 1000).toFixed(2)} km`;
  }
  if (abs >= 1) {
    return `${value.toFixed(2)} m`;
  }
  if (abs >= 0.01) {
    return `${(value * 100).toFixed(2)} cm`;
  }
  return `${(value * 1000).toFixed(2)} mm`;
}

function formatAngle(quaternion: TransformDelta['rotation']): string {
  const angle = 2 * Math.acos(quaternion.w);
  const degrees = CesiumMath.toDegrees(angle);
  return `${degrees.toFixed(2)}°`;
}
