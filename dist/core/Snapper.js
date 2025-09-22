export class Snapper {
    apply(value, config, context = {}) {
        var _a, _b, _c, _d, _e;
        if (!config || config.enabled === false) {
            return { value, applied: false, step: 0 };
        }
        let step = (_c = (_b = (_a = config.translate) !== null && _a !== void 0 ? _a : config.rotate) !== null && _b !== void 0 ? _b : config.scale) !== null && _c !== void 0 ? _c : 0;
        if (context.inputStep !== undefined) {
            step = context.inputStep;
        }
        if (context.ctrlKey && ((_d = config.modifierSteps) === null || _d === void 0 ? void 0 : _d.ctrl)) {
            step = config.modifierSteps.ctrl;
        }
        if (context.shiftKey && ((_e = config.modifierSteps) === null || _e === void 0 ? void 0 : _e.shift)) {
            step = config.modifierSteps.shift;
        }
        if (step <= 0) {
            return { value, applied: false, step: 0 };
        }
        const snapped = Math.round(value / step) * step;
        return { value: snapped, applied: Math.abs(snapped - value) > 1e-8, step };
    }
}
