// STORAGE — Supabase (REST) + localStorage fallback
// Table: kv_store  columns: key (text PK), value (jsonb)
// ══════════════════════════════════════
const SB_TIMEOUT = 5000; // 5 秒超时
let sbOnline = true;     // 运行时连通性标志

let mainSnapshot = '';
const SUPABASE_MIRROR_KEY = 'wc_supabase_mirror';
const SUPABASE_MIRROR_SYNC_MINUTE = 5;
const SUPABASE_MIRROR_RETRY_DELAY = 30 * 60 * 1000;

function sbFetchWithTimeout(url, options) {
  // 不用 AbortSignal（手机浏览器 postMessage 不能克隆它）
  // 改用 Promise.race：fetch 和一个定时 reject 竞速
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), SB_TIMEOUT)
  );
  return Promise.race([fetch(url, options), timeout]);
}

// localStorage 镜像（key 加前缀避免冲突）
function lsGet(key) {
  try { const v = localStorage.getItem('wc_sb_' + key); return v ? JSON.parse(v) : null; }
  catch(e) { return null; }
}
function lsSet(key, value) {
  try { localStorage.setItem('wc_sb_' + key, JSON.stringify(value)); } catch(e) {}
}

function readSupabaseMirror() {
  try {
    const raw = localStorage.getItem(SUPABASE_MIRROR_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch(e) {
    return null;
  }
}

function writeSupabaseMirror(mirror) {
  try {
    localStorage.setItem(SUPABASE_MIRROR_KEY, JSON.stringify(mirror));
  } catch(e) {}
}

function localDateKey(date) {
  const d = date || new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function getMirrorValue(key) {
  const mirror = readSupabaseMirror();
  if (mirror && mirror.rows && Object.prototype.hasOwnProperty.call(mirror.rows, key)) {
    return cloneForStorage(mirror.rows[key]);
  }
  return lsGet(key);
}

function updateMirrorValue(key, value) {
  const mirror = readSupabaseMirror() || { source: 'supabase', syncedAt: '', rows: {} };
  if (!mirror.rows || typeof mirror.rows !== 'object') mirror.rows = {};
  mirror.source = 'supabase';
  mirror.syncedAt = new Date().toISOString();
  mirror.rows[key] = cloneForStorage(value);
  mirror.rowCount = Object.keys(mirror.rows).length;
  writeSupabaseMirror(mirror);
}

function mirrorSyncedLabel() {
  const mirror = readSupabaseMirror();
  if (!mirror || !mirror.syncedAt) return '';
  try {
    return new Date(mirror.syncedAt).toLocaleString();
  } catch(e) {
    return mirror.syncedAt;
  }
}

async function syncSupabaseMirror() {
  if (!sbOnline) return null;
  try {
    const r = await sbFetchWithTimeout(
      `${SB_URL}/rest/v1/kv_store?select=key,value`,
      { headers: SB_HEADERS }
    );
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const rows = await r.json();
    const mirrorRows = {};
    (rows || []).forEach(row => {
      if (!row || !row.key) return;
      mirrorRows[row.key] = row.value;
      lsSet(row.key, row.value);
    });
    const mirror = {
      source: 'supabase',
      syncedAt: new Date().toISOString(),
      fullSyncedDate: localDateKey(),
      rowCount: Object.keys(mirrorRows).length,
      rows: mirrorRows
    };
    writeSupabaseMirror(mirror);
    return mirror;
  } catch(e) {
    console.warn('syncSupabaseMirror failed; switching to offline mode', e.message || e);
    sbOnline = false;
    showOfflineBanner();
    return null;
  }
}

function shouldSyncSupabaseMirrorToday() {
  const mirror = readSupabaseMirror();
  return !mirror || mirror.fullSyncedDate !== localDateKey();
}

async function syncSupabaseMirrorIfDue(force) {
  if (!force && !shouldSyncSupabaseMirrorToday()) return null;
  return await syncSupabaseMirror();
}

function nextSupabaseMirrorDelay() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, SUPABASE_MIRROR_SYNC_MINUTE, 0, 0);
  return Math.max(1000, next.getTime() - now.getTime());
}

function scheduleDailySupabaseMirror(delay) {
  setTimeout(async () => {
    const mirror = await syncSupabaseMirrorIfDue(true);
    scheduleDailySupabaseMirror(mirror ? nextSupabaseMirrorDelay() : SUPABASE_MIRROR_RETRY_DELAY);
  }, delay || nextSupabaseMirrorDelay());
}

function cloneForStorage(value) {
  return value ? JSON.parse(JSON.stringify(value)) : value;
}

function fingerprintData(value) {
  return JSON.stringify(value || null);
}

function setMainSnapshot(data) {
  const copy = cloneForStorage(data);
  if (copy) normalizeAppData(copy);
  mainSnapshot = fingerprintData(copy);
}

function storageError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

function showStorageError(err) {
  if (err && err.code === 'OFFLINE_READONLY') {
    alert('\u5f53\u524d\u662f\u79bb\u7ebf\u6a21\u5f0f\uff0c\u53ea\u80fd\u67e5\u770b\uff0c\u4e0d\u80fd\u7f16\u8f91\u3002\u8bf7\u8054\u7f51\u540e\u5237\u65b0\u4e91\u7aef\u6570\u636e\u518d\u4fdd\u5b58\u3002');
    return;
  }
  if (err && err.code === 'MAIN_CONFLICT') {
    alert('\u4e91\u7aef\u6570\u636e\u521a\u521a\u88ab\u5176\u4ed6\u8bbe\u5907\u66f4\u65b0\u4e86\u3002\u4e3a\u4e86\u907f\u514d\u8986\u76d6\u65b0\u5185\u5bb9\uff0c\u5df2\u505c\u6b62\u672c\u6b21\u4fdd\u5b58\u5e76\u5237\u65b0\u4e3a\u4e91\u7aef\u7248\u672c\u3002');
    return;
  }
  alert('\u4fdd\u5b58\u5931\u8d25\uff1a\u6ca1\u6709\u5199\u5165\u4e91\u7aef\u3002\u8bf7\u786e\u8ba4\u7f51\u7edc\u6b63\u5e38\u540e\u518d\u8bd5\u3002');
}

function canWriteCloudData() {
  if (sbOnline) return true;
  showOfflineBanner();
  showStorageError(storageError('OFFLINE_READONLY', 'offline'));
  return false;
}

async function sbGetRemote(key) {
  if (!sbOnline) throw storageError('OFFLINE_READONLY', 'offline');
  try {
    const r = await sbFetchWithTimeout(
      `${SB_URL}/rest/v1/kv_store?key=eq.${encodeURIComponent(key)}&select=value`,
      { headers: SB_HEADERS }
    );
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const rows = await r.json();
    const val = rows.length ? rows[0].value : null;
    if (val !== null) {
      lsSet(key, val);
      updateMirrorValue(key, val);
    }
    return val;
  } catch(e) {
    console.warn('sbGet failed; switching to offline mode', e.message || e);
    sbOnline = false;
    showOfflineBanner();
    throw storageError('OFFLINE_READONLY', 'offline');
  }
}

async function loadUserBatch(batchId) {
  const r = await sbGet(currentUser + '_' + batchId);
  return r || { known:[], unknown:[] };
}
// Loading overlay
async function sbGet(key) {
  if (!sbOnline) return getMirrorValue(key);
  try {
    return await sbGetRemote(key);
  } catch(e) {
    return getMirrorValue(key);
  }
}

async function sbSet(key, value) {
  if (!sbOnline) throw storageError('OFFLINE_READONLY', 'offline');
  try {
    const r = await sbFetchWithTimeout(`${SB_URL}/rest/v1/kv_store`, {
      method: 'POST',
      headers: { ...SB_HEADERS, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ key, value })
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    lsSet(key, value);
    updateMirrorValue(key, value);
  } catch(e) {
    console.warn('sbSet failed; blocked local-only write', e.message || e);
    sbOnline = false;
    showOfflineBanner();
    throw storageError('OFFLINE_READONLY', 'offline');
  }
}

async function loadData() {
  const data = await sbGet('main');
  if (data && sbOnline) setMainSnapshot(data);
  return data;
}

async function ensureMainCanSave(data) {
  const remote = await sbGetRemote('main');
  if (remote) normalizeAppData(remote);
  const remoteFp = fingerprintData(remote);
  const dataFp = fingerprintData(data);
  if (mainSnapshot && remoteFp !== mainSnapshot && remoteFp !== dataFp) {
    appData = remote || { batches: [], pin: null };
    setMainSnapshot(appData);
    const home = document.getElementById('screenHome');
    if (home && home.classList.contains('active')) loadHome();
    throw storageError('MAIN_CONFLICT', 'main changed remotely');
  }
  if (remote) {
    try {
      localStorage.setItem('wc_main_last_good', JSON.stringify({ createdAt: new Date().toISOString(), value: remote }));
    } catch(e) {}
  }
}

async function saveData(data) {
  try {
    if (!canWriteCloudData()) return false;
    normalizeAppData(data);
    await ensureMainCanSave(data);
    await sbSet('main', data);
    setMainSnapshot(data);
    return true;
  } catch(e) {
    if (e && e.code === 'OFFLINE_READONLY') {
      const cached = getMirrorValue('main');
      if (cached) {
        normalizeAppData(cached);
        appData = cached;
      }
    }
    showStorageError(e);
    return false;
  }
}

async function saveUserBatch(batchId, rec) {
  try {
    if (!canWriteCloudData()) return false;
    await sbSet(currentUser + '_' + batchId, rec);
    return true;
  } catch(e) {
    showStorageError(e);
    return false;
  }
}

async function clearUserBatch(user, batchId) {
  try {
    if (!canWriteCloudData()) return false;
    await sbSet(user + '_' + batchId, { known:[], unknown:[] });
    return true;
  } catch(e) {
    showStorageError(e);
    return false;
  }
}

function showLoading(msg) {
  let el = document.getElementById('fbLoading');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fbLoading';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,0.88);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:999;font-size:15px;color:#4A90C4;font-weight:700;gap:10px';
    el.innerHTML = '<div style="font-size:32px">☁️</div><div id="fbLoadingMsg"></div>';
    document.body.appendChild(el);
  }
  document.getElementById('fbLoadingMsg').textContent = msg || '加载中…';
  el.style.display = 'flex';
}
function hideLoading() {
  const el = document.getElementById('fbLoading');
  if (el) el.style.display = 'none';
}

async function initData() {
  showLoading('连接云端…');
  let data = await loadData();
  if (!data) {
    data = { batches: [], pin: null };
    data.batches.push(makeBatch('六月号复习卷四·选择题', DEFAULT_CARDS));
    await saveData(data);
  }
  if (!data.pin) data.pin = null;
  if (!Array.isArray(data.mixedAssignments)) data.mixedAssignments = [];
  if (!Array.isArray(data.taskAssignments)) data.taskAssignments = [];
  normalizePhonemeLibrary(data);
  normalizeAppData(data);
  if (sbOnline) syncSupabaseMirrorIfDue(false);
  hideLoading();
  // 离线时在标题区显示一个小提示
  if (!sbOnline) showOfflineBanner();
  return data;
}

function showOfflineBanner() {
  let el = document.getElementById('offlineBanner');
  if (el) return;
  el = document.createElement('div');
  el.id = 'offlineBanner';
  el.style.cssText = 'width:100%;background:#FFF8EC;color:#7A5C00;font-size:12px;font-weight:600;text-align:center;padding:6px 16px;border-bottom:1px solid #FFD166;position:sticky;top:0;z-index:50';
  el.textContent = '📶 离线模式 · 当前只读本机缓存，联网后将重新拉取云端数据';
  const home = document.getElementById('screenHome');
  const synced = mirrorSyncedLabel();
  el.textContent = synced
    ? '\u79bb\u7ebf\u6a21\u5f0f - \u5f53\u524d\u53ea\u8bfb\u672c\u5730 Supabase \u955c\u50cf\uff0c\u6700\u540e\u540c\u6b65\uff1a' + synced
    : '\u79bb\u7ebf\u6a21\u5f0f - \u5f53\u524d\u53ea\u8bfb\u672c\u5730 Supabase \u955c\u50cf';
  home.insertBefore(el, home.firstChild);
}
function makeBatch(name, cards) {
  const id = String(Date.now())+String(Math.floor(Math.random()*9999));
  const date = batchTodayISO();
  const displayName = String(name || '').trim() || todayStr();
  return { id, date, name: displayName, cards: (cards || []).map(normalizeEnglishCard), sharedWith: [] };
}
function todayStr() {
  return formatBatchName(batchTodayISO(), '');
}

function batchTodayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function formatBatchName(date, title) {
  const d = parseISODate(date) || new Date();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${mm}.${dd}｜${String(title || '').trim()}`;
}

function parseISODate(value) {
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) return null;
  return d;
}

function makeISODate(year, month, day) {
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return '';
  return year + '-' + String(month).padStart(2,'0') + '-' + String(day).padStart(2,'0');
}

function batchDateLabelFromISO(date) {
  const m = String(date || '').match(/^\d{4}-(\d{2})-(\d{2})$/);
  return m ? `${m[1]}.${m[2]}` : '';
}

function addBatchDateCandidate(candidates, match, offset, token, year, month, day) {
  const date = makeISODate(year, month, day);
  if (!date) return;
  candidates.push({
    index: match.index + offset,
    end: match.index + offset + String(token || '').length,
    date
  });
}

function findBatchDateCandidates(text) {
  const value = String(text || '');
  const candidates = [];
  const year = new Date().getFullYear();
  let m;

  const fullDateRe = /(^|[^\d.\/-])(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})(?![.\/-]\d)/g;
  while ((m = fullDateRe.exec(value)) !== null) {
    addBatchDateCandidate(candidates, m, m[1].length, m[0].slice(m[1].length), Number(m[2]), Number(m[3]), Number(m[4]));
  }

  const shortYearRe = /(^|[^\d.\/-])(\d{2})[.\/-](\d{1,2})[.\/-](\d{1,2})(?![.\/-]\d)/g;
  while ((m = shortYearRe.exec(value)) !== null) {
    addBatchDateCandidate(candidates, m, m[1].length, m[0].slice(m[1].length), 2000 + Number(m[2]), Number(m[3]), Number(m[4]));
  }

  const monthDayRe = /(^|[^\d.\/-])(\d{1,2})[.\/-](\d{1,2})(?![.\/-]\d)/g;
  while ((m = monthDayRe.exec(value)) !== null) {
    addBatchDateCandidate(candidates, m, m[1].length, m[0].slice(m[1].length), year, Number(m[2]), Number(m[3]));
  }

  const compactMonthDayRe = /(^|\D)(\d{4})(?!\d)/g;
  while ((m = compactMonthDayRe.exec(value)) !== null) {
    const token = m[2];
    addBatchDateCandidate(candidates, m, m[1].length, token, year, Number(token.slice(0, 2)), Number(token.slice(2, 4)));
  }

  return candidates.sort((a, b) => a.index - b.index);
}

function getLastBatchDateFromText(text) {
  const candidates = findBatchDateCandidates(text);
  return candidates.length > 0 ? candidates[candidates.length - 1].date : '';
}

function parseBatchNamePartsLegacy(name) {
  const text = String(name || '').trim();
  let m = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s*[|｜-]?\s*(.*))?$/);
  if (m) return { date: makeISODate(Number(m[1]), Number(m[2]), Number(m[3])), title: m[4] || '' };

  m = text.match(/^(\d{2})\.(\d{2})\.(\d{2})(?:\s*[|｜]?\s*(.*))?$/);
  if (m) return { date: makeISODate(2000 + Number(m[1]), Number(m[2]), Number(m[3])), title: m[4] || '' };

  m = text.match(/^(\d{2})[./](\d{2})(?:\s*[|｜]?\s*(.*))?$/);
  if (m) return { date: makeISODate(new Date().getFullYear(), Number(m[1]), Number(m[2])), title: m[3] || '' };

  return { date: '', title: text };
}

function parseBatchNameParts(name) {
  const text = String(name || '').trim();
  const candidates = findBatchDateCandidates(text);
  if (candidates.length === 0) return { date: '', title: text };

  const last = candidates[candidates.length - 1];
  if (candidates.length > 1 || last.index !== 0) return { date: last.date, title: text };

  const title = text.slice(last.end).replace(/^\s*(?:[|~\-]+)?\s*/, '');
  return { date: last.date, title };
}

function parseBatchDate(name) {
  return parseBatchNameParts(name).date;
}

function getBatchSortDate(batch) {
  const nameDate = getLastBatchDateFromText(batch && batch.name);
  if (nameDate) return nameDate;
  return parseISODate(batch && batch.date) ? batch.date : '';
}

function normalizeBatchName(name, date) {
  const parts = parseBatchNameParts(name);
  return formatBatchName(date || parts.date || batchTodayISO(), parts.title);
}

function normalizeBatch(batch) {
  if (!batch || typeof batch !== 'object') return false;
  const oldDate = batch.date;
  const oldName = batch.name;
  const parsedDate = parseBatchDate(batch.name);
  if (!parseISODate(batch.date)) {
    batch.date = parsedDate || batchTodayISO();
  }
  if (!String(batch.name || '').trim()) {
    batch.name = todayStr();
  }
  if (!Array.isArray(batch.sharedWith)) batch.sharedWith = [];
  return oldDate !== batch.date || oldName !== batch.name;
}

function normalizeAppData(data) {
  if (!data || !Array.isArray(data.batches)) return false;
  normalizePhonemeLibrary(data);
  let changed = false;
  data.batches.forEach(batch => {
    if (normalizeBatch(batch)) changed = true;
    (batch.cards || []).forEach(card => normalizeCardDictionary(card));
  });
  return changed;
}

// 轮询同步：每30秒自动拉一次最新数据（学生端看到老师更新）
// 离线时只做重连探测，恢复后重新拉取云端数据，避免旧本地缓存覆盖云端。
setInterval(async () => {
  if (!sbOnline) {
    // 尝试重连：探测一次
    sbOnline = true; // 临时乐观设回 true，让 sbGet 真的发请求
    const fresh = await sbGet('main');
    if (!sbOnline || !fresh) return; // 还是失败，继续等
    // 重连成功：隐藏离线横幅，使用云端最新数据刷新本机状态。
    const banner = document.getElementById('offlineBanner');
    if (banner) banner.remove();
    normalizeAppData(fresh);
    appData = fresh;
    setMainSnapshot(appData);
    syncSupabaseMirrorIfDue(false);
    const home = document.getElementById('screenHome');
    if (home && home.classList.contains('active')) loadHome();
    return;
  }
  const fresh = await loadData();
  if (!fresh || !sbOnline) return;
  normalizeAppData(fresh);
  appData = fresh;
  setMainSnapshot(appData);
  const home = document.getElementById('screenHome');
  if (home && home.classList.contains('active')) loadHome();
}, 30000);

scheduleDailySupabaseMirror();

// ══════════════════════════════════════
