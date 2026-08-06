(function storageResilienceModule(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.StorageResilience = api;
    if (typeof module !== 'object') api.installStorageResilience(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createStorageResilienceModule() {
  'use strict';

  const DEFAULT_WRITE_TIMEOUT_MS = 12000;
  const DEFAULT_READ_TIMEOUT_MS = 8000;
  const DEFAULT_RETRY_DELAYS_MS = Object.freeze([800, 1600, 3200]);
  const RETRYABLE_HTTP_STATUS = new Set([408, 425, 429]);

  function storageError(code, message, details) {
    const error = new Error(message || code || 'Storage error');
    error.code = code || 'STORAGE_ERROR';
    if (details && typeof details === 'object') Object.assign(error, details);
    return error;
  }

  function safeJsonStringify(value) {
    let serialized;
    try {
      serialized = JSON.stringify(value);
    } catch (cause) {
      throw storageError('DATA_FORMAT_ERROR', 'Data cannot be serialized as JSON', { cause });
    }
    if (serialized === undefined) {
      throw storageError('DATA_FORMAT_ERROR', 'Top-level value is not JSON serializable');
    }
    return serialized;
  }

  function httpStorageError(status, statusText, responseBody) {
    const details = {
      status: Number(status) || 0,
      statusText: String(statusText || ''),
      responseBody: String(responseBody || '').slice(0, 500)
    };
    if (details.status === 401 || details.status === 403) {
      return storageError('AUTH_ERROR', `Supabase authentication failed with HTTP ${details.status}`, details);
    }
    if (details.status === 400 || details.status === 422) {
      return storageError('DATA_FORMAT_ERROR', `Supabase rejected the payload with HTTP ${details.status}`, details);
    }
    return storageError('SUPABASE_HTTP_ERROR', `Supabase returned HTTP ${details.status}`, details);
  }

  function isRetryableStorageError(error) {
    if (!error) return false;
    if (error.code === 'REQUEST_TIMEOUT' || error.code === 'NETWORK_ERROR') return true;
    if (error.code === 'SUPABASE_HTTP_ERROR') {
      return RETRYABLE_HTTP_STATUS.has(Number(error.status)) || Number(error.status) >= 500;
    }
    return false;
  }

  function causeLabel(error) {
    if (!error) return '未知错误';
    const code = error.code === 'RETRIES_EXHAUSTED' ? error.causeCode : error.code;
    if (code === 'NETWORK_OFFLINE') return '网络已断开';
    if (code === 'NETWORK_ERROR') return '网络连接异常';
    if (code === 'REQUEST_TIMEOUT') return '请求超时';
    if (code === 'AUTH_ERROR') return '权限或认证失败';
    if (code === 'DATA_FORMAT_ERROR') return '数据格式错误';
    if (code === 'SUPABASE_HTTP_ERROR') {
      const status = error.status || (error.lastError && error.lastError.status);
      return status ? `Supabase HTTP ${status}` : 'Supabase HTTP 错误';
    }
    return error.message || '未知错误';
  }

  function formatStorageError(error) {
    if (!error) return '保存失败：未知错误，当前内容尚未写入云端。';
    if (error.code === 'NETWORK_OFFLINE') {
      return '保存失败：网络已断开。当前题目和答案已保留，请恢复网络后点击“重新保存”。';
    }
    if (error.code === 'NETWORK_ERROR') {
      return '保存失败：云端连接被阻断。当前题目和答案已保留，请检查浏览器扩展、代理或网络工具是否拦截 supabase.co，然后重试。';
    }
    if (error.code === 'REQUEST_TIMEOUT') {
      return '保存失败：请求超时。当前题目和答案已保留，请稍后重新保存。';
    }
    if (error.code === 'AUTH_ERROR') {
      return `保存失败：Supabase 权限或认证错误${error.status ? `（HTTP ${error.status}）` : ''}。数据未写入云端。`;
    }
    if (error.code === 'DATA_FORMAT_ERROR') {
      return `保存失败：数据格式错误${error.status ? `（HTTP ${error.status}）` : ''}。已阻止无效数据写入。`;
    }
    if (error.code === 'SUPABASE_HTTP_ERROR') {
      return `保存失败：Supabase 返回 HTTP ${error.status || '错误'}。当前内容尚未写入云端。`;
    }
    if (error.code === 'RETRIES_EXHAUSTED') {
      const retries = Math.max(0, Number(error.attempts || 1) - 1);
      const blockedHint = error.causeCode === 'NETWORK_ERROR'
        ? ' 请检查浏览器扩展、代理或网络工具是否拦截 supabase.co。'
        : '';
      return `保存失败：已自动重试 ${retries} 次仍未成功。最后原因：${causeLabel(error)}。当前题目和答案已保留。${blockedHint}`;
    }
    if (error.code === 'MAIN_CONFLICT') {
      return '云端数据刚刚被其他设备更新。为避免覆盖新内容，本次保存已停止。';
    }
    if (error.code === 'INVALID_CARD_DATA') {
      return '保存失败：单词卡数据缺少必要字段或包含旧字段，已阻止写入。';
    }
    return `保存失败：${error.message || '未知错误'}。当前内容尚未写入云端。`;
  }

  function createStorageResilience(options) {
    const settings = options && typeof options === 'object' ? options : {};
    const fetchFn = settings.fetchFn;
    if (typeof fetchFn !== 'function') throw new TypeError('fetchFn is required');

    const wait = typeof settings.wait === 'function'
      ? settings.wait
      : milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
    const navigatorRef = settings.navigatorRef || null;
    const AbortControllerRef = settings.AbortControllerRef
      || (typeof AbortController === 'function' ? AbortController : null);
    const retryDelays = Array.isArray(settings.retryDelaysMs)
      ? settings.retryDelaysMs.map(Number).filter(value => Number.isFinite(value) && value >= 0)
      : [...DEFAULT_RETRY_DELAYS_MS];
    const onOnline = typeof settings.onOnline === 'function' ? settings.onOnline : () => {};
    const onUnavailable = typeof settings.onUnavailable === 'function' ? settings.onUnavailable : () => {};
    const onPersist = typeof settings.onPersist === 'function' ? settings.onPersist : () => {};

    let connectionState = settings.initialOnline === false ? 'unavailable' : 'online';
    let lastError = null;
    const queueByKey = new Map();
    const pendingTasks = new Set();

    function browserIsOffline() {
      return !!navigatorRef && navigatorRef.onLine === false;
    }

    function markOnline() {
      connectionState = 'online';
      lastError = null;
      onOnline();
    }

    function markUnavailable(error) {
      lastError = error || null;
      if (
        error
        && ['NETWORK_OFFLINE', 'NETWORK_ERROR', 'REQUEST_TIMEOUT', 'RETRIES_EXHAUSTED'].includes(error.code)
      ) {
        connectionState = 'unavailable';
        onUnavailable(error);
      }
    }

    async function fetchWithTimeout(url, requestOptions, timeoutMs) {
      if (browserIsOffline()) {
        throw storageError('NETWORK_OFFLINE', 'Browser reports that the network is offline');
      }

      const timeout = Math.max(1, Number(timeoutMs) || DEFAULT_READ_TIMEOUT_MS);
      if (!AbortControllerRef) {
        let timer = null;
        try {
          return await Promise.race([
            Promise.resolve(fetchFn(url, requestOptions)),
            new Promise((_, reject) => {
              timer = setTimeout(() => reject(storageError('REQUEST_TIMEOUT', `Request exceeded ${timeout} ms`)), timeout);
            })
          ]);
        } catch (error) {
          if (error && error.code) throw error;
          throw storageError('NETWORK_ERROR', error && error.message || 'Network request failed', { cause: error });
        } finally {
          if (timer) clearTimeout(timer);
        }
      }

      const controller = new AbortControllerRef();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeout);
      try {
        return await fetchFn(url, { ...(requestOptions || {}), signal: controller.signal });
      } catch (error) {
        if (timedOut || (error && error.name === 'AbortError')) {
          throw storageError('REQUEST_TIMEOUT', `Request exceeded ${timeout} ms`, { cause: error });
        }
        if (browserIsOffline()) {
          throw storageError('NETWORK_OFFLINE', 'Browser reports that the network is offline', { cause: error });
        }
        throw storageError('NETWORK_ERROR', error && error.message || 'Network request failed', { cause: error });
      } finally {
        clearTimeout(timer);
      }
    }

    async function request(url, requestOptions, policy) {
      const requestPolicy = policy && typeof policy === 'object' ? policy : {};
      const timeoutMs = Number(requestPolicy.timeoutMs) || DEFAULT_READ_TIMEOUT_MS;
      const maxAttempts = Math.max(1, Math.floor(Number(requestPolicy.maxAttempts) || (retryDelays.length + 1)));
      let lastFailure = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const response = await fetchWithTimeout(url, requestOptions, timeoutMs);
          if (!response || response.ok !== true) {
            let responseBody = '';
            try {
              responseBody = response && typeof response.text === 'function' ? await response.text() : '';
            } catch (_) {}
            throw httpStorageError(response && response.status, response && response.statusText, responseBody);
          }
          markOnline();
          return response;
        } catch (error) {
          const failure = error && error.code
            ? error
            : storageError('NETWORK_ERROR', error && error.message || 'Network request failed', { cause: error });
          lastFailure = failure;
          const retryable = isRetryableStorageError(failure);
          const hasNext = attempt < maxAttempts && retryable;
          if (!hasNext) {
            const finalError = retryable && attempt > 1
              ? storageError('RETRIES_EXHAUSTED', 'All automatic retries failed', {
                  attempts: attempt,
                  causeCode: failure.code,
                  status: failure.status,
                  lastError: failure
                })
              : failure;
            markUnavailable(finalError);
            throw finalError;
          }
          const delay = retryDelays[Math.min(attempt - 1, retryDelays.length - 1)] || 0;
          await wait(delay);
        }
      }

      throw lastFailure || storageError('NETWORK_ERROR', 'Request failed');
    }

    async function probeConnection(config) {
      const probe = config && typeof config === 'object' ? config : {};
      if (browserIsOffline()) {
        const error = storageError('NETWORK_OFFLINE', 'Browser reports that the network is offline');
        markUnavailable(error);
        throw error;
      }
      return request(probe.url, {
        method: 'GET',
        headers: probe.headers
      }, {
        timeoutMs: probe.timeoutMs || 6000,
        maxAttempts: probe.maxAttempts || 2
      });
    }

    async function performWrite(config, key, value, serializedValue) {
      if (connectionState !== 'online' && config.probeUrl) {
        await probeConnection({
          url: config.probeUrl,
          headers: config.headers,
          timeoutMs: config.probeTimeoutMs,
          maxAttempts: config.probeMaxAttempts
        });
      }

      const body = `{"key":${safeJsonStringify(String(key))},"value":${serializedValue}}`;
      const response = await request(config.url, {
        method: 'POST',
        headers: config.headers,
        body
      }, {
        timeoutMs: config.timeoutMs || DEFAULT_WRITE_TIMEOUT_MS,
        maxAttempts: config.maxAttempts || (retryDelays.length + 1)
      });
      onPersist(key, value, response);
      return true;
    }

    function writeKey(config, key, value) {
      const normalizedKey = String(key == null ? '' : key).trim();
      if (!normalizedKey) {
        return Promise.reject(storageError('DATA_FORMAT_ERROR', 'Storage key is required'));
      }

      let serializedValue;
      try {
        serializedValue = safeJsonStringify(value);
      } catch (error) {
        lastError = error;
        return Promise.reject(error);
      }

      const fingerprint = `${normalizedKey}\n${serializedValue}`;
      const queue = queueByKey.get(normalizedKey);
      if (queue && queue.tailFingerprint === fingerprint) return queue.tailPromise;

      const previous = queue ? queue.tailPromise : Promise.resolve();
      const task = previous
        .catch(() => {})
        .then(() => performWrite(config, normalizedKey, value, serializedValue));

      queueByKey.set(normalizedKey, {
        tailPromise: task,
        tailFingerprint: fingerprint
      });
      pendingTasks.add(task);
      task.finally(() => {
        pendingTasks.delete(task);
        const current = queueByKey.get(normalizedKey);
        if (current && current.tailPromise === task) queueByKey.delete(normalizedKey);
      }).catch(() => {});
      return task;
    }

    return {
      request,
      probeConnection,
      writeKey,
      markOnline,
      markUnavailable,
      getConnectionState: () => connectionState,
      getLastError: () => lastError,
      getPendingWriteCount: () => pendingTasks.size
    };
  }

  function installStorageResilience(root) {
    if (!root || root.__storageResilienceInstalled) return root && root.__storageResilience;

    const baseUrl = typeof SB_URL !== 'undefined' ? SB_URL : root.SB_URL;
    const headers = typeof SB_HEADERS !== 'undefined' ? SB_HEADERS : root.SB_HEADERS;
    if (!baseUrl || !headers || typeof root.fetch !== 'function') return null;

    const mirrorGet = typeof getMirrorValue === 'function' ? getMirrorValue : root.getMirrorValue;
    const localSet = typeof lsSet === 'function' ? lsSet : root.lsSet;
    const mirrorSet = typeof updateMirrorValue === 'function' ? updateMirrorValue : root.updateMirrorValue;
    const originalShowStorageError = typeof showStorageError === 'function' ? showStorageError : root.showStorageError;

    function setLegacyOnline(value) {
      try {
        if (typeof sbOnline !== 'undefined') sbOnline = !!value;
      } catch (_) {}
      root.__sbConnectionOnline = !!value;
    }

    function hideStatusBanner() {
      const banner = root.document && root.document.getElementById('offlineBanner');
      if (banner) banner.remove();
    }

    function showStatusBanner(error) {
      const documentRef = root.document;
      if (!documentRef) return;
      const home = documentRef.getElementById('screenHome');
      if (!home) return;
      let banner = documentRef.getElementById('offlineBanner');
      if (!banner) {
        banner = documentRef.createElement('div');
        banner.id = 'offlineBanner';
        banner.style.cssText = 'width:100%;background:#FFF8EC;color:#7A5C00;font-size:12px;font-weight:600;text-align:center;padding:6px 16px;border-bottom:1px solid #FFD166;position:sticky;top:0;z-index:50';
        home.insertBefore(banner, home.firstChild);
      }
      banner.textContent = error && error.code === 'NETWORK_OFFLINE'
        ? '网络已断开 · 当前只读本机缓存；恢复网络后可直接重新保存，无需刷新页面'
        : '云端连接暂时异常 · 当前内容未丢失，后续保存会自动重试并检测恢复';
    }

    const resilience = createStorageResilience({
      fetchFn: root.fetch.bind(root),
      navigatorRef: root.navigator,
      initialOnline: typeof sbOnline === 'undefined' ? true : sbOnline,
      onOnline: () => {
        setLegacyOnline(true);
        hideStatusBanner();
      },
      onUnavailable: error => {
        setLegacyOnline(false);
        showStatusBanner(error);
      },
      onPersist: (key, value) => {
        if (typeof localSet === 'function') localSet(key, value);
        if (typeof mirrorSet === 'function') mirrorSet(key, value);
      }
    });

    const writeConfig = {
      url: `${baseUrl}/rest/v1/kv_store`,
      probeUrl: `${baseUrl}/rest/v1/kv_store?select=key&limit=1`,
      headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
      timeoutMs: DEFAULT_WRITE_TIMEOUT_MS,
      maxAttempts: DEFAULT_RETRY_DELAYS_MS.length + 1,
      probeTimeoutMs: 6000,
      probeMaxAttempts: 2
    };
    const backgroundWriteConfig = {
      ...writeConfig,
      timeoutMs: 5000,
      maxAttempts: 1,
      probeTimeoutMs: 3500,
      probeMaxAttempts: 1
    };

    async function resilientSbSet(key, value) {
      return resilience.writeKey(writeConfig, key, value);
    }

    async function resilientSbSetBackground(key, value) {
      return resilience.writeKey(backgroundWriteConfig, key, value);
    }

    async function resilientSbGetRemote(key) {
      const response = await resilience.request(
        `${baseUrl}/rest/v1/kv_store?key=eq.${encodeURIComponent(key)}&select=value`,
        { headers },
        { timeoutMs: DEFAULT_READ_TIMEOUT_MS, maxAttempts: 2 }
      );
      const rows = await response.json();
      const value = rows && rows.length ? rows[0].value : null;
      if (value !== null) {
        if (typeof localSet === 'function') localSet(key, value);
        if (typeof mirrorSet === 'function') mirrorSet(key, value);
      }
      return value;
    }

    async function resilientSbGet(key) {
      if (root.navigator && root.navigator.onLine === false) {
        return typeof mirrorGet === 'function' ? mirrorGet(key) : null;
      }
      try {
        return await resilientSbGetRemote(key);
      } catch (_) {
        return typeof mirrorGet === 'function' ? mirrorGet(key) : null;
      }
    }

    function detailedShowStorageError(error) {
      if (error && error.__storageErrorShown) return;
      if (error) error.__storageErrorShown = true;
      const message = formatStorageError(error);
      if (typeof root.alert === 'function') root.alert(message);
      else if (typeof originalShowStorageError === 'function') originalShowStorageError(error);
    }

    function resilientCanWriteCloudData() {
      if (root.navigator && root.navigator.onLine === false) {
        const error = storageError('NETWORK_OFFLINE', 'Browser reports that the network is offline');
        resilience.markUnavailable(error);
        detailedShowStorageError(error);
        return false;
      }
      return true;
    }

    try { sbSet = resilientSbSet; } catch (_) {}
    try { sbGetRemote = resilientSbGetRemote; } catch (_) {}
    try { sbGet = resilientSbGet; } catch (_) {}
    try { canWriteCloudData = resilientCanWriteCloudData; } catch (_) {}
    try { showStorageError = detailedShowStorageError; } catch (_) {}
    root.sbSet = resilientSbSet;
    root.sbSetBackground = resilientSbSetBackground;
    root.sbGetRemote = resilientSbGetRemote;
    root.sbGet = resilientSbGet;
    root.canWriteCloudData = resilientCanWriteCloudData;
    root.showStorageError = detailedShowStorageError;
    root.getLastStorageError = resilience.getLastError;
    root.formatStorageError = formatStorageError;

    if (typeof root.addEventListener === 'function') {
      root.addEventListener('offline', () => {
        const error = storageError('NETWORK_OFFLINE', 'Browser reports that the network is offline');
        resilience.markUnavailable(error);
      });
      root.addEventListener('online', () => {
        resilience.probeConnection({
          url: writeConfig.probeUrl,
          headers,
          timeoutMs: 6000,
          maxAttempts: 2
        }).catch(() => {});
      });
    }

    root.__storageResilienceInstalled = true;
    root.__storageResilience = resilience;
    return resilience;
  }

  return Object.freeze({
    DEFAULT_WRITE_TIMEOUT_MS,
    DEFAULT_READ_TIMEOUT_MS,
    DEFAULT_RETRY_DELAYS_MS,
    storageError,
    safeJsonStringify,
    httpStorageError,
    isRetryableStorageError,
    formatStorageError,
    createStorageResilience,
    installStorageResilience
  });
});
