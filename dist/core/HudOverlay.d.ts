import { HudState } from '../types.js';
export declare class HudOverlay {
    private readonly container;
    private readonly panel;
    constructor(container: HTMLElement);
    update(state: HudState): void;
    destroy(): void;
}
