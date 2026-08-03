(function runtimeHomeStabilityModule(root, factory) {
  const api = factory(root || {});
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) api.install();
})(typeof globalThis !== 'undefined' ? globalThis : this, function createRuntimeHomeStability(root) {
  'use strict';

  const STATUS_IDS = Object.freeze({
    adventure: 'vocabularyAdventureHomeStatus',
    vocabularyChallenge: 'vocabularyAdventureChallengeHomeSub',
    classroomPractice: 'studentClassroomPracticeStatus'
  });
  const snapshots = new Map();
  const wrappedLoaders = new WeakSet();
  let restoring = false;
  let contextKey = '';
  let contextSettling = false;
  let installed = false;

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
    if (value.state === 'claimed') return 3;
    if (value.state === 'pending') return 2;
    return value.completed ? 1 : 0;
  }

  function installStyles() {
    if (root.document.getElementById('runtimeHomeStabilityStyles')) return;
    const style = root.document.createElement('style');
    style.id = 'runtimeHomeStabilityStyles';
    style.textContent = `
      #studentDashboard{position:relative}
      #studentDashboard[data-runtime-home-loading="true"]::after{content:'';position:absolute;inset:0;z-index:35;border-radius:inherit;background:rgba(248,252,255,.88);backdrop-filter:blur(1.5px);pointer-events:auto}
      .runtime-home-loading-badge{position:absolute;z-index:40;top:8px;left:50%;transform:translateX(-50%);min-height:38px;padding:8px 15px;border-radius:999px;display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.96);box-shadow:0 8px 24px rgba(55,82,100,.18);color:#365f7b;font-size:14px;font-weight:900;pointer-events:none}
      .runtime-home-loading-badge::before{content:'';width:14px;height:14px;border:2px solid rgba(54,95,123,.22);border-top-color:#365f7b;border-radius:50%;animation:runtime-home-spin .75s linear infinite}
      .student-reward-chest[data-state="pending"]{animation:runtime-chest-glow 1.3s ease-in-out infinite;filter:drop-shadow(0 0 9px rgba(255,193,61,.78)) drop-shadow(0 0 18px rgba(255,218,112,.58))}
      @keyframes runtime-home-spin{to{transform:rotate(360deg)}}
      @keyframes runtime-chest-glow{0%,100%{transform:translateY(0) scale(1);filter:drop-shadow(0 0 7px rgba(255,193,61,.58)) drop-shadow(0 0 13px rgba(255,218,112,.38))}50%{transform:translateY(-3px) scale(1.045);filter:drop-shadow(0 0 13px rgba(255,177,24,.92)) drop-shadow(0 0 25px rgba(255,222,115,.82))}}
      @media(prefers-reduced-motion:reduce){.runtime-home-loading-badge::before,.student-reward-chest[data-state="pending"]{animation:none}}
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
      card.dataset.rewardState = value.state;
      card.dataset.completed = value.completed ? 'true' : 'false';
      const stamp = card.querySelector('.student-home-card__stamp');
      if (stamp) stamp.hidden = value.stampHidden;
      const chest = card.querySelector('.student-reward-chest');
      const image = chest?.querySelector('img');
      if (chest) {
        chest.dataset.state = value.chestState;
        chest.disabled = value.chestDisabled;
        if (value.chestLabel) chest.setAttribute('aria-label', value.chestLabel);
      }
      if (image && value.imageSrc) image.setAttribute('src', value.imageSrc);
      const status = statusNode(source);
      if (status && value.statusText) status.textContent = value.statusText;
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
    if (typeof current !== 'function' || current.__runtimeHomeCoordinator || wrappedLoaders.has(current)) return;
    let active = null;
    let rerun = false;
    let latestArgs = [];
    let latestThis = root;
    const wrapped = function runtimeHomeCoordinator(...args) {
      latestArgs = args;
      latestThis = this;
      rerun = true;
      if (active) return active;
      active = (async () => {
        while (rerun) {
          rerun = false;
          const userBefore = currentStudent();
          const timer = root.setTimeout(showLoading, 160);
          try {
            await current.apply(latestThis, latestArgs);
          } finally {
            root.clearTimeout(timer);
            hideLoading();
            const userAfter = currentStudent();
            if (userAfter !== userBefore || `${userAfter}|${todayKey()}` !== contextKey) {
              contextKey = `${userAfter}|${todayKey()}`;
              snapshots.clear();
            }
            contextSettling = false;
            stabilize();
          }
        }
      })().finally(() => {
        active = null;
        if (rerun) wrapped.apply(latestThis, latestArgs);
      });
      return active;
    };
    wrapped.__runtimeHomeCoordinator = true;
    wrappedLoaders.add(current);
    root.loadHome = wrapped;
  }

  function install() {
    if (installed || !root.document) return;
    installed = true;
    installStyles();
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
