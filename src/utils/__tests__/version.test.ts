import { describe, it, expect } from 'vitest';
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
    expect(result).toContain('v1.0.0');
    expect(result).toContain('Dev Build');
  });

  it('formats production build', () => {
    (import.meta as unknown as { env: Record<string, string> }).env = {
      VITE_APP_VERSION: '1.0.0',
      VITE_BUILD_DATE: '2024-01-01T00:00:00.000Z',
      VITE_BUILD_NUMBER: '42',
      VITE_ENVIRONMENT: 'production',
    };
    const result = formatVersionDisplay();
    expect(result).toContain('v1.0.0');
    expect(result).toContain('Build #42');
  });
});
