const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const api = require(path.join(root, 'js', 'wrongAnswerOrganizer.js'));

const sourceCatalog = {
  schema_version: 1,
  latest_paper_id: 'daily-2026-08-05-brother-sentence-parts:brother',
  assessments: [
    {
      assessment_id: 'daily-2026-08-05-brother-sentence-parts',
      assessment_type: 'daily',
      assessment_date: '2026-08-05',
      student_id: 'brother',
      title: '句子骨架与基础语序',
      map_revision: 'sha256:daily-v1',
      sections: [
        {
          section_id: 'section-1',
          display_label: '一、找出句子成分',
          items: [
            { question_id: 'Q01', display_label: '第 1 小问', kp_ids: ['sentence-parts'] },
            { question_id: 'Q02', display_label: '第 2 小问', kp_ids: ['sentence-parts', 'sentence-be-action-aux'] }
          ]
        },
        {
          section_id: 'section-2',
          display_label: '二、按正确语序完成句子',
          items: [
            { question_id: 'Q03', display_label: '第 1 小问', kp_ids: ['sentence-parts'] },
            { question_id: 'Q04', display_label: '第 2 小问', kp_ids: ['sentence-parts'] },
            { question_id: 'Q05', display_label: '第 3 小问', kp_ids: ['sentence-parts'] }
          ]
        }
      ]
    },
    {
      assessment_id: 'weekly-2026-W31',
      assessment_type: 'weekly',
      assessment_date: '2026-08-01',
      title: '基础语法周测',
      map_revision: 'sha256:weekly-v1',
      papers: [
        {
          paper_id: 'weekly-2026-W31:sister',
          student_id: 'sister',
          sections: [{ section_id: 'one', display_label: '一、选择', items: [{ question_id: 'S01', kp_ids: ['articles'] }] }]
        },
        {
          paper_id: 'weekly-2026-W31:brother',
          student_id: 'brother',
          sections: [{ section_id: 'one', display_label: '一、选择', items: [{ question_id: 'B01', kp_ids: ['articles'] }] }]
        }
      ]
    }
  ]
};

const catalog = api.normalizeCatalog(sourceCatalog);
assert.equal(catalog.papers.length, 3);
assert.equal(catalog.papers[0].paperId, 'daily-2026-08-05-brother-sentence-parts:brother');
assert.equal(catalog.papers[0].totalQuestions, 5);
assert.deepEqual(catalog.papers[0].sections[0].items.map(item => item.questionId), ['Q01', 'Q02']);
assert.equal(api.latestPaper(catalog).title, '句子骨架与基础语序');

const daily = catalog.papers[0];
const record = api.createGradingRecord(daily, ['Q02', 'Q04', 'unknown'], '2026-08-05T12:30:00.000Z');
assert.deepEqual(record.wrong_question_ids, ['Q02', 'Q04']);
assert.deepEqual(record.wrong_items, [
  { question_id: 'Q02', kp_ids: ['sentence-parts', 'sentence-be-action-aux'] },
  { question_id: 'Q04', kp_ids: ['sentence-parts'] }
]);
assert.equal(record.total_questions, 5);
assert.equal(record.map_revision, 'sha256:daily-v1');

const store = api.mergeGradingStore(null, daily, ['Q02', 'Q04'], '2026-08-05T12:30:00.000Z');
const current = api.recordForPaper(store, daily);
assert.deepEqual(current.record.wrongQuestionIds, ['Q02', 'Q04']);
assert.equal(current.stale, false);
assert.equal(api.paperProgressLabel(daily, current), '错 2 / 5 小问');

const revisedDaily = { ...daily, mapRevision: 'sha256:daily-v2' };
const stale = api.recordForPaper(store, revisedDaily);
assert.equal(stale.record, null);
assert.equal(stale.stale, true);
assert.equal(api.paperProgressLabel(revisedDaily, stale), '映射已更新 · 共 5 小问');

const missingRevision = api.recordForPaper({
  ...store,
  records: {
    [daily.paperId]: { ...store.records[daily.paperId], map_revision: '' }
  }
}, daily);
assert.equal(missingRevision.record, null);
assert.equal(missingRevision.stale, true);

const invalidCatalog = api.normalizeCatalog({
  assessments: [{
    assessment_id: 'invalid-paper',
    student_id: 'sister',
    sections: [{ items: [{ question_id: 'Q01', kp_ids: ['articles'] }] }]
  }, {
    assessment_id: 'duplicate-question-id',
    student_id: 'sister',
    map_revision: 'sha256:duplicate',
    sections: [
      { items: [{ question_id: 'Q01', kp_ids: ['articles'] }] },
      { items: [{ question_id: 'Q01', kp_ids: ['nouns'] }] }
    ]
  }, {
    assessment_id: 'missing-kp-id',
    student_id: 'sister',
    map_revision: 'sha256:missing-kp',
    sections: [{ items: [{ question_id: 'Q01', kp_ids: [] }] }]
  }]
});
assert.equal(invalidCatalog.papers.length, 0);

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles-wrong-answer-organizer.css'), 'utf8');
const loader = fs.readFileSync(path.join(root, 'js', 'lazyFeatures.js'), 'utf8');
const organizerSource = fs.readFileSync(path.join(root, 'js', 'wrongAnswerOrganizer.js'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

assert.match(html, /<h2>错题整理<\/h2>/);
assert.match(html, /id="screenWrongAnswerDirectory"/);
assert.match(html, /id="screenWrongAnswerDetail"/);
assert.match(html, /onclick="markWrongAnswerPaperAllCorrect\(\)"[^>]*>全对<\/button>/);
assert.match(html, /onclick="clearWrongAnswerSelection\(\)"[^>]*>清空<\/button>/);
assert.match(html, /onclick="saveWrongAnswerGrading\(\)"[^>]*>保存批改<\/button>/);
assert.doesNotMatch(html, /score|percentage|百分比/i);
assert.ok(
  html.indexOf('teacher-dashboard-entry-card--knowledge') < html.indexOf('teacher-dashboard-entry-card--wrong-answers'),
  'wrong answer organizer must occupy the final dashboard slot after the knowledge library'
);
assert.match(styles, /\.wrong-answer-directory-grid\s*\{[^}]*repeat\(2,/s);
assert.match(styles, /\.teacher-dashboard-entry-card--wrong-answers\s*\{\s*order:\s*6;/);
assert.match(styles, /\.wrong-answer-question:has\(input:checked\)/);
assert.match(loader, /wrongAnswerOrganizer:\s*\['js\/wrongAnswerOrganizer\.js'\]/);
assert.doesNotMatch(organizerSource, /root\.loadHome\s*=|window\.loadHome\s*=/);
assert.match(serviceWorker, /styles-wrong-answer-organizer\.css/);
assert.match(serviceWorker, /js\/wrongAnswerOrganizer\.js/);

console.log('wrong answer organizer tests passed');
