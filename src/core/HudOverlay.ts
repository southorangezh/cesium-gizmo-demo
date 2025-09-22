import { TransformDelta } from './types.js';

interface HudOptions {
  container?: HTMLElement;
}

export class HudOverlay {
  private element: HTMLElement;

  constructor(options: HudOptions = {}) {
    if (options.container) {
      this.element = options.container;
    } else {
      this.element = document.createElement('div');
      this.element.className = 'manipulator-hud';
      Object.assign(this.element.style, {
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '6px 12px',
        background: 'rgba(0,0,0,0.7)',
        color: '#fff',
        fontFamily: 'sans-serif',
        fontSize: '12px',
        borderRadius: '4px',
        pointerEvents: 'none',
        display: 'none'
      });
      document.body.appendChild(this.element);
    }
  }

  update(delta: TransformDelta, mode: string): void {
    const [tx, ty, tz] = delta.translation;
    const [qw, qx, qy, qz] = delta.rotation;
    const [sx, sy, sz] = delta.scale;
    const angle = (2 * Math.acos(Math.min(1, Math.max(-1, qw)))) * (180 / Math.PI);
    this.element.innerHTML = `
      <div><strong>${mode.toUpperCase()}</strong></div>
      <div>ΔT: ${tx.toFixed(3)}, ${ty.toFixed(3)}, ${tz.toFixed(3)}</div>
      <div>ΔR: ${angle.toFixed(2)}° axis=(${qx.toFixed(3)}, ${qy.toFixed(3)}, ${qz.toFixed(3)})</div>
      <div>ΔS: ${sx.toFixed(3)}, ${sy.toFixed(3)}, ${sz.toFixed(3)}</div>
    `;
    this.element.style.display = 'block';
  }

  hide(): void {
    this.element.style.display = 'none';
  }

  destroy(): void {
    if (this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
    }
  }
}
