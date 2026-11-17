(() => {
  "use strict";
  const PORTFOLIO_API="https://br-raspy-hat-b96bluqn-areeval.compute.c-7.eu-central-1.aws.neon.tech/v1/portfolio";
  const SCORE_API="https://br-raspy-hat-b96bluqn-arescore.compute.c-7.eu-central-1.aws.neon.tech";
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const params=new URLSearchParams(location.search);
  let locale=params.get("lang")==="zh-CN"?"zh-CN":"en";
  let rows=[],creatorReports=[],cohort=[],active=null,challenge=null,isPublic=false,portfolioState="connecting";
  const en={};
  document.querySelectorAll("[data-i18n]").forEach(node=>{en[node.dataset.i18n]=node.textContent;});
  const t=(enText,zhText)=>locale==="zh-CN"?(zhText??enText):enText;
  const labels={
    contract:["Contract","工具契约"],tool_guidance:["Guidance","工具说明"],
    annotations:["Annotations","工具注解"],payload_footprint:["Manifest size","工具列表大小"]
  };
  const statusLabels={
    published_case:["Published independent case","已发布独立案例"],
    directory_only:["Public directory metadata","公开目录元数据"],
    preliminary:["Preliminary","初步研究"],source_review:["Source review","源码复核"]
  };
  const errors={
    github_repository_not_supported_use_https_mcp_endpoint:["Enter a running HTTPS MCP endpoint, not a GitHub repository.","请填写正在运行的 HTTPS MCP Endpoint，而非 GitHub 仓库。"],
    https_mcp_endpoint_required:["An HTTPS MCP endpoint is required.","请提供 HTTPS MCP Endpoint。"],
    mcp_endpoint_unavailable_or_auth_required:["The service could not be discovered anonymously. Check availability, OAuth and MCP transport.","无法匿名发现工具；请检查服务、OAuth 和 MCP 传输方式。"],
    invalid_request_schema:["Unsupported request format.","请求参数格式不支持。"],
    rate_limit_exceeded:["Anonymous quota reached. Try again later.","匿名请求超出限额，请稍后重试。"],
    owner_proof_required:["Valid owner token is required.","需要有效的所有者 Token。"]
  };
  const message=(id,enText,zhText,isError=false)=>{
    const node=$(id);node.textContent=t(enText,zhText);node.classList.toggle("error",isError);
  };
  const msgForError=s=>errors[s]?t(...errors[s]):String(s||t("Request failed","请求失败")).slice(0,120);
  function renderLiveStatus(){
    if(portfolioState==="ready")message("liveStatus","Live public records","公开记录 · 实时");
    else if(portfolioState==="error")message("liveStatus","Public directory unavailable","公开目录暂不可用",true);
    else message("liveStatus","Connecting","正在连接");
  }
  const formatDate=iso=>{
    const d=new Date(iso);
    return Number.isFinite(d.getTime())?new Intl.DateTimeFormat(locale,{timeZone:"Europe/Zurich",year:"numeric",month:"short",day:"numeric"}).format(d):"—";
  };
  const swissDay=iso=>{
    const d=new Date(iso);
    return Number.isFinite(d.getTime())?new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Zurich",year:"numeric",month:"2-digit",day:"2-digit"}).format(d):null;
  };
  function setLanguage(next){
    locale=next==="zh-CN"?"zh-CN":"en";
    document.documentElement.lang=locale;
    document.title=t("ARE Evaluations — Evidence-first MCP Reviews","ARE 评估 · 证据驱动的 MCP 审查");
    document.querySelectorAll("[data-i18n]").forEach(node=>{
      const key=node.dataset.i18n;
      node.textContent=locale==="en"?en[key]:(window.ARE_ZH?.[key]??en[key]);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(node=>{
      if(!node.dataset.placeholderEn)node.dataset.placeholderEn=node.placeholder;
      node.placeholder=locale==="en"?node.dataset.placeholderEn:(window.ARE_ZH?.[node.dataset.i18nPlaceholder]??node.dataset.placeholderEn);
    });
    $("enButton").setAttribute("aria-pressed",String(locale==="en"));
    $("zhButton").setAttribute("aria-pressed",String(locale==="zh-CN"));
    const u=new URL(location.href);
    if(locale==="zh-CN")u.searchParams.set("lang","zh-CN");else u.searchParams.delete("lang");
    history.replaceState(null,"",u.pathname+u.search+u.hash);
    renderRows();renderCreators();renderMetrics();renderCohort();renderLiveStatus();
    if(active)renderReport(active,false);
    $("publishBtn").textContent=isPublic?t("Withdraw publication","撤回公开"):t("Publish voluntarily","自愿公开");
    $("historyResults").textContent="";
  }
  async function getJSON(url,body){
    const resp=await fetch(url,{method:body?"POST":"GET",mode:"cors",cache:"no-store",
      headers:body?{"Content-Type":"application/json"}:{},...(body?{body:JSON.stringify(body)}:{})});
    let data;
    try{data=await resp.json();}catch{throw Error("invalid_json_response");}
    if(!resp.ok||data?.ok===false)throw Error(data.error||"HTTP "+resp.status);
    return data;
  }
  function recordIsPublic(x){
    // Also filter on the client to prevent accidental display during a rolling API upgrade.
    return x?.source_kind==="github_public" && /^https:\/\/github\.com\/[^/]+\/[^/]+/i.test(x.repo_url||"");
  }
  function classification(x){
    return x.publication==="published_case"&&x.project_key==="mcp/solarstorm.today"?"published_case":"directory_only";
  }
  function renderMetrics(){
    $("totalCount").textContent=String(rows.length);
    $("sourceCount").textContent=String(rows.filter(x=>classification(x)==="published_case").length);
    const sorted=rows.map(x=>swissDay(x.checked_at)).filter(Boolean).sort();
    const day=sorted.at(-1)||null;
    $("latestDateLabel").textContent=day?day:"—";
    $("latestHint").textContent=day?t("Entries updated that date: ","该日期更新条目：")+sorted.filter(x=>x===day).length:
      t("No public dates available","暂无公开更新日期");
    $("verifiedCount").textContent="0";
  }
  function caseSummary(x){
    if(classification(x)!=="published_case")return t(
      "Public repository discovered. Tool behavior, authorization and 39-check maturity have not been independently established.",
      "仅发现公开仓库，尚未独立验证工具运行、授权或 39 项成熟度。");
    if(locale==="zh-CN")return x.summary||"";
    return "Solarstorm public read-only pilot: four tools exercised; one real Agent task checked against NOAA. The inspected source and live deployment versions were not proven identical. This is not certification.";
  }
  function renderRows(){
    const query=$("searchInput").value.toLowerCase().trim(),stage=$("statusFilter").value;
    const visible=rows.filter(x=>(!stage||classification(x)===stage)&&
      (!query||[x.display_name,x.project_key,x.category,caseSummary(x)].join(" ").toLowerCase().includes(query)));
    $("shownCount").textContent=visible.length+" / "+rows.length;
    $("assessmentRows").innerHTML=visible.length?visible.map(x=>{
      const key=rows.indexOf(x),stageKey=classification(x);
      return '<tr><td><strong>'+esc(x.display_name)+'</strong><small>'+esc(x.project_key)+'</small></td>'+
        '<td>'+esc(x.category)+'</td><td><span class="stage '+(stageKey==="published_case"?"case":"")+'">'+esc(t(...statusLabels[stageKey]))+'</span></td>'+
        '<td>'+esc(formatDate(x.checked_at))+'</td><td><button type="button" class="viewbtn" data-row="'+key+'">'+esc(t("View","查看"))+'</button></td></tr>';
    }).join(""):'<tr><td colspan="5">'+esc(t("No matching public entries","没有符合筛选条件的公开条目"))+'</td></tr>';
    $("assessmentRows").querySelectorAll("[data-row]").forEach(node=>node.addEventListener("click",()=>openDetail(rows[Number(node.dataset.row)])));
  }
  const solarEN={
    strengths:[
      "Nine bounded 2026 protocol probes passed. This is not full protocol certification.",
      "All four declared public read-only tools were exercised in safe normal paths.",
      "Offline source checks and NOAA-backed tests passed; one real Claude Agent task received an independent data comparison."
    ],
    findings:[
      "Public source v1.0.3 and live serverInfo v1.0.0 could not be linked to the same deployment.",
      "Invalid latitude 999 returned a textual error with isError=false; a missing latitude returned isError=true. Engineering consistency recommendation, not a proven MCP MUST violation.",
      "One 60-second Kp timeout was observed; subsequent calls succeeded in 683 ms and 252 ms. This is an isolated latency outlier.",
      "The 39 checks: 4 PASS, 2 design-level FAIL, 10 N/A and 23 NOT_VERIFIED. MATURITY_NOT_ESTABLISHED."
    ]
  };
  function renderBullets(arr){
    return arr.length?'<ul>'+arr.map(text=>'<li>'+esc(text)+'</li>').join("")+'</ul>':'<p>'+esc(t("No independently verified entries","暂无独立验证的内容"))+'</p>';
  }
  function openDetail(x){
    const stage=classification(x),casePublic=stage==="published_case";
    $("detailName").textContent=x.display_name;
    const source=x.repo_url?'<a href="'+esc(x.repo_url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.repo_url)+'</a>':"";
    let html='<p class="field-help">'+esc(t(...statusLabels[stage]))+' · '+esc(formatDate(x.checked_at))+'</p>'+
      '<div class="dialog-section"><h3>'+esc(t("Evidence level","证据级别"))+'</h3><p>'+esc(caseSummary(x))+'</p>'+source+'</div>';
    if(casePublic){
      const strengths=locale==="zh-CN"?(x.strengths||[]):solarEN.strengths;
      const findings=locale==="zh-CN"?(x.findings||[]):solarEN.findings;
      html+='<div class="dialog-section"><h3>'+esc(t("Verified observations","已观察到的能力"))+'</h3>'+renderBullets(strengths)+'</div>'+
        '<div class="dialog-section"><h3>'+esc(t("Open findings and top priorities","待确认问题与整改优先级"))+'</h3>'+renderBullets(findings)+'</div>';
      const evidence=(x.evidence||[]).filter(e=>/^https:\/\//.test(typeof e==="string"?e:e?.url||""));
      html+='<div class="dialog-section"><h3>'+esc(t("Published sources","公开证据"))+'</h3><ul>'+
        evidence.map(e=>{const url=typeof e==="string"?e:e.url;
          const name=typeof e==="string"?e:(e.label||url);
          return '<li><a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(name)+'</a></li>';
        }).join("")+'</ul></div>';
      html+='<p class="field-help">'+esc(t("English summary is editorially curated from the public case. Follow the linked original evidence for exact technical facts.","英文说明根据公开案例整理；精确技术数据请参阅原始公开证据。"))+'</p>';
    }else{
      html+='<div class="dialog-section"><p>'+esc(t("This is metadata discovery only, not a claim about a service implementation or safety.","这仅是公开元数据发现，不构成对服务实现或安全性的评判。"))+'</p></div>';
    }
    $("detailContent").innerHTML=html;
    $("detailDialog").showModal();
  }
  async function loadPortfolio(){
    try{
      const data=await getJSON(PORTFOLIO_API);
      if(!Array.isArray(data.assessments))throw Error("invalid_response");
      rows=data.assessments.filter(recordIsPublic);
      portfolioState="ready";
      // Never use internal seed snapshots as a fallback in a public experience.
      renderLiveStatus();
    }catch(e){
      rows=[];
      portfolioState="error";
      renderLiveStatus();
      console.warn("ARE public portfolio unavailable",String(e.message||"error").slice(0,90));
    }
    renderRows();renderMetrics();
  }
  async function loadMetadata(){
    try{
      const r=await getJSON("/are-metadata.json");
      $("frameworkVersion").textContent="v"+r.framework_version;
    }catch{$("frameworkVersion").textContent=t("unknown","未知");}
  }
  function renderCreators(){
    $("publicList").innerHTML=creatorReports.length?creatorReports.map(x=>{
      const id=esc(x.id),name=esc(x.display_name),count=esc(x.observed_tools??"?");
      return '<article class="panel"><h3>'+name+'</h3><p>'+esc(t("Creator-opted-in static report · observed tools: ","开发者自愿公开的静态报告 · 工具数："))+count+'</p>'+
        '<a class="minor-link" href="/evaluations/?report='+encodeURIComponent(id)+(locale==="zh-CN"?"&lang=zh-CN":"")+'">'+esc(t("View public preflight report","查看公开预检报告"))+'</a></article>';
    }).join(""):'<article class="panel"><p>'+esc(t("No creator has opted into a public report yet.","目前没有开发者选择公开自评报告。"))+'</p></article>';
  }
  function renderCohort(){
    $("cohortTable").innerHTML=cohort.length?'<table><thead><tr><th>'+esc(t("Observed entry","观察到的项目"))+'</th><th>'+esc(t("Tool count","工具数"))+'</th><th>'+esc(t("Source","来源"))+'</th></tr></thead><tbody>'+
      cohort.map(x=>{
        const repository=String(x.repository_key||"");
        const link=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)?
          '<a target="_blank" rel="noopener noreferrer" href="https://github.com/'+esc(repository)+'">GitHub</a>':"—";
        return '<tr><td>'+esc(x.display_name)+'</td><td>'+esc(x.tool_count??"?")+'</td><td>'+link+'</td></tr>';
      }).join("")+'</tbody></table>':
      '<p>'+esc(t("No cohort metadata available","暂无研究样本元数据"))+'</p>';
  }
  async function loadCreators(){
    try{
      const data=await getJSON(SCORE_API+"/v2/overview");
      creatorReports=Array.isArray(data.recent)?data.recent:[];
      cohort=Array.isArray(data.cohort_preview)?data.cohort_preview:[];
    }catch{creatorReports=[];cohort=[];}
    renderCreators();renderCohort();
  }
  function renderReport(r,scroll=true){
    active=r;
    $("reportPanel").hidden=false;
    $("claimPanel").hidden=Boolean(r.publicView);
    const existing=Boolean(r.existing);
    $("reportTitle").textContent=r.publicView?t("Creator-published preflight report","开发者公开预检报告"):
      existing?t("Existing endpoint entry","已有 Endpoint 记录"):t("Preflight observations","静态预检观察");
    $("reportStage").textContent=existing?t("Previously submitted","已有提交"):t("Uncertified","非认证");
    $("reportTrust").textContent=t("Discovery only. Runtime effects, real permissions and business outcomes remain UNKNOWN.",
      "仅工具发现。真实副作用、权限与业务结果仍为 UNKNOWN。");
    const version=String(r.evaluator_version||"are-preflight-v2-endpoint-only");
    const historical=!version.includes("v3-risk-observations");
    $("reportMethod").textContent=t("Assessment method: ","评估方法：")+version+
      (historical?t(" · Historical v2 static method; not recalculated and not comparable to new observations.",
        " · 历史 v2 静态方法，未重新评分，不能与新版观察比较。"):
        t(" · v3 static observations and risk hints; no verified safety or maturity score.",
          " · v3 静态观察及风险提示；未提供可信的安全或成熟度总分。"));
    const parts=r.score_components||{};
    $("scoreBreakdown").innerHTML=Object.keys(parts).length?Object.entries(parts).map(([key,val])=>
      '<div class="component"><span>'+esc(t(...(labels[key]||[key,key])))+'</span><strong>'+
      esc(val)+' / '+({contract:35,tool_guidance:25,annotations:20,payload_footprint:20}[key]||20)+'</strong></div>').join(""):
      '<p>'+esc(t("No authenticated tool definitions available.","暂无已验证的工具定义。"))+'</p>';
    const findings=(r.findings||[]).slice(0,40);
    const fallback={code:"unknown_runtime",status:"unknown"};
    const textForFinding=(f)=>{
      const map={
        suspected_annotation_risk_conflict:["Suspected annotation conflict: read-only declaration versus a potentially high-impact action. Needs handler review; not confirmed malicious behavior.",
          "疑似注解冲突：只读声明与可能的高影响操作不一致。须检查实现，不能认定为已证实漏洞。"],
        broad_capability_review:["Potential arbitrary or broad execution; inspect command constraints, permissions and sandbox.",
          "可能存在宽泛执行能力；需核查参数限制、权限及沙箱。"],
        annotation_requires_review:["Ambiguous action verb: inspect real side effects before trusting the annotation.",
          "动作含义不明确，信任注解前须核实真实副作用。"],
        declared_high_impact:["High-impact behavior is declared transparently. Real permissions and safety remain untested.",
          "高影响行为已明确声明，但真实权限与安全仍未验证。"],
        annotation_conflict:["Directly contradictory readOnlyHint/destructiveHint declarations.",
          "readOnlyHint 与 destructiveHint 存在直接冲突。"],
        unknown_runtime:["Runtime behavior, security, recovery and Agent task success remain UNKNOWN.",
          "真实运行、安全、恢复和 Agent 任务结果均为 UNKNOWN。"],
        schema_review:["Schema quality requires closer review.","Schema 质量需要复核。"],
        annotations_review:["Annotations require review; missing hints are not proof of a flaw.","注解需要复核；缺失注解不表示已确认缺陷。"],
        description_review:["Description completeness is a heuristic, not a quality score.","描述完整度只是启发式线索，并非质量评分。"],
        context_hypothesis:["Manifest volume is a context-cost hypothesis pending host measurements.","工具清单体积提示上下文成本假设，仍需真实测量。"]
      };
      return t(...(map[f.code]||["Static observation pending verification.","静态观察，仍需复核。"]));
    };
    $("reportFindings").innerHTML=(findings.length?findings:[fallback]).map(f=>
      '<article><strong>'+esc((f.tool?f.tool+" · ":"")+(f.code||f.status||"UNKNOWN"))+'</strong><p>'+
      esc(textForFinding(f))+'</p></article>').join("");
    const ranked=(
      findings.filter(f=>["suspected_annotation_risk_conflict","annotation_conflict"].includes(f.code)).slice(0,1).map(f=>({
        title:t("Check a suspected declaration conflict","检查疑似声明冲突"),
        detail:textForFinding(f)}))
      .concat(findings.filter(f=>f.code==="broad_capability_review").slice(0,1).map(f=>({
        title:t("Bound broad execution","限制宽泛执行能力"),detail:textForFinding(f)})))
      .concat([
        {title:t("Verify runtime behavior","核实运行行为"),detail:t("Run an authorized, bounded task with independent outcome verification; never infer safe behavior from tools/list.","在获授权的边界内运行任务，用独立真值核对结果；不能从 tools/list 推断安全。")},
        {title:t("Inspect permissions & recovery","审查权限与恢复"),detail:t("Confirm tool side effects, cancellation and recovery against source and a pinned deployed version.","根据固定的源码和部署版本核对副作用、取消及恢复。")},
        {title:t("Review 39-check evidence","复核 39 项证据"),detail:t("Use local --workspace T07/T10 review. Unknowns are not PASS and a static preflight is not certification.","使用本地 --workspace 对 T07/T10 复核；UNKNOWN 不是 PASS，预检也不是认证。")}
      ])
    ).slice(0,3);
    $("topFixes").innerHTML=ranked.map((p,i)=>
      '<article><strong>'+(i+1)+'. '+esc(p.title)+'</strong><p>'+esc(p.detail)+'</p></article>').join("");
    $("targetId").textContent=t("Target: ","目标 ID：")+(r.target_id||"?")+(r.run_id?" · "+r.run_id:"");
    $("claimBtn").disabled=Boolean(r.publicView);
    if(scroll)$("reportPanel").scrollIntoView({behavior:"smooth",block:"start"});
  }
  async function submit(evt){
    evt.preventDefault();
    $("submitBtn").disabled=true;
    message("submitStatus","Reading live MCP tool declarations…","正在读取实际 MCP 工具声明…");
    try{
      const result=await getJSON(SCORE_API+"/v2/submit",{endpoint:$("targetInput").value.trim()});
      isPublic=false;renderReport(result);
      message("submitStatus",result.existing?"Existing entry: verify domain control to reassess.":"Preflight recorded; no Agent task or safety certification was performed.",
        result.existing?"已存在记录：验证域名控制权后可复评。":"已保存预检记录；未进行真实 Agent 任务或安全认证。");
    }catch(e){message("submitStatus",msgForError(e.message),msgForError(e.message),true);}
    finally{$("submitBtn").disabled=false;}
  }
  async function startClaim(){
    if(!active?.target_id)return message("claimStatus","Submit an endpoint first.","请先提交 Endpoint。",true);
    try{
      const result=await getJSON(SCORE_API+"/v2/claim/start",{target_id:active.target_id});
      challenge=result.challenge;
      $("challengeText").textContent=challenge;
      $("claimChallenge").hidden=false;
      message("claimStatus","Publish the challenge text on the MCP host, then verify within 30 minutes.","在 MCP 域名上发布挑战文本，30 分钟内完成验证。");
    }catch(e){message("claimStatus",msgForError(e.message),msgForError(e.message),true);}
  }
  async function verifyClaim(){
    if(!challenge||!active?.target_id)return;
    try{
      const result=await getJSON(SCORE_API+"/v2/claim/verify",{target_id:active.target_id,challenge});
      $("ownerToken").value=result.owner_token;
      $("claimChallenge").hidden=true;
      message("claimStatus","Domain verified. Copy the owner token immediately; it is shown once.",
        "域名验证通过。请立即复制并保管仅显示一次的 Owner Token。");
    }catch(e){message("claimStatus",msgForError(e.message),msgForError(e.message),true);}
  }
  async function owned(path,extra={}){
    const token=$("ownerToken").value.trim();
    if(!active?.target_id||!token)throw Error(t("Submit an endpoint and supply your owner token.","请先提交 Endpoint 并提供 Owner Token。"));
    return getJSON(SCORE_API+path,{target_id:active.target_id,owner_token:token,...extra});
  }
  async function reassess(){
    try{
      const result=await owned("/v2/reassess");
      renderReport(result);
      message("claimStatus","New immutable run recorded. Not certified.","已保存新版本运行记录，但并非认证。");
    }catch(e){message("claimStatus",msgForError(e.message),msgForError(e.message),true);}
  }
  async function publish(){
    try{
      const r=await owned("/v2/publish",{public:!isPublic});
      isPublic=Boolean(r.is_public);
      $("publishBtn").textContent=isPublic?t("Withdraw publication","撤回公开"):t("Publish voluntarily","自愿公开");
      message("claimStatus",isPublic?"Publication enabled.":"Public sharing withdrawn.",
        isPublic?"已公开当前报告。":"已撤回公开。");
      await loadCreators();
    }catch(e){message("claimStatus",msgForError(e.message),msgForError(e.message),true);}
  }
  async function showHistory(){
    try{
      const result=await owned("/v2/history");
      isPublic=Boolean(result.target?.is_public);
      $("publishBtn").textContent=isPublic?t("Withdraw publication","撤回公开"):t("Publish voluntarily","自愿公开");
      const runs=Array.isArray(result.runs)?result.runs:[];
      const events=Array.isArray(result.events)?result.events:[];
      $("historyResults").innerHTML='<h4>'+esc(t("Private version history","私有评估历史"))+' ('+runs.length+')</h4>'+
        runs.slice(0,30).map(r=>'<article><b>'+esc(formatDate(r.created_at))+' · '+esc(r.status)+'</b><p>'+
          esc(t("Evaluator: ","评分版本：")+(r.evaluator_version||"legacy")+" · "+t("Observed tools: ","观察工具：")+(r.observed_tools??"?"))+'</p></article>').join("")+
        '<h4>'+esc(t("Submission events","提交事件"))+' ('+events.length+')</h4>'+
        events.slice(0,40).map(e=>'<article><p>'+esc(e.event_type)+" · "+esc(formatDate(e.created_at))+'</p></article>').join("");
      message("claimStatus","History loaded. Only this owner token can retrieve private entries.",
        "已读取历史，仅有效所有者 Token 能获取私有记录。");
    }catch(e){message("claimStatus",msgForError(e.message),msgForError(e.message),true);}
  }
  async function submitEvidence(){
    try{
      const e={check_id:$("evidenceId").value.trim().toUpperCase(),kind:$("evidenceType").value,
        url:$("evidenceUrl").value.trim(),note:$("evidenceNote").value.trim()};
      const result=await owned("/v2/evidence",{evidence:[e]});
      message("claimStatus","Evidence recorded for independent review: "+result.event_id,
        "证据已保存待独立复核："+result.event_id);
    }catch(e){message("claimStatus",msgForError(e.message),msgForError(e.message),true);}
  }
  async function loadReport(id){
    try{
      const result=await getJSON(SCORE_API+"/v2/report?id="+encodeURIComponent(id));
      const run=result.runs?.[0];
      if(!run)throw Error("not_public");
      renderReport({target_id:id,status:run.status,score_components:run.score_components,
        findings:run.findings,run_id:run.id,evaluator_version:run.evaluator_version,
        publicView:true});
      $("reportTitle").textContent=t("Creator-published report: ","开发者公开报告：")+result.target.display_name;
    }catch(e){message("submitStatus","Report not published or unavailable.","报告尚未公开或不可用。",true);}
  }
  async function copy(text,id){
    try{await navigator.clipboard.writeText(text);message(id,"Copied.","已复制。");}
    catch{message(id,"Clipboard unavailable. Copy manually.","无法访问剪贴板，请手动复制。",true);}
  }
  $("enButton").addEventListener("click",()=>setLanguage("en"));
  $("zhButton").addEventListener("click",()=>setLanguage("zh-CN"));
  $("searchInput").addEventListener("input",renderRows);
  $("statusFilter").addEventListener("change",renderRows);
  $("submitForm").addEventListener("submit",submit);
  $("claimBtn").addEventListener("click",()=>{
    $("claimPanel").hidden=false;
    $("claimPanel").scrollIntoView({behavior:"smooth",block:"start"});
  });
  $("startClaimBtn").addEventListener("click",startClaim);
  $("verifyClaimBtn").addEventListener("click",verifyClaim);
  $("retestBtn").addEventListener("click",reassess);
  $("publishBtn").addEventListener("click",publish);
  $("historyBtn").addEventListener("click",showHistory);
  $("evidenceBtn").addEventListener("click",submitEvidence);
  $("closeDetail").addEventListener("click",()=>$("detailDialog").close());
  $("copyOwnerBtn").addEventListener("click",()=>copy($("ownerToken").value,"claimStatus"));
  $("copyReportBtn").addEventListener("click",()=>copy(JSON.stringify({
    target_id:active?.target_id,evaluator_version:active?.evaluator_version,
    contract_components:active?.score_components,findings:active?.findings,
    runtime:"UNKNOWN",maturity:"MATURITY_NOT_ESTABLISHED"},null,2),"submitStatus"));
  $("copyPromptBtn").addEventListener("click",()=>copy(
    t("Call are_score_mcp on the connected ARE MCP at https://are.world2.co/mcp with only {endpoint: '"+($("targetInput").value.trim()||"https://example.com/mcp")+"'}; give static observations and UNKNOWNs, not a safety or maturity grade.",
      "调用已连接的 ARE MCP https://are.world2.co/mcp 的 are_score_mcp，仅传入 endpoint: "+($("targetInput").value.trim()||"https://example.com/mcp")+"；只报告静态观察和 UNKNOWN，不输出安全或成熟度等级。"),
    "submitStatus"));
  setLanguage(locale);
  loadPortfolio();loadMetadata();loadCreators();
  const id=new URLSearchParams(location.search).get("report");
  if(id&&/^[0-9a-f-]{36}$/i.test(id))loadReport(id);
})();
