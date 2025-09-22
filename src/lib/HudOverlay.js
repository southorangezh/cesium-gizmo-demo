import { Mode, Axis } from './constants.js';

const UNIT_LABELS = {
  position: ['mm', 'cm', 'm', 'km'],
  angle: ['°'],
  scale: ['×']
};

function formatDistance(value) {
  const abs = Math.abs(value);
  if (abs < 0.01) return `${(value * 1000).toFixed(2)} mm`;
  if (abs < 1) return `${(value * 100).toFixed(2)} cm`;
  if (abs < 1000) return `${value.toFixed(3)} m`;
  return `${(value / 1000).toFixed(3)} km`;
}

export class HudOverlay {
  constructor(container) {
    this.container = container;
    this.root = document.createElement('div');
    this.root.className = 'hud-overlay';
    this.root.innerHTML = `
      <div class="hud-mode"></div>
      <div class="hud-axis"></div>
      <div class="hud-values"></div>
    `;
    container.appendChild(this.root);
    this.modeEl = this.root.querySelector('.hud-mode');
    this.axisEl = this.root.querySelector('.hud-axis');
    this.valuesEl = this.root.querySelector('.hud-values');
    this.hide();
  }

  show() {
    this.root.style.display = 'block';
  }

  hide() {
    this.root.style.display = 'none';
  }

  update({ mode, axis, delta }) {
    this.show();
    this.modeEl.textContent = mode.toUpperCase();
    this.axisEl.textContent = axis ? `Axis: ${axis.toUpperCase()}` : 'Free';
    if (mode === Mode.TRANSLATE) {
      const { x, y, z } = delta.position;
      this.valuesEl.textContent = `ΔX ${formatDistance(x)} | ΔY ${formatDistance(y)} | ΔZ ${formatDistance(z)}`;
    } else if (mode === Mode.ROTATE) {
      this.valuesEl.textContent = `Δθ ${(delta.rotation * 180 / Math.PI).toFixed(2)}°`;
    } else if (mode === Mode.SCALE) {
      const { x, y, z } = delta.scale;
      this.valuesEl.textContent = `Sx ${x.toFixed(3)} | Sy ${y.toFixed(3)} | Sz ${z.toFixed(3)}`;
    }
  }
}
