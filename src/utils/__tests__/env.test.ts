import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getEnvVar, getEnvVarWithFallback } from '../env';

describe('getEnvVar', () => {
  it('reads from window.ENV', () => {
    (globalThis as unknown as { window: { ENV: Record<string, string> } }).window = {
      ENV: { VITE_SAMPLE: 'hello' },
    };
    assert.equal(getEnvVar('VITE_SAMPLE'), 'hello');
  });
});

describe('getEnvVarWithFallback', () => {
  it('returns fallback when missing', () => {
    (globalThis as unknown as { window: { ENV: Record<string, string> } }).window = {
      ENV: {},
    };
    assert.equal(getEnvVarWithFallback('MISSING', 'fallback'), 'fallback');
  });
});
