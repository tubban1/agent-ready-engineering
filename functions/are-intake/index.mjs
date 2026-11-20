/**
 * ARE private colleague intake. Independent submissions never enter public portfolio.
 * No third-party evaluation publication, email sending or grade assignment.
 */
import {createHash,timingSafeEqual} from "node:crypto";
import {ownerPage} from "./owner-page.mjs";

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
   if(!t||!validText(t.goal,240)||!validText(t.trace_ref,240)||!validText(t.oracle_ref,240)||
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
 if(Buffer.byteLength(content)>125000||/\b(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|-----BEGIN PRIVATE KEY-----)\b/.test(content))fail("sensitive_or_oversize_payload");
 return {submission_sha256:sha(content),repository_key,cohort_id,report,agent_tasks,recommendations,summary,contact_route,source_binding,decisive,verifiedTasks,stage,assessor_id:reviewerId,assessor_organization:assessor.organization,source_revision:target.source_revision,observed_version:target.observed_version,endpoint:target.endpoint||""};
}
const SUBMIT_SQL=`WITH i AS (
INSERT INTO are_eval.private_evaluation_runs(
 submission_sha256,cohort_id,repository_key,assessor_id,assessor_organization,
 source_revision,observed_version,endpoint,state,report,agent_tasks,recommendations,contact_route,source_binding,summary,decisive_count,verified_task_count)
SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb,$15,$16::integer,$17::integer
FROM are_eval.benchmark_study_candidates c
WHERE c.cohort_id=$2 AND c.repository_key=$3
 AND (SELECT COUNT(*) FROM are_eval.private_evaluation_runs z WHERE z.assessor_id=$4 AND z.created_at>now()-interval '1 hour')<15
ON CONFLICT (submission_sha256) DO NOTHING
RETURNING id,submission_sha256,repository_key,state,created_at
)
SELECT COALESCE((SELECT row_to_json(i) FROM i),
 (SELECT row_to_json(e) FROM (SELECT id,submission_sha256,repository_key,state,created_at
   FROM are_eval.private_evaluation_runs WHERE submission_sha256=$1 AND assessor_id=$4) e))::text`;
const QUEUE_SQL=`SELECT json_build_object('runs',COALESCE(json_agg(row_to_json(q) ORDER BY q.created_at DESC),'[]'::json))::text FROM (
 SELECT DISTINCT ON (r.repository_key) r.id,r.repository_key,r.assessor_id,r.assessor_organization,
    r.source_revision,r.observed_version,r.endpoint,r.state,r.decisive_count,r.verified_task_count,
    r.summary,r.recommendations,r.contact_route,r.source_binding,r.created_at,
    (SELECT e.event_type FROM are_eval.private_outreach_events e WHERE e.run_id=r.id ORDER BY e.created_at DESC LIMIT 1) as contact_status
 FROM are_eval.private_evaluation_runs r ORDER BY r.repository_key,r.created_at DESC
) q`;
const DETAIL_SQL=`SELECT COALESCE((SELECT row_to_json(r) FROM (
 SELECT id,repository_key,cohort_id,assessor_id,assessor_organization,source_revision,
 observed_version,endpoint,state,report,agent_tasks,recommendations,contact_route,source_binding,summary,
 decisive_count,verified_task_count,created_at FROM are_eval.private_evaluation_runs
 WHERE id=$1::uuid) r),'null'::json)::text`;
const CONTACT_SQL=`WITH e AS (INSERT INTO are_eval.private_outreach_events(run_id,event_type,details,actor)
 SELECT id,$2,$3,'owner' FROM are_eval.private_evaluation_runs WHERE id=$1::uuid
 RETURNING id,run_id,event_type,created_at)
 SELECT COALESCE((SELECT row_to_json(e) FROM e),'null'::json)::text`;
