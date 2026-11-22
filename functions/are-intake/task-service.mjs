import {randomBytes,createHash} from "node:crypto";
import {preflightAssessment,renderStructuredReport} from "./evidence-validation.mjs";
import {EVIDENCE_PROTOCOL,v5EvidenceGuide,mcpEvaluationLifecycle,cleanupEligibility} from "./evaluation-contract-v51.mjs";
import {CAPTURE_READ_SQL,captureReadOnly,validCaptureId} from "./capture-v5.mjs";
import {AUTH_REQUEST_SQL,AUTH_STATUS_SQL,authRequired,authorizationRequestData} from "./authorization-service.mjs";
import {HANDOFF_START_SQL,HANDOFF_FINISH_SQL,HANDOFF_STATUS_SQL,
 handoffStartData,handoffFinishData,handoffBlockingError} from "./provider-handoff-service.mjs";

const cohort="ARE100-VALUE-20261115";
const repository=/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
const tokenPattern=/^aret_[a-zA-Z0-9_-]{43}$/;
const taskIdPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sha=x=>createHash("sha256").update(x).digest("hex");
function error(code){const e=new Error(code);e.code=code;throw e;}
async function jsonBody(req){
 const raw=await req.text();
 if(Buffer.byteLength(raw)>1800000)error("payload_too_large");
 try{return JSON.parse(raw)}catch{error("malformed_json")}
}
const txt=(x,max=160)=>typeof x==="string"&&x.trim().length>0&&x.length<=max;

export const TASK_READ_SQL=`SELECT COALESCE((SELECT row_to_json(a) FROM (
 SELECT t.id,t.cohort_id,t.repository_key,t.title,t.instructions,t.assignee_id,t.assessor_organization,
 t.created_at,t.expires_at,t.plan_snapshot,p.runtime_endpoint AS screened_endpoint,p.auth_mode AS screened_auth_mode,
 p.decision AS screening_decision,p.updated_at AS screened_at
 FROM are_eval.private_assessment_tasks t
 LEFT JOIN are_eval.private_project_pool p ON p.cohort_id=t.cohort_id AND p.repository_key=t.repository_key
 WHERE t.token_sha256=$1 AND t.expires_at>now() AND t.revoked_at IS NULL AND t.plan_snapshot->>'version'='are.test-plan.v3') a),'null'::json)::text`;

export const TASK_SUBMIT_SQL=`WITH permitted AS (
 SELECT t.id FROM are_eval.private_assessment_tasks t
 WHERE t.token_sha256=$1 AND t.revoked_at IS NULL AND t.expires_at>now()
 AND t.cohort_id=$3 AND t.repository_key=$4 AND t.assignee_id=$5
 AND t.assessor_organization=$6 AND t.plan_snapshot->>'version'='are.test-plan.v3'
 AND NOT EXISTS (SELECT 1 FROM are_eval.private_task_submissions previous WHERE previous.task_id=t.id)
 FOR UPDATE OF t
),
reserved AS (
 INSERT INTO are_eval.private_task_finalizations (task_id,submission_sha256)
 SELECT p.id,$2 FROM permitted p
 ON CONFLICT (task_id) DO NOTHING RETURNING task_id
),
created AS (
 INSERT INTO are_eval.private_evaluation_runs
 (submission_sha256,cohort_id,repository_key,assessor_id,assessor_organization,
 source_revision,observed_version,endpoint,state,report,agent_tasks,recommendations,
 contact_route,source_binding,summary,decisive_count,verified_task_count)
 SELECT $2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13::jsonb,
 $14::jsonb,$15::jsonb,$16,$17::integer,$18::integer
 FROM reserved p JOIN are_eval.benchmark_study_candidates c
 ON c.cohort_id=$3 AND c.repository_key=$4
 ON CONFLICT(submission_sha256) DO NOTHING
 RETURNING id,submission_sha256,repository_key,state,created_at
),
linked AS (
 INSERT INTO are_eval.private_task_submissions(task_id,run_id)
 SELECT p.task_id,c.id FROM reserved p CROSS JOIN created c
 ON CONFLICT DO NOTHING RETURNING task_id,run_id
),
closed AS (
 UPDATE are_eval.private_assessment_tasks t SET revoked_at=now(),
 plan_snapshot=jsonb_set(t.plan_snapshot,'{final_submission}',to_jsonb('CLOSED'::text),true)
 FROM linked l WHERE t.id=l.task_id RETURNING t.id
)
SELECT COALESCE((SELECT row_to_json(c) FROM created c
 JOIN linked l ON l.run_id=c.id JOIN closed done ON done.id=l.task_id),'null'::json)::text`;

