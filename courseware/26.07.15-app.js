const state = questions.map(q => ({
  correct:false, tried:false,
  annotate:Array(q.chunks?.length||0).fill(null),
  selected:null, built:[], expand:[]
}));
let index = 0;
let activeTool = "S";

const $ = id => document.getElementById(id);
const stage = $("stage");
const modulePill = $("modulePill");
const progressPill = $("progressPill");
const controlNote = $("controlNote");
const checkBtn = $("checkBtn");
const nextBtn = $("nextBtn");
const prevBtn = $("prevBtn");
const resetBtn = $("resetBtn");

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}
function levelClass(level){ return level==="挑战" ? "challenge" : ""; }
function moduleIcon(type){
  return {annotate:"🔎",classify:"🚉",transform:"⚙️",expand:"🧱"}[type]||"🧩";
}
function renderJumpbar(){
  $("jumpbar").innerHTML = questions.map((q,i)=>{
    const st=state[i];
    const cls=["jump-btn",i===index?"current":"",st.correct?"done":"",st.tried&&!st.correct?"tried":""].filter(Boolean).join(" ");
    return `<button class="${cls}" data-i="${i}" aria-label="第${i+1}题">${i+1}</button>`;
  }).join("");
  document.querySelectorAll(".jump-btn").forEach(btn=>btn.onclick=()=>{index=Number(btn.dataset.i);render();});
  const cur=document.querySelector(".jump-btn.current"); if(cur) cur.scrollIntoView({behavior:"smooth",inline:"center",block:"nearest"});
}
function feedbackHtml(kind="idle",main="完成操作后点击“检查”。",detail="作答前不会显示结构颜色或答案提示。"){
  const icon=kind==="good"?"✓":kind==="bad"?"△":"💡";
  return `<div class="feedback ${kind==="idle"?"":kind}">
    <div class="feedback-icon">${icon}</div>
    <div><div class="feedback-main">${main}</div><div class="feedback-detail">${detail}</div></div>
  </div>`;
}
function render(){
  const q=questions[index], st=state[index];
  modulePill.textContent=q.module;
  progressPill.textContent=`${index+1} / ${questions.length}`;
  prevBtn.disabled=index===0;
  nextBtn.textContent=index===questions.length-1?"完成 →":"下一题 →";
  controlNote.textContent=st.correct?"本题已完成，可以继续下一题。":"完成操作后点击“检查”";
  checkBtn.disabled=st.correct;
  renderJumpbar();

  let body="";
  if(q.type==="annotate") body=renderAnnotate(q,st);
  if(q.type==="classify") body=renderClassify(q,st);
  if(q.type==="transform") body=renderTransform(q,st);
  if(q.type==="expand") body=renderExpand(q,st);

  const fb = st.feedback || feedbackHtml();
  stage.innerHTML=`<section class="slide">
    <div class="question-head">
      <div>
        <div class="question-kicker">${moduleIcon(q.type)} 第 ${index+1} 题 · ${q.module}</div>
        <h2 class="question-title">${escapeHtml(q.title)}</h2>
      </div>
      <div class="level-badge ${levelClass(q.level)}">${q.level}</div>
    </div>
    <div class="workarea">${body}</div>
    <div id="feedbackWrap">${fb}</div>
  </section>`;
  bindCurrent();
}
function renderAnnotate(q,st){
  const tools=[
    ["S","◯","圈主语"],["V","＿","划谓语"],["O","□","框宾语"],["X","╱","划掉补充"]
  ];
  return `<div class="scanner">
    <aside class="tool-panel">
      <div class="tool-title">选择标记工具</div>
      <div class="tool-grid">
        ${tools.map(([v,icon,label])=>`<button class="tool ${activeTool===v?"active":""}" data-tool="${v}">
          <span class="tool-mark">${icon}</span><span>${label}</span>
        </button>`).join("")}
      </div>
      <div class="tool-help">先选工具，再点句子中的词块。点错了可以直接换一种标记覆盖。</div>
    </aside>
    <div class="scan-board">
      <div class="scan-label">句子扫描区</div>
      <div class="sentence-line">
        ${q.chunks.map((c,i)=>`<button class="chunk ${st.annotate[i]?`role-${st.annotate[i]}`:""}" data-chunk="${i}">${escapeHtml(c[0])}</button>`).join("")}
      </div>
      <div class="legend-row">
        <span class="legend-chip">主语：谁 / 什么</span>
        <span class="legend-chip">谓语：做什么 / 是什么</span>
        <span class="legend-chip">宾语：动作指向谁 / 什么</span>
        <span class="legend-chip">补充：时间、地点、方式等</span>
      </div>
    </div>
  </div>`;
}
function renderClassify(q,st){
  const gates=[
    ["be","🔷","be 动词句","am / is / are"],
    ["verb","🏃","实义动词句","动作词作谓语"],
    ["can","🪄","can 句","can + 动词原形"]
  ];
  return `<div class="station ${st.correct?"result-good":""}">
    <div class="sentence-car"><div class="sentence-text">${escapeHtml(q.sentence)}</div></div>
    <div class="gates">
      ${gates.map(([v,icon,name,rule])=>`<button class="gate ${st.selected===v?"selected":""}" data-gate="${v}">
        <div class="gate-icon">${icon}</div><div class="gate-name">${name}</div><div class="gate-rule">${rule}</div>
      </button>`).join("")}
    </div>
  </div>`;
}
function renderTransform(q,st){
  const output=st.built.length?st.built.map(x=>`<span class="answer-token">${escapeHtml(x)}</span>`).join(""):`<span class="answer-placeholder">点击下方零件，按顺序组装新句子</span>`;
  return `<div class="factory">
    <div class="factory-top">
      <div class="input-card">${escapeHtml(q.source)}</div>
      <div class="machine">⚙️</div>
      <div class="output-card"><div class="answer-belt">${output}</div></div>
    </div>
    <div class="factory-bottom">
      <div class="word-bank">
        ${q.bank.map((x,i)=>`<button class="tile" data-tile="${i}" ${st.used?.includes(i)?"disabled":""}>${escapeHtml(x)}</button>`).join("")}
      </div>
      <aside class="factory-tools">
        <div class="target-card">变身目标<br><b>${escapeHtml(q.target)}</b></div>
        <button class="btn secondary" data-action="undo">撤回一个</button>
        <button class="btn ghost" data-action="clear">清空传送带</button>
      </aside>
    </div>
  </div>`;
}
function buildExpanded(q,selected){
  const valid=selected.map(i=>q.details[i]).sort((a,b)=>a.pos-b.pos);
  const before=valid.filter(x=>x.pos<3).map(x=>x.text);
  const after=valid.filter(x=>x.pos>=3).map(x=>x.text);
  const parts=[q.subject,...before,q.verb,...after];
  return parts.join(" ") + ".";
}
function renderExpand(q,st){
  const sentence=buildExpanded(q,st.expand);
  return `<div class="expand-lab">
    <div class="expand-main">
      <div class="base-sentence">原句：${escapeHtml(q.subject+" "+q.verb+".")}</div>
      <div class="detail-bank">
        ${q.details.map((d,i)=>`<button class="detail ${st.expand.includes(i)?"selected":""}" data-detail="${i}">${escapeHtml(d.text)}</button>`).join("")}
      </div>
    </div>
    <aside class="preview-panel">
      <div class="preview-title">扩句预览</div>
      <div class="preview-sentence">${escapeHtml(sentence)}</div>
      <div class="preview-count">已加入 ${st.expand.length} 个细节｜至少 ${q.min} 个</div>
    </aside>
  </div>`;
}
function bindCurrent(){
  const q=questions[index],st=state[index];
  if(st.correct){
    document.querySelectorAll('.tool,.chunk,.gate,.tile,.detail,[data-action]').forEach(el=>{
      el.disabled=true;
      el.style.cursor='default';
    });
    return;
  }
  if(q.type==="annotate"){
    document.querySelectorAll("[data-tool]").forEach(b=>b.onclick=()=>{activeTool=b.dataset.tool;render();});
    document.querySelectorAll("[data-chunk]").forEach(b=>b.onclick=()=>{
      st.annotate[Number(b.dataset.chunk)]=activeTool; st.tried=true; render();
    });
  }
  if(q.type==="classify"){
    document.querySelectorAll("[data-gate]").forEach(b=>b.onclick=()=>{st.selected=b.dataset.gate;st.tried=true;render();});
  }
  if(q.type==="transform"){
    if(!st.used) st.used=[];
    document.querySelectorAll("[data-tile]").forEach(b=>b.onclick=()=>{
      const i=Number(b.dataset.tile); if(st.used.includes(i)) return;
      st.used.push(i);st.built.push(q.bank[i]);st.tried=true;render();
    });
    const undo=document.querySelector('[data-action="undo"]');
    const clear=document.querySelector('[data-action="clear"]');
    if(undo) undo.onclick=()=>{if(st.built.length){st.built.pop();st.used.pop();render();}};
    if(clear) clear.onclick=()=>{st.built=[];st.used=[];render();};
  }
  if(q.type==="expand"){
    document.querySelectorAll("[data-detail]").forEach(b=>b.onclick=()=>{
      const i=Number(b.dataset.detail),pos=st.expand.indexOf(i);
      if(pos>=0) st.expand.splice(pos,1); else st.expand.push(i);
      st.tried=true;render();
    });
  }
}
function setFeedback(kind,main,detail){
  const st=state[index];
  st.feedback=feedbackHtml(kind,escapeHtml(main),escapeHtml(detail));
  render();
}
function checkCurrent(){
  const q=questions[index],st=state[index];
  st.tried=true;
  if(q.type==="annotate"){
    if(st.annotate.some(x=>!x)){setFeedback("bad","还有词块没有标记。","把每个词块都圈、划、框或划掉后再检查。");return;}
    const wrong=[];
    q.chunks.forEach((c,i)=>{if(st.annotate[i]!==c[1]) wrong.push(c[0]);});
    if(wrong.length){setFeedback("bad",`还有 ${wrong.length} 处需要调整。`,`先重新观察：${wrong[0]} 在句子中承担什么作用？`);return;}
    st.correct=true;st.feedback=feedbackHtml("good","扫描完成，句子骨架找对了！",q.explain);render();return;
  }
  if(q.type==="classify"){
    if(!st.selected){setFeedback("bad","还没有选择句型站。","先观察句子中的谓语，再选择 be 动词句、实义动词句或 can 句。");return;}
    if(st.selected!==q.answer){setFeedback("bad","这列车进错站了。","先找谓语：句中是 am/is/are、动作词，还是 can + 动词原形？");return;}
    st.correct=true;st.feedback=feedbackHtml("good","分流正确！",q.explain);render();return;
  }
  if(q.type==="transform"){
    if(!st.built.length){setFeedback("bad","传送带还是空的。","点击下方零件，按正确顺序组装新句子。");return;}
    const same=st.built.length===q.answer.length&&st.built.every((x,i)=>x===q.answer[i]);
    if(!same){
      const hasDoes=q.answer.includes("Does")||q.answer.includes("does not");
      const tip=hasDoes?"出现 does / does not 后，后面的实义动词要用原形。":q.answer.includes("Can")||q.answer.includes("cannot")?"can 直接变位置或加 not，后面的动词保持原形。":"be 动词句直接移动 be 动词或在后面加 not。";
      setFeedback("bad","机器还没有完成正确变身。",tip);return;
    }
    st.correct=true;
    const rule=q.answer.includes("Does")||q.answer.includes("does not")
      ?"does 负责变化，原来的三单动词还原。"
      :q.answer.includes("Can")||q.answer.includes("cannot")
      ?"can 自己完成否定或疑问，后面保持动词原形。"
      :"be 动词直接加 not 或移动到主语前。";
    st.feedback=feedbackHtml("good","变身成功！",rule);render();return;
  }
  if(q.type==="expand"){
    if(st.expand.length<q.min){setFeedback("bad",`还需要再加入 ${q.min-st.expand.length} 个细节。`,"可以补充做什么、怎样、在哪里、和谁或什么时候。");return;}
    const bad=st.expand.map(i=>q.details[i]).find(d=>!d.ok);
    if(bad){setFeedback("bad",`${bad.text} 不适合放进这个句子。`,bad.reason);return;}
    st.correct=true;st.feedback=feedbackHtml("good","扩句完成，信息更具体了！",q.explain);render();return;
  }
}
function resetCurrent(){
  const q=questions[index];
  state[index]={
    correct:false,tried:false,
    annotate:Array(q.chunks?.length||0).fill(null),
    selected:null,built:[],used:[],expand:[]
  };
  render();
}
function showFinish(){
  const done=state.filter(s=>s.correct).length;
  const groups=[
    ["句子扫描",state.slice(0,4).filter(s=>s.correct).length,4],
    ["句型分流",state.slice(4,7).filter(s=>s.correct).length,3],
    ["魔法变身",state.slice(7,15).filter(s=>s.correct).length,8],
    ["扩句工坊",state.slice(15,18).filter(s=>s.correct).length,3]
  ];
  stage.innerHTML=`<div class="workarea" style="height:100%">
    <div class="finish">
      <div class="finish-icon">${done===questions.length?"🎉":"📌"}</div>
      <h2>${done===questions.length?"全部完成！":"练习小结"}</h2>
      <p>已完成 ${done} / ${questions.length} 题。可以点击题号回到未完成的题目继续练习。</p>
      <div class="summary-grid">
        ${groups.map(g=>`<div class="summary-box"><b>${g[1]}/${g[2]}</b><span>${g[0]}</span></div>`).join("")}
      </div>
    </div>
  </div>`;
  modulePill.textContent="练习小结";
  progressPill.textContent=`${done} / ${questions.length}`;
}
prevBtn.onclick=()=>{if(index>0){index--;render();}};
nextBtn.onclick=()=>{
  if(index<questions.length-1){index++;render();}
  else showFinish();
};
resetBtn.onclick=resetCurrent;
checkBtn.onclick=checkCurrent;

render();
