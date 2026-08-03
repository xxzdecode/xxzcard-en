'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'vocabularyPracticeUI.js'),
  'utf8'
);

class FakeElement {
  constructor(tagName = 'div') {
    this.tagName = String(tagName).toUpperCase();
    this.nodeType = 1;
    this.id = '';
    this.className = '';
    this.dataset = {};
    this.children = [];
    this.hidden = false;
    this._text = '';
    this._html = '';
    this.parentElement = null;
    this.question = null;
  }

  get textContent() {
    if (!this.children.length) return this._text;
    return this.children.map(child => child.textContent || '').join('');
  }

  set textContent(value) {
    this._text = String(value == null ? '' : value);
    this.children = [];
  }

  get innerHTML() {
    return this._html;
  }

  set innerHTML(value) {
    this._html = String(value == null ? '' : value);
    this.children = [];
    const match = this._html.match(/<div class="vocabulary-adventure-prompt-text">([\s\S]*?)<\/div>/);
    if (!match) return;
    const question = new FakeElement('div');
    question.className = 'vocabulary-adventure-question';
    const label = new FakeElement('div');
    label.className = 'vocabulary-adventure-question-label';
    label.textContent = '补全缺少的字母';
    const prompt = new FakeElement('div');
    prompt.className = 'vocabulary-adventure-prompt-text';
    prompt.textContent = match[1];
    prompt.question = question;
    question.label = label;
    question.append(label, prompt);
    this.appendChild(question);
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  append(...children) {
    children.forEach(child => this.appendChild(child));
  }

  addEventListener() {}
  setAttribute() {}
  removeAttribute() {}

  matches(selector) {
    if (selector === '.vocabulary-adventure-prompt-text') {
      return this.className.split(/\s+/).includes('vocabulary-adventure-prompt-text');
    }
    return false;
  }

  closest(selector) {
    if (selector === '.vocabulary-adventure-question') return this.question;
    if (selector.includes('#screenVocabularyAdventure .vocabulary-adventure-question')) return null;
    return null;
  }

  querySelector(selector) {
    if (this.className.includes('vocabulary-adventure-question')
        && selector.includes('.vocabulary-adventure-question-label')) {
      return this.label;
    }
    return null;
  }

  querySelectorAll(selector) {
    const result = [];
    const visit = node => {
      node.children.forEach(child => {
        if (selector === '.vocabulary-adventure-prompt-text'
            && child.className.split(/\s+/).includes('vocabulary-adventure-prompt-text')) {
          result.push(child);
        }
        visit(child);
      });
    };
    if (selector === '.vocabulary-adventure-options button') return [];
    visit(this);
    return result;
  }
}

function createHarness() {
  const adventureBody = new FakeElement('div');
  adventureBody.id = 'vocabularyAdventureBody';
  const challengeBody = new FakeElement('div');
  challengeBody.id = 'vocabularyAdventureChallengeBody';
  const elements = new Map([
    [adventureBody.id, adventureBody],
    [challengeBody.id, challengeBody]
  ]);
  const head = new FakeElement('head');
  const document = {
    body: new FakeElement('body'),
    head,
    createElement(tagName) { return new FakeElement(tagName); },
    getElementById(id) { return elements.get(id) || null; },
    querySelectorAll() { return []; },
    addEventListener() {}
  };
  const context = {
    document,
    Element: FakeElement,
    console,
    setTimeout(callback) { callback(); return 1; }
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'js/vocabularyPracticeUI.js' });
  return { context, adventureBody };
}

test('missing-letter prompt is decoded in the same innerHTML assignment', () => {
  const { adventureBody } = createHarness();
  const cue = encodeURIComponent(JSON.stringify({
    meaning: '苹果',
    emoji: '🍎',
    maskedWord: 'a_ple'
  }));

  adventureBody.innerHTML = `
    <div class="vocabulary-adventure-question">
      <div class="vocabulary-adventure-prompt-text">__VOCAB_MISSING__:${cue}</div>
    </div>`;

  const prompt = adventureBody.querySelectorAll('.vocabulary-adventure-prompt-text')[0];
  assert.equal(prompt.dataset.vocabularyCueEnhanced, '1');
  assert.equal(prompt.question.label.textContent, '选择缺失字母');
  assert.equal(prompt.children[0].className, 'vocabulary-adventure-missing-cue');
  assert.doesNotMatch(prompt.textContent, /__VOCAB_MISSING__|%[0-9A-F]{2}/i);
});