export const TASK_RECEIPT_SQL=`SELECT COALESCE((SELECT row_to_json(r) FROM (
 SELECT s.run_id AS id,p.repository_key,r.state,r.submission_sha256,r.source_revision,r.created_at,
   r.decisive_count,r.verified_task_count,r.report,r.agent_tasks,r.source_binding
 FROM are_eval.private_assessment_tasks p
 JOIN are_eval.private_task_submissions s ON s.task_id=p.id
 JOIN are_eval.private_evaluation_runs r ON r.id=s.run_id
 WHERE p.token_sha256=$1 AND p.revoked_at IS NULL AND p.expires_at>now()
   AND p.plan_snapshot->>'version'='are.test-plan.v3' AND ($2::uuid IS NULL OR s.run_id=$2::uuid)
 ORDER BY s.created_at DESC LIMIT 1) r),'null'::json)::text`;

export function tokenHash(token){
 if(!tokenPattern.test(token||""))error("invalid_task_token");
 return sha(token);
}
export async function taskAgentAction(path,req,sql,{validateSubmission,githubVerify,criteria}){
 const auth=req.headers.get("authorization")||"";
 const raw=auth.startsWith("Bearer ") ? auth.slice(7) : "";
 let digest;
 try{digest=tokenHash(raw)}catch{return {status:401,data:{error:"task_token_required"}};}
 const assignment=await sql(TASK_READ_SQL,[digest]);
 if(!assignment)return {status:403,data:{error:"task_revoked_expired_or_unknown"}};
 const task={id:assignment.id,cohort_id:assignment.cohort_id,repository_key:assignment.repository_key,
   title:assignment.title,instructions:assignment.instructions,assignee_id:assignment.assignee_id,
   assessor_organization:assignment.assessor_organization,created_at:assignment.created_at,expires_at:assignment.expires_at,plan:assignment.plan_snapshot,
   endpoint:{url:assignment.plan_snapshot?.runtime_endpoint||assignment.screened_endpoint||"",status:"SCREENED_NOT_INDEPENDENTLY_ATTESTED",screened_at:assignment.screened_at||null},
   auth_mode:assignment.plan_snapshot?.auth_mode||assignment.screened_auth_mode||"UNKNOWN"};
 if(path==="/v3/task/read"&&req.method==="POST")return {status:200,data:{ok:true,task,criteria_version:"pilot-2026-11-21",
   assessment_mode:"ARE_INDEPENDENT",track:"product",task_token_echoed:false,
   workflow:["are_get_task","are_get_criteria","are_request_authorization_if_needed","are_record_provider_handoff_START_FINISH_if_needed","are_checkpoint","are_validate_assessment","are_submit_assessment"],
   constraints:["Only authorized non-destructive operations","Record UNKNOWN/NOT_TESTED rather than fabricate results",
      "No public release of a third-party independent report without owner approval"],
   evidence_schema:"are.assessment.result.v3",evidence_protocol:EVIDENCE_PROTOCOL,
   evaluation_lifecycle:mcpEvaluationLifecycle(),
   evidence_contract_tool:"are_get_evidence_contract",capture_tool:"are_capture_readonly",private:true,
   authorization_request_tool:"are_request_authorization",
   authorization_status_tool:"are_get_authorization_status",
   test_plan:(await import("./pipeline-service.mjs")).estimatePlan(Number(task.plan?.declared_tool_count||0),task.plan?.auth_mode||"UNKNOWN",task.plan?.risk_level||"LOW"),
   required_additional_fields:["tool_coverage","test_blockers","test_metadata","evidence_artifacts","source_binding","agent_tasks"],
   submission_guidance:"Follow evaluation_lifecycle in order: DISCOVER, task-owned SETUP/CONNECT if needed, provider AUTH, native SMOKE_TEST, evidence-backed EVALUATE, VALIDATE, SUBMIT, confirm Neon receipt, then scoped CLEANUP only if COMPLETE. Record baseline/setup_manifest before changing host MCP config, install only isolated trusted dependencies, never modify preexisting MCP connections.  use are_capture_readonly for anonymous public tools/list and approved safe read-only tools even when screening auth_mode is UNKNOWN/OAUTH/API_KEY; never send provider credentials. A provider 401/403 or API_KEY_REQUIRED triggers an official provider login/account/API-key page or OAuth consent in host browser; if unavailable show verified official link. Record are_record_provider_handoff START/FINISH with actual host/user outcome before submitting PARTIAL, not merely BLOCKED_AUTH. Legacy GRANTED is only auth challenge recorded, never provider consent. For large capture receipts use capture_id without pasting the original trace. Each PASS or N/A must match official applies_when + pass_if, and traces must preserve raw MCP request/response. Do not invent the source binding. Validate, then submit privately; only human reviewer may approve contact or publication.",
   evidence_package_template:{
     evidence_protocol:EVIDENCE_PROTOCOL,cohort_id:task.cohort_id,repository_key:task.repository_key,summary:"",
     recommendations:[],agent_tasks:[],evidence_artifacts:[],tool_coverage:[],test_blockers:[],
     test_metadata:{discovered_tool_count:0,minutes_used:0,auth_mode:task.auth_mode,
       duration:{kind:"UNMEASURED",source:"UNKNOWN",active_minutes:null},applicability_facts:{}},
     source_binding:{verified:false,evidence_ref:"",reason:"Not yet verified by independent source-to-deployment observations"},
     contact_route:{url:"https://github.com/"+task.repository_key},
     report:{schema:"are.assessment.result.v3",mode:"ARE_INDEPENDENT",track:"product",
       criteria_version:"pilot-2026-11-21",maturity_level:null,certification:false,
       public_release_authorized:false,
       target:{id:task.repository_key,source_revision:"REPLACE_WITH_ACTUAL_40_HEX_GIT_SHA",
          observed_version:"REPLACE_WITH_ACTUALLY_OBSERVED_VERSION",
          owner_organization:"REPLACE_WITH_SOURCE_PROJECT_ORG",endpoint:task.endpoint.url},
       assessor:{id:task.assignee_id,organization:task.assessor_organization},
       findings:criteria.map(c=>({check_id:c.id,status:"NOT_TESTED",reason:"Not yet assessed; replace after testing",
         evaluator_mode:"ARE_INDEPENDENT",
         evidence_class:"ASSESSOR_DECLARED_PROVENANCE_NOT_EXTERNALLY_ATTESTED"}))}
    }
 }};
 if(path==="/v3/task/auth/request"&&req.method==="POST"){
   const input=authorizationRequestData(await jsonBody(req));
   const state=await sql(AUTH_REQUEST_SQL,[digest,task.id,input.reason,JSON.stringify(input.scopes),input.scheme]);
   if(!state)return {status:409,data:{error:"authorization_request_not_saved"}};
   return {status:200,data:{ok:true,authorization:{auth_scheme:state.auth_scheme,
       challenge_state:"CHALLENGE_RECORDED",requested_scopes:state.requested_scopes,
       requested_at:state.requested_at},
     auth_request_recorded:true,provider_consent_obtained:false,
     workflow_status:"CHALLENGE_RECORDED_NOT_AUTHORIZED",
     next_action:input.scheme==="OAUTH"?"OPEN_PROVIDER_OAUTH_IN_AGENT_HOST_BROWSER":
       "OPEN_PROVIDER_OFFICIAL_ACCOUNT_OR_API_KEY_PAGE",
     are_approval_required:false,
     instruction:input.scheme==="OAUTH"?
      "Immediately invoke host-native OAuth connect/reconnect to OPEN the provider's official login/consent page. The user decides on that provider page; no ARE approval. Call are_record_provider_handoff START with actual host browser event and verified official doc/link; then FINISH with actual outcome before any formal submission.":
      "Immediately check the provider's OFFICIAL documentation for how a test account / API key can be obtained. If no secure credential is already configured, use your Agent host browser to OPEN the official account/login/API-key page, present it to the user and give them the opportunity to provision a key securely in the host. No ARE approval, never paste credentials into chat, never create accounts/pay without user consent. Call are_record_provider_handoff START then FINISH with real user/host outcome; do not just label BLOCKED_AUTH and submit.",
     privacy:"ARE records the authentication handoff, never grants provider OAuth consent or certifies login.",
     private:true}};
 }
 if(path==="/v3/task/auth/status"&&req.method==="POST"){
   const state=await sql(AUTH_STATUS_SQL,[digest,task.id]);
   return {status:200,data:{ok:true,authorization:state?{auth_scheme:state.auth_scheme,
       challenge_state:state.decision==="GRANTED"?"CHALLENGE_RECORDED":"LEGACY_"+state.decision,
       requested_at:state.requested_at}:null,
     credential_granted_by_provider:false,
     are_approval_required:false,
     workflow_status:"CHALLENGE_RECORDED_NOT_AUTHORIZED",
     guidance:!state?"Register the authentication challenge using are_request_authorization":
      state.auth_scheme==="OAUTH"?
      "Open official provider OAuth page in host browser, then record are_record_provider_handoff START/FINISH with real outcome. User decides at provider.":
      state.auth_scheme==="API_KEY"?
      "Proactively open the provider's official account/login/API key setup page in host browser and offer user safe host credential configuration. Record START/FINISH; API key stays in host and is never sent to ARE.":
      "Do not claim login or testing success without original authenticated native MCP traces.",private:true}};
 }
 if(path==="/v3/task/auth/handoff"&&req.method==="POST"){
  const input=await jsonBody(req);
  if(input?.phase==="START"){
    const {phase,...body}=input;
    const data=handoffStartData(body);
    const recorded=await sql(HANDOFF_START_SQL,[digest,task.id,data.scheme,
      data.provider_url,data.source_url,data.action,data.ref,data.note]);
    if(!recorded)return {status:409,data:{ok:false,error:"auth_challenge_must_be_registered_first"}};
    return {status:200,data:{ok:true,provider_handoff:recorded,
      consent_obtained:false,evidence_level:"AGENT_HOST_REPORTED_NOT_INDEPENDENTLY_ATTESTED",
      instruction:"Keep the official provider login/key setup visible to the user. Do not collect credentials via ARE. After actual user/host outcome, call FINISH. Mere START cannot finalize a BLOCKED_AUTH assessment.",private:true}};
  }
  if(input?.phase==="FINISH"){
    const {phase,...body}=input;
    const data=handoffFinishData(body);
    const recorded=await sql(HANDOFF_FINISH_SQL,[digest,task.id,data.outcome,data.ref,data.note]);
    if(!recorded)return {status:409,data:{ok:false,error:"provider_handoff_not_started_or_already_finished"}};
    return {status:200,data:{ok:true,provider_handoff:recorded,
      evidence_level:"AGENT_HOST_REPORTED_NOT_INDEPENDENTLY_ATTESTED",
      provider_authenticated_inferred:false,
      next_action:data.outcome==="AUTHENTICATED"?
       "Now execute protected native MCP tools and capture successful authenticated traces":
       "If user refused or host/provider blocked credential setup, record the actual blocker and submit a truthful PARTIAL report after preflight",
      private:true}};
  }
  error("invalid_provider_handoff_phase");
 }
 if(path==="/v3/task/contract"&&req.method==="POST")
   return {status:200,data:{ok:true,contract:v5EvidenceGuide(),
     criteria_machine_contract:criteria.map(c=>({id:c.id,applies_when:c.applies_when,
       pass_if:c.pass_if,minimum_samples:c.minimum_samples,obligation:c.obligation})),
     private:true,public_release_authorized:false}};
 if(path==="/v3/task/capture"&&req.method==="POST"){
   const input=await jsonBody(req);
   const capture=await captureReadOnly(input,{assignment,tokenDigest:digest,sql});
   return {status:200,data:{...capture,private:true,public_release_authorized:false}};
 }
 if(path==="/v3/task/criteria"&&req.method==="POST"){
  const input=await jsonBody(req);const offset=input?.offset??0;
  if(!Number.isInteger(offset)||offset<0||offset>criteria.length||Object.keys(input||{}).some(k=>k!=="offset"))
    error("invalid_criteria_cursor");
  const page=criteria.slice(offset,offset+8);
  return {status:200,data:{ok:true,criteria_version:"pilot-2026-11-21",total:criteria.length,offset,
     criteria:page,next:offset+page.length<criteria.length?offset+page.length:null}};
 }
 const runPreflight=async(payload)=>{
   const ids=[...new Set((Array.isArray(payload?.evidence_artifacts)?payload.evidence_artifacts:[])
    .map(a=>a?.capture_id).filter(validCaptureId))].slice(0,100);
   const captureRows=ids.length?(await sql(CAPTURE_READ_SQL,[digest,task.id,ids]))?.rows||[]:[];
   // Server-issued observations can be referenced by receipt ID rather than
   // repeatedly pasting raw tool frames into the Agent's context and HTTP body.
   // A supplied hash/content is NEVER replaced, so a tampered receipt still fails.
   const receipts=new Map(captureRows.map(row=>[row.id,row]));
   const hydrated={...payload,evidence_artifacts:Array.isArray(payload?.evidence_artifacts)?
     payload.evidence_artifacts.map(a=>{
       const receipt=a?.capture_id&&receipts.get(a.capture_id);
       if(!receipt||a?.kind!=="trace")return a;
       return {...a,content:a.content??receipt.content,sha256:a.sha256??receipt.sha256,
         provenance:a.provenance??"ARE server-origin immutable observation"};
     }):payload?.evidence_artifacts};
   const requiresAuth=authRequired(hydrated,task.auth_mode);
   const authState=requiresAuth?await sql(AUTH_STATUS_SQL,[digest,task.id]):null;
   const handoff=requiresAuth?await sql(HANDOFF_STATUS_SQL,[digest,task.id]):null;
   const result=preflightAssessment(hydrated,{
     taskId:task.id,captures:captureRows,authorization:authState,
     assigneeId:task.assignee_id,organization:task.assessor_organization,
     repositoryKey:task.repository_key,expectedEndpoint:task.endpoint.url,
     authMode:payload?.test_metadata?.auth_mode==="OAUTH"?"OAUTH":task.auth_mode,
     baseValidate:validateSubmission
   });
   const hasUnfinishedProtectedTools=(hydrated.tool_coverage||[]).some(row=>row.status==="BLOCKED_AUTH")||
     (hydrated.agent_tasks||[]).some(row=>row.status==="BLOCKED_AUTH")||
     (hydrated.test_blockers||[]).some(row=>row.cause==="OAUTH");
   if(requiresAuth&&(hasUnfinishedProtectedTools||!((hydrated.tool_coverage||[]).some(x=>x.status==="PASS")))){
     const issue=handoffBlockingError(handoff,hydrated.test_metadata?.auth_mode||task.auth_mode);
     if(issue){
       result.valid=false;
       result.errors.push({path:"provider_auth_handoff",code:issue,
        message:"Do not submit a partial report immediately after an auth challenge. First open/show an independently checked official provider OAuth/account/API-key page, offer the user a safe provider-side decision, and record a real terminal host/user outcome through are_record_provider_handoff START/FINISH. Never send credentials to ARE."});
     }
     result.provider_auth_handoff=handoff?{
       status:handoff.outcome,auth_scheme:handoff.auth_scheme,host_action:handoff.host_action,
       provider_url:handoff.provider_url,source_url:handoff.source_url,
       host_action_ref:handoff.host_action_ref,outcome_ref:handoff.outcome_ref,
       started_at:handoff.started_at,finished_at:handoff.finished_at,
       evidence_level:"AGENT_HOST_REPORTED_NOT_INDEPENDENTLY_ATTESTED"}:{status:"NOT_STARTED"};
   }
   const observed=Math.max(0,Math.round((Date.now()-new Date(task.created_at).getTime())/60000));
   result.server_elapsed_minutes=Number.isFinite(observed)?observed:null;
   if(Number.isInteger(payload?.test_metadata?.minutes_used)&&Number.isFinite(observed)&&
      payload.test_metadata.minutes_used>observed+10)
     result.warnings.push({path:"test_metadata.minutes_used",code:"elapsed_time_claim_exceeds_server_window",
      message:"Reported test duration exceeds the task's server-observed lifetime; preserve timeline evidence for reviewer"});
   return {result,hydrated};
 };
 if(path==="/v3/task/validate"&&req.method==="POST"){
   const payload=await jsonBody(req);
   const {result}=await runPreflight(payload);
   // No SQL INSERT/UPDATE, no revision slot consumed. Only the task read above is authorized.
   return {status:200,data:{ok:true,...result,
    server_elapsed_minutes:Math.max(0,Math.round((Date.now()-new Date(task.created_at).getTime())/60000)),
    side_effects:false,revisions_consumed:0}};
 }
 if(path==="/v3/task/receipt"&&req.method==="POST"){
  const input=await jsonBody(req),id=input?.submission_id??null;
  if(id!==null&&!taskIdPattern.test(id))error("invalid_submission_id");
  const receipt=await sql(TASK_RECEIPT_SQL,[digest,id]);
  if(!receipt)return {status:404,data:{ok:false,receipt:null,private:true,public_release_authorized:false}};
  const stored={repository_key:task.repository_key,report:receipt.report||{},agent_tasks:receipt.agent_tasks||[],
   tool_coverage:receipt.report?.tool_coverage||[],source_binding:receipt.source_binding||{}};
  const counts=(rows)=>{const out={PASS:0,FAIL:0,NOT_APPLICABLE:0,NOT_TESTED:0,UNKNOWN:0};
    for(const x of rows)if(Object.hasOwn(out,x.status))out[x.status]++;return out};
  const toolRows=stored.tool_coverage;
  const metrics={criteria:counts(stored.report.findings||[]),tools:counts(toolRows),
   discovered_tools:toolRows.length,blocked:toolRows.filter(x=>x.status?.startsWith("BLOCKED")).length,
   agent_tasks:stored.agent_tasks.length,
   verified_agent_tasks:stored.agent_tasks.filter(x=>x.authorized&&x.oracle_verified===true&&["PASS","FAIL"].includes(x.status)).length};
  const cleanReceipt={...receipt};
  delete cleanReceipt.report;delete cleanReceipt.agent_tasks;delete cleanReceipt.source_binding;
  return {status:200,data:{ok:true,receipt:cleanReceipt,canonical_metrics:metrics,
    canonical_report:renderStructuredReport(stored,metrics),test_completion:stored.report?.test_completion||null,private:true,public_release_authorized:false}};

 }
 if(path==="/v3/task/submit"&&req.method==="POST"){
  const input=await jsonBody(req);
  const {result:preflight,hydrated}=await runPreflight(input);
  if(!preflight.valid)return {status:422,data:{ok:false,error:"assessment_preflight_failed",
    issues:preflight.errors,warnings:preflight.warnings,metrics:preflight.metrics,
    hint:"Call are_validate_assessment and finish all possible testing before the ONE final submission. Submission closes this Task Token."}};
  const {validateCoverage}=await import("./pipeline-service.mjs");
  if(!hydrated||!hydrated.test_metadata||!Number.isInteger(hydrated.test_metadata.discovered_tool_count)||
     !Number.isInteger(hydrated.test_metadata.minutes_used)||
     hydrated.test_metadata.minutes_used<0||hydrated.test_metadata.minutes_used>1440)
    error("missing_full_test_metadata");
  const coverage=validateCoverage(hydrated.tool_coverage,hydrated.test_blockers,hydrated.test_metadata.discovered_tool_count);
  if(coverage.total===0&&input.report?.target?.endpoint&&!(
    (task.auth_mode==="OAUTH"||input.test_metadata?.auth_mode==="OAUTH")&&
    input.test_blockers?.some(x=>x.cause==="OAUTH")&&
    input.agent_tasks?.some(x=>x.status==="BLOCKED_AUTH")
  ))error("tool_discovery_missing");
  const elapsed=Math.max(0,Math.round((Date.now()-new Date(task.created_at).getTime())/60000));
  const extended={...hydrated,summary:preflight.normalized_summary,report:{...hydrated.report,
    integrity_readiness:preflight.readiness,integrity_metrics:preflight.metrics.semantic,
    provider_auth_handoff:preflight.provider_auth_handoff??null,
    test_completion:{...preflight.completion,wall_clock_minutes:elapsed},
    evidence_artifacts:hydrated.evidence_artifacts,
    test_metadata:{...hydrated.test_metadata,server_observed_minutes:elapsed},tool_coverage:hydrated.tool_coverage,
    test_blockers:hydrated.test_blockers}};
  const assessment=validateSubmission(extended,task.assignee_id);
  if(assessment.repository_key!==task.repository_key||assessment.cohort_id!==task.cohort_id||
      assessment.assessor_organization!==task.assessor_organization)error("task_scope_mismatch");
  const verified=await githubVerify(assessment.repository_key,assessment.source_revision);
  if(!verified)return {status:422,data:{error:"github_source_revision_unverified"}};
  const taskScopedDigest=sha(task.id+":"+assessment.submission_sha256);
  const submitted=await sql(TASK_SUBMIT_SQL,[digest,taskScopedDigest,assessment.cohort_id,
    assessment.repository_key,assessment.assessor_id,assessment.assessor_organization,
    assessment.source_revision,assessment.observed_version,assessment.endpoint,
    assessment.stage,JSON.stringify(assessment.report),JSON.stringify(assessment.agent_tasks),
    JSON.stringify(assessment.recommendations),JSON.stringify(assessment.contact_route),
    JSON.stringify(assessment.source_binding),assessment.summary,assessment.decisive,assessment.verifiedTasks]);
  if(!submitted)return {status:409,data:{error:"task_already_finalized_or_unavailable",
   hint:"One formal submission per task. After human NEEDS_RETEST review, get a new task for the retest."}};
  return {status:200,data:{ok:true,submission_id:submitted.id,task_id:task.id,
    canonical_metrics:preflight.metrics,canonical_report:preflight.report_preview,
    test_completion:{...preflight.completion,wall_clock_minutes:elapsed},
    server_elapsed_minutes:elapsed,reported_minutes:input.test_metadata.minutes_used,
    repository_key:submitted.repository_key,stage:submitted.state,
    content_sha256:taskScopedDigest,task_token_closed:true,final_submission:true,
    cleanup_eligibility:cleanupEligibility({submission_id:submitted.id,task_token_closed:true,
      test_completion:preflight.completion}),
    receipt_hint:"Read the submission in the ARE tester page. The task token has automatically expired.",
    private:true,public_release_authorized:false}};
 }
 return {status:404,data:{error:"unknown_task_operation"}};
}
