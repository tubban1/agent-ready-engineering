import {randomBytes,createHash} from "node:crypto";
import * as Q from "./pipeline-queries.mjs";
const sha=x=>createHash("sha256").update(x).digest("hex");
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const repo=/^[a-z\d_.-]+\/[a-z\d_.-]+$/i;
const valid=(s,n)=>typeof s==="string"&&s.trim().length>0&&s.length<=n;
const fail=code=>{const e=new Error(code);e.code=code;throw e;};
const token=(prefix)=>prefix+randomBytes(32).toString("base64url");
function hashToken(value){
 if(!/^aret_[A-Za-z0-9_-]{43}$/.test(value||""))fail("invalid_task_token");
 return sha(value);
}
async function input(req){
 const raw=await req.text();
 if(Buffer.byteLength(raw)>350000)fail("payload_too_large");
 try{return JSON.parse(raw);}catch{fail("invalid_json")}
}
export function estimatePlan(tools,auth="UNKNOWN",risk="LOW"){
 if(!Number.isInteger(tools)||tools<0||tools>3000||!["NONE","OAUTH","API_KEY","UNKNOWN"].includes(auth)||
    !["LOW","MEDIUM","HIGH"].includes(risk))fail("invalid_plan_inputs");
 const minutes=Math.min(240,Math.max(60,60+Math.ceil(tools/10)*15+
     (auth==="OAUTH"?20:0)+(risk==="HIGH"?30:risk==="MEDIUM"?15:0)));
 return {estimated_minutes:minutes,tool_count:tools,auth_mode:auth,risk_level:risk,
   phases:[{phase:"DISCOVERY",minutes:Math.max(10,Math.round(minutes*.12))},
     {phase:"AUTH",minutes:auth==="OAUTH"?20:10},
     {phase:"TOOLS",minutes:Math.round(minutes*.55)},
     {phase:"REPRODUCE",minutes:Math.max(10,Math.round(minutes*.15))},
     {phase:"REPORT",minutes:Math.max(10,Math.round(minutes*.08))}],
   retry_limit_per_operation:2,block_after_minutes:10,tool_goal:"every discovered tool accounted for",
   stop_rules:[
    "Classify observed failures: missing authorization as BLOCKED_AUTH, environment/rate limits as BLOCKED_ENVIRONMENT, inconsistent tool contract or unstable/unverifiable state as BLOCKED_DESIGN, independently confirmed incorrect business results as FAIL",
    "Preserve reproduction steps, parameters, responses, exact errors, before/after state, software versions and trace/log references; label unconfirmed root causes UNKNOWN",
    "Retry only if safe and reversible, at most twice per operation; after ten blocked minutes report evidence and continue the remaining tools",
    "OAuth requires interactive human sign-in through the provider; never put credentials in a report",
    "Unsafe or irreversible writes require explicit authorization; otherwise BLOCKED_AUTH",
    "Never label an unverified action successful without an external success oracle"]};
}
export function validateCoverage(rows,blockers=[],count){
 if(!Array.isArray(rows)||rows.length>3000||!Array.isArray(blockers)||blockers.length>100||
   !Number.isInteger(count)||count<0||count>3000||rows.length!==count)fail("invalid_tool_inventory");
 const names=new Set();let pass=0,failed=0,blocked=0,untested=0;
 for(const r of rows){
  if(!r||!valid(r.name,160)||names.has(r.name)||
    !["PASS","FAIL","BLOCKED_AUTH","BLOCKED_DESIGN","BLOCKED_ENVIRONMENT","NOT_TESTED","NOT_APPLICABLE"].includes(r.status)||
    (r.status==="PASS"&&!valid(r.oracle_ref,250))||
    (r.status==="FAIL"&&!valid(r.trace_ref,250))||
    (r.status==="NOT_TESTED"&&!valid(r.reason,500))||
    (r.status.startsWith("BLOCKED")&&(!valid(r.trace_ref,250)||!valid(r.reason,500))))fail("invalid_tool_row");
  names.add(r.name);
  if(r.status==="PASS")pass++;else if(r.status==="FAIL")failed++;
  else if(r.status.startsWith("BLOCKED"))blocked++;else if(r.status==="NOT_TESTED")untested++;
 }
 for(const b of blockers){
  if(!["OAUTH","TOOL_DESIGN","RATE_LIMIT","ENVIRONMENT","SAFETY","TIME_BUDGET","UNKNOWN"].includes(b?.cause)||
   !valid(b.reason,500)||!valid(b.trace_ref,250))fail("invalid_blocker");
 }
 return {total:count,pass,failed,blocked,untested,accounted:count-untested,
  executed:pass+failed,
  executed_pass_rate:pass+failed?pass/(pass+failed):null};
}
export async function ownerAction(path,req,sql){
 if(path==="/v3/pool"&&req.method==="GET")return {status:200,data:{ok:true,...await sql(Q.POOL)}};
 if(path==="/v3/pool/filter"&&req.method==="POST"){
  const d=await input(req);
  if(!repo.test(d?.repository_key||"")||d.repository_key.length>160||
    !["ELIGIBLE","HOLD","EXCLUDED"].includes(d.decision)||
    typeof d.reason!=="string"||d.reason.length>400||
    !Number.isInteger(d.tool_count)||d.tool_count<0||d.tool_count>3000||
    !["NONE","OAUTH","API_KEY","UNKNOWN"].includes(d.auth_mode)||
    !["LOW","MEDIUM","HIGH"].includes(d.risk_level)||
    typeof d.runtime_endpoint!=="string"||d.runtime_endpoint.length>400||
    (d.runtime_endpoint&&!/^https:\/\//.test(d.runtime_endpoint))||
    (d.decision==="ELIGIBLE"&&!d.runtime_endpoint&&!d.reason.includes("[local-runner-verified]"))||
    !Number.isInteger(d.priority)||d.priority<0||d.priority>100)fail("invalid_pool_filter");
  const row=await sql(Q.FILTER,["ARE100-VALUE-20261115",d.repository_key,d.decision,d.reason,
    d.tool_count,d.auth_mode,d.risk_level,d.runtime_endpoint,d.priority]);
  return {status:row?200:404,data:{ok:!!row,project:row,plan:estimatePlan(d.tool_count,d.auth_mode,d.risk_level)}};
 }
 if(path==="/v3/tasks/issue"&&req.method==="POST"){
  const d=await input(req);
  if(!repo.test(d?.repository_key||"")||d.repository_key.length>160||
    !/^[a-z0-9_-]{3,40}$/.test(d.tester_id||"")||
    !valid(d.tester_organization,150)||
    ![90,150,240].includes(d.max_minutes)||typeof d.allow_oauth!=="boolean"||
    !Number.isInteger(d.expires_days)||d.expires_days<1||d.expires_days>14)
    fail("invalid_issue_request");
  const secret=token("aret_");
  const task=await sql(Q.ISSUE,[d.repository_key,d.tester_id,
    d.tester_organization,sha(secret),d.expires_days,d.max_minutes,d.allow_oauth]);
  return {status:task?200:409,data:task?
    {ok:true,task,task_token:secret,visible_once:true,
      plan:estimatePlan(Number(task.plan_snapshot?.declared_tool_count??0),
        task.plan_snapshot?.auth_mode||"UNKNOWN",task.plan_snapshot?.risk_level||"LOW"),
      private:true,published:false,mcp_url:"https://are.world2.co/mcp"}:
    {error:"project_not_eligible_already_issued_or_exceeds_test_budget"}};
 }
 if(path==="/v3/tasks"&&req.method==="GET")return {status:200,data:{ok:true,...await sql(Q.TASK_LIST)}};
 if(path==="/v3/tasks/revoke"&&req.method==="POST"){
  const d=await input(req);if(!uuid.test(d?.id||""))fail("invalid_task_id");
  const row=await sql(Q.TASK_REVOKE,[d.id]);return {status:row?200:404,data:{ok:!!row,task:row}};
 }
 if(path==="/v3/review"&&req.method==="GET")return {status:200,data:{ok:true,...await sql(Q.REVIEWS)}};
 if(path==="/v3/review/decision"&&req.method==="POST"){
  const d=await input(req);
  if(!uuid.test(d?.id||"")||!["NEEDS_RETEST","VERIFIED","REJECTED"].includes(d.decision)||
    !valid(d.explanation,2000)||d.explanation.length<5)fail("invalid_review");
  if(d.decision==="VERIFIED"){
   const data=await sql(Q.REVIEWS),row=data?.runs?.find(x=>x.id===d.id);
   if(!row)fail("review_not_found");
   const meta=row.test_metadata,tools=row.tool_coverage,blocks=row.blockers||[];
   if(!meta||!Number.isInteger(meta.discovered_tool_count)||!Array.isArray(tools)||
      tools.length!==meta.discovered_tool_count||(tools.length===0&&!blocks.length))
      fail("assessment_lacks_test_inventory");
   validateCoverage(tools,blocks,meta.discovered_tool_count);
   if(row.state!=="READY_FOR_OUTREACH"||row.decisive_count<1||row.verified_task_count<1||
     !Array.isArray(row.findings)||row.findings.length!==32||
     !Array.isArray(row.evidence_artifacts)||row.evidence_artifacts.length===0||
     row.source_binding?.verified!==true||!Array.isArray(row.agent_tasks)||row.agent_tasks.length===0)
     fail("assessment_evidence_incomplete_for_owner_verification");
  }
  // Verification records a responsible human decision. No public writes.
  const row=await sql(Q.REVIEW_INSERT,[d.id,d.decision,d.explanation]);
  return {status:row?200:404,data:{ok:!!row,review:row,private:true,published:false}};
 }
 if(path==="/v3/release/draft"&&req.method==="POST"){
  const d=await input(req);
  if(!uuid.test(d?.id||"")||!valid(d.summary,2000))fail("invalid_release_draft");
  const row=await sql(Q.PUBLICATION_DRAFT,[d.id,d.summary]);
  return {status:row?200:409,data:{ok:!!row,draft:row,published:false}};
 }
 if(path==="/v3/release/approve"&&req.method==="POST"){
  const d=await input(req);
  if(!uuid.test(d?.id||"")||d.confirm!=="I APPROVE MANUAL PUBLICATION")fail("explicit_confirmation_required");
  const row=await sql(Q.PUBLICATION_APPROVE,[d.id]);
  return {status:row?200:409,data:{ok:!!row,approval:row,published:false,
    next:"Explicitly release via a separately approved public publishing workflow"}};
 }
 return {status:404,data:{error:"unknown_owner_operation"}};
}
export async function checkpointAction(req,sql,secret){
 const d=await input(req),metrics=validateCoverage(d.coverage,d.blockers,d.total_tools);
 if(!["DISCOVERY","AUTH","TOOLS","REPRODUCE","REPORT","SUBMITTED"].includes(d.phase)||
   !Number.isInteger(d.minutes_used)||d.minutes_used<0||d.minutes_used>1440)fail("invalid_checkpoint");
 const row=await sql(Q.CHECKPOINT,[hashToken(secret),JSON.stringify(d.coverage),
   JSON.stringify(d.blockers),d.phase,d.total_tools,d.minutes_used]);
 return {status:row?200:403,data:{ok:!!row,checkpoint:row,coverage:metrics,private:true}};
}
export async function checkpointRead(sql,secret){
 const row=await sql(Q.CHECKPOINT_GET,[hashToken(secret)]);
 return {status:200,data:{ok:true,checkpoint:row,private:true}};
}
