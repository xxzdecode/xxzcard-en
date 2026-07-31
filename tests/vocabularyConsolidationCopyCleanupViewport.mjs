import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webkit } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPaths = [
  path.join(__dirname, '../js/vocabularyConsolidationCore.js'),
  path.join(__dirname, '../js/vocabularyConsolidationView.js'),
  path.join(__dirname, '../js/vocabularyConsolidationPlayer.js')
];
const viewports = [
  { name: 'iPad Air 11 landscape', width: 1180, height: 820 },
  { name: 'iPhone 16 portrait', width: 393, height: 852 }
];

function shellHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box} html,body{margin:0;width:100%;min-height:100%;overflow-x:hidden;font-family:sans-serif}
    #screenVocabularyAdventure{width:100vw;min-height:100vh;padding:12px;display:grid;grid-template-rows:auto minmax(0,1fr) auto;gap:10px}
    .top{display:flex;gap:10px;flex-wrap:wrap}.top>*{min-width:0}
    #vocabularyAdventureBody{min-width:0;overflow:auto}.vocabulary-adventure-options{display:grid;gap:10px;grid-template-columns:repeat(2,minmax(0,1fr))}
    button,input{min-height:44px;font:inherit}.vocabulary-adventure-full-card,.vocabulary-adventure-question,.vocabulary-adventure-summary{max-width:760px;margin:auto}
    .vocabulary-adventure-card-heading{display:flex;gap:10px;align-items:center}.vocabulary-adventure-card-heading>div{min-width:0;flex:1}
    @media(max-width:500px){.vocabulary-adventure-options{grid-template-columns:1fr}}
  </style></head><body>
    <section id="screenVocabularyAdventure">
      <div class="top">
        <strong id="vocabularyAdventureStageTitle"></strong>
        <span id="vocabularyAdventureScreeningProgress"></span>
        <span id="vocabularyAdventureTotalProgress"></span>
        <span id="vocabularyAdventureSessionDate"></span>
        <span style="flex:1;min-width:100px"><i id="vocabularyAdventureProgressFill"></i></span>
      </div>
      <main id="vocabularyAdventureBody"></main>
      <footer><span id="vocabularyAdventureFeedbackText"></span><button id="vocabularyAdventureAction" hidden></button></footer>
    </section>
    <div id="vocabularyAdventurePreviewEntry"></div>
  </body></html>`;
}

async function installScenario(page, { results, failSave = false, inputQuestion = false }) {
  await page.setContent(shellHtml());
  await page.evaluate(({ results, failSave, inputQuestion }) => {
    const plan = results.map((entry, index) => ({
      wordKey: entry.word,
      word: entry.word,
      phase: 'screening',
      status: 'completed',
      result: entry.result,
      taskType: entry.taskType || 'wordToMeaning',
      confirmationTaskType: ''
    }));
    window.currentUser = 'sister';
    window.__failSave = failSave;
    window.__saved = {
      version: 1,
      words: Object.fromEntries(results.map(entry => [entry.word, {
        lastResult: entry.result,
        intervalIndex: 2,
        reviewCount: 3,
        nextReviewAt: '2026-08-08',
        lastTaskType: entry.taskType || 'wordToMeaning'
      }])),
      session: {
        date: '2026-08-01', plan, cursor: plan.length, phase: 'completed', completed: true, rewardGranted: false
      }
    };
    const clone = value => JSON.parse(JSON.stringify(value));
    window.sbGet = async () => clone(window.__saved);
    window.sbSet = async (_key, value) => {
      if (window.__failSave) return false;
      window.__saved = clone(value);
      return true;
    };
    window.showScreen = () => {};
    window.loadHome = () => {};
    window.speakEnglish = () => {};
    window.confirm = () => true;
    window.collectVisibleVocabularyAdventureCandidates = () => [
      { key: 'alpha', word: 'alpha', card: { word: 'alpha', meaning: '字母A', emoji: '🅰️', tip: '从 a 开始' } },
      { key: 'bravo', word: 'bravo', card: { word: 'bravo', meaning: '喝彩', emoji: '👏' } },
      { key: 'charlie', word: 'charlie', card: { word: 'charlie', meaning: '查理', emoji: '👦' } }
    ];
    window.VocabularyAdventureCore = {
      normalizeVocabularyAdventureState(value) {
        const source = value && typeof value === 'object' ? value : {};
        return { version: 1, words: clone(source.words || {}), session: source.session ? {
          date: source.session.date,
          plan: clone(source.session.plan || []),
          cursor: source.session.cursor,
          phase: source.session.phase,
          completed: source.session.completed === true,
          rewardGranted: source.session.rewardGranted === true
        } : null };
      },
      localDateKey: () => '2026-08-01',
      resolveVocabularyAdventureSession({ state }) { return { action: 'resumed', state }; },
      buildVocabularyAdventureQuestion({ candidates, wordKey, taskType }) {
        const target = candidates.find(item => item.key === wordKey);
        const other = candidates.find(item => item.key !== wordKey);
        return {
          ok: true, interaction: 'choice', taskType, questionType: taskType,
          prompt: target.card.meaning,
          options: [{ label: target.card.word, correct: true }, { label: other.card.word, correct: false }],
          correctIndex: 0
        };
      }
    };
    const choice = context => ({
      ok: true,
      interaction: 'choice',
      questionType: 'meaningToWord',
      taskType: 'meaningToWord',
      prompt: context.card.meaning,
      options: [{ label: context.card.word, correct: true }, { label: 'charlie', correct: false }],
      correctIndex: 0
    });
    const input = context => ({
      ok: true,
      interaction: 'input',
      questionType: 'missingLetters',
      taskType: 'missingLetters',
      prompt: 'al_ha',
      answer: 'p',
      fullAnswer: context.card.word
    });
    window.VocabularyAdventureReview = {
      VocabularyAdventureReviewTypes: inputQuestion
        ? { missingLetters: { build: input } }
        : { meaningToWord: { build: choice } },
      gradeVocabularyAdventureReviewQuestion(question, answer) {
        if (question.interaction === 'choice') return Number(answer) === question.correctIndex;
        if (question.interaction === 'input') return String(answer).trim().toLowerCase() === question.answer;
        return false;
      },
      visualMatchOutcome(errors) { return errors ? { result: 'H', requiresConfirmation: false } : { result: 'D', requiresConfirmation: false }; },
      buildVocabularyAdventureReviewQuestion: choice,
      buildVocabularyAdventureMeaningConfirmation: choice
    };
  }, { results, failSave, inputQuestion });
  for (const scriptPath of scriptPaths) await page.addScriptTag({ path: scriptPath });
}

async function assertViewport(page, viewportName) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    smallTargets: [...document.querySelectorAll('button,input')].filter(node => node.getBoundingClientRect().height < 44).length
  }));
  assert.ok(metrics.scrollWidth <= metrics.clientWidth + 1, `${viewportName}: horizontal overflow`);
  assert.equal(metrics.smallTargets, 0, `${viewportName}: touch target below 44px`);
}

const browser = await webkit.launch();
try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    await installScenario(page, {
      results: [
        { word: 'alpha', result: 'F', taskType: 'wordToMeaning' },
        { word: 'bravo', result: 'H', taskType: 'wordToMeaning' },
        { word: 'charlie', result: 'D', taskType: 'wordToMeaning' }
      ],
      failSave: true
    });
    await page.evaluate(() => openVocabularyAdventure());
    await page.waitForSelector('#vocabularyAdventureReviewOptions button');
    assert.equal(await page.textContent('#vocabularyAdventureStageTitle'), '再练几个刚才遇到的词');

    await page.click('#vocabularyAdventureReviewOptions button:nth-child(2)');
    assert.equal(await page.textContent('#vocabularyAdventureFeedbackText'), '再试一次，看看提示。');
    await page.click('#vocabularyAdventureReviewOptions button:nth-child(1)');
    assert.equal(await page.textContent('#vocabularyAdventureFeedbackText'), '保存失败，进度还没有前进。');
    assert.equal(await page.evaluate(() => __getVocabularyConsolidationRuntime().state.session.consolidation.cursor), 0);

    await page.evaluate(() => { window.__failSave = false; });
    await page.click('#vocabularyAdventureAction');
    assert.match(await page.textContent('#vocabularyAdventureBody'), /提示帮你想起来了/);
    await page.click('#vocabularyAdventureAction');
    assert.equal(await page.evaluate(() => __getVocabularyConsolidationRuntime().state.session.consolidation.cursor), 1);

    await page.evaluate(async () => {
      closeVocabularyAdventure();
      await openVocabularyAdventure();
    });
    await page.waitForSelector('#vocabularyAdventureReviewOptions button');
    assert.equal(await page.evaluate(() => __getVocabularyConsolidationRuntime().state.session.consolidation.cursor), 1);

    await page.click('#vocabularyAdventureReviewOptions button:nth-child(2)');
    await page.click('#vocabularyAdventureReviewOptions button:nth-child(2)');
    assert.match(await page.textContent('#vocabularyAdventureBody'), /我们再认识一次这个词/);
    assert.match(await page.textContent('#vocabularyAdventureBody'), /bravo/);
    await page.click('#vocabularyAdventureAction');
    assert.match(await page.textContent('#vocabularyAdventureBody'), /今天的词汇探险完成了/);

    const visibleText = await page.textContent('body');
    for (const phrase of ['D 直接答对', 'H 提示后', 'F 待加强', '使用较弱', '严重逾期', '掌握率', '复习优先级']) {
      assert.equal(visibleText.includes(phrase), false, `${viewport.name}: leaked ${phrase}`);
    }
    await assertViewport(page, viewport.name);
    await page.close();
  }

  const inputPage = await browser.newPage({ viewport: { width: 393, height: 852 } });
  await installScenario(inputPage, {
    results: [
      { word: 'alpha', result: 'F', taskType: 'audioToWord' },
      { word: 'bravo', result: 'D', taskType: 'wordToMeaning' }
    ],
    inputQuestion: true
  });
  await inputPage.evaluate(() => openVocabularyAdventure());
  const input = inputPage.locator('#vocabularyAdventureReviewInput');
  await input.fill('p');
  assert.equal(await input.inputValue(), 'p');
  await inputPage.click('.vocabulary-adventure-input-row button');
  assert.match(await inputPage.textContent('#vocabularyAdventureBody'), /找到了/);
  await assertViewport(inputPage, 'iPhone input question');
  await inputPage.close();

  const noWeakPage = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  await installScenario(noWeakPage, {
    results: [
      { word: 'alpha', result: 'D' },
      { word: 'bravo', result: 'D' }
    ]
  });
  await noWeakPage.evaluate(() => openVocabularyAdventure());
  assert.match(await noWeakPage.textContent('#vocabularyAdventureBody'), /今天的词汇探险完成了/);
  assert.equal((await noWeakPage.textContent('#vocabularyAdventureBody')).includes('刚才容易忘的词'), false);
  await noWeakPage.close();

  console.log('Vocabulary consolidation viewport checks passed for 1180×820 and 393×852.');
} finally {
  await browser.close();
}
