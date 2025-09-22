export class HudOverlay {
    constructor(container) {
        this.container = container;
        this.panel = document.createElement('div');
        this.panel.className = 'manipulator-hud';
        Object.assign(this.panel.style, {
            position: 'absolute',
            top: '12px',
            right: '12px',
            padding: '8px 12px',
            borderRadius: '8px',
            background: 'rgba(0,0,0,0.6)',
            color: '#fff',
            fontFamily: 'sans-serif',
            fontSize: '13px',
            pointerEvents: 'none',
            minWidth: '160px',
            display: 'none'
        });
        this.container.appendChild(this.panel);
    }
    update(state) {
        if (!state.active) {
            this.panel.style.display = 'none';
            return;
        }
        const lines = [];
        lines.push(`<strong>${state.mode.toUpperCase()}${state.axis ? ' · ' + state.axis.toUpperCase() : ''}</strong>`);
        if (state.deltaTranslation) {
            lines.push(`ΔT: ${formatLength(state.deltaTranslation.x)}, ${formatLength(state.deltaTranslation.y)}, ${formatLength(state.deltaTranslation.z)}`);
        }
        if (state.deltaRotation) {
            lines.push(`ΔR: ${formatAngle(state.deltaRotation.x)}, ${formatAngle(state.deltaRotation.y)}, ${formatAngle(state.deltaRotation.z)}`);
        }
        if (state.deltaScale) {
            lines.push(`ΔS: ${state.deltaScale.x.toFixed(3)}, ${state.deltaScale.y.toFixed(3)}, ${state.deltaScale.z.toFixed(3)}`);
        }
        if (state.snap && state.snap.applied) {
            lines.push(`Snap: ${state.snap.value.toFixed(3)} (step ${state.snap.step.toFixed(3)})`);
        }
        this.panel.innerHTML = lines.join('<br />');
        this.panel.style.display = 'block';
    }
    destroy() {
        this.panel.remove();
    }
}
function formatLength(value) {
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
function formatAngle(value) {
    return `${(value * (180 / Math.PI)).toFixed(2)}°`;
}
