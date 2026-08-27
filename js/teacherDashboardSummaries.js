(function exposeTeacherDashboardSummaries(root) {
  'use strict';

  let activeRefresh = null;

  function practiceDateParts(item) {
    const value = String(item && (item.id || item.title) || '');
    let match = value.match(/(?:^|[^\d])(20\d{2})[-./](\d{1,2})[-./](\d{1,2})(?:[^\d]|$)/);
    if (!match) {
      match = String(item && item.title || '').match(/(?:^|[^\d])(\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})(?:[^\d]|$)/);
      if (match) match = [match[0], `20${match[1]}`, match[2], match[3]];
    }
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      return null;
    }
    return { year, month, day, timestamp: date.getTime() };
  }

  function practiceDisplayTitle(value) {
    return String(value || '')
      .replace(/^\s*\d{2,4}[.\-/]\d{1,2}[.\-/]\d{1,2}\s*[｜|·—–-]?\s*/, '')
      .trim() || '未命名练习';
  }

  function latestPractice(items) {
    const ranked = (Array.isArray(items) ? items : []).map((item, index) => ({
      item,
      index,
      date: practiceDateParts(item)
    }));
    ranked.sort((a, b) => {
      const aTime = a.date ? a.date.timestamp : Number.NEGATIVE_INFINITY;
      const bTime = b.date ? b.date.timestamp : Number.NEGATIVE_INFINITY;
      return bTime - aTime || a.index - b.index;
    });
    const latest = ranked[0];
    if (!latest || !latest.item) return null;
    return {
      title: practiceDisplayTitle(latest.item.title),
      date: latest.date
        ? `${latest.date.year}年${latest.date.month}月${latest.date.day}日`
        : '日期未标注'
    };
  }

  function progressDate(row) {
    const value = row && (row.last_lesson_date || row.lesson_date || row.updated_at);
    const timestamp = Date.parse(String(value || ''));
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  function rowTopicKey(row) {
    return String(row && (row.topicKey || row.topic_key) || '');
  }

  function buildKnowledgeSummary(topics, progressStore, initialProgress) {
    const catalog = Array.isArray(topics) ? topics : [];
    const catalogByKey = new Map(catalog.map(topic => [String(topic.topicKey || ''), topic]));
    const remoteTopics = progressStore && progressStore.topics && typeof progressStore.topics === 'object'
      ? progressStore.topics
      : null;
    const rows = remoteTopics
      ? Object.entries(remoteTopics).map(([topicKey, row]) => ({ topicKey, ...(row || {}) }))
      : (Array.isArray(initialProgress) ? initialProgress.map(row => ({ ...(row || {}) })) : []);
    const sequence = row => Number(row && row.sequence)
      || Number(catalogByKey.get(rowTopicKey(row))?.sequenceOrder)
      || 9999;
    const rowTitle = row => String(
      row && (row.title || catalogByKey.get(rowTopicKey(row))?.titleZh) || ''
    ).trim();
    const completed = rows.filter(row => row.status === 'confirmed_complete');
    const last = [...completed].sort((a, b) => progressDate(b) - progressDate(a) || sequence(b) - sequence(a))[0] || null;
    const statusPriority = { materials_ready: 0, to_teach: 1, needs_review: 2 };
    const queued = rows.filter(row => Object.prototype.hasOwnProperty.call(statusPriority, row.status));
    queued.sort((a, b) => {
      const statusDelta = statusPriority[a.status] - statusPriority[b.status];
      if (statusDelta) return statusDelta;
      const aDate = progressDate(a);
      const bDate = progressDate(b);
      if (aDate && bDate && aDate !== bDate) return aDate - bDate;
      return sequence(a) - sequence(b);
    });
    let next = queued[0] || null;
    if (!next) {
      const progressByKey = new Map(rows.map(row => [rowTopicKey(row), row]));
      const pendingTopic = [...catalog]
        .sort((a, b) => (Number(a.sequenceOrder) || 9999) - (Number(b.sequenceOrder) || 9999))
        .find(topic => progressByKey.get(String(topic.topicKey || ''))?.status !== 'confirmed_complete');
      if (pendingTopic) next = { topicKey: pendingTopic.topicKey, title: pendingTopic.titleZh };
    }
    return {
      completed: completed.length,
      total: catalog.length,
      lastTitle: rowTitle(last) || '暂无已教授记录',
      nextTitle: rowTitle(next) || '暂无待教授知识点',
      source: remoteTopics ? 'remote' : 'initial'
    };
  }

  function setPanelState(id, state, busy) {
    const panel = root.document?.getElementById(id);
    if (!panel) return null;
    panel.dataset.state = state;
    panel.setAttribute('aria-busy', busy ? 'true' : 'false');
    return panel;
  }

  function renderPractice(summary) {
    const panel = setPanelState('teacherLatestPracticeSummary', summary ? 'ready' : 'unavailable', false);
    const title = root.document?.getElementById('teacherLatestPracticeTitle');
    const date = root.document?.getElementById('teacherLatestPracticeDate');
    if (!panel || !title || !date) return;
    title.textContent = summary ? summary.title : '暂时无法读取随堂练习';
    date.textContent = summary ? summary.date : '暂无日期';
  }

  function renderKnowledge(summary) {
    const panel = setPanelState('teacherKnowledgeSummary', summary ? 'ready' : 'unavailable', false);
    const progress = root.document?.getElementById('teacherKnowledgeProgressCount');
    const last = root.document?.getElementById('teacherKnowledgeLastTopic');
    const next = root.document?.getElementById('teacherKnowledgeNextTopic');
    if (!panel || !progress || !last || !next) return;
    progress.textContent = summary ? `${summary.completed} / ${summary.total}` : '— / —';
    last.textContent = summary ? summary.lastTitle : '暂时无法读取正式进度';
    next.textContent = summary ? summary.nextTitle : '进入知识点库后可查看';
    if (summary) {
      panel.setAttribute('aria-label', `已教授 ${summary.completed} / ${summary.total}；刚教过：${summary.lastTitle}；下一项：${summary.nextTitle}`);
    } else {
      panel.removeAttribute('aria-label');
    }
  }

  function setLoading() {
    setPanelState('teacherLatestPracticeSummary', 'loading', true);
    setPanelState('teacherKnowledgeSummary', 'loading', true);
    const practiceTitle = root.document?.getElementById('teacherLatestPracticeTitle');
    const knowledgeLast = root.document?.getElementById('teacherKnowledgeLastTopic');
    const knowledgeNext = root.document?.getElementById('teacherKnowledgeNextTopic');
    if (practiceTitle) practiceTitle.textContent = '正在读取练习目录…';
    if (knowledgeLast) knowledgeLast.textContent = '正在读取…';
    if (knowledgeNext) knowledgeNext.textContent = '正在读取…';
  }

  function teacherIsActive() {
    return typeof root.isTeacher !== 'function' || root.isTeacher();
  }

  function refresh() {
    if (!teacherIsActive()) return Promise.resolve(null);
    if (activeRefresh) return activeRefresh;
    setLoading();
    activeRefresh = (async () => {
      const practiceTask = (async () => {
        await root.loadIndependentFeatureScript('js/courseware-data.js');
        if (teacherIsActive()) renderPractice(latestPractice(root.CLASSROOM_PRACTICE_ITEMS));
      })().catch(error => {
        console.warn('Unable to load teacher practice summary', error && (error.message || error));
        if (teacherIsActive()) renderPractice(null);
      });

      const knowledgeTask = (async () => {
        const [topicsResponse, initialResponse] = await Promise.all([
          root.fetch('grammar-library/data/topics.json'),
          root.fetch('grammar-library/data/initial-progress.json')
        ]);
        if (!topicsResponse.ok || !initialResponse.ok) throw new Error('知识点目录读取失败');
        const [topics, initialProgress] = await Promise.all([topicsResponse.json(), initialResponse.json()]);
        const mirrored = typeof root.getMirrorValue === 'function' ? root.getMirrorValue('grammar_progress') : null;
        if (teacherIsActive()) renderKnowledge(buildKnowledgeSummary(topics, mirrored, initialProgress));
        if (typeof root.sbGetRemote === 'function') {
          try {
            const remote = await root.sbGetRemote('grammar_progress', { silent: true });
            if (teacherIsActive() && remote && typeof remote === 'object') {
              renderKnowledge(buildKnowledgeSummary(topics, remote, initialProgress));
            }
          } catch (_) {
            // The mirrored or initial summary is already visible; remote refresh remains optional.
          }
        }
      })().catch(error => {
        console.warn('Unable to load teacher knowledge summary', error && (error.message || error));
        if (teacherIsActive()) renderKnowledge(null);
      });

      await Promise.allSettled([practiceTask, knowledgeTask]);
      return true;
    })().finally(() => {
      activeRefresh = null;
    });
    return activeRefresh;
  }

  root.TeacherDashboardSummaries = Object.freeze({
    practiceDateParts,
    practiceDisplayTitle,
    latestPractice,
    buildKnowledgeSummary,
    renderPractice,
    renderKnowledge,
    refresh
  });
})(typeof window !== 'undefined' ? window : globalThis);
