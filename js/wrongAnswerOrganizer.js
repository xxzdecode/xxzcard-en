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
  const VERSION = 1;
  const STUDENTS = Object.freeze([
    { id: 'sister', name: '姐姐', emoji: '👧' },
    { id: 'brother', name: '弟弟', emoji: '👦' }
  ]);
  const TYPE_LABELS = Object.freeze({ daily: '日测', weekly: '周测', monthly: '月测' });

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
    return ['daily', 'weekly', 'monthly'].includes(value) ? value : 'daily';
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
    const mapRevision = text(source.mapRevision || source.map_revision || source.mapHash || source.map_hash
      || assessment.mapRevision || assessment.map_revision || assessment.mapHash || assessment.map_hash);
    if (!mapRevision || !sections.length || sections.some(section => !section)) return null;
    const allQuestionIds = sections.flatMap(section => section.items.map(item => item.questionId));
    if (new Set(allQuestionIds).size !== allQuestionIds.length) return null;
    return {
      assessmentId,
      paperId,
      studentId: student,
      title: text(source.title || assessment.title) || '未命名练习',
      assessmentType: assessmentType(source.assessmentType || source.assessment_type || assessment.assessmentType || assessment.assessment_type),
      assessmentDate: isoDate(source.assessmentDate || source.assessment_date || assessment.assessmentDate || assessment.assessment_date),
      mapRevision,
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
    const assessments = (Array.isArray(source.assessments) ? source.assessments : [])
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
      mapRevision: text(source.mapRevision || source.map_revision || source.mapHash || source.map_hash),
      totalQuestions: Math.max(0, Number(source.totalQuestions || source.total_questions) || 0),
      wrongQuestionIds: strings(source.wrongQuestionIds || source.wrong_question_ids),
      wrongItems: (Array.isArray(source.wrongItems || source.wrong_items) ? source.wrongItems || source.wrong_items : [])
        .map(item => ({
          questionId: text(item && (item.questionId || item.question_id)),
          kpIds: strings(item && (item.kpIds || item.kp_ids))
        }))
        .filter(item => item.questionId),
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

  function createGradingRecord(paper, wrongQuestionIds, nowValue) {
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
      total_questions: paper.totalQuestions,
      wrong_question_ids: wrongIds,
      wrong_items: wrongIds.map(questionId => ({
        question_id: questionId,
        kp_ids: questionById.get(questionId)?.kpIds || []
      })),
      status: 'graded',
      graded_at: now,
      updated_at: now
    };
  }

  function mergeGradingStore(value, paper, wrongQuestionIds, nowValue) {
    const current = normalizeGradingStore(value, paper.studentId);
    const record = createGradingRecord(paper, wrongQuestionIds, nowValue);
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
    const stale = Boolean(paper.mapRevision && record.mapRevision !== paper.mapRevision);
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

  function install(root) {
    if (!root || !root.document || root.__wrongAnswerOrganizerInstalled) return;
    root.__wrongAnswerOrganizerInstalled = true;
    const doc = root.document;
    const runtime = {
      catalog: normalizeCatalog(null),
      grading: { sister: normalizeGradingStore(null, 'sister'), brother: normalizeGradingStore(null, 'brother') },
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
        `${studentName(paper.studentId)} · ${shortDate(paper.assessmentDate)}${typeLabel(paper.assessmentType)}`
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
      title.textContent = `${shortDate(paper.assessmentDate)}${typeLabel(paper.assessmentType)}｜${paper.title}`;
      const meta = doc.createElement('small');
      meta.textContent = `${typeLabel(paper.assessmentType)} · ${paper.assessmentDate || '日期未标注'}`;
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

    function applyLoadedData(catalogValue, gradingValues) {
      runtime.catalog = normalizeCatalog(catalogValue);
      STUDENTS.forEach(student => {
        runtime.grading[student.id] = normalizeGradingStore(gradingValues[student.id], student.id);
      });
      renderHome();
      renderDirectory();
    }

    function loadAll(preferRemote) {
      if (runtime.loadPromise) return runtime.loadPromise;
      runtime.loadPromise = Promise.all([
        readValue(CATALOG_KEY, preferRemote),
        readValue(gradingKey('sister'), preferRemote),
        readValue(gradingKey('brother'), preferRemote)
      ]).then(([catalog, sister, brother]) => {
        applyLoadedData(catalog, { sister, brother });
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
      if (saveButton) saveButton.disabled = true;
      updateSelectionStatus('正在保存…');
      runtime.savePromise = (async () => {
        const key = gradingKey(paper.studentId);
        const remote = await readValue(key, true);
        const next = mergeGradingStore(remote, paper, wrongIds);
        if (typeof root.sbSet !== 'function') throw new Error('批改记录存储不可用');
        await root.sbSet(key, next);
        runtime.grading[paper.studentId] = normalizeGradingStore(next, paper.studentId);
        renderHome();
        renderDirectory();
        updateSelectionStatus(allCorrect ? '已保存：本卷全对' : `已保存：错 ${wrongIds.length} / ${paper.totalQuestions} 小问`);
      })().catch(error => {
        console.warn('wrong answer grading save failed', error && (error.message || error));
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
    VERSION,
    normalizeCatalog,
    normalizeGradingStore,
    createGradingRecord,
    mergeGradingStore,
    recordForPaper,
    sortedPapers,
    latestPaper,
    paperProgressLabel,
    install
  };
});
