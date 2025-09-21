import { Cartesian3, Quaternion } from 'cesium';
import type { Mode } from './types';

interface DeltaDisplay {
  translation: Cartesian3;
  rotation: Quaternion;
  scale: Cartesian3;
}

export class HudOverlay {
  private readonly container: HTMLElement;
  private readonly deltaEl: HTMLElement;
  private readonly modeEl: HTMLElement;

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.className = 'manipulator-hud';
    this.container.style.position = 'absolute';
    this.container.style.bottom = '20px';
    this.container.style.left = '20px';
    this.container.style.padding = '12px 16px';
    this.container.style.background = 'rgba(10, 16, 40, 0.82)';
    this.container.style.border = '1px solid rgba(255, 255, 255, 0.12)';
    this.container.style.borderRadius = '8px';
    this.container.style.fontFamily = 'JetBrains Mono, monospace';
    this.container.style.fontSize = '13px';
    this.container.style.color = '#f5f8ff';
    this.container.style.pointerEvents = 'none';
    this.modeEl = document.createElement('div');
    this.deltaEl = document.createElement('pre');
    this.deltaEl.style.margin = '6px 0 0 0';
    this.deltaEl.style.whiteSpace = 'pre';
    this.container.append(this.modeEl, this.deltaEl);
    parent.appendChild(this.container);
    this.hide();
  }

  show(mode: Mode, delta: DeltaDisplay): void {
    this.modeEl.textContent = `Mode: ${mode.toUpperCase()}`;
    const translation = `ΔT: ${delta.translation.x.toFixed(3)}, ${delta.translation.y.toFixed(3)}, ${delta.translation.z.toFixed(3)} m`;
    const scale = `ΔS: ${delta.scale.x.toFixed(3)}, ${delta.scale.y.toFixed(3)}, ${delta.scale.z.toFixed(3)}`;
    const angle = 2 * Math.acos(delta.rotation.w);
    const deg = (angle * 180) / Math.PI;
    const rotation = `ΔR: ${deg.toFixed(2)}°`;
    this.deltaEl.textContent = `${translation}\n${rotation}\n${scale}`;
    this.container.style.display = 'block';
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  destroy(): void {
    this.container.remove();
  }
}
