import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatVersionDisplay } from '../version';

describe('formatVersionDisplay', () => {
  it('formats development build', () => {
    (import.meta as unknown as { env: Record<string, string> }).env = {
      VITE_APP_VERSION: '1.0.0',
      VITE_BUILD_DATE: '2024-01-01T00:00:00.000Z',
      VITE_BUILD_NUMBER: '1',
      VITE_ENVIRONMENT: 'development',
    };
    const result = formatVersionDisplay();
    assert.ok(result.includes('v1.0.0'));
    assert.ok(result.includes('Dev Build'));
  });

  it('formats production build', () => {
    (import.meta as unknown as { env: Record<string, string> }).env = {
      VITE_APP_VERSION: '1.0.0',
      VITE_BUILD_DATE: '2024-01-01T00:00:00.000Z',
      VITE_BUILD_NUMBER: '42',
      VITE_ENVIRONMENT: 'production',
    };
    const result = formatVersionDisplay();
    assert.ok(result.includes('v1.0.0'));
    assert.ok(result.includes('Build #42'));
  });
});
