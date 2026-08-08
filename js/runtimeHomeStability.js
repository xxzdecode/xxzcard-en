(function runtimeHomeStabilityModule(root, factory) {
  const api = factory(root || {});
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) api.install();
})(typeof globalThis !== 'undefined' ? globalThis : this, function createRuntimeHomeStability(root) {
  'use strict';

  const STATUS_IDS = Object.freeze({
    adventure: 'vocabularyAdventureHomeStatus',
    vocabularyChallenge: 'vocabularyAdventureChallengeHomeSub',
    grammarChallenge: 'grammarChallengeHomeStatus',
    classroomPractice: 'studentClassroomPracticeStatus'
  });
  const snapshots = new Map();
  const wrappedLoaders = new WeakSet();
  let restoring = false;
  let contextKey = '';
  let contextSettling = false;
  let installed = false;
  let loadSequence = 0;

  function text(value) {
    return String(value == null ? '' : value).trim().replace(/\s+/g, ' ');
  }

  function currentStudent() {
    try {
      return typeof currentUser !== 'undefined' && ['sister', 'brother'].includes(currentUser)
        ? currentUser
        : '';
    } catch (_) {
      return ['sister', 'brother'].includes(root.currentUser) ? root.currentUser : '';
    }
  }

  function todayKey() {
    const date = new Date();
    return date.getFullYear() + '-'
      + String(date.getMonth() + 1).padStart(2, '0') + '-'
      + String(date.getDate()).padStart(2, '0');
  }

  function rank(value) {
    if (!value) return 0;
    if (value.state === 'claimed') return 4;
    if (value.state === 'opening') return 3;
    if (value.state === 'pending') return 2;
    return value.completed ? 1 : 0;
  }

  function installStyles() {
    if (root.document.getElementById('runtimeHomeStabilityStyles')) return;
    const style = root.document.createElement('style');
    style.id = 'runtimeHomeStabilityStyles';
    style.textContent = `
      #studentDashboard{position:relative}
      .runtime-home-loading-badge{position:absolute;z-index:40;top:8px;left:50%;transform:translateX(-50%);min-height:38px;padding:8px 15px;border-radius:999px;display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.96);box-shadow:0 8px 24px rgba(55,82,100,.18);color:#365f7b;font-size:14px;font-weight:900;pointer-events:none}
      .runtime-home-loading-badge::before{content:'';width:14px;height:14px;border:2px solid rgba(54,95,123,.22);border-top-color:#365f7b;border-radius:50%;animation:runtime-home-spin .75s linear infinite}
      @keyframes runtime-home-spin{to{transform:rotate(360deg)}}
      @media(prefers-reduced-motion:reduce){.runtime-home-loading-badge::before{animation:none}}
    `;
    root.document.head.appendChild(style);
  }

  function statusNode(source) {
    const id = STATUS_IDS[source];
    return id ? root.document.getElementById(id) : null;
  }

  function capture(card, source) {
    const stamp = card.querySelector('.student-home-card__stamp');
    const chest = card.querySelector('.student-reward-chest');
    const image = chest?.querySelector('img');
    return {
      state: String(card.dataset.rewardState || chest?.dataset.state || 'idle'),
      completed: card.dataset.completed === 'true',
      statusText: text(statusNode(source)?.textContent),
      stampHidden: stamp ? stamp.hidden : true,
      chestState: String(chest?.dataset.state || 'idle'),
      chestDisabled: chest ? chest.disabled : true,
      chestLabel: String(chest?.getAttribute('aria-label') || ''),
      imageSrc: String(image?.getAttribute('src') || '')
    };
  }

  function restore(card, source, value) {
    restoring = true;
    try {
      const completed = value.completed ? 'true' : 'false';
      if (card.dataset.rewardState !== value.state) card.dataset.rewardState = value.state;
      if (card.dataset.completed !== completed) card.dataset.completed = completed;
      const stamp = card.querySelector('.student-home-card__stamp');
      if (stamp && stamp.hidden !== value.stampHidden) stamp.hidden = value.stampHidden;
      const chest = card.querySelector('.student-reward-chest');
      const image = chest?.querySelector('img');
      if (chest) {
        if (chest.dataset.state !== value.chestState) chest.dataset.state = value.chestState;
        if (chest.disabled !== value.chestDisabled) chest.disabled = value.chestDisabled;
        if (value.chestLabel && chest.getAttribute('aria-label') !== value.chestLabel) {
          chest.setAttribute('aria-label', value.chestLabel);
        }
      }
      if (image && value.imageSrc && image.getAttribute('src') !== value.imageSrc) image.setAttribute('src', value.imageSrc);
      const status = statusNode(source);
      if (status && value.statusText && text(status.textContent) !== value.statusText) status.textContent = value.statusText;
    } finally {
      restoring = false;
    }
  }

  function stabilize() {
    if (restoring || !root.document) return;
    const currentContext = `${currentStudent()}|${todayKey()}`;
    if (currentContext !== contextKey) {
      contextKey = currentContext;
      snapshots.clear();
      contextSettling = true;
    }
    if (contextSettling) return;
    root.document.querySelectorAll('.student-home-card[data-reward-source]').forEach(card => {
      const source = String(card.dataset.rewardSource || '');
      if (!source) return;
      const key = `${currentContext}|${source}`;
      const previous = snapshots.get(key);
      const next = capture(card, source);
      if (previous && rank(next) < rank(previous)) {
        restore(card, source, previous);
        return;
      }
      if (previous && rank(next) === rank(previous) && previous.completed) {
        const generic = previous.state === 'pending'
          ? !/待领取/.test(next.statusText)
          : previous.state === 'claimed' && !/已通关|已领取/.test(next.statusText);
        if (generic) {
          restore(card, source, previous);
          return;
        }
      }
      if (next.completed) {
        const expected = next.state === 'pending' ? '已通关 · 待领取' : '今日已通关';
        const status = statusNode(source);
        if (status && text(status.textContent) !== expected) status.textContent = expected;
        next.statusText = expected;
      }
      snapshots.set(key, next);
    });
  }

  function directChild(node, className) {
    return Array.from(node?.children || []).find(child => child.classList?.contains(className)) || null;
  }

  function showLoading() {
    const dashboard = root.document.getElementById('studentDashboard');
    if (!dashboard || directChild(dashboard, 'runtime-home-loading-badge')) return;
    const badge = root.document.createElement('div');
    badge.className = 'runtime-home-loading-badge';
    badge.setAttribute('role', 'status');
    badge.textContent = '正在加载最新学习状态…';
    dashboard.appendChild(badge);
    dashboard.dataset.runtimeHomeLoading = 'true';
    dashboard.setAttribute('aria-busy', 'true');
  }

  function hideLoading() {
    const dashboard = root.document.getElementById('studentDashboard');
    directChild(dashboard, 'runtime-home-loading-badge')?.remove();
    if (dashboard) delete dashboard.dataset.runtimeHomeLoading;
    dashboard?.removeAttribute('aria-busy');
  }

  function wrapLoadHome() {
    const current = root.loadHome;
    if (typeof current !== 'function' || current.__runtimeHomeLoadingGuard || wrappedLoaders.has(current)) return;
    const wrapped = function runtimeHomeLoadingGuard(...args) {
      const callId = ++loadSequence;
      const settings = args[0] && typeof args[0] === 'object' ? args[0] : {};
      const background = settings.background === true;
      const loadingTimer = background ? 0 : root.setTimeout(() => {
        if (callId === loadSequence) showLoading();
      }, 160);
      const safetyTimer = root.setTimeout(() => {
        if (callId === loadSequence) hideLoading();
      }, 3500);
      let result;
      try {
        result = current.apply(this, args);
      } catch (error) {
        if (loadingTimer) root.clearTimeout(loadingTimer);
        root.clearTimeout(safetyTimer);
        if (callId === loadSequence) hideLoading();
        throw error;
      }
      Promise.resolve(result).catch(() => null).finally(() => {
        if (loadingTimer) root.clearTimeout(loadingTimer);
        root.clearTimeout(safetyTimer);
        if (callId === loadSequence) hideLoading();
        contextSettling = false;
        stabilize();
      });
      return result;
    };
    wrapped.__runtimeHomeLoadingGuard = true;
    wrappedLoaders.add(current);
    root.loadHome = wrapped;
    try { loadHome = wrapped; } catch (_) {}
  }

  function install() {
    if (installed || !root.document) return;
    installed = true;
    installStyles();
    hideLoading();
    const dashboard = root.document.getElementById('studentDashboard');
    if (dashboard && typeof root.MutationObserver === 'function') {
      const observer = new root.MutationObserver(stabilize);
      observer.observe(dashboard, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['data-reward-state', 'data-completed', 'data-state', 'hidden', 'disabled', 'src']
      });
    }
    stabilize();
    wrapLoadHome();
    if (root.document.readyState === 'loading') {
      root.document.addEventListener('DOMContentLoaded', wrapLoadHome, { once: true });
    }
    root.setTimeout(() => {
      if (!contextSettling) return;
      contextSettling = false;
      stabilize();
    }, 1500);
    let attempts = 0;
    const timer = root.setInterval(() => {
      attempts += 1;
      wrapLoadHome();
      stabilize();
      if (attempts >= 120) root.clearInterval(timer);
    }, 250);
  }

  return Object.freeze({ rank, install });
});
