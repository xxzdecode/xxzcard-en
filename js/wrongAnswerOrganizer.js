(function wrongAnswerOrganizerModule(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && typeof document !== 'undefined') {
    root.WrongAnswerOrganizer = api;
    api.install(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createWrongAnswerOrganizer() {
  'use strict';

  const CATALOG_KEY = 'assessment_catalog_v1';
  const GRADING_KEY_PREFIX = 'assessment_grading_v1_';
  const WEAKNESS_VIEW_KEY = 'assessment_weakness_view_v1';
  const VERSION = 1;
  const WEAKNESS_COLORS = Object.freeze(['#7658ba', '#e78aa9', '#f0a45d', '#5fa7a0', '#6f8fd1', '#9b78b5']);
  const STUDENTS = Object.freeze([
    { id: 'sister', name: '姐姐', emoji: '👧' },
    { id: 'brother', name: '弟弟', emoji: '👦' }
  ]);
  const TYPE_LABELS = Object.freeze({ daily: '日测', weekly: '周测', monthly: '月测', homework: '暑假作业' });

  function isObject(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function strings(value) {
    const seen = new Set();
    const result = [];
    (Array.isArray(value) ? value : []).forEach(item => {
      const normalized = text(item);
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      result.push(normalized);
    });
    return result;
  }

  function studentId(value) {
    return value === 'brother' ? 'brother' : value === 'sister' ? 'sister' : '';
  }

  function assessmentType(value) {
    return ['daily', 'weekly', 'monthly', 'homework'].includes(value) ? value : 'daily';
  }

  function isoDate(value) {
    const raw = text(value);
    const match = raw.match(/^(20\d{2})-(\d{2})-(\d{2})/);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
  }

  function normalizeItem(value, index, paperKpIds) {
    const source = isObject(value) ? value : {};
    const questionId = text(source.questionId || source.question_id || source.id);
    const kpIds = strings(source.kpIds || source.kp_ids || paperKpIds);
    if (!questionId || !kpIds.length) return null;
    return {
      questionId,
      displayLabel: text(source.displayLabel || source.display_label) || `第 ${index + 1} 小问`,
      kpIds
    };
  }

  function normalizeSection(value, index, paperKpIds) {
    const source = isObject(value) ? value : {};
    const rawItems = Array.isArray(source.items) ? source.items : [];
    const seen = new Set();
    const items = rawItems.map((item, itemIndex) => normalizeItem(item, itemIndex, paperKpIds));
    if (!items.length || items.some(item => !item)) return null;
    if (items.some(item => {
      if (seen.has(item.questionId)) return true;
      seen.add(item.questionId);
      return false;
    })) return null;
    return {
      sectionId: text(source.sectionId || source.section_id || source.id) || `section-${index + 1}`,
      displayLabel: text(source.displayLabel || source.display_label || source.title) || `第 ${index + 1} 大题`,
      items
    };
  }

  function normalizePaper(value, assessment, index) {
    const source = isObject(value) ? value : {};
    const student = studentId(source.studentId || source.student_id || assessment.studentId || assessment.student_id);
    if (!student) return null;
    const assessmentId = text(assessment.assessmentId || assessment.assessment_id || assessment.id);
    if (!assessmentId) return null;
    const paperId = text(source.paperId || source.paper_id || source.id) || `${assessmentId}:${student}`;
    const paperKpIds = strings(source.kpIds || source.kp_ids);
    const rawSections = Array.isArray(source.sections) ? source.sections : [];
    const sections = rawSections.map((section, sectionIndex) => normalizeSection(section, sectionIndex, paperKpIds));
    const mapRevision = text(source.mapRevision || source.map_revision || assessment.mapRevision || assessment.map_revision);
    const mapHash = text(source.mapHash || source.map_hash || assessment.mapHash || assessment.map_hash);
    if (!mapRevision || !mapHash || !sections.length || sections.some(section => !section)) return null;
    const allQuestionIds = sections.flatMap(section => section.items.map(item => item.questionId));
    if (new Set(allQuestionIds).size !== allQuestionIds.length) return null;
    return {
      assessmentId,
      paperId,
      studentId: student,
      title: text(source.displayName || source.display_name || source.title
        || assessment.displayName || assessment.display_name || assessment.title) || '未命名练习',
      scopeLabel: text(source.scopeLabel || source.scope_label || source.rangeLabel || source.range_label
        || assessment.scopeLabel || assessment.scope_label || assessment.rangeLabel || assessment.range_label),
      assessmentType: assessmentType(source.assessmentType || source.assessment_type || assessment.assessmentType || assessment.assessment_type),
      assessmentDate: isoDate(source.assessmentDate || source.assessment_date || assessment.assessmentDate || assessment.assessment_date),
      mapRevision,
      mapHash,
      sourceIndex: index,
      sections,
      totalQuestions: sections.reduce((sum, section) => sum + section.items.length, 0)
    };
  }

  function normalizeAssessment(value, index) {
    const source = isObject(value) ? value : {};
    const assessmentId = text(source.assessmentId || source.assessment_id || source.id);
    if (!assessmentId) return null;
    const rawPapers = Array.isArray(source.papers) && source.papers.length ? source.papers : [source];
    const papers = rawPapers
      .map((paper, paperIndex) => normalizePaper(paper, source, index * 10 + paperIndex))
      .filter(Boolean);
    if (!papers.length) return null;
    return { assessmentId, papers };
  }

  function normalizeCatalog(value) {
    const source = Array.isArray(value) ? { assessments: value } : isObject(value) ? value : {};
    const rawAssessments = Array.isArray(source.assessments)
      ? source.assessments
      : text(source.assessmentId || source.assessment_id || source.id) ? [source] : [];
    const assessments = rawAssessments
      .map(normalizeAssessment)
      .filter(Boolean);
    return {
      schemaVersion: Number(source.schemaVersion || source.schema_version) || VERSION,
      latestPaperId: text(source.latestPaperId || source.latest_paper_id),
      updatedAt: text(source.updatedAt || source.updated_at),
      assessments,
      papers: assessments.flatMap(assessment => assessment.papers)
    };
  }

  function normalizeGradingRecord(value, paperId) {
    const source = isObject(value) ? value : {};
    const id = text(source.paperId || source.paper_id || paperId);
    if (!id || text(source.status) !== 'graded') return null;
    return {
      schemaVersion: Number(source.schemaVersion || source.schema_version) || VERSION,
      studentId: studentId(source.studentId || source.student_id),
      assessmentId: text(source.assessmentId || source.assessment_id),
      paperId: id,
      mapRevision: text(source.mapRevision || source.map_revision),
      mapHash: text(source.mapHash || source.map_hash),
      totalQuestions: Math.max(0, Number(source.totalQuestions || source.total_questions) || 0),
      wrongQuestionIds: strings(source.wrongQuestionIds || source.wrong_question_ids),
      wrongItems: (Array.isArray(source.wrongItems || source.wrong_items) ? source.wrongItems || source.wrong_items : [])
        .map(item => ({
          questionId: text(item && (item.questionId || item.question_id)),
          kpIds: strings(item && (item.kpIds || item.kp_ids))
        }))
        .filter(item => item.questionId),
      teacherNote: text(source.teacherNote || source.teacher_note),
      status: 'graded',
      gradedAt: text(source.gradedAt || source.graded_at),
      updatedAt: text(source.updatedAt || source.updated_at)
    };
  }

  function normalizeGradingStore(value, fallbackStudent) {
    const source = isObject(value) ? value : {};
    const records = {};
    const rawRecords = isObject(source.records) ? source.records : {};
    Object.entries(rawRecords).forEach(([paperId, record]) => {
      const normalized = normalizeGradingRecord(record, paperId);
      if (normalized) records[normalized.paperId] = normalized;
    });
    return {
      schemaVersion: Number(source.schemaVersion || source.schema_version) || VERSION,
      studentId: studentId(source.studentId || source.student_id || fallbackStudent),
      records,
      updatedAt: text(source.updatedAt || source.updated_at)
    };
  }

  function createGradingRecord(paper, wrongQuestionIds, nowValue, teacherNote) {
    const now = text(nowValue) || new Date().toISOString();
    const validQuestionIds = new Set(paper.sections.flatMap(section => section.items.map(item => item.questionId)));
    const wrongIds = strings(wrongQuestionIds).filter(id => validQuestionIds.has(id));
    const questionById = new Map(paper.sections.flatMap(section => section.items).map(item => [item.questionId, item]));
    return {
      schema_version: VERSION,
      student_id: paper.studentId,
      assessment_id: paper.assessmentId,
      paper_id: paper.paperId,
      map_revision: paper.mapRevision,
      map_hash: paper.mapHash,
      total_questions: paper.totalQuestions,
      wrong_question_ids: wrongIds,
      wrong_items: wrongIds.map(questionId => ({
        question_id: questionId,
        kp_ids: questionById.get(questionId)?.kpIds || []
      })),
      teacher_note: text(teacherNote),
      status: 'graded',
      graded_at: now,
      updated_at: now
    };
  }

  function mergeGradingStore(value, paper, wrongQuestionIds, nowValue, teacherNote) {
    const current = normalizeGradingStore(value, paper.studentId);
    const record = createGradingRecord(paper, wrongQuestionIds, nowValue, teacherNote);
    return {
      schema_version: VERSION,
      student_id: paper.studentId,
      records: { ...current.records, [paper.paperId]: record },
      updated_at: record.updated_at
    };
  }

  function recordForPaper(storeValue, paper) {
    const store = normalizeGradingStore(storeValue, paper.studentId);
    const record = store.records[paper.paperId] || null;
    if (!record) return { record: null, stale: false };
    const stale = Boolean(
      !record.mapRevision || record.mapRevision !== paper.mapRevision
      || !record.mapHash || record.mapHash !== paper.mapHash
    );
    return { record: stale ? null : record, stale };
  }

  function dateRank(value) {
    const timestamp = Date.parse(`${value || ''}T00:00:00Z`);
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  function sortedPapers(papers) {
    return [...(Array.isArray(papers) ? papers : [])].sort((left, right) => (
      dateRank(right.assessmentDate) - dateRank(left.assessmentDate)
      || right.sourceIndex - left.sourceIndex
      || right.paperId.localeCompare(left.paperId)
    ));
  }

  function latestPaper(catalogValue) {
    const catalog = catalogValue && Array.isArray(catalogValue.papers)
      ? catalogValue
      : normalizeCatalog(catalogValue);
    if (catalog.latestPaperId) {
      const explicit = catalog.papers.find(paper => paper.paperId === catalog.latestPaperId);
      if (explicit) return explicit;
    }
    return sortedPapers(catalog.papers)[0] || null;
  }

  function typeLabel(type) {
    return TYPE_LABELS[type] || '练习';
  }

  function studentName(id) {
    return STUDENTS.find(student => student.id === id)?.name || '';
  }

  function shortDate(value) {
    const match = text(value).match(/^20\d{2}-(\d{2})-(\d{2})$/);
    if (!match) return '日期未标注';
    return `${Number(match[1])}月${Number(match[2])}日`;
  }

  function paperProgressLabel(paper, recordState) {
    if (!paper) return '暂无可登记练习';
    if (recordState && recordState.stale) return `映射已更新 · 共 ${paper.totalQuestions} 小问`;
    const record = recordState && recordState.record;
    return record
      ? `错 ${record.wrongQuestionIds.length} / ${paper.totalQuestions} 小问`
      : `待批改 · 共 ${paper.totalQuestions} 小问`;
  }

  function normalizeWeaknessItem(value) {
    const source = isObject(value) ? value : {};
    const weaknessId = text(source.weaknessId || source.weakness_id);
    const title = text(source.title);
    const status = text(source.status);
    if (!weaknessId || !title || !['active', 'improving'].includes(status)) return null;
    return {
      weaknessId,
      title,
      status,
      evidenceCount: Math.max(0, Number(source.evidenceCount || source.evidence_count) || 0),
      lastSeenAt: isoDate(source.lastSeenAt || source.last_seen_at)
    };
  }

  function normalizeWeaknessGroup(value) {
    const source = isObject(value) ? value : {};
    const kpId = text(source.kpId || source.kp_id);
    const title = text(source.title);
    const items = (Array.isArray(source.items) ? source.items : []).map(normalizeWeaknessItem).filter(Boolean);
    if (!kpId || !title || !items.length) return null;
    return {
      kpId,
      title,
      itemCount: items.length,
      evidenceCount: items.reduce((sum, item) => sum + item.evidenceCount, 0),
      items
    };
  }

  function normalizeWeaknessStudent(value) {
    const source = isObject(value) ? value : {};
    const groups = (Array.isArray(source.groups) ? source.groups : []).map(normalizeWeaknessGroup).filter(Boolean);
    return { itemCount: groups.reduce((sum, group) => sum + group.itemCount, 0), groups };
  }

  function normalizeWeaknessView(value) {
    const source = isObject(value) ? value : {};
    const students = isObject(source.students) ? source.students : {};
    return {
      schemaVersion: Number(source.schemaVersion || source.schema_version) || VERSION,
      sourceUpdatedAt: text(source.sourceUpdatedAt || source.source_updated_at),
      sourceHash: text(source.sourceHash || source.source_hash),
      students: {
        sister: normalizeWeaknessStudent(students.sister),
        brother: normalizeWeaknessStudent(students.brother)
      }
    };
  }

  function weaknessColor(kpId) {
    let hash = 0;
    for (const character of text(kpId)) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
    return WEAKNESS_COLORS[Math.abs(hash) % WEAKNESS_COLORS.length];
  }

  function weaknessDonutSegments(groups) {
    const valid = (Array.isArray(groups) ? groups : []).filter(group => group && group.itemCount > 0);
    const total = valid.reduce((sum, group) => sum + group.itemCount, 0);
    let offset = 0;
    return valid.map(group => {
      const percent = total ? group.itemCount / total * 100 : 0;
      const result = { group, percent, offset, color: weaknessColor(group.kpId) };
      offset += percent;
      return result;
    });
  }

  function install(root) {
    if (!root || !root.document || root.__wrongAnswerOrganizerInstalled) return;
    root.__wrongAnswerOrganizerInstalled = true;
    const doc = root.document;
    const runtime = {
      catalog: normalizeCatalog(null),
      grading: { sister: normalizeGradingStore(null, 'sister'), brother: normalizeGradingStore(null, 'brother') },
      weaknessView: normalizeWeaknessView(null),
      activeWeaknessStudent: 'brother',
      topicTitles: new Map(),
      activePaper: null,
      loadPromise: null,
      savePromise: null
    };

    function gradingKey(student) {
      return GRADING_KEY_PREFIX + studentId(student);
    }

    function isTeacherMode() {
      try { return typeof root.isTeacher === 'function' ? root.isTeacher() : root.currentUser === 'teacher'; }
      catch (_) { return false; }
    }

    function setText(id, value) {
      const node = doc.getElementById(id);
      if (node) node.textContent = value;
    }

    function paperRecordState(paper) {
      return recordForPaper(runtime.grading[paper.studentId], paper);
    }

    function paperScopeLabel(paper) {
      if (paper.scopeLabel) return paper.scopeLabel;
      const kpIds = strings(paper.sections.flatMap(section => section.items.flatMap(item => item.kpIds)));
      const labels = kpIds.map(kpId => runtime.topicTitles.get(kpId) || kpId);
      return labels.join('、') || '范围未标注';
    }

    function renderHome() {
      const button = doc.getElementById('teacherLatestAssessmentEntry');
      const paper = latestPaper(runtime.catalog);
      if (!button) return;
      button.disabled = !paper;
      button.dataset.paperId = paper ? paper.paperId : '';
      button.setAttribute('aria-busy', 'false');
      if (!paper) {
        setText('teacherLatestAssessmentLabel', '还没有已上传的练习');
        setText('teacherLatestAssessmentTitle', '出卷后会自动显示在这里');
        setText('teacherLatestAssessmentStatus', '暂无数据');
        return;
      }
      setText(
        'teacherLatestAssessmentLabel',
        `${studentName(paper.studentId)} · ${typeLabel(paper.assessmentType)}`
      );
      setText('teacherLatestAssessmentTitle', paper.title);
      setText('teacherLatestAssessmentStatus', paperProgressLabel(paper, paperRecordState(paper)));
    }

    function emptyState(label) {
      const node = doc.createElement('div');
      node.className = 'wrong-answer-empty';
      node.textContent = label;
      return node;
    }

    function createPaperRow(paper) {
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'wrong-answer-paper-row';
      button.dataset.paperId = paper.paperId;
      const copy = doc.createElement('span');
      copy.className = 'wrong-answer-paper-row__copy';
      const title = doc.createElement('strong');
      title.textContent = paper.title;
      const meta = doc.createElement('small');
      meta.textContent = `练习范围：${paperScopeLabel(paper)}`;
      copy.append(title, meta);
      const count = doc.createElement('span');
      count.className = 'wrong-answer-paper-row__count';
      count.textContent = paperProgressLabel(paper, paperRecordState(paper));
      button.append(copy, count);
      button.addEventListener('click', () => openPaper(paper.paperId));
      return button;
    }

    function renderDirectory() {
      STUDENTS.forEach(student => {
        const list = doc.getElementById(`wrongAnswer${student.id === 'sister' ? 'Sister' : 'Brother'}List`);
        if (!list) return;
        list.replaceChildren();
        const papers = sortedPapers(runtime.catalog.papers.filter(paper => paper.studentId === student.id));
        if (!papers.length) {
          list.append(emptyState(`还没有${student.name}的已上传练习`));
          return;
        }
        papers.forEach(paper => list.append(createPaperRow(paper)));
      });
    }

    function shortTimestamp(value) {
      const parsed = new Date(value);
      if (!Number.isFinite(parsed.getTime())) return '尚未同步';
      return `${parsed.getMonth() + 1}月${parsed.getDate()}日 ${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
    }

    function hideWeaknessTooltip(force) {
      const tooltip = doc.getElementById('wrongAnswerWeaknessTooltip');
      if (tooltip) {
        if (!force && tooltip.dataset.pinned === 'true') return;
        delete tooltip.dataset.pinned;
        tooltip.hidden = true;
        tooltip.replaceChildren();
      }
    }

    function showWeaknessTooltip(group, color, pinned) {
      const tooltip = doc.getElementById('wrongAnswerWeaknessTooltip');
      if (!tooltip) return;
      if (pinned) tooltip.dataset.pinned = 'true';
      else delete tooltip.dataset.pinned;
      const heading = doc.createElement('strong');
      heading.textContent = `${group.title} · ${group.itemCount} 个薄弱项`;
      heading.style.setProperty('--weakness-color', color);
      const list = doc.createElement('ul');
      group.items.forEach(item => {
        const row = doc.createElement('li');
        const title = doc.createElement('span');
        title.textContent = item.title;
        const count = doc.createElement('small');
        count.textContent = `${item.evidenceCount} 条证据${item.status === 'improving' ? ' · 巩固中' : ''}`;
        row.append(title, count);
        list.append(row);
      });
      tooltip.replaceChildren(heading, list);
      tooltip.hidden = false;
    }

    function bindWeaknessGroupTarget(node, segment) {
      node.addEventListener('mouseenter', () => showWeaknessTooltip(segment.group, segment.color));
      node.addEventListener('focus', () => showWeaknessTooltip(segment.group, segment.color));
      node.addEventListener('click', () => showWeaknessTooltip(segment.group, segment.color, true));
      node.addEventListener('pointerup', event => {
        if (event.pointerType === 'touch') showWeaknessTooltip(segment.group, segment.color, true);
      });
      node.addEventListener('mouseleave', hideWeaknessTooltip);
      node.addEventListener('blur', hideWeaknessTooltip);
    }

    function renderWeaknessChart() {
      const chart = doc.getElementById('wrongAnswerWeaknessChart');
      const legend = doc.getElementById('wrongAnswerWeaknessLegend');
      if (!chart || !legend) return;
      STUDENTS.forEach(student => {
        const tab = doc.querySelector(`[data-weakness-student="${student.id}"]`);
        if (!tab) return;
        const selected = runtime.activeWeaknessStudent === student.id;
        tab.classList.toggle('is-active', selected);
        tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      });
      setText('wrongAnswerWeaknessUpdated', `更新于 ${shortTimestamp(runtime.weaknessView.sourceUpdatedAt)}`);
      chart.replaceChildren();
      legend.replaceChildren();
      hideWeaknessTooltip(true);

      const student = runtime.weaknessView.students[runtime.activeWeaknessStudent];
      const segments = weaknessDonutSegments(student.groups);
      if (!segments.length) {
        const empty = doc.createElement('div');
        empty.className = 'wrong-answer-weakness-empty';
        empty.textContent = `暂时还没有${studentName(runtime.activeWeaknessStudent)}的薄弱项分析`;
        chart.append(empty);
        return;
      }

      const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 160 160');
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', `${studentName(runtime.activeWeaknessStudent)}共有 ${student.itemCount} 个薄弱项`);
      const track = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
      track.setAttribute('class', 'wrong-answer-weakness-donut__track');
      track.setAttribute('cx', '80');
      track.setAttribute('cy', '80');
      track.setAttribute('r', '55');
      track.setAttribute('pathLength', '100');
      svg.append(track);
      segments.forEach(segment => {
        const circle = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('class', 'wrong-answer-weakness-donut__segment');
        circle.setAttribute('cx', '80');
        circle.setAttribute('cy', '80');
        circle.setAttribute('r', '55');
        circle.setAttribute('pathLength', '100');
        circle.setAttribute('stroke', segment.color);
        circle.setAttribute('stroke-dasharray', `${Math.max(0.001, segment.percent - 0.8)} ${100 - Math.max(0.001, segment.percent - 0.8)}`);
        circle.setAttribute('stroke-dashoffset', String(-segment.offset));
        circle.setAttribute('transform', 'rotate(-90 80 80)');
        circle.setAttribute('tabindex', '0');
        circle.setAttribute('role', 'button');
        circle.setAttribute('aria-label', `${segment.group.title}，${segment.group.itemCount} 个薄弱项`);
        bindWeaknessGroupTarget(circle, segment);
        svg.append(circle);
      });
      svg.addEventListener('mousemove', event => {
        const bounds = svg.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        const x = (event.clientX - bounds.left) * 160 / bounds.width - 80;
        const y = (event.clientY - bounds.top) * 160 / bounds.height - 80;
        const radius = Math.hypot(x, y);
        if (radius < 40 || radius > 72) {
          hideWeaknessTooltip();
          return;
        }
        const percent = ((Math.atan2(y, x) * 180 / Math.PI + 450) % 360) / 3.6;
        const segment = segments.find(item => percent >= item.offset && percent < item.offset + item.percent)
          || segments[segments.length - 1];
        showWeaknessTooltip(segment.group, segment.color);
      });
      svg.addEventListener('mouseleave', hideWeaknessTooltip);
      const center = doc.createElement('div');
      center.className = 'wrong-answer-weakness-donut__center';
      const count = doc.createElement('strong');
      count.textContent = String(student.itemCount);
      const label = doc.createElement('span');
      label.textContent = '个薄弱项';
      center.append(count, label);
      chart.append(svg, center);

      segments.forEach(segment => {
        const button = doc.createElement('button');
        button.type = 'button';
        button.className = 'wrong-answer-weakness-legend__item';
        const dot = doc.createElement('span');
        dot.className = 'wrong-answer-weakness-legend__dot';
        dot.style.background = segment.color;
        const title = doc.createElement('span');
        title.textContent = segment.group.title;
        const amount = doc.createElement('strong');
        amount.textContent = String(segment.group.itemCount);
        button.append(dot, title, amount);
        bindWeaknessGroupTarget(button, segment);
        legend.append(button);
      });
    }

    function selectedWrongQuestionIds() {
      return [...doc.querySelectorAll('#wrongAnswerQuestionSections input[type="checkbox"]:checked')]
        .map(input => text(input.value));
    }

    function updateSelectionStatus(message) {
      const count = selectedWrongQuestionIds().length;
      const total = runtime.activePaper ? runtime.activePaper.totalQuestions : 0;
      setText('wrongAnswerSelectedCount', String(count));
      setText('wrongAnswerTotalCount', String(total));
      if (message != null) setText('wrongAnswerSaveStatus', message);
    }

    function createQuestionItem(item, selected) {
      const label = doc.createElement('label');
      label.className = 'wrong-answer-question';
      const input = doc.createElement('input');
      input.type = 'checkbox';
      input.value = item.questionId;
      input.checked = selected.has(item.questionId);
      input.addEventListener('change', () => updateSelectionStatus('选择已更改，尚未保存'));
      const copy = doc.createElement('span');
      copy.textContent = item.displayLabel;
      label.append(input, copy);
      return label;
    }

    function renderDetail(paper) {
      runtime.activePaper = paper;
      const recordState = paperRecordState(paper);
      const selected = new Set(recordState.record ? recordState.record.wrongQuestionIds : []);
      setText('wrongAnswerPaperStudent', `${studentName(paper.studentId)} · ${paper.assessmentDate || '日期未标注'}`);
      setText('wrongAnswerPaperTitle', paper.title);
      setText(
        'wrongAnswerPaperMeta',
        `共 ${paper.sections.length} 大题、${paper.totalQuestions} 小问 · ${typeLabel(paper.assessmentType)}`
      );
      setText('wrongAnswerPaperType', typeLabel(paper.assessmentType));
      const sections = doc.getElementById('wrongAnswerQuestionSections');
      if (sections) {
        sections.replaceChildren();
        paper.sections.forEach(section => {
          const details = doc.createElement('details');
          details.className = 'wrong-answer-section';
          details.open = true;
          const summary = doc.createElement('summary');
          summary.textContent = `${section.displayLabel}（${section.items.length} 小问）`;
          const grid = doc.createElement('div');
          grid.className = 'wrong-answer-question-grid';
          section.items.forEach(item => grid.append(createQuestionItem(item, selected)));
          details.append(summary, grid);
          sections.append(details);
        });
      }
      const note = doc.getElementById('wrongAnswerTeacherNote');
      if (note) note.value = recordState.record ? recordState.record.teacherNote : '';
      updateSelectionStatus(recordState.stale
        ? '题号映射已更新，请重新核对并保存'
        : recordState.record
          ? `上次保存：错 ${recordState.record.wrongQuestionIds.length} / ${paper.totalQuestions} 小问`
          : '尚未保存');
    }

    function paperById(paperId) {
      return runtime.catalog.papers.find(paper => paper.paperId === paperId) || null;
    }

    async function readValue(key, preferRemote) {
      let value = null;
      if (preferRemote && typeof root.sbGetRemote === 'function') {
        try { value = await root.sbGetRemote(key); } catch (_) {}
      }
      if (value == null && typeof root.sbGet === 'function') {
        try { value = await root.sbGet(key); } catch (_) {}
      }
      if (value == null && typeof root.getMirrorValue === 'function') {
        try { value = root.getMirrorValue(key); } catch (_) {}
      }
      return value;
    }

    function applyLoadedData(catalogValue, gradingValues, weaknessValue) {
      runtime.catalog = normalizeCatalog(catalogValue);
      STUDENTS.forEach(student => {
        runtime.grading[student.id] = normalizeGradingStore(gradingValues[student.id], student.id);
      });
      runtime.weaknessView = normalizeWeaknessView(weaknessValue);
      renderHome();
      renderDirectory();
      renderWeaknessChart();
    }

    async function loadTopicTitles() {
      if (runtime.topicTitles.size || typeof root.fetch !== 'function') return;
      try {
        const response = await root.fetch('grammar-library/data/topics.json');
        if (!response || !response.ok) return;
        const topics = await response.json();
        (Array.isArray(topics) ? topics : []).forEach(topic => {
          const kpId = text(topic && (topic.topicKey || topic.topic_key));
          const label = text(topic && (topic.titleZh || topic.title_zh || topic.title));
          if (kpId && label) runtime.topicTitles.set(kpId, label);
        });
      } catch (_) {}
    }

    function loadAll(preferRemote) {
      if (runtime.loadPromise) return runtime.loadPromise;
      runtime.loadPromise = Promise.all([
        readValue(CATALOG_KEY, preferRemote),
        readValue(gradingKey('sister'), preferRemote),
        readValue(gradingKey('brother'), preferRemote),
        readValue(WEAKNESS_VIEW_KEY, preferRemote),
        loadTopicTitles()
      ]).then(([catalog, sister, brother, weakness]) => {
        applyLoadedData(catalog, { sister, brother }, weakness);
        return runtime.catalog;
      }).finally(() => { runtime.loadPromise = null; });
      return runtime.loadPromise;
    }

    async function openDirectory() {
      if (!isTeacherMode()) return;
      if (typeof root.showScreen === 'function') root.showScreen('screenWrongAnswerDirectory');
      setText('wrongAnswerDirectoryStatus', '正在读取练习目录…');
      await loadAll(true);
      setText(
        'wrongAnswerDirectoryStatus',
        runtime.catalog.papers.length ? '按学生查看每天、每张卷子的批改记录。' : '还没有已上传的练习。'
      );
    }

    async function openPaper(paperId) {
      if (!isTeacherMode()) return;
      if (!runtime.catalog.papers.length) await loadAll(true);
      const paper = paperById(paperId);
      if (!paper) {
        if (typeof root.alert === 'function') root.alert('这张练习暂时无法读取，请刷新目录后重试。');
        return;
      }
      renderDetail(paper);
      if (typeof root.showScreen === 'function') root.showScreen('screenWrongAnswerDetail');
    }

    async function openLatest() {
      if (!isTeacherMode()) return;
      await loadAll(true);
      const paper = latestPaper(runtime.catalog);
      if (!paper) {
        await openDirectory();
        return;
      }
      await openPaper(paper.paperId);
    }

    async function saveCurrent(allCorrect) {
      const paper = runtime.activePaper;
      if (!paper || runtime.savePromise) return;
      if (typeof root.canWriteCloudData === 'function' && !root.canWriteCloudData()) {
        updateSelectionStatus('当前离线，只能查看，无法保存批改');
        return;
      }
      const saveButton = doc.getElementById('wrongAnswerSaveButton');
      if (allCorrect) {
        doc.querySelectorAll('#wrongAnswerQuestionSections input[type="checkbox"]')
          .forEach(input => { input.checked = false; });
      }
      const wrongIds = allCorrect ? [] : selectedWrongQuestionIds();
      const teacherNote = text(doc.getElementById('wrongAnswerTeacherNote')?.value);
      if (saveButton) saveButton.disabled = true;
      updateSelectionStatus('正在保存…');
      runtime.savePromise = (async () => {
        const key = gradingKey(paper.studentId);
        const remote = await readValue(key, true);
        const next = mergeGradingStore(remote, paper, wrongIds, undefined, teacherNote);
        if (typeof root.sbSet !== 'function') throw new Error('批改记录存储不可用');
        await root.sbSet(key, next);
        runtime.grading[paper.studentId] = normalizeGradingStore(next, paper.studentId);
        renderHome();
        renderDirectory();
        updateSelectionStatus(allCorrect ? '已保存：本卷全对' : `已保存：错 ${wrongIds.length} / ${paper.totalQuestions} 小问`);
      })().catch(error => {
        console.warn('wrong answer grading save failed', error && (error.message || error));
        if (typeof root.showStorageError === 'function') root.showStorageError(error);
        updateSelectionStatus('保存失败，请确认网络后重试');
      }).finally(() => {
        runtime.savePromise = null;
        if (saveButton) saveButton.disabled = false;
      });
      return runtime.savePromise;
    }

    function clearSelection() {
      doc.querySelectorAll('#wrongAnswerQuestionSections input[type="checkbox"]')
        .forEach(input => { input.checked = false; });
      updateSelectionStatus('已清空选择，尚未保存');
    }

    function closeToTeacherHome() {
      runtime.activePaper = null;
      if (typeof root.returnToTeacherHome === 'function') root.returnToTeacherHome();
      else if (typeof root.showScreen === 'function') root.showScreen('screenHome');
      loadAll(true);
    }

    function backToDirectory() {
      runtime.activePaper = null;
      renderDirectory();
      setText(
        'wrongAnswerDirectoryStatus',
        runtime.catalog.papers.length ? '按学生查看每天、每张卷子的批改记录。' : '还没有已上传的练习。'
      );
      if (typeof root.showScreen === 'function') root.showScreen('screenWrongAnswerDirectory');
    }

    root.openWrongAnswerOrganizer = openDirectory;
    root.openLatestWrongAnswerPaper = openLatest;
    root.closeWrongAnswerOrganizer = closeToTeacherHome;
    root.backToWrongAnswerDirectory = backToDirectory;
    root.clearWrongAnswerSelection = clearSelection;
    root.saveWrongAnswerGrading = () => saveCurrent(false);
    root.markWrongAnswerPaperAllCorrect = () => saveCurrent(true);
    root.refreshWrongAnswerOrganizerHome = () => loadAll(true);

    doc.querySelectorAll('[data-weakness-student]').forEach(tab => {
      tab.addEventListener('click', () => {
        const selected = studentId(tab.dataset.weaknessStudent);
        if (!selected || selected === runtime.activeWeaknessStudent) return;
        runtime.activeWeaknessStudent = selected;
        renderWeaknessChart();
      });
    });

    const observer = typeof root.MutationObserver === 'function'
      ? new root.MutationObserver(() => {
        if (isTeacherMode() && doc.body.classList.contains('is-teacher')) loadAll(true);
      })
      : null;
    if (observer && doc.body) observer.observe(doc.body, { attributes: true, attributeFilter: ['class'] });
    if (isTeacherMode()) loadAll(false);
  }

  return {
    CATALOG_KEY,
    GRADING_KEY_PREFIX,
    WEAKNESS_VIEW_KEY,
    VERSION,
    normalizeCatalog,
    normalizeGradingStore,
    createGradingRecord,
    mergeGradingStore,
    recordForPaper,
    sortedPapers,
    latestPaper,
    paperProgressLabel,
    normalizeWeaknessView,
    weaknessDonutSegments,
    install
  };
});
