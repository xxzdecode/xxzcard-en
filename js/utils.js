function getCurrentBatch() { return appData.batches.find(b => String(b.id) === String(currentBatchId)); }
async function getUserRec() {
  if (!currentBatchId) return {known:[],unknown:[]};
  currentUserRec = await loadUserBatch(currentBatchId);
  return currentUserRec;
}
async function saveUserRec() { if (!currentBatchId || !currentUserRec) return false; return await saveUserBatch(currentBatchId, currentUserRec); }
function isTeacher() { return currentUser === 'teacher'; }

// ══════════════════════════════════════
// VISIBLE BATCHES (permission filter)
// ══════════════════════════════════════
function visibleBatches() {
  if (isTeacher()) return appData.batches;
  return appData.batches.filter(b => (b.sharedWith || []).includes(currentUser));
}

const warnedInvalidBookPurposes = new Set();

function getBookPurpose(batch) {
  const purpose = batch && batch.bookPurpose;
  if (purpose === 'support' || purpose === 'common') return purpose;
  if (typeof purpose === 'undefined') {
    return String(batch && batch.name || '').includes('暑假') ? 'support' : 'common';
  }

  const warningKey = `${batch && batch.id || 'unknown'}:${String(purpose)}`;
  if (!warnedInvalidBookPurposes.has(warningKey)) {
    warnedInvalidBookPurposes.add(warningKey);
    console.warn('Unknown bookPurpose; treating batch as common:', batch && batch.id, purpose);
  }
  return 'common';
}

function filterBatchesByBookPurpose(batches, showCommon, showSupport) {
  return (batches || []).filter(batch => {
    const purpose = getBookPurpose(batch);
    return purpose === 'support' ? showSupport : showCommon;
  });
}

function getBookPurposeFilterState(commonFilterId, supportFilterId) {
  const commonFilter = document.getElementById(commonFilterId);
  const supportFilter = document.getElementById(supportFilterId);
  return {
    showCommon: commonFilter ? commonFilter.checked : true,
    showSupport: supportFilter ? supportFilter.checked : false
  };
}

// ══════════════════════════════════════
// SCREEN NAV
// ══════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0,0);
}

// ══════════════════════════════════════
