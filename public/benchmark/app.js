(() => {
 "use strict";
 const API="https://br-raspy-hat-b96bluqn-arescore.compute.c-7.eu-central-1.aws.neon.tech";
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const pretty=n=>Number(n||0).toLocaleString("en-US");
 let cohort=[],publicReports=[],active=null,challenge=null,isPublic=false;
 const names={contract:"工具契约",tool_guidance:"工具说明",annotations:"安全声明",payload_footprint:"发现响应体积"};
 function status(id,text,error=false){const el=$(id);el.textContent=text;el.classList.toggle("error",error);}
 const messageForError=msg=>({
   github_repository_not_supported_use_https_mcp_endpoint:"不接受 GitHub 仓库地址。请填写实际运行中的公网 HTTPS MCP Endpoint。",
   https_mcp_endpoint_required:"只能提交 HTTPS MCP Endpoint；本地 stdio 或 HTTP 地址不支持官方登记。",
   mcp_endpoint_unavailable_or_auth_required:"无法通过该 Endpoint 完成 MCP 初始化与工具发现，可能需要登录、网络不可达或协议不兼容；本次未创建评分。",
   invalid_request_schema:"请求格式不符合新版 Endpoint-only 接口：只接受 endpoint 参数。",
   rate_limit_exceeded:"匿名请求已达到限额，请稍后再试。"
 })[msg]||msg;
 async function call(path,data){
  const resp=await fetch(API+path,{method:data?"POST":"GET",mode:"cors",cache:"no-store",
   headers:data?{"Content-Type":"application/json"}:{},
   ...(data?{body:JSON.stringify(data)}:{})});
  let payload;
  try{payload=await resp.json();}catch{throw Error("接口未返回有效 JSON");}
  if(!resp.ok||payload.ok===false)throw Error(payload.error||"HTTP "+resp.status);
  return payload;
 }
 function cohortRender(){
  const q=$("cohortSearch").value.toLowerCase().trim(),bucket=$("cohortBucket").value;
  const filtered=cohort.filter(x=>(!bucket||x.sampling_bucket===bucket)&&
   (!q||[x.display_name,x.repository_key].join(" ").toLowerCase().includes(q)));
  $("cohortShown").textContent=filtered.length+" / "+cohort.length;
  $("cohortRows").innerHTML=filtered.length?filtered.map(x=>{
   const repo=/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(x.repository_key||"")?
    '<a class="origin-link" rel="noopener noreferrer" target="_blank" href="https://github.com/'+esc(x.repository_key)+'">GitHub ↗</a>':"—";
   return '<tr><td><span class="project-name">'+esc(x.display_name)+'</span><span class="repo-sub">'+esc(x.repository_key)+'</span></td>'+
    '<td class="research-number">'+Number(x.tool_count||0)+'</td><td>'+Math.round(Number(x.manifest_bytes||0)/1024*10)/10+' KiB</td>'+
    '<td><span class="cohort-stage">Manifest 初筛 · 仓库待验证</span></td><td>'+repo+'</td></tr>';
  }).join(""):'<tr><td colspan="5" class="empty">没有符合搜索条件的项目。</td></tr>';
 }
 function publicRender(){
  $("publicList").innerHTML=publicReports.length?publicReports.map(x=>
   '<article class="public-item"><h3>'+esc(x.display_name)+'</h3><p>'+ 'HTTPS MCP · '+esc(x.status||"等待证据")+
   '</p><div class="report-score"><b>'+ (x.score===null||x.score===undefined?"未评分":Number(x.score)+"/100")+
   '</b><span class="preflight-tag">静态预评估</span></div><p>已观察工具：'+esc(x.observed_tools??"未知")+
   '</p><a href="/benchmark/?report='+encodeURIComponent(x.id)+'">查看公开报告 ↗</a></article>'
  ).join(""):'<div class="bench-card"><p class="small-help">目前还没有 Creator 主动认领并公开的自评分报告。研究样本不自动等同于公开认证。</p></div>';
 }
 async function load(){
  status("liveStatus","同步 Neon 数据中");
  try{
   const v=await call("/v2/overview");
   cohort=Array.isArray(v.cohort_preview)?v.cohort_preview:[];
   publicReports=Array.isArray(v.recent)?v.recent:[];
   $("cohortCount").textContent=pretty(v.cohort_count);
   $("cohortTools").textContent=pretty(v.cohort_tools);
   $("publicReports").textContent=pretty(v.public_submissions);
   cohortRender();publicRender();status("liveStatus","Neon 实时数据");
   $("liveStatus").classList.remove("error");
  }catch(e){
   status("liveStatus","数据暂不可用",true);
   $("cohortRows").innerHTML='<tr><td colspan="5" class="empty">Neon 数据暂不可用，请稍后刷新。</td></tr>';
   $("publicList").textContent="公开报告暂时无法读取。";
  }
 }
 function showReport(r){
  active=r;challenge=null;
  $("reportPanel").hidden=false;
  $("claimPanel").hidden=false;
  $("ownerArea").hidden=false; // returning verified creators can paste owner token
  $("claimChallenge").hidden=true;
  $("reportTitle").textContent=r.existing?"该项目已在库中":"ARE 自助预评估";
  $("reportStage").textContent=r.existing?"已有记录":r.status==="preflight_scored"?"实测工具契约静态预检":"证据不足";
  $("scoreNumber").textContent=r.score===null||r.score===undefined?"—":String(r.score);
  $("scoreTag").textContent=r.score===null||r.score===undefined?"待提供工具定义":"静态预检 / 100";
  $("reportTrust").textContent=(r.provenance||"暂无可复核的工具定义")+" · 不表示真实运行成功或平台审核结果";
  const parts=r.score_components||{};
  $("scoreBreakdown").innerHTML=Object.keys(parts).map(k=>'<div class="component"><span>'+
   esc(names[k]||k)+'</span><strong>'+esc(parts[k])+' / '+({contract:35,tool_guidance:25,annotations:20,payload_footprint:20}[k]||20)+'</strong></div>').join("");
  $("reportFindings").innerHTML=(r.findings||[]).map(x=>
   '<article><b>'+esc(x.code||x.status)+'</b><p>'+esc(x.note||"")+'</p></article>').join("");
  if(r.existing)$("reportFindings").innerHTML='<p class="small-help">'+esc(r.note||"")+'</p>';
  $("targetId").textContent="报告目标 ID："+(r.target_id||"")+(r.run_id?" · 运行 ID："+r.run_id:"");
  $("claimBtn").disabled=false;
  $("claimBtn").onclick=()=>{$("claimPanel").scrollIntoView({behavior:"smooth"});};
  $("copyReportBtn").onclick=()=>navigator.clipboard?.writeText(
   "ARE Preflight · "+(r.target_id||"")+"\n"+JSON.stringify({
    score:r.score,components:r.score_components,findings:r.findings,evidence:r.evidence,
    maturity:"39 checks not independently verified"},null,2));
  $("reportPanel").scrollIntoView({behavior:"smooth",block:"start"});
 }
 async function submit(e){
  e.preventDefault();
  $("submitBtn").disabled=true;
  status("submitStatus","正在安全检索公开工具证据并保存版本记录…");
  try{
   const p=await call("/v2/submit",{endpoint:$("targetInput").value.trim()});
   showReport(p);
   status("submitStatus",p.existing?"此 Endpoint 已有报告，需验证域名控制权后复评。":"工具列表已通过真实 MCP 连接获取；静态预评估写入 Neon，但不是正式成熟度认证。");
  }catch(err){status("submitStatus","未完成："+messageForError(err.message),true);}
  finally{$("submitBtn").disabled=false;}
 }
 async function startClaim(){
  if(!active?.target_id)return status("claimStatus","请先提交项目。",true);
  status("claimStatus","正在创建域名控制权挑战…");
  try{
   const d=await call("/v2/claim/start",{target_id:active.target_id});
   challenge=d.challenge;
   $("challengeText").textContent=challenge;
   $("claimChallenge").hidden=false;
   status("claimStatus","请在 30 分钟内提交验证文件，再点击验证。");
  }catch(e){status("claimStatus",e.message,true);}
 }
 async function verifyClaim(){
  if(!challenge)return;
  status("claimStatus","正在核实 MCP 域名验证文件…");
  try{
   const d=await call("/v2/claim/verify",{target_id:active.target_id,challenge});
   $("ownerToken").value=d.owner_token;
   $("claimChallenge").hidden=true;
   status("claimStatus","控制权验证成功。请立即复制并安全保存 Owner Token（只显示一次）；可重新评估、查阅自己的历史或公开报告。");
  }catch(e){status("claimStatus","核实失败："+e.message,true);}
 }
 async function owned(path,payload){
  if(!active?.target_id)throw Error("请先提交项目");
  const token=$("ownerToken").value.trim();
  if(!token)throw Error("请输入 Owner Token");
  return call(path,{target_id:active.target_id,owner_token:token,...payload});
 }
 async function retest(){
  status("claimStatus","正在复评并保存历史…");
  try{
   const d=await owned("/v2/reassess",{});
   showReport(d);status("claimStatus","复评已保存为不可变历史，尚非正式成熟度认证。");
  }catch(e){status("claimStatus","复评失败："+e.message,true);}
 }
 async function publish(){
  status("claimStatus","正在更新公开状态…");
  try{
   const d=await owned("/v2/publish",{public:!isPublic});
   isPublic=d.is_public;
   $("publishBtn").textContent=isPublic?"撤回公开":"自愿公开当前报告";
   status("claimStatus",isPublic?"已自愿公开；可以复制 /benchmark/?report="+active.target_id:"已撤回公开。");
   await load();
  }catch(e){status("claimStatus",e.message,true);}
 }
 async function evidence(){
  status("claimStatus","正在保存提交证据…");
  try{
   const d=await owned("/v2/evidence",{evidence:[{
    check_id:$("evidenceId").value.trim().toUpperCase(),
    kind:$("evidenceType").value,
    url:$("evidenceUrl").value.trim(),note:$("evidenceNote").value.trim()}]});
   status("claimStatus","证据已留档："+d.event_id+"；仍需要独立复核才能计入成熟度验收。");
  }catch(e){status("claimStatus",e.message,true);}
 }
 async function history(){
  status("claimStatus","正在读取自己的提交与复评历史…");
  try {
   const data=await owned("/v2/history",{});
   isPublic=Boolean(data.target?.is_public);
   $("publishBtn").textContent=isPublic?"撤回公开":"自愿公开当前报告";
   const runs=Array.isArray(data.runs)?data.runs:[];
   const events=Array.isArray(data.events)?data.events:[];
   $("historyResults").innerHTML=
    '<h4>评估版本（'+runs.length+'）</h4>'+
    (runs.length?runs.map(r=>'<article><b>'+esc(r.created_at)+' · '+esc(r.status)+
       '</b><p>静态预检：'+(r.score===null?"证据不足":Number(r.score)+"/100")+
       ' · 工具：'+esc(r.observed_tools??"未知")+' · 来源：'+esc(r.source_provenance)+
       '</p><p>'+esc((r.findings||[]).map(f=>f.note).slice(0,3).join("；"))+'</p></article>').join(""):"<p>没有历史记录。</p>")+
    '<h4>提交事件（'+events.length+'）</h4>'+
    (events.length?events.map(e=>'<article><b>'+esc(e.created_at)+' · '+esc(e.event_type)+
      '</b><p>'+esc(JSON.stringify(e.details||{})).slice(0,900)+'</p></article>').join(""):"<p>暂无额外提交。</p>");
   status("claimStatus","已读取完整的本人提交和版本历史，所有证明尚以实际独立审核为准。");
  }catch(e){status("claimStatus","读取历史失败："+e.message,true);}
 }
 async function loadReport(id){
  try{
   const data=await call("/v2/report?id="+encodeURIComponent(id));
   const run=data.runs?.[0];
   if(!run)return;
   showReport({target_id:id,status:run.status,score:run.score,score_components:run.score_components,
    provenance:run.source_provenance,findings:run.findings,evidence:run.evidence,
    run_id:run.id,observed_tools:run.observed_tools});
   $("reportTitle").textContent="公开预评估："+data.target.display_name;
   $("claimBtn").disabled=true;
   $("claimPanel").hidden=true;
  }catch(e){status("submitStatus","该报告未公开或不存在："+e.message,true);}
 }
 $("submitForm").addEventListener("submit",submit);
 $("refreshBtn").addEventListener("click",load);
 $("copyPromptBtn").addEventListener("click",async()=>{
  const endpoint=$("targetInput").value.trim()||"https://YOUR-SERVICE.example/mcp";
  const prompt="请使用已连接的 ARE MCP（https://are.fde.fan/mcp）的 are_score_mcp 工具，对我的公网 HTTPS MCP Endpoint 进行自助预评估：\n"+endpoint+
   "\n请只传 endpoint 参数，明确区分预评分与正式 39 项成熟度验收，返回评分、证据和 run_id。若当前 Agent 无法连接 ARE MCP，请直接说明，不要自行假称官方注册成功。";
  try{await navigator.clipboard.writeText(prompt);status("submitStatus","中文提示词已复制；先确认 Agent 中已连接 ARE MCP。");}
  catch{status("submitStatus","无法自动复制，请通过本页直接提交 Endpoint 进行评分。",true);}
 });
 $("cohortSearch").addEventListener("input",cohortRender);
 $("cohortBucket").addEventListener("change",cohortRender);
 $("startClaimBtn").addEventListener("click",startClaim);
 $("verifyClaimBtn").addEventListener("click",verifyClaim);
 $("retestBtn").addEventListener("click",retest);
 $("publishBtn").addEventListener("click",publish);
 $("evidenceBtn").addEventListener("click",evidence);
 $("historyBtn").addEventListener("click",history);
 $("copyOwnerBtn").addEventListener("click",async()=>{
  const token=$("ownerToken").value.trim();
  if(!token)return status("claimStatus","尚无可复制的 Token，请先完成控制权验证。",true);
  try{await navigator.clipboard.writeText(token);status("claimStatus","Owner Token 已复制。请立即保存在自己的密码管理器中。");}
  catch{status("claimStatus","复制失败，请选中输入框内容手动复制。",true);}
 });
 load();
 const report=new URLSearchParams(location.search).get("report");
 if(report&&/^[0-9a-f-]{36}$/i.test(report))loadReport(report);
})();