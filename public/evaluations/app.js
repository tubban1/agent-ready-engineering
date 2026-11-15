(() => {
  'use strict';
  // Read-only public API on Neon Functions; no database credentials in the browser.
  const API = 'https://br-raspy-hat-b96bluqn-areeval.compute.c-7.eu-central-1.aws.neon.tech/v1/portfolio';
  const dims = [['V','价值定义'],['C','执行契约'],['S','状态与恢复'],['A','权限与信任'],['X','上下文经济'],['I','接入与协议'],['O','观测与验收'],['R','运行与回顾']];
  let items = [], batches = [], source = 'loading';
  const $ = id => document.getElementById(id);
  const esc = val => String(val ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateStr = iso => iso ? new Date(iso).toLocaleString('zh-CN',{timeZone:'Europe/Zurich',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '—';
  const labels = {source_review:'源码核查',preliminary:'自动预评估',verified:'独立验证',error:'评估失败'};
  const map = (x) => ({
    ...x, strengths:Array.isArray(x.strengths)?x.strengths:[],
    findings:Array.isArray(x.findings)?x.findings:[],
    evidence:Array.isArray(x.evidence)?x.evidence:[],
    dimensions:x.dimensions && typeof x.dimensions==='object'?x.dimensions:{}
  });
  function firstText(x){return typeof x==='string'?x : (x?.text||x?.finding||x?.summary||x?.issue||'');}
  function tableRow(x,i){
    const has = dims.map(([d])=>x.dimensions[d]&&x.dimensions[d]!=='unknown'?d:null).filter(Boolean);
    const top = x.findings.length?firstText(x.findings[0]):x.summary;
    return '<tr><td><span class="project-name">'+esc(x.display_name)+'</span><span class="repo-sub">'+esc(x.project_key)+'</span></td>'+
      '<td><span class="category">'+esc(x.category)+'</span></td><td><span class="stage '+esc(x.status)+'">'+esc(labels[x.status]||'待审阅')+'</span></td>'+
      '<td><div class="dim-pills">'+dims.map(([d])=>'<span class="'+(has.includes(d)?'has':'')+'">'+d+'</span>').join('')+'</div></td>'+
      '<td><span class="finding">'+esc(top).slice(0,160)+'</span></td><td class="date">'+esc(dateStr(x.checked_at))+'</td><td><button type="button" class="viewbtn" data-index="'+i+'">详情 ↗</button></td></tr>';
  }
  function render(){
    const text=$('searchInput').value.toLowerCase().trim(),stage=$('statusFilter').value,cat=$('categoryFilter').value;
    const visible=items.filter(x=>(!stage||x.status===stage)&&(!cat||x.category===cat)&&(!text||[x.display_name,x.project_key,x.category,x.summary,...x.findings.map(firstText)].join(' ').toLowerCase().includes(text)));
    const body=$('assessmentRows');
    body.innerHTML=visible.length?visible.map(x=>tableRow(x,items.indexOf(x))).join(''):'<tr><td colspan="7" class="empty">当前筛选没有匹配记录。</td></tr>';
    $('shownCount').textContent=visible.length+' / '+items.length;
    body.querySelectorAll('[data-index]').forEach(btn=>btn.addEventListener('click',()=>openDetail(items[Number(btn.dataset.index)])));
  }
  function openDetail(x){
    $('detailName').textContent=x.display_name;
    const src=x.repo_url && /^https:\/\//.test(x.repo_url)?'<a target="_blank" rel="noopener noreferrer" class="evidence-link" href="'+esc(x.repo_url)+'">'+esc(x.repo_url)+'</a>':'';
    const bullet = a=>'<ul class="detail-list">'+a.map(v=>'<li>'+esc(firstText(v))+'</li>').join('')+'</ul>';
    const evid=x.evidence.map(o=>{
      const url=typeof o==='string'?o:(o.url||o.path||'');
      const title=typeof o==='string'?o:(o.label||o.type||url);
      return /^https:\/\//.test(url)?'<a class="evidence-link" rel="noopener noreferrer" target="_blank" href="'+esc(url)+'">'+esc(title)+' ↗</a>':'<div class="evidence-link">'+esc(title)+'</div>';
    }).join('');
    $('detailContent').innerHTML='<div class="detail-meta">'+esc(labels[x.status]||x.status)+' · '+esc(x.source_ref||'版本未核实')+' · '+esc(dateStr(x.checked_at))+'</div>'+
      '<div class="banner">本页展示证据驱动的研究记录。未完成 ARE 39 项独立验收前，不授予 L0–L4 正式等级。</div>'+
      '<p class="detail-summary">'+esc(x.summary)+'</p>'+src+
      '<div class="detail-section"><h3>ARE 八维观察</h3><div class="dimensions">'+dims.map(([d,name])=>'<div class="dimension"><strong>'+d+'</strong><span>'+esc(typeof x.dimensions[d]==='string'?x.dimensions[d]:name+(x.dimensions[d]?' · evidence':' · 待验证'))+'</span></div>').join('')+'</div></div>'+
      '<div class="detail-section"><h3>已发现优势</h3>'+bullet(x.strengths)+'</div>'+
      '<div class="detail-section"><h3>待验证问题 / 风险</h3>'+bullet(x.findings)+'</div>'+
      '<div class="detail-section"><h3>引用证据</h3>'+(evid||'<p class="detail-summary">缺少可访问的独立证据</p>')+'</div>';
    $('detailDialog').showModal();
  }
  function renderBatches(){
    const total=batches.reduce((n,x)=>n+Number(x.analyzed_count||0),0);
    $('batchDone').textContent=total;
    $('batchProgress').firstElementChild.style.width=Math.min(100,total/240*100)+'%';
    $('batchHint').textContent='已完成 '+total+' / 240 · 共 '+batches.filter(x=>x.status==='completed').length+' / 8 个批次完成 · 实际完成数可能低于目标';
    $('batchGrid').innerHTML=batches.map(x=>{
      const t=new Date(x.slot_at).toLocaleTimeString('en-GB',{timeZone:'Europe/Zurich',hour:'2-digit',minute:'2-digit'});
      return '<article class="batch"><div><b>'+esc(t)+'</b><span class="state '+esc(x.status)+'">'+esc({scheduled:'待执行',running:'执行中',completed:'已完成',partial:'部分完成',failed:'失败'}[x.status]||x.status)+'</span></div><p class="meta">NOV 15 · Europe/Zurich</p><div class="num">'+Number(x.analyzed_count||0)+' <span>/ 30</span></div></article>';
    }).join('');
  }
  async function load(){
    $('liveIndicator').textContent='读取中';
    try {
      if(API.includes('__ARE_NEON')) throw new Error('Neon API not configured');
      const response=await fetch(API+'?view=portfolio',{cache:'no-store',mode:'cors'});
      if(!response.ok)throw Error('HTTP '+response.status);
      const data=await response.json();
      if(!Array.isArray(data.assessments)||!Array.isArray(data.batches))throw Error('Invalid response');
      items=data.assessments.map(map);batches=data.batches;source='neon';
      $('liveIndicator').textContent='Neon 实时数据';
      $('liveIndicator').classList.remove('error');
    } catch(err) {
      const response=await fetch('/evaluations/seed.json',{cache:'no-store'});
      const data=await response.json();items=data.assessments.map(map);batches=data.batches;source='snapshot';
      $('liveIndicator').textContent='离线快照 · 数据连接待验证';
      $('liveIndicator').classList.add('error');
      console.warn('ARE live API unavailable; showing correctly labeled snapshot',err);
    }
    $('totalCount').textContent=items.length;
    $('sourceCount').textContent=items.filter(x=>x.status==='source_review').length;
    $('todayCount').textContent=items.filter(x=>{const d=new Date(x.checked_at);return d.toLocaleDateString('en-CA',{timeZone:'Europe/Zurich'})==='2026-11-15';}).length;
    $('verifiedCount').textContent=items.filter(x=>x.status==='verified').length;
    $('categoryFilter').innerHTML='<option value="">全部类别</option>'+[...new Set(items.map(x=>x.category))].sort().map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('');
    render();renderBatches();
  }
  $('dimensionLegend').innerHTML=dims.map(([k,v])=>'<div class="dimension"><strong>'+k+'</strong><span>'+v+'</span></div>').join('');
  $('searchInput').addEventListener('input',render);
  $('statusFilter').addEventListener('change',render);
  $('categoryFilter').addEventListener('change',render);
  $('refreshBtn').addEventListener('click',load);
  $('closeDetail').addEventListener('click',()=>$('detailDialog').close());
  load();
})();
