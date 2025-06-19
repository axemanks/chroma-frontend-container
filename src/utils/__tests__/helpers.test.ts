import { vi, describe, it, expect, afterEach } from 'vitest';

vi.mock('../../config/azureFunctionsConfig', () => ({
  AZURE_FUNCTIONS_URL: 'https://example.com/',
  AZURE_FUNCTIONS_KEY: 'secret',
}));

import { getFunctionUrl, apiRequest } from '../helpers';

describe('getFunctionUrl', () => {
  it('builds URL with code', () => {
    const url = getFunctionUrl('/api/test');
    expect(url).toBe('https://example.com/api/test?code=secret');
  });
});

describe('apiRequest', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns JSON on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ foo: 'bar' }),
      })) as unknown as typeof fetch,
    );

    const result = await apiRequest<{ foo: string }>('https://example.com');
    expect(result.foo).toBe('bar');
  });

  it('throws on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 500,
        statusText: 'Internal Error',
        json: async () => ({}),
      })) as unknown as typeof fetch,
    );

    await expect(apiRequest('https://example.com')).rejects.toThrow(
      'API request failed: 500 Internal Error',
    );
  });
});
