/**
 * ARE public-source research worker.
 * Only Neon Function Trigger-delivered POSTs can mutate research rows.
 * Each run discovers and samples <=30 public GitHub projects and stores
 * evidence-scoped preliminary findings, never an ARE certification.
 */
const TOPICS = [
  'topic:model-context-protocol stars:>=20 archived:false',
  '"agent framework" in:description stars:>=50 archived:false',
  '"AI agent" in:description stars:>=50 archived:false',
  '"tool calling" in:readme stars:>=20 archived:false',
  '"workflow automation" in:description stars:>=30 archived:false',
  '"MCP server" in:description stars:>=15 archived:false',
  '"browser automation" in:description stars:>=50 archived:false',
  '"AI developer tools" in:description stars:>=50 archived:false'
];
const LIMIT = 30;
const DIMS = ["V","C","S","A","X","I","O","R"];
function dbEndpoint() {
 const conn = process.env.DATABASE_URL;
 if (!conn) throw Error("db_not_configured");
 const hostname = new URL(conn).hostname;
 if (!/\.neon\.tech$/.test(hostname)) throw Error("unsupported_db");
 return {conn,endpoint:"https://"+hostname.replace(/^[^.]+\./,"api.")+"/sql"};
}
async function sql(query,params=[]) {
 const {conn,endpoint}=dbEndpoint();
 const res=await fetch(endpoint,{method:"POST",headers:{
   "Content-Type":"application/json","Neon-Connection-String":conn,
   "Neon-Raw-Text-Output":"true","Neon-Array-Mode":"true"
 },body:JSON.stringify({query,params}),signal:AbortSignal.timeout(14000)});
 if(!res.ok)throw Error("db_http_"+res.status);
 const x=await res.json();
 const raw=x.rows?.[0]?.[0];
 if(raw===undefined)throw Error("db_unexpected");
 return raw==="null"?null:JSON.parse(raw);
}
const QUERY_CLAIM = `WITH claim AS (
 UPDATE are_eval.batches
 SET status='running',started_at=now(),updated_at=now(),error_message=null
 WHERE slot_at = (
  SELECT MIN(slot_at) FROM are_eval.batches
  WHERE slot_at <= now() AND status='scheduled'
 )
 RETURNING slot_at
) SELECT COALESCE((SELECT json_build_object('slot',slot_at) FROM claim),'null'::json)::text`;
const EXISTING = "SELECT COALESCE(json_agg(project_key),'[]'::json)::text FROM are_eval.assessments";
const UPDATE = `
WITH up AS (
 INSERT INTO are_eval.assessments
  (project_key,display_name,source_kind,repo_url,source_ref,category,status,
   title,summary,strengths,findings,dimensions,evidence,metrics,batch_slot)
 SELECT
  r.project_key,r.display_name,'github_public',r.repo_url,r.source_ref,r.category,
  'preliminary',r.title,r.summary,r.strengths,r.findings,r.dimensions,r.evidence,r.metrics,
  $2::timestamptz
 FROM jsonb_to_recordset($1::jsonb) AS r(
  project_key text,display_name text,repo_url text,source_ref text,category text,
  title text,summary text,strengths jsonb,findings jsonb,dimensions jsonb,
  evidence jsonb,metrics jsonb
 )
 ON CONFLICT(project_key) DO UPDATE SET
 checked_at=now(),
 source_ref=EXCLUDED.source_ref,
 summary=EXCLUDED.summary,
 strengths=EXCLUDED.strengths,
 findings=EXCLUDED.findings,
 dimensions=EXCLUDED.dimensions,
 evidence=EXCLUDED.evidence,
 metrics=EXCLUDED.metrics
 WHERE are_eval.assessments.source_kind='github_public'
 RETURNING project_key
), upd AS (
 UPDATE are_eval.batches SET
  analyzed_count=(SELECT count(*) FROM up),
  discovered_count=$3::integer,
  error_count=$4::integer,
  status=CASE WHEN (SELECT count(*) FROM up) >= 30 THEN 'completed' ELSE 'partial' END,
  finished_at=now(),updated_at=now(),
  error_message=CASE WHEN (SELECT count(*) FROM up) >= 30 THEN null ELSE 'Fewer than 30 public repositories could be audited with available evidence.' END
 WHERE slot_at=$2::timestamptz
 RETURNING analyzed_count,status,slot_at
)
SELECT COALESCE((SELECT row_to_json(upd) FROM upd),'null'::json)::text`;
const FAIL = `WITH upd AS (
 UPDATE are_eval.batches SET status='failed', error_count=1, error_message=$2::text,
 finished_at=now(),updated_at=now() WHERE slot_at=$1::timestamptz
 RETURNING slot_at
) SELECT COALESCE((SELECT row_to_json(upd) FROM upd),'null'::json)::text`;

