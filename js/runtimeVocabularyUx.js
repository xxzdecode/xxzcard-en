(function runtimeVocabularyUxModule(root, factory) {
  const api = factory(root || {});
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.RuntimeVocabularyUx = api;
    api.install();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createRuntimeVocabularyUx(root) {
  'use strict';

  const MISSING_PREFIX = '__VOCAB_MISSING__:';
  const AUDIO_PREFIX = '__VOCAB_CUE__:';
  let installed = false;
  let reviewValue = null;
  let reviewAccessorInstalled = false;
  const bodySetters = new WeakMap();

  function text(value) {
    return String(value == null ? '' : value).trim().replace(/\s+/g, ' ');
  }

  function splitBilingualExample(value) {
    const source = text(value);
    if (!source) return { english: '', chinese: '' };
    const parts = source.split(/\s*[\/／]\s*/).map(text).filter(Boolean);
    if (parts.length < 2) return { english: source, chinese: '' };
    const englishIndex = parts.findIndex(part => /[a-z]/i.test(part));
    const chineseIndex = parts.findIndex(part => /[\u3400-\u9fff]/.test(part));
    return {
      english: englishIndex >= 0 ? parts[englishIndex] : parts[0],
      chinese: chineseIndex >= 0 ? parts[chineseIndex] : parts[parts.length - 1]
    };
  }

  function normalizedToken(value) {
    return text(value).toLocaleLowerCase()
      .replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '')
      .replace(/[’]/g, "'");
  }

  function transformSentenceOrder(question, context) {
    if (!question || !question.ok || question.questionType !== 'sentenceOrder') return question;
    const source = splitBilingualExample(question.sourceText);
    const words = source.english.split(/\s+/).filter(Boolean);
    if (words.length < 3) return question;

    const core = root.VocabularyAdventureCore;
    const targetKey = core?.adventureWordKey?.(context?.planItem?.wordKey)
      || normalizedToken(context?.planItem?.wordKey);
    const candidate = (Array.isArray(context?.allCards) ? context.allCards : [])
      .find(item => (core?.adventureWordKey?.(item?.key || item?.word)
        || normalizedToken(item?.key || item?.word)) === targetKey);
    const focusWord = text(candidate?.word || candidate?.card?.word || context?.planItem?.wordKey);
    const focusParts = new Set(focusWord.split(/\s+/).map(normalizedToken).filter(Boolean));
    const ordered = words.map((label, index) => {
      const focus = focusParts.has(normalizedToken(label));
      return {
        id: `${focus ? 'focus:' : ''}${index}:${label}`,
        label,
        sourceIndex: index,
        focus
      };
    });
    let shuffled = typeof core?.deterministicAdventureShuffle === 'function'
      ? core.deterministicAdventureShuffle(ordered, `${question.seed || ''}|english-only`, token => token.id)
      : [...ordered.slice(1), ordered[0]];
    if (shuffled.every((token, index) => token.sourceIndex === index)) {
      shuffled = [...shuffled.slice(1), shuffled[0]];
    }
    return {
      ...question,
      prompt: source.chinese || text(question.prompt),
      tokens: shuffled,
      answer: ordered.map(token => token.id),
      sourceText: source.english,
      bilingualSourceText: text(question.sourceText),
      focusWord
    };
  }

  function patchReview(review) {
    if (!review || typeof review !== 'object' || review.__runtimeSentenceOrderPatched) return review;
    const registry = review.VocabularyAdventureReviewTypes;
    const sentence = registry && registry.sentenceOrder;
    if (!sentence || typeof sentence.build !== 'function') return review;
    const originalBuild = sentence.build;
    const originalBuildReview = typeof review.buildVocabularyAdventureReviewQuestion === 'function'
      ? review.buildVocabularyAdventureReviewQuestion.bind(review)
      : null;
    return Object.freeze({
      ...review,
      VocabularyAdventureReviewTypes: Object.freeze({
        ...registry,
        sentenceOrder: Object.freeze({
          ...sentence,
          build(context) {
            return transformSentenceOrder(originalBuild(context), context);
          }
        })
      }),
      buildVocabularyAdventureReviewQuestion: originalBuildReview
        ? input => transformSentenceOrder(originalBuildReview(input), input)
        : review.buildVocabularyAdventureReviewQuestion,
      __runtimeSentenceOrderPatched: true
    });
  }

  function installReviewAccessor() {
    if (reviewAccessorInstalled) return;
    reviewAccessorInstalled = true;
    reviewValue = patchReview(root.VocabularyAdventureReview);
    const descriptor = Object.getOwnPropertyDescriptor(root, 'VocabularyAdventureReview');
    if (descriptor && descriptor.configurable === false) return;
    try {
      Object.defineProperty(root, 'VocabularyAdventureReview', {
        configurable: true,
        enumerable: true,
        get() { return reviewValue; },
        set(value) { reviewValue = patchReview(value); }
      });
    } catch (_) {
      reviewAccessorInstalled = false;
    }
  }

  function ensureReviewPatched() {
    if (reviewAccessorInstalled) {
      if (reviewValue) reviewValue = patchReview(reviewValue);
      return;
    }
    const patched = patchReview(root.VocabularyAdventureReview);
    if (patched && patched !== root.VocabularyAdventureReview) root.VocabularyAdventureReview = patched;
  }

  function decodeCue(value) {
    const raw = text(value);
    for (const [kind, prefix] of [['missing', MISSING_PREFIX], ['audio', AUDIO_PREFIX]]) {
      const index = raw.indexOf(prefix);
      if (index < 0) continue;
      try {
        return { kind, value: JSON.parse(decodeURIComponent(raw.slice(index + prefix.length))) };
      } catch (_) {
        return null;
      }
    }
    return null;
  }

  function renderMissingCue(node, cue) {
    const question = node.closest?.('.vocabulary-adventure-question');
    const label = question?.querySelector?.('.vocabulary-adventure-question-label, .vocabulary-adventure-instruction, h2');
    if (label) label.textContent = '选择缺失字母';
    node.textContent = '';
    node.dataset.runtimeCueEnhanced = 'missing';
    const wrap = root.document.createElement('div');
    wrap.className = 'vocabulary-adventure-missing-cue';
    const visual = root.document.createElement('div');
    visual.className = 'vocabulary-adventure-missing-visual is-fallback';
    visual.textContent = cue.emoji || cue.placeholder || '📝';
    if (cue.image) {
      const image = root.document.createElement('img');
      image.src = cue.image;
      image.alt = cue.meaning || '单词图片';
      image.addEventListener('load', () => {
        visual.textContent = '';
        visual.classList.remove('is-fallback');
        visual.appendChild(image);
      }, { once: true });
    }
    const copy = root.document.createElement('div');
    copy.className = 'vocabulary-adventure-missing-copy';
    const meaning = root.document.createElement('p');
    meaning.textContent = cue.meaning || '根据图示选择缺失字母';
    const masked = root.document.createElement('strong');
    masked.textContent = cue.maskedWord || '';
    copy.append(meaning, masked);
    wrap.append(visual, copy);
    node.appendChild(wrap);
  }

  function renderAudioCue(node, cue) {
    const question = node.closest?.('.vocabulary-adventure-question');
    const label = question?.querySelector?.('.vocabulary-adventure-question-label, .vocabulary-adventure-instruction');
    if (label) label.textContent = '听一听，选择中文意思';
    node.textContent = '';
    node.dataset.runtimeCueEnhanced = 'audio';
    const button = root.document.createElement('button');
    button.type = 'button';
    button.className = 'vocabulary-adventure-audio-prompt';
    button.innerHTML = '<span aria-hidden="true">🔊</span> 再听一次';
    button.addEventListener('click', () => {
      if (question?.closest?.('#screenVocabularyAdventureChallenge')) root.speakVocabularyAdventureChallengeWord?.();
      else root.speakVocabularyAdventureCurrent?.();
    });
    node.appendChild(button);
    if (cue?.meaning) node.dataset.meaning = cue.meaning;
  }

  function enhanceCueNode(node) {
    if (!node || node.nodeType !== 1) return;
    const decoded = decodeCue(node.textContent);
    if (!decoded) return;
    delete node.dataset.vocabularyCueEnhanced;
    if (decoded.kind === 'missing') renderMissingCue(node, decoded.value || {});
    else renderAudioCue(node, decoded.value || {});
  }

  function highlightOrderFocus(host) {
    if (!host?.querySelectorAll) return;
    host.querySelectorAll(
      '.vocabulary-adventure-order-bank button[data-token^="focus:"],'
      + '.vocabulary-adventure-order-pool button[onclick*="\'focus:"]'
    ).forEach(button => button.classList.add('runtime-order-focus'));
    const labels = new Set();
    host.querySelectorAll('.runtime-order-focus').forEach(node => {
      const value = normalizedToken(node.textContent);
      if (value) labels.add(value);
    });
    if (!labels.size) return;
    host.querySelectorAll('.vocabulary-adventure-order-answer span').forEach(span => {
      span.classList.toggle('runtime-order-focus', labels.has(normalizedToken(span.textContent)));
    });
    const answer = host.querySelector('#vocabularyAdventureChallengeOrderAnswer');
    if (!answer || answer.querySelector('strong')) return;
    const raw = text(answer.textContent);
    if (!raw || raw === '点击下方卡片完成排列') return;
    const words = raw.split(/\s+/);
    if (!words.some(word => labels.has(normalizedToken(word)))) return;
    answer.textContent = '';
    words.forEach((word, index) => {
      if (index) answer.appendChild(root.document.createTextNode(' '));
      if (labels.has(normalizedToken(word))) {
        const strong = root.document.createElement('strong');
        strong.className = 'runtime-order-focus';
        strong.textContent = word;
        answer.appendChild(strong);
      } else {
        answer.appendChild(root.document.createTextNode(word));
      }
    });
  }

  function scanHost(host) {
    if (!host || host.nodeType !== 1) return;
    root.VocabularyPracticeUI?.scan?.(host);
    if (host.matches?.('.vocabulary-adventure-prompt-text')) enhanceCueNode(host);
    host.querySelectorAll?.('.vocabulary-adventure-prompt-text').forEach(enhanceCueNode);
    highlightOrderFocus(host);
  }

  function scan() {
    ['vocabularyAdventureBody', 'vocabularyAdventureChallengeBody'].forEach(id => {
      const host = root.document?.getElementById(id);
      if (host) scanHost(host);
    });
  }

  function innerHtmlDescriptor(node) {
    let prototype = node;
    while (prototype) {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, 'innerHTML');
      if (descriptor?.get && descriptor?.set) return descriptor;
      prototype = Object.getPrototypeOf(prototype);
    }
    return null;
  }

  function patchHostInnerHtml(host) {
    if (!host) return;
    const own = Object.getOwnPropertyDescriptor(host, 'innerHTML');
    if (own?.set && own.set === bodySetters.get(host)) return;
    const descriptor = own?.get && own?.set ? own : innerHtmlDescriptor(Object.getPrototypeOf(host));
    if (!descriptor?.get || !descriptor?.set) return;
    try {
      const setter = function runtimeVocabularyInnerHtml(value) {
        descriptor.set.call(this, value);
        scanHost(this);
      };
      Object.defineProperty(host, 'innerHTML', {
        configurable: true,
        enumerable: descriptor.enumerable === true,
        get() { return descriptor.get.call(this); },
        set: setter
      });
      bodySetters.set(host, setter);
    } catch (_) {}
  }

  function observeHost(id) {
    const host = root.document?.getElementById(id);
    if (!host) return;
    patchHostInnerHtml(host);
    if (!host.dataset.runtimeCueObserverInstalled) {
      host.dataset.runtimeCueObserverInstalled = 'true';
      if (typeof root.MutationObserver === 'function') {
        const observer = new root.MutationObserver(() => scanHost(host));
        observer.observe(host, { subtree: true, childList: true, characterData: true });
      }
    }
    scanHost(host);
  }

  function installStyles() {
    if (root.document.getElementById('runtimeVocabularyUxStyles')) return;
    const style = root.document.createElement('style');
    style.id = 'runtimeVocabularyUxStyles';
    style.textContent = `
      .vocabulary-adventure-order-bank button[data-token^="focus:"],
      .vocabulary-adventure-order-pool button[onclick*="'focus:"]{font-weight:950;box-shadow:0 0 0 3px rgba(112,87,179,.13)}
      .vocabulary-adventure-order-answer .runtime-order-focus{font-weight:950;color:#65499f}
    `;
    root.document.head.appendChild(style);
  }

  function install() {
    if (installed || !root.document) return;
    installed = true;
    installStyles();
    installReviewAccessor();
    observeHost('vocabularyAdventureBody');
    observeHost('vocabularyAdventureChallengeBody');
    scan();
    let attempts = 0;
    const timer = root.setInterval(() => {
      attempts += 1;
      ensureReviewPatched();
      observeHost('vocabularyAdventureBody');
      observeHost('vocabularyAdventureChallengeBody');
      scan();
      if (attempts >= 120) root.clearInterval(timer);
    }, 250);
  }

  return Object.freeze({
    splitBilingualExample,
    transformSentenceOrder,
    decodeCue,
    scan,
    install
  });
});
