(function installStudentActivityControlsCompactUI(root) {
  if (!root || typeof document === 'undefined' || document.getElementById('studentActivityControlsCompactUI')) return;
  const style = document.createElement('style');
  style.id = 'studentActivityControlsCompactUI';
  style.textContent = `
    .teacher-activity-panel{width:min(440px,calc(100% - 24px));margin:14px auto 24px;padding:13px 15px 14px;border:1px solid #eadde6;border-radius:16px;background:rgba(255,255,255,.97);box-shadow:0 7px 18px rgba(80,55,75,.08)}
    .teacher-activity-panel__top{display:grid;grid-template-columns:1fr;gap:10px;align-items:center}
    .teacher-activity-panel__summary{text-align:center}.teacher-activity-panel__summary h2{margin:0;color:#55425f;font-size:18px;line-height:1.2}.teacher-activity-panel__summary p{display:flex;align-items:center;justify-content:center;min-height:32px;margin:8px 0 0;padding:6px 12px;border-radius:999px;background:#faf8fb;color:#625866;font-size:12px;font-weight:800;line-height:1.2}
    .teacher-activity-selectors{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.teacher-activity-selectors label{display:grid;gap:4px;min-width:0;font-size:11px;font-weight:700;color:#776b74}.teacher-activity-selectors select{width:100%;height:39px;border:1px solid #dfd1da;border-radius:9px;padding:5px 9px;background:#fff;color:#514850;font:inherit;font-size:13px}
    .teacher-activity-actions{display:grid;grid-template-columns:42px minmax(0,1fr);gap:8px 10px;align-items:center;margin-top:11px;padding-top:11px;border-top:1px solid #f0e7ec}
    .teacher-activity-actions__label{font-size:12px;font-weight:850;color:#61545e;white-space:nowrap}.teacher-activity-actions__buttons{display:flex;min-width:0;flex-wrap:wrap;gap:7px}
    .teacher-activity-actions button{flex:1 1 0;min-width:0;height:38px;border:0;border-radius:9px;padding:5px 7px;font-size:12px;font-weight:850;white-space:nowrap;cursor:pointer;background:#eef4f2;color:#31584d}.teacher-activity-actions button[data-tone="subtract"]{background:#f8dfe5;color:#7c3d50}.teacher-activity-actions button[data-tone="large"]{background:#fff1bd;color:#75520d}.teacher-activity-actions button[data-tone="custom"]{flex:1.35 1 0;background:#ebe2f2;color:#654476}
    .teacher-activity-actions button:disabled{cursor:wait;opacity:.55}.teacher-activity-custom{display:flex;flex:1 0 100%;justify-content:flex-end;gap:6px;align-items:center;margin-top:1px}.teacher-activity-custom[hidden]{display:none}.teacher-activity-custom input{width:116px;height:36px;border:1px solid #dfd1da;border-radius:9px;padding:5px 8px;font:inherit;font-size:12px}.teacher-activity-custom button{flex:0 0 58px;height:36px}.teacher-activity-status{margin-top:7px;text-align:center;font-size:11px;font-weight:700;color:#b65360}.teacher-activity-status:empty{display:none}
    @media(max-width:480px){.teacher-activity-panel{width:calc(100% - 16px);padding:12px}.teacher-activity-selectors{gap:7px}.teacher-activity-actions{grid-template-columns:36px minmax(0,1fr);gap:7px}.teacher-activity-actions__buttons{flex-wrap:wrap;gap:6px}.teacher-activity-actions button{flex:1 1 calc(50% - 3px)}.teacher-activity-actions button[data-tone="custom"]{flex-basis:calc(50% - 3px)}}
  `;
  document.head.appendChild(style);
})(typeof globalThis !== 'undefined' ? globalThis : window);
