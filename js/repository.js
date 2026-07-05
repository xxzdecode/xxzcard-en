// STORAGE — Supabase (REST) + localStorage fallback
// Table: kv_store  columns: key (text PK), value (jsonb)
// ══════════════════════════════════════
const SB_TIMEOUT = 5000; // 5 秒超时
let sbOnline = true;     // 运行时连通性标志

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

async function sbGet(key) {
  if (!sbOnline) return lsGet(key);
  try {
    const r = await sbFetchWithTimeout(
      `${SB_URL}/rest/v1/kv_store?key=eq.${encodeURIComponent(key)}&select=value`,
      { headers: SB_HEADERS }
    );
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const rows = await r.json();
    const val = rows.length ? rows[0].value : null;
    if (val !== null) lsSet(key, val); // 写入本地镜像
    return val;
  } catch(e) {
    console.warn('sbGet 失败，切换离线模式:', e.message || e);
    sbOnline = false;
    return lsGet(key); // 降级返回本地缓存
  }
}

async function sbSet(key, value) {
  lsSet(key, value); // 先写本地，保证不丢数据
  if (!sbOnline) return;
  try {
    const r = await sbFetchWithTimeout(`${SB_URL}/rest/v1/kv_store`, {
      method: 'POST',
      headers: { ...SB_HEADERS, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ key, value })
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
  } catch(e) {
    console.warn('sbSet 失败，数据已保存本地:', e.message || e);
    sbOnline = false;
  }
}

async function loadData() { return await sbGet('main'); }
async function saveData(data) { await sbSet('main', data); }
async function loadUserBatch(batchId) {
  const r = await sbGet(currentUser + '_' + batchId);
  return r || { known:[], unknown:[] };
}
async function saveUserBatch(batchId, rec) { await sbSet(currentUser + '_' + batchId, rec); }
async function clearUserBatch(user, batchId) { await sbSet(user + '_' + batchId, { known:[], unknown:[] }); }

// Loading overlay
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
  data.batches.forEach(b => { if (!b.sharedWith) b.sharedWith = []; });
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
  el.textContent = '📶 离线模式 · 数据已保存在本机，联网后自动同步';
  const home = document.getElementById('screenHome');
  home.insertBefore(el, home.firstChild);
}
function makeBatch(name, cards) {
  return { id: String(Date.now())+String(Math.floor(Math.random()*9999)), name, cards, sharedWith: [] };
}
function todayStr() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${yy}.${mm}.${dd}`;
}

// 轮询同步：每30秒自动拉一次最新数据（学生端看到老师更新）
// 离线时自动变成重连探测，恢复后推送本地缓存到云端
setInterval(async () => {
  if (!sbOnline) {
    // 尝试重连：探测一次
    sbOnline = true; // 临时乐观设回 true，让 sbGet 真的发请求
    const probe = await sbGet('main');
    if (!sbOnline) return; // 还是失败，继续等
    // 重连成功：隐藏离线横幅，把本地缓存推上去
    const banner = document.getElementById('offlineBanner');
    if (banner) banner.remove();
    // 把 appData 重新同步到云端
    await saveData(appData);
    return;
  }
  const fresh = await loadData();
  if (!fresh) return;
  fresh.batches.forEach(b => { if (!b.sharedWith) b.sharedWith = []; });
  appData = fresh;
  const home = document.getElementById('screenHome');
  if (home && home.classList.contains('active')) loadHome();
}, 30000);

// ══════════════════════════════════════
