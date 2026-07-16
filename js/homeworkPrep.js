const HOMEWORK_WORKER_URL = `${SB_URL}/functions/v1/homework-worker`;
const HOMEWORK_SESSION_KEY = 'homework_teacher_session';
let homeworkOverviewData = null;
let homeworkBlockData = null;
let homeworkSourceObjectUrl = '';

function homeworkEscape(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  })[char]);
}

function homeworkSession() {
  try {
    const value = JSON.parse(localStorage.getItem(HOMEWORK_SESSION_KEY) || 'null');
    return value && value.access_token ? value : null;
  } catch { return null; }
}

function saveHomeworkSession(value) {
  if (value) localStorage.setItem(HOMEWORK_SESSION_KEY, JSON.stringify(value));
  else localStorage.removeItem(HOMEWORK_SESSION_KEY);
}

async function refreshHomeworkSession() {
  const current = homeworkSession();
  if (!current?.refresh_token) return null;
  const response = await fetch(`${SB_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {'Content-Type':'application/json','apikey':SB_KEY},
    body: JSON.stringify({refresh_token: current.refresh_token})
  });
  if (!response.ok) { saveHomeworkSession(null); return null; }
  const next = await response.json();
  saveHomeworkSession(next);
  return next;
}

async function homeworkApi(path, options = {}, allowRefresh = true) {
  const session = homeworkSession();
  if (!session) throw new Error('请先登录教师账号');
  const headers = {
    'apikey': SB_KEY,
    'Authorization': `Bearer ${session.access_token}`,
    ...(options.body ? {'Content-Type':'application/json'} : {}),
    ...(options.headers || {})
  };
  const response = await fetch(`${HOMEWORK_WORKER_URL}${path}`, {...options, headers});
  if (response.status === 401 && allowRefresh && await refreshHomeworkSession()) {
    return homeworkApi(path, options, false);
  }
  if (!response.ok) {
    let message = '请求失败';
    try { message = (await response.json()).error?.message || message; } catch {}
    throw new Error(message);
  }
  return options.responseType === 'blob' ? response.blob() : response.json();
}

function homeworkSetMessage(message, isError = false) {
  const target = document.getElementById('homeworkPrepMessage');
  target.textContent = message || '';
  target.classList.toggle('error', isError);
}

function renderHomeworkAuth() {
  const signedIn = Boolean(homeworkSession());
  document.getElementById('homeworkPrepLoginPanel').hidden = signedIn;
  document.getElementById('homeworkPrepApp').hidden = !signedIn;
  document.getElementById('homeworkPrepSignOutBtn').hidden = !signedIn;
  return signedIn;
}

async function openHomeworkPrep() {
  if (!isTeacher()) return;
  showScreen('screenHomeworkPrep');
  if (renderHomeworkAuth()) await loadHomeworkOverview();
}

function closeHomeworkPrep() {
  closeHomeworkSourcePreview();
  returnToTeacherHome();
}

async function homeworkPrepSignIn() {
  const email = document.getElementById('homeworkPrepEmail').value.trim();
  const password = document.getElementById('homeworkPrepPassword').value;
  const message = document.getElementById('homeworkPrepLoginMessage');
  message.textContent = '正在验证…';
  try {
    const response = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {'Content-Type':'application/json','apikey':SB_KEY},
      body: JSON.stringify({email, password})
    });
    const body = await response.json();
    if (!response.ok || !body.access_token) throw new Error(body.error_description || '登录失败');
    saveHomeworkSession(body);
    document.getElementById('homeworkPrepPassword').value = '';
    message.textContent = '';
    renderHomeworkAuth();
    await loadHomeworkOverview();
  } catch (error) {
    message.textContent = error.message;
  }
}

async function homeworkPrepSignOut() {
  const session = homeworkSession();
  if (session) {
    fetch(`${SB_URL}/auth/v1/logout`, {
      method:'POST', headers:{'apikey':SB_KEY,'Authorization':`Bearer ${session.access_token}`}
    }).catch(() => {});
  }
  saveHomeworkSession(null);
  homeworkOverviewData = null;
  homeworkBlockData = null;
  renderHomeworkAuth();
}

function homeworkStatusLabel(status) {
  return ({pending:'等待处理',locating:'定位中',extracting:'提取中',analyzing:'分析中',qa:'质检中',review:'待确认',ready:'已 ready',completed:'已完成',blocked:'已阻塞',paused:'已暂停'})[status] || status;
}

function renderHomeworkOverview() {
  const blocks = homeworkOverviewData?.blocks || [];
  const current = homeworkOverviewData?.current_block;
  const pending = blocks.reduce((sum, block) => sum + block.pending_review_count, 0);
  document.getElementById('homeworkPendingBadge').textContent = pending;
  document.getElementById('homeworkPrepOverview').innerHTML = `
    <div class="homework-prep-current">
      <div><span>当前块</span><strong>${current ? homeworkEscape(current.block_code) : '无'}</strong></div>
      <div><span>编号范围</span><strong>${current ? `${current.number_start}–${current.number_end}` : '—'}</strong></div>
      <div><span>状态</span><strong>${current ? homeworkEscape(homeworkStatusLabel(current.status)) : '—'}</strong></div>
      <div><span>待确认</span><strong>${pending}</strong></div>
    </div>
    <div class="homework-block-list">${blocks.map(block => `
      <button type="button" onclick="homeworkOpenBlock('${block.id}')">
        <span><strong>${homeworkEscape(block.block_code)}</strong><small>编号 ${block.number_start}–${block.number_end}</small></span>
        <span class="homework-status homework-status--${homeworkEscape(block.status)}">${homeworkEscape(homeworkStatusLabel(block.status))}</span>
        <small>${block.pending_review_count ? `${block.pending_review_count} 项待确认` : (block.recent_error || '')}</small>
      </button>`).join('')}</div>`;
}

async function loadHomeworkOverview() {
  homeworkSetMessage('正在加载…');
  try {
    homeworkOverviewData = await homeworkApi('/api/homework/overview');
    renderHomeworkOverview();
    homeworkSetMessage('');
    const currentId = homeworkOverviewData.current_block?.id;
    if (currentId) await homeworkOpenBlock(currentId);
  } catch (error) { homeworkSetMessage(error.message, true); }
}

async function homeworkProcessNext() {
  homeworkSetMessage('正在启动下一块…');
  try {
    const result = await homeworkApi('/api/homework/blocks/process-next', {method:'POST'});
    homeworkSetMessage(result.claimed ? '已启动下一块。' : `未启动：${result.reason}`);
    await loadHomeworkOverview();
  } catch (error) { homeworkSetMessage(error.message, true); }
}

async function homeworkRetryBlock(blockId) {
  homeworkSetMessage('正在从失败步骤继续…');
  try {
    const result = await homeworkApi(`/api/homework/blocks/${blockId}/retry`, {method:'POST'});
    homeworkSetMessage(result.retried ? `已从 ${result.step_name} 继续。` : `未重试：${result.reason}`);
    await loadHomeworkOverview();
  } catch (error) { homeworkSetMessage(error.message, true); }
}

function homeworkShowPendingReview() {
  const first = homeworkBlockData?.review_items?.find(item => item.status !== 'completed');
  if (first) document.getElementById(`homework-review-${first.id}`)?.scrollIntoView({behavior:'smooth',block:'center'});
  else homeworkSetMessage('当前没有待确认项。');
}

function renderHomeworkDetail() {
  const data = homeworkBlockData;
  const block = data.block;
  const openReviews = data.review_items.filter(item => item.status !== 'completed');
  const qaComplete = data.tasks.some(task => task.step_name === 'qa' && task.status === 'completed');
  document.getElementById('homeworkConfirmReadyBtn').disabled = openReviews.length > 0 || !qaComplete || block.status !== 'review';
  const taskMap = Object.fromEntries(data.tasks.map(task => [task.step_name, task]));
  document.getElementById('homeworkPrepDetail').innerHTML = `
    <article class="homework-detail-card">
      <header><div><h2>${homeworkEscape(block.block_code)}｜${block.number_start}–${block.number_end}</h2><p>${homeworkEscape(block.schedule_date_text || '')}</p></div>
      ${block.status === 'blocked' ? `<button type="button" onclick="homeworkRetryBlock('${block.id}')">重试</button>` : ''}</header>
      <div class="homework-stepper">${['locating','extracting','analyzing','qa'].map(step => {
        const task = taskMap[step]; return `<div class="${task?.status === 'completed' ? 'done' : ''}"><strong>${step}</strong><span>${task ? homeworkEscape(homeworkStatusLabel(task.status)) : '未创建'}</span><small>${task?.attempt_count || 0} 次${task?.duration_ms != null ? ` · ${task.duration_ms}ms` : ''}</small></div>`;
      }).join('')}</div>
    </article>
    <section class="homework-review-section"><h2>待我确认</h2>${openReviews.length ? openReviews.map(item => `
      <article class="homework-review-card" id="homework-review-${item.id}">
        <h3>${homeworkEscape(item.review_type)}</h3><p>${homeworkEscape(item.problem_summary)}</p>
        <small>来源：第 ${item.source_page || '—'} 页</small>
        <pre>${homeworkEscape(JSON.stringify(item.candidate_options || [], null, 2))}</pre>
        <textarea id="homework-decision-${item.id}" placeholder="输入教师决定"></textarea>
        <div><button type="button" onclick="homeworkResolveReview('${item.id}')">保存并进入下一项</button>${item.question_id ? `<button type="button" onclick="openHomeworkSourcePreview('${item.question_id}')">查看来源页</button>` : ''}</div>
      </article>`).join('') : '<p class="homework-empty">没有待确认项</p>'}</section>
    <section class="homework-question-section"><h2>块详情</h2>${data.questions.map(question => {
      const analysis = Array.isArray(question.teaching_analysis) ? question.teaching_analysis[0] : question.teaching_analysis;
      return `<article class="homework-question-card"><header><strong>编号 ${question.homework_number}</strong><button type="button" onclick="openHomeworkSourcePreview('${question.id}')">第 ${question.source_page || '—'} 页</button></header><p>${homeworkEscape(question.printed_prompt || '')}</p><dl><dt>候选答案</dt><dd>${homeworkEscape(JSON.stringify(question.candidate_answers || []))}</dd><dt>理由</dt><dd>${homeworkEscape(question.answer_reason || '')}</dd><dt>教学分析</dt><dd>${homeworkEscape(analysis?.teaching_note || '')}</dd></dl></article>`;
    }).join('') || '<p class="homework-empty">尚无结构化题目</p>'}</section>
    <section class="homework-audit-section"><h2>审计时间线</h2>${data.audit_events.map(event => `<div><time>${homeworkEscape(new Date(event.created_at).toLocaleString())}</time><strong>${homeworkEscape(event.event_type)}</strong><span>${homeworkEscape(event.step_name || '')}</span><small>${homeworkEscape(JSON.stringify(event.summary || {}))}</small></div>`).join('') || '<p class="homework-empty">尚无审计记录</p>'}</section>`;
}

async function homeworkOpenBlock(blockId) {
  try {
    homeworkBlockData = await homeworkApi(`/api/homework/blocks/${blockId}`);
    renderHomeworkDetail();
  } catch (error) { homeworkSetMessage(error.message, true); }
}

async function homeworkResolveReview(reviewItemId) {
  const value = document.getElementById(`homework-decision-${reviewItemId}`).value.trim();
  if (!value) { homeworkSetMessage('请先填写教师决定。', true); return; }
  try {
    await homeworkApi(`/api/homework/review-items/${reviewItemId}/resolve`, {
      method:'POST', body:JSON.stringify({teacher_decision:{decision:value}})
    });
    homeworkSetMessage('教师决定已保存；仅安排必要的分析或 QA 重跑。');
    await homeworkOpenBlock(homeworkBlockData.block.id);
    await loadHomeworkOverview();
  } catch (error) { homeworkSetMessage(error.message, true); }
}

async function homeworkConfirmReady() {
  const blockId = homeworkBlockData?.block?.id;
  if (!blockId) return;
  try {
    const result = await homeworkApi(`/api/homework/blocks/${blockId}/confirm-ready`, {method:'POST'});
    homeworkSetMessage(result.confirmed ? '已由教师确认 ready。' : `暂不能确认：${result.reason}`);
    await loadHomeworkOverview();
  } catch (error) { homeworkSetMessage(error.message, true); }
}

async function openHomeworkSourcePreview(questionId) {
  const question = homeworkBlockData?.questions?.find(item => item.id === questionId);
  if (!question?.source_page) { homeworkSetMessage('这道题还没有可追溯的来源页。', true); return; }
  const source = homeworkBlockData.sources.find(item =>
    item.pdf_page_start != null && item.pdf_page_end != null &&
    question.source_page >= item.pdf_page_start && question.source_page <= item.pdf_page_end
  );
  const sourceDocument = Array.isArray(source?.documents) ? source.documents[0] : source?.documents;
  if (!sourceDocument) { homeworkSetMessage('来源文档尚未关联。', true); return; }
  try {
    const blob = await homeworkApi(`/api/homework/blocks/${homeworkBlockData.block.id}/source-preview?document_id=${encodeURIComponent(sourceDocument.id)}&page=${question.source_page}`, {responseType:'blob'});
    closeHomeworkSourcePreview();
    homeworkSourceObjectUrl = URL.createObjectURL(blob);
    document.getElementById('homeworkSourceFrame').src = homeworkSourceObjectUrl;
    document.getElementById('homeworkSourceMeta').textContent = `${sourceDocument.file_name} · PDF 第 ${question.source_page} 页 · 区域 ${JSON.stringify(question.source_region || {})}`;
    document.getElementById('homeworkSourceModal').hidden = false;
  } catch (error) { homeworkSetMessage(error.message, true); }
}

function closeHomeworkSourcePreview() {
  const modal = document.getElementById('homeworkSourceModal');
  if (modal) modal.hidden = true;
  const frame = document.getElementById('homeworkSourceFrame');
  if (frame) frame.removeAttribute('src');
  if (homeworkSourceObjectUrl) URL.revokeObjectURL(homeworkSourceObjectUrl);
  homeworkSourceObjectUrl = '';
}
