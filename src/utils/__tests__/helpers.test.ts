import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const loadHelpers = async () => {
  globalThis.window = {
    ENV: {
      VITE_FUNCTION_APP_URL: 'https://example.com/',
      VITE_AZURE_FUNCTIONS_KEY: 'secret',
    },
  } as unknown as Window;
  return import('../helpers.ts');
};

describe('getFunctionUrl', () => {
  it('builds URL with code', async () => {
    const { getFunctionUrl } = await loadHelpers();
    const url = getFunctionUrl('/api/test');
    assert.equal(url, 'https://example.com/api/test?code=secret');
  });
});

describe('apiRequest', () => {
  afterEach(() => {
    if (restoreFetch) {
      restoreFetch();
      restoreFetch = undefined;
    }
  });

  let restoreFetch: (() => void) | undefined;

  it('returns JSON on success', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true,
      json: async () => ({ foo: 'bar' }),
    })) as typeof fetch;
    restoreFetch = () => { globalThis.fetch = originalFetch; };

    const { apiRequest } = await loadHelpers();
    const result = await apiRequest<{ foo: string }>('https://example.com');
    assert.equal(result.foo, 'bar');
  });

  it('throws on failure', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: false,
      status: 500,
      statusText: 'Internal Error',
      json: async () => ({}),
    })) as typeof fetch;
    restoreFetch = () => { globalThis.fetch = originalFetch; };

    const { apiRequest } = await loadHelpers();
    await assert.rejects(() => apiRequest('https://example.com'), {
      message: 'API request failed: 500 Internal Error',
    });
  });
});
