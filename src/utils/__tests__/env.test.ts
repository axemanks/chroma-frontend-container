import { describe, it, expect } from 'vitest';
import { getEnvVar, getEnvVarWithFallback } from '../env';

describe('getEnvVar', () => {
  it('reads from window.ENV', () => {
    (globalThis as unknown as { window: { ENV: Record<string, string> } }).window = {
      ENV: { VITE_SAMPLE: 'hello' },
    };
    expect(getEnvVar('VITE_SAMPLE')).toBe('hello');
  });
});

describe('getEnvVarWithFallback', () => {
  it('returns fallback when missing', () => {
    (globalThis as unknown as { window: { ENV: Record<string, string> } }).window = {
      ENV: {},
    };
    expect(getEnvVarWithFallback('MISSING', 'fallback')).toBe('fallback');
  });
});
