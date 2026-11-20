/**
 * ARE V2 — single task page, independent filter/draw/test/verify/release stages.
 * No V1 compatibility. No direct public third-party review publishing endpoint.
 */
import {createHash,timingSafeEqual} from "node:crypto";
import {pipelinePage} from "./pipeline-page.mjs";
import {TASK_CRITERIA} from "./criteria-compact.mjs";
import {taskAgentAction} from "./task-service.mjs";
import {publicTesterAction} from "./tester-service.mjs";
import {ownerAction,checkpointAction,checkpointRead} from "./pipeline-service.mjs";

export const PRODUCT_CHECKS = Object.freeze("MCP-L1-V4 MCP-L1-C1 MCP-L2-C1 MCP-L2-C2 MCP-L2-X1 MCP-L2-X2 MCP-L2-X3 MCP-L2-X4 MCP-L2-A1 MCP-L2-A2 MCP-L2-I1 MCP-L2-O1 MCP-L2-O2 MCP-L3-C1 MCP-L3-C2 MCP-L3-C3 MCP-L3-C4 MCP-L3-S1 MCP-L3-S2 MCP-L3-S3 MCP-L3-S4 MCP-L3-A2 MCP-L3-A3 MCP-L3-A4 MCP-L3-O1 MCP-L3-O2 MCP-L4-O1 MCP-L4-O2 MCP-L4-I1 MCP-L4-I2 MCP-L4-R1 MCP-L4-R4".split(" "));
const STATES=new Set(["PASS","FAIL","UNKNOWN","NOT_TESTED","NOT_APPLICABLE","BLOCKED_AUTH","NOT_ASSESSED","ADVISORY_ONLY"]);
const HASH_SHA=/^[0-9a-f]{40}$/;
const REPO=/^[a-z\d_.-]+\/[a-z\d_.-]+$/i;
const sha=s=>createHash("sha256").update(s).digest("hex");
function stable(value) {
  if(Array.isArray(value))return "["+value.map(stable).join(",")+"]";
  if(value&&typeof value==="object")return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+stable(value[k])).join(",")+"}";
  return JSON.stringify(value);
}
function fail(code){const e=new Error(code);e.code=code;throw e;}
function validText(s,max=300){return typeof s==="string"&&s.trim().length>0&&s.length<=max;}
export function validateSubmission(data, reviewerId) {
 if(!data||typeof data!=="object"||Array.isArray(data))fail("invalid_submission");
 const {cohort_id,repository_key,report,agent_tasks=[],recommendations=[],summary="",contact_route={},source_binding={}}=data;
 if(cohort_id!=="ARE100-VALUE-20261115"||!REPO.test(repository_key||"")||repository_key.length>160)fail("not_catalog_target");
 if(!report||report.schema!=="are.assessment.result.v1"||report.mode!=="ARE_INDEPENDENT"||
    report.track!=="product"||report.criteria_version!=="pilot-2026-11-18"||
    report.certification!==false||report.public_release_authorized!==false||
    report.maturity_level!==null)fail("unsupported_assessment");
 const target=report.target,assessor=report.assessor;
 if(!target||target.id!==repository_key||!HASH_SHA.test(target.source_revision||"")||
    !validText(target.observed_version,150)||["unknown","unverified","not_pinned"].includes(target.observed_version.toLowerCase())||
    !validText(target.owner_organization,200)||!assessor||
    assessor.id!==reviewerId||!validText(assessor.organization,200)||
    assessor.organization.trim().toLowerCase()===target.owner_organization.trim().toLowerCase())fail("reviewer_or_version_mismatch");
 if(!Array.isArray(report.findings)||report.findings.length!==PRODUCT_CHECKS.length)fail("incomplete_criteria");
 const got=new Set();
 let decisive=0;
 for(const f of report.findings){
   if(!f||typeof f.check_id!=="string"||!PRODUCT_CHECKS.includes(f.check_id)||got.has(f.check_id)||
      !STATES.has(f.status)||f.evaluator_mode!=="ARE_INDEPENDENT"||
      f.evidence_class!=="ASSESSOR_DECLARED_PROVENANCE_NOT_EXTERNALLY_ATTESTED")fail("invalid_finding");
   got.add(f.check_id);
   if(["PASS","FAIL"].includes(f.status)){
     // Decisive findings need a traceable evidence link; not just a claimed verdict.
     if(!validText(f.evidence_id||f.evidence_ref||"",240))fail("decisive_missing_evidence");
     decisive++;
   }
 }
 if(!Array.isArray(agent_tasks)||agent_tasks.length>20||!Array.isArray(recommendations)||recommendations.length>3||
    recommendations.some(s=>!validText(s,380))||typeof summary!=="string"||summary.length>2000)fail("invalid_payload_fields");
 let verifiedTasks=0;
 for(const t of agent_tasks){
   if(!t||!validText(t.goal,240)||!validText(t.trace_ref,240)||
      (["PASS","FAIL"].includes(t.status)&&!validText(t.oracle_ref,240))||
      !["PASS","FAIL","BLOCKED_AUTH","NOT_TESTED"].includes(t.status)||
      typeof t.authorized!=="boolean"||!validText(t.agent,140))fail("invalid_agent_task");
   if(t.authorized&&["PASS","FAIL"].includes(t.status)&&t.oracle_verified===true)verifiedTasks++;
 }
 if(contact_route===null||typeof contact_route!=="object"||Array.isArray(contact_route)||
    (contact_route.url && (!/^https:\/\/github\.com\//.test(contact_route.url)||contact_route.url.length>300))||
    (contact_route.email && (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact_route.email)||!validText(contact_route.source_url,300))))fail("invalid_contact_source");
 // Reviewer-declared repository-to-service binding is mandatory for outreach readiness.
 if(!source_binding||typeof source_binding!=="object"||Array.isArray(source_binding)||
    (source_binding.verified===true&&!validText(source_binding.evidence_ref,300)))fail("invalid_source_binding");
 // READY means a staff evidence packet exists, not that the claims are independently certified.
 const stage=decisive>0&&verifiedTasks>0&&source_binding.verified===true ? "READY_FOR_OUTREACH":"NEEDS_EVIDENCE";
 const sanitized={cohort_id,repository_key,report,agent_tasks,recommendations,summary,contact_route,source_binding};
 const content=stable(sanitized);
 if(Buffer.byteLength(content)>340000||/\b(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|-----BEGIN PRIVATE KEY-----)\b/.test(content))fail("sensitive_or_oversize_payload");
 return {submission_sha256:sha(content),repository_key,cohort_id,report,agent_tasks,recommendations,summary,contact_route,source_binding,decisive,verifiedTasks,stage,assessor_id:reviewerId,assessor_organization:assessor.organization,source_revision:target.source_revision,observed_version:target.observed_version,endpoint:target.endpoint||""};
}
function authorized(req,hash){const s=req.headers.get("authorization")||"";
 if(!hash||!/^Bearer [A-Za-z0-9_-]{40,110}$/.test(s))return false;
 const got=sha(s.slice(7)),expect=String(hash).toLowerCase();
 return /^[a-f0-9]{64}$/.test(expect)&&timingSafeEqual(Buffer.from(got),Buffer.from(expect));
}
const ALLOW_ORIGIN="https://are.world2.co";
function response(req,status,obj,extraHeaders={}){const origin=req.headers.get("origin");
 return new Response(JSON.stringify(obj),{status,headers:{
 "Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff",
 ...extraHeaders,
 ...(origin===ALLOW_ORIGIN?{"Access-Control-Allow-Origin":ALLOW_ORIGIN,"Vary":"Origin"}:{})}});
}
async function neonSql(query,params=[]){
 const conn=process.env.DATABASE_URL;
 if(!conn)fail("db_unconfigured");
 const u=new URL(conn);
 if(!/\.neon\.tech$/.test(u.hostname))fail("bad_db_host");
 const endpoint="https://"+u.hostname.replace(/^[^.]+\./,"api.")+"/sql";
 const r=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json",
 "Neon-Connection-String":conn,"Neon-Raw-Text-Output":"true","Neon-Array-Mode":"true"},
 body:JSON.stringify({query,params}),signal:AbortSignal.timeout(11000)});
 if(!r.ok)fail("db_unavailable");
 const data=await r.json();
 return data?.rows?.[0]?.[0]===undefined?null:JSON.parse(data.rows[0][0]);
}
async function verifiedGitHubSha(repository_key,shaValue,requestFetch=fetch){
 const [owner,repo]=repository_key.split("/");
 // Fixed github.com hostname, never fetch an endpoint supplied by the assessor.
 try{
 const r=await requestFetch("https://api.github.com/repos/"+encodeURIComponent(owner)+"/"+encodeURIComponent(repo)+"/commits/"+shaValue,
 {headers:{"Accept":"application/vnd.github+json","User-Agent":"ARE-evidence-ingest/1.0"},signal:AbortSignal.timeout(7000)});
 return r.status===200;
 }catch{return false;}
}
export function makeHandler({sql=neonSql,githubVerify=verifiedGitHubSha,env=process.env}={}){
 return async function handle(req){
  const {pathname:path}=new URL(req.url);
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{
    "Cache-Control":"no-store","Access-Control-Allow-Methods":"GET,POST,OPTIONS",
    "Access-Control-Allow-Headers":"Authorization,Content-Type",
    "Access-Control-Allow-Origin":req.headers.get("origin")==="https://are.world2.co"?"https://are.world2.co":"null"
  }});
  if(path==="/v3/health"&&req.method==="GET")
    return response(req,200,{ok:true,service:"are-pipeline-v3",public_reports:0});
  if(path==="/v3/board"&&req.method==="GET")return new Response(pipelinePage(),{
    status:200,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store",
      "X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY",
      "Content-Security-Policy":"default-src 'none'; base-uri 'none'; form-action 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'"
    }});
  try{
   if(path.startsWith("/v3/tester/")){
     const result=await publicTesterAction(path,req,sql);
     return response(req,result.status,result.data,result.setCookie?{"Set-Cookie":result.setCookie}:{});
   }
   if(path.startsWith("/v3/task/")&&req.method==="POST"){
     const token=req.headers.get("authorization")?.replace(/^Bearer /,"")||"";
     if(path==="/v3/task/checkpoint"){
       const result=await checkpointAction(req,sql,token);
       return response(req,result.status,result.data);
     }
     if(path==="/v3/task/progress"){
       const result=await checkpointRead(sql,token);
       return response(req,result.status,result.data);
     }
     const result=await taskAgentAction(path,req,sql,{
       validateSubmission,githubVerify,criteria:TASK_CRITERIA
     });
     return response(req,result.status,result.data);
   }
   if(!authorized(req,env.ARE_INTAKE_OWNER_HASH))
     return response(req,401,{error:"owner_token_required"});
   const result=await ownerAction(path,req,sql);
   return response(req,result.status,result.data);
  }catch(e){
   if(e.code)return response(req,400,{error:e.code});
   console.error("ARE pipeline v3",String(e?.message||"unknown").slice(0,100));
   return response(req,503,{error:"pipeline_unavailable"});
  }
 };
}
export default {fetch:makeHandler()};
