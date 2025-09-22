import test from 'node:test';
import assert from 'node:assert/strict';
import { Snapper } from '../src/lib/Snapper.js';

test('snapper snaps translation to step', () => {
  const snapper = new Snapper({ translate: 0.5 });
  const result = snapper.snapTranslate(0.74);
  assert.equal(result, 0.5);
});

test('snapper respects modifiers', () => {
  const snapper = new Snapper({ translate: 1, modifiers: { fine: { key: 'ControlLeft', multiplier: 0.1 } } });
  const result = snapper.snapTranslate(0.26, new Set(['ControlLeft']));
  assert.ok(Math.abs(result - 0.3) < 1e-6);
});
