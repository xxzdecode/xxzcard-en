const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createStorageResilience,
  formatStorageError,
  DEFAULT_RETRY_DELAYS_MS,
  DEFAULT_WRITE_TIMEOUT_MS
} = require('../js/storageResilience.js');

function response(status, jsonValue = null, textValue = '') {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    async json() { return jsonValue; },
    async text() { return textValue; }
  };
}

function config(overrides = {}) {
  return {
    url: 'https://example.supabase.co/rest/v1/kv_store',
    probeUrl: 'https://example.supabase.co/rest/v1/kv_store?select=key&limit=1',
    headers: { apikey: 'test' },
    timeoutMs: 20,
    maxAttempts: 4,
    probeTimeoutMs: 20,
    probeMaxAttempts: 2,
    ...overrides
  };
}

function abortingTimeoutFetch(signal) {
  return new Promise((_, reject) => {
    signal.addEventListener('abort', () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      reject(error);
    }, { once: true });
  });
}

test('production retry policy uses three incremental waits and a longer write timeout', () => {
  assert.deepEqual([...DEFAULT_RETRY_DELAYS_MS], [800, 1600, 3200]);
  assert.equal(DEFAULT_WRITE_TIMEOUT_MS, 12000);
});

test('normal network saves once and keeps the exact value shape', async () => {
  const calls = [];
  const persisted = [];
  const storage = createStorageResilience({
    fetchFn: async (url, options) => {
      calls.push({ url, options });
      return response(201);
    },
    navigatorRef: { onLine: true },
    retryDelaysMs: [1, 1, 1],
    wait: async () => {},
    onPersist: (key, value) => persisted.push({ key, value })
  });
  const value = { words: { apple: { lastResult: 'D' } }, session: { cursor: 1 } };
  assert.equal(await storage.writeKey(config(), 'vocab_adventure_v1_sister', value), true);
  assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    key: 'vocab_adventure_v1_sister',
    value
  });
  assert.deepEqual(persisted, [{ key: 'vocab_adventure_v1_sister', value }]);
});

test('first timeout then second attempt succeeds', async () => {
  let calls = 0;
  const storage = createStorageResilience({
    fetchFn: async (_url, options) => {
      calls += 1;
      if (calls === 1) return abortingTimeoutFetch(options.signal);
      return response(201);
    },
    navigatorRef: { onLine: true },
    retryDelaysMs: [1, 1, 1],
    wait: async () => {}
  });
  assert.equal(await storage.writeKey(config(), 'key', { ok: true }), true);
  assert.equal(calls, 2);
});

test('two recoverable failures then third attempt succeeds', async () => {
  let calls = 0;
  const storage = createStorageResilience({
    fetchFn: async () => {
      calls += 1;
      if (calls === 1) throw new TypeError('network down');
      if (calls === 2) return response(503, null, 'temporarily unavailable');
      return response(201);
    },
    navigatorRef: { onLine: true },
    retryDelaysMs: [1, 1, 1],
    wait: async () => {}
  });
  assert.equal(await storage.writeKey(config(), 'key', { attempt: 3 }), true);
  assert.equal(calls, 3);
});

test('all retries failing does not call persistence and reports exhaustion', async () => {
  let calls = 0;
  let persisted = 0;
  const storage = createStorageResilience({
    fetchFn: async () => {
      calls += 1;
      return response(503, null, 'unavailable');
    },
    navigatorRef: { onLine: true },
    retryDelaysMs: [1, 1],
    wait: async () => {},
    onPersist: () => { persisted += 1; }
  });
  await assert.rejects(
    storage.writeKey(config({ maxAttempts: 3 }), 'key', { cursor: 1 }),
    error => {
      assert.equal(error.code, 'RETRIES_EXHAUSTED');
      assert.equal(error.attempts, 3);
      assert.match(formatStorageError(error), /自动重试 2 次/);
      return true;
    }
  );
  assert.equal(calls, 3);
  assert.equal(persisted, 0);
});

test('network recovery allows another save without recreating the storage layer', async () => {
  const navigatorRef = { onLine: false };
  let calls = 0;
  const storage = createStorageResilience({
    fetchFn: async () => {
      calls += 1;
      return response(200, []);
    },
    navigatorRef,
    retryDelaysMs: [1],
    wait: async () => {},
    initialOnline: false
  });
  await assert.rejects(storage.writeKey(config(), 'key', { cursor: 1 }), { code: 'NETWORK_OFFLINE' });
  assert.equal(calls, 0);
  navigatorRef.onLine = true;
  assert.equal(await storage.writeKey(config(), 'key', { cursor: 1 }), true);
  assert.equal(calls, 2, 'one recovery probe and one write');
  assert.equal(storage.getConnectionState(), 'online');
});

test('rapid identical saves share one in-flight write', async () => {
  let calls = 0;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const storage = createStorageResilience({
    fetchFn: async () => {
      calls += 1;
      await gate;
      return response(201);
    },
    navigatorRef: { onLine: true },
    retryDelaysMs: [1],
    wait: async () => {}
  });
  const value = { cursor: 2, plan: [{ status: 'completed' }] };
  const first = storage.writeKey(config(), 'key', value);
  const second = storage.writeKey(config(), 'key', value);
  const third = storage.writeKey(config(), 'key', value);
  assert.equal(storage.getPendingWriteCount(), 1);
  release();
  assert.deepEqual(await Promise.all([first, second, third]), [true, true, true]);
  assert.equal(calls, 1);
});

test('different writes for the same key are serialized in order', async () => {
  const bodies = [];
  let active = 0;
  let maxActive = 0;
  const storage = createStorageResilience({
    fetchFn: async (_url, options) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      bodies.push(JSON.parse(options.body));
      await new Promise(resolve => setTimeout(resolve, 3));
      active -= 1;
      return response(201);
    },
    navigatorRef: { onLine: true },
    retryDelaysMs: [1],
    wait: async () => {}
  });
  await Promise.all([
    storage.writeKey(config(), 'key', { cursor: 1 }),
    storage.writeKey(config(), 'key', { cursor: 2 })
  ]);
  assert.equal(maxActive, 1);
  assert.deepEqual(bodies.map(item => item.value.cursor), [1, 2]);
});

test('authentication and invalid payload errors are not retried', async () => {
  for (const [status, code] of [[401, 'AUTH_ERROR'], [403, 'AUTH_ERROR'], [400, 'DATA_FORMAT_ERROR'], [422, 'DATA_FORMAT_ERROR']]) {
    let calls = 0;
    const storage = createStorageResilience({
      fetchFn: async () => {
        calls += 1;
        return response(status, null, 'bad request');
      },
      navigatorRef: { onLine: true },
      retryDelaysMs: [1, 1, 1],
      wait: async () => {}
    });
    await assert.rejects(storage.writeKey(config(), `key-${status}`, { ok: true }), { code });
    assert.equal(calls, 1, `HTTP ${status} must not retry`);
  }
});

test('circular values are rejected before any request', async () => {
  let calls = 0;
  const storage = createStorageResilience({
    fetchFn: async () => {
      calls += 1;
      return response(201);
    },
    navigatorRef: { onLine: true }
  });
  const value = {};
  value.self = value;
  await assert.rejects(storage.writeKey(config(), 'key', value), { code: 'DATA_FORMAT_ERROR' });
  assert.equal(calls, 0);
});