function authorized(req,hash){const s=req.headers.get("authorization")||"";
 if(!hash||!/^Bearer [A-Za-z0-9_-]{40,110}$/.test(s))return false;
 const got=sha(s.slice(7)),expect=String(hash).toLowerCase();
 return /^[a-f0-9]{64}$/.test(expect)&&timingSafeEqual(Buffer.from(got),Buffer.from(expect));
}
const ALLOW_ORIGIN="https://are.world2.co";
function response(req,status,obj){const origin=req.headers.get("origin");
 return new Response(JSON.stringify(obj),{status,headers:{
 "Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff",
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
   const url=new URL(req.url),path=url.pathname;
   if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{
     "Access-Control-Allow-Origin":req.headers.get("origin")===ALLOW_ORIGIN?ALLOW_ORIGIN:"null",
     "Access-Control-Allow-Headers":"Authorization, Content-Type, X-ARE-Reviewer",
     "Access-Control-Allow-Methods":"GET, POST, OPTIONS","Cache-Control":"no-store"}});
   if(req.method==="GET"&&path==="/v1/health")return response(req,200,{ok:true,service:"are-private-intake",public_reports:0});
   if(req.method==="GET"&&path==="/v1/owner")return new Response(ownerPage(),{status:200,headers:{
     "Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff",
     "X-Frame-Options":"DENY","Content-Security-Policy":"default-src 'none'; base-uri 'none'; form-action 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'"}});
   const owner=authorized(req,env.ARE_INTAKE_OWNER_HASH);
   let reviewers={};
   try{reviewers=JSON.parse(env.ARE_INTAKE_REVIEWERS_JSON||"{}")}catch{}
   const reviewer=req.headers.get("x-are-reviewer")||"";
   const validReviewer=/^[a-z0-9_-]{3,40}$/.test(reviewer)&&authorized(req,reviewers[reviewer]);
   if(path==="/v1/submit"&&req.method==="POST"){
     if(!validReviewer)return response(req,401,{error:"reviewer_token_required"});
     try{
       const text=await req.text();if(Buffer.byteLength(text)>125000)fail("payload_too_large");
       const data=validateSubmission(JSON.parse(text),reviewer);
       const verified=await githubVerify(data.repository_key,data.source_revision);
       if(!verified)return response(req,422,{error:"github_source_revision_unverified"});
       const row=await sql(SUBMIT_SQL,[data.submission_sha256,data.cohort_id,data.repository_key,
         data.assessor_id,data.assessor_organization,data.source_revision,data.observed_version,
         data.endpoint,data.stage,JSON.stringify(data.report),JSON.stringify(data.agent_tasks),
         JSON.stringify(data.recommendations),JSON.stringify(data.contact_route),JSON.stringify(data.source_binding),data.summary,
         data.decisive,data.verifiedTasks]);
       if(!row)return response(req,429,{error:"catalog_target_not_found_or_review_budget"});
       return response(req,200,{ok:true,submission_id:row.id,repository_key:row.repository_key,
         stage:row.state,idempotency_sha256:data.submission_sha256,private:true,public_release_authorized:false});
     }catch(e){const code=e.code||"invalid_submission";return response(req,400,{error:code});}
   }
   if(!owner)return response(req,401,{error:"owner_token_required"});
   try{
     if(req.method==="GET"&&path==="/v1/inbox"){
       const data=await sql(QUEUE_SQL);return response(req,200,{ok:true,private:true,...data});
     }
     if(req.method==="GET"&&path==="/v1/run"){
       const id=url.searchParams.get("id")||"";
       if(!/^[0-9a-f-]{36}$/i.test(id))return response(req,400,{error:"invalid_id"});
       const run=await sql(DETAIL_SQL,[id]);return response(req,run?200:404,{ok:!!run,run});
     }
     if(req.method==="POST"&&path==="/v1/contact"){
       const input=await req.json();
       if(!/^[0-9a-f-]{36}$/i.test(input.id||"")||
          !["CONTACTED","REPLY_RECEIVED","NEEDS_RETEST","ARCHIVED"].includes(input.event_type)||
          typeof input.details!=="string"||input.details.length>500)fail("invalid_contact_event");
       const item=await sql(CONTACT_SQL,[input.id,input.event_type,input.details]);
       return response(req,item?200:404,{ok:!!item,event:item});
     }
     return response(req,404,{error:"not_found"});
   }catch(e){
     if(e.code)return response(req,400,{error:e.code});
     console.error("ARE private intake",String(e?.message||"unknown").slice(0,90));
     return response(req,503,{error:"intake_unavailable"});
   }
 };
}
export default {fetch:makeHandler()};
