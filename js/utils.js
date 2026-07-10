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

// ══════════════════════════════════════
// SCREEN NAV
// ══════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0,0);
}

// ══════════════════════════════════════