function allowedTrigger(req,body) {
  // Neon proxy strips user-supplied x-neon-* headers, so this is genuine trigger provenance.
  const id=req.headers.get("x-neon-trigger-invocation-id");
  return !!id && !!body && body.version===1 && id===body.invocation_id
    && body.trigger?.type==="schedule"
    && ["are-hourly-2026","are-first-backfill-2026"].includes(body.trigger?.name)
    && typeof body.data?.scheduled_at==="string";
}
const fetchWithLimit=async (url,ms=9000)=>{
 const res=await fetch(url,{headers:{"User-Agent":"ARE-Evidence-Study/1.0","Accept":"application/vnd.github+json"},
   signal:AbortSignal.timeout(ms),redirect:"error"});
 return res;
};
function safeRepo(r) {
 return r && typeof r.full_name==="string" && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(r.full_name)
 && r.html_url==="https://github.com/"+r.full_name && !r.private && !r.archived && !r.fork;
}
function isSoftwareProject(r) {
  const name=String(r.name||"").toLowerCase();
  const description=String(r.description||"").toLowerCase();
  return !/^awesome[-_]/.test(name) &&
    !/(curated list|collection of (awesome|links|resources)|list of (awesome|resources)|free (api|dataset) list|learning resources|course to get into)/.test(description);
}
function projectCategory(r,topicIndex) {
  const name=String(r.name||"");
  const txt=(name+" "+String(r.description||"")).toLowerCase();
  if (/\bmcp\b|model context protocol/.test(txt)) return "MCP / Tooling";
  if (/browser|playwright|devtools|web scraping|automation/.test(txt)) return "Developer Tooling";
  if (/agent|autonomous|multi-agent|agents|ai assistant/.test(txt)) return "AI Agents";
  if (/workflow|orchestrat|pipeline/.test(txt)) return "Workflow Infrastructure";
  return ["General Software","AI Agents","AI Agents","Tool Contracts","Workflow Infrastructure","MCP / Tooling","Developer Tooling","AI Developer Tools"][topicIndex];
}
function excerptAnalysis(r,readme,manifest,readmeUrl,manifestUrl,topicIndex){
 const body=readme.slice(0,80000);
 const ls=body.toLowerCase();
 const pkg=manifest.toLowerCase();
 const findings=[],strengths=[],dims={};
 const signals={
  V:/\b(problem|purpose|why|use cases?|features?|benefits?)\b/i.test(body),
  C:/\b(json schema|pydantic|zod|typed|tool schema|input schema|api reference|openapi)\b/i.test(body+manifest),
  S:/\b(idempoten|retri|replay|checkpoint|persist|recovery|resumable|queue)\b/i.test(body),
  A:/\b(authentication|authorization|oauth|permissions?|access control|rbac|jwt)\b/i.test(body),
  X:/\b(token budget|context window|progressive discovery|token optim|lazy load|compact context)\b/i.test(body),
  I:/\b(mcp|rest api|sdk|tool call|openapi|plugin|server)\b/i.test(body),
  O:/\b(benchmark|test suite|evals?|coverage|ci\/cd|integration test)\b/i.test(body+manifest),
  R:/\b(release|versioning|changelog|deploy|rollback|maintenance)\b/i.test(body)
 };
 const names={V:"价值定义",C:"接口契约",S:"状态恢复",A:"权限信任",X:"上下文经济",I:"接入协议",O:"观测与测试",R:"运行回顾"};
 for(const k of DIMS) dims[k]=signals[k]?"公开文档提及 · 尚未独立复测":"样本证据不足 · 未判定";
 if(body)strengths.push("已获取公开 README，可追溯文档原文。");
 if(manifest)strengths.push("已读取仓库配置文件，可检查依赖与工具声明。");
 if(r.stargazers_count>=100)strengths.push("公开仓库元数据记录 "+r.stargazers_count+" Stars；不等于工程可靠性。");
 if(!signals.C)findings.push("抽样 README/manifest 未提供可核实的参数化操作契约；需要检查实际接口实现。");
 if(!signals.S)findings.push("抽样资料未显示幂等、持久恢复或重试语义；需故障注入测试。");
 if(!signals.A)findings.push("抽样资料未显示独立的授权边界证据；需负向权限测试。");
 if(!signals.O)findings.push("抽样资料未显示可重放的 Agent 端到端验收；需实测。");
 if(findings.length<3)findings.push("当前只有公开仓库材料，不能判定真实运行结果或商业收益。");
 const evidence=[{url:r.html_url,label:"GitHub repository metadata",type:"metadata"}];
 if(body)evidence.push({url:readmeUrl,label:"README.md · public documentation (not independently proven)",type:"documented"});
 if(manifest)evidence.push({url:manifestUrl,label:"Manifest · source sample",type:"inspected"});
 const language=r.language||"Unknown";
 return {
  project_key:"github/"+r.full_name.toLowerCase(),display_name:r.name,
  repo_url:r.html_url,source_ref:"branch:"+r.default_branch,
  category:projectCategory(r,topicIndex),
  title:r.description?.slice(0,250)||"Public project",
  summary:"自动初步评估（非ARE成熟度认证）：检查 GitHub 公开元数据"+
     (body?"、README":"")+(manifest?"、配置文件":"")+
     "；本次未运行应用、未验证授权或完成39项检查。",
  strengths,findings:findings.slice(0,4),dimensions:dims,evidence,
  metrics:{stars:r.stargazers_count||0,language,source:"github_search",
   readme_bytes:readme.length,manifest_bytes:manifest.length,
   pushed_at:r.pushed_at||null,project_default_branch:r.default_branch,
   source_commit_verified:false,inspection_scope:"public metadata + sampled files",independent_e2e:false}
 };
}
async function sampleRepository(repo,idx) {
 const branch=encodeURIComponent(repo.default_branch||"main");
 const url="https://raw.githubusercontent.com/"+repo.full_name+"/"+branch+"/README.md";
 const manifestName=/python/i.test(repo.language||"")?"pyproject.toml":"package.json";
 const manifestUrl="https://raw.githubusercontent.com/"+repo.full_name+"/"+branch+"/"+manifestName;
 const one=async (url)=>{try{const r=await fetchWithLimit(url,6500);if(!r.ok)return "";
   const size=Number(r.headers.get("content-length")||0);if(size>130000)return "";
   return (await r.text()).slice(0,90000);}catch{return "";}}
 const [readme,manifest]=await Promise.all([one(url),one(manifestUrl)]);
 return excerptAnalysis(repo,readme,manifest,url,manifestUrl,idx);
}
async function collect(slot) {
 const dt=new Date(slot), hour=dt.getUTCHours();
 // Slot 01:45–08:45 UTC maps to 02:45–09:45 Europe/Zurich on Nov 15.
 if(dt.getUTCFullYear()!==2026||dt.getUTCMonth()!==10||dt.getUTCDate()!==15||
  dt.getUTCMinutes()!==45||hour<1||hour>8) throw Error("invalid_batch_slot");
 const idx=hour-1;
 const query=TOPICS[idx];
 const endpoint="https://api.github.com/search/repositories?q="+encodeURIComponent(query)+"&sort=stars&order=desc&per_page=100";
 const response=await fetchWithLimit(endpoint,12000);
 if(!response.ok)throw Error("github_search_http_"+response.status);
 const result=await response.json();
 if(!Array.isArray(result.items))throw Error("github_search_unavailable");
 const existing=new Set((await sql(EXISTING)||[]).map(x=>String(x).toLowerCase()));
 const selected=result.items.filter(safeRepo).filter(isSoftwareProject).filter(r=>!existing.has("github/"+r.full_name.toLowerCase())).slice(0,LIMIT);
 const completed=[];
 let errors=0;
 for(let i=0;i<selected.length;i+=6){
  const group=selected.slice(i,i+6);
  const values=await Promise.allSettled(group.map(r=>sampleRepository(r,idx)));
  for(const x of values){
   if(x.status==="fulfilled")completed.push(x.value);
   else errors++;
  }
 }
 return {found:selected.length,assessments:completed,errors};
}
export default {
 async fetch(request) {
  if(request.method!=="POST"||new URL(request.url).pathname!=="/cron")return new Response("Not found",{status:404});
  let body;
  try {body=await request.json();} catch {return new Response("Invalid JSON",{status:400});}
  if(!allowedTrigger(request,body))return new Response("Not authorized",{status:401});
  if(!body.data.scheduled_at.startsWith("2026-11-15"))return Response.json({ok:true,skipped:"outside_one_day_run"});
  let claim;
  try {claim=await sql(QUERY_CLAIM);}catch(e){return Response.json({ok:false,error:"claim_failed"}, {status:503});}
  if(!claim?.slot)return Response.json({ok:true,skipped:"no_due_batch"});
  try {
   const {found,assessments,errors}=await collect(claim.slot);
   const updated=await sql(UPDATE,[JSON.stringify(assessments),claim.slot,found,errors]);
   return Response.json({ok:true,slot:claim.slot,status:updated?.status,found,analyzed:updated?.analyzed_count,errors});
  } catch(e) {
   const reason=String(e?.message||"scan_failed").replace(/[^a-z0-9_-]/gi,"_").slice(0,80);
   console.error("ARE batch failed",reason);
   await sql(FAIL,[claim.slot,reason]).catch(()=>{});
   return Response.json({ok:false,slot:claim.slot,error:reason},{status:503});
  }
 }
};
