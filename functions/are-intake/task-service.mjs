import {randomBytes,createHash} from "node:crypto";

const cohort="ARE100-VALUE-20261115";
const repository=/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
const tokenPattern=/^aret_[a-zA-Z0-9_-]{43}$/;
const taskIdPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sha=x=>createHash("sha256").update(x).digest("hex");
function error(code){const e=new Error(code);e.code=code;throw e;}
async function jsonBody(req){
 const raw=await req.text();
 if(Buffer.byteLength(raw)>340000)error("payload_too_large");
 try{return JSON.parse(raw)}catch{error("malformed_json")}
}
const txt=(x,max=160)=>typeof x==="string"&&x.trim().length>0&&x.length<=max;

export const TASK_READ_SQL=`SELECT COALESCE((SELECT row_to_json(a) FROM (
 SELECT id,cohort_id,repository_key,title,instructions,assignee_id,assessor_organization,
 created_at,expires_at,plan_snapshot FROM are_eval.private_assessment_tasks
 WHERE token_sha256=$1 AND expires_at>now() AND revoked_at IS NULL AND plan_snapshot->>'version'='are.test-plan.v3') a),'null'::json)::text`;

export const TASK_SUBMIT_SQL=`WITH permitted AS (
 SELECT t.id FROM are_eval.private_assessment_tasks t
 WHERE t.token_sha256=$1 AND t.revoked_at IS NULL AND t.expires_at>now()
   AND t.cohort_id=$3 AND t.repository_key=$4 AND t.assignee_id=$5 AND t.assessor_organization=$6 AND t.plan_snapshot->>'version'='are.test-plan.v3'
 FOR UPDATE OF t
),
created AS (
 INSERT INTO are_eval.private_evaluation_runs
  (submission_sha256,cohort_id,repository_key,assessor_id,assessor_organization,
   source_revision,observed_version,endpoint,state,report,agent_tasks,recommendations,
   contact_route,source_binding,summary,decisive_count,verified_task_count)
 SELECT $2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13::jsonb,
        $14::jsonb,$15::jsonb,$16,$17::integer,$18::integer
 FROM permitted p JOIN are_eval.benchmark_study_candidates c
   ON c.cohort_id=$3 AND c.repository_key=$4
 WHERE (SELECT COUNT(*) FROM are_eval.private_task_submissions l WHERE l.task_id=p.id)<5
 ON CONFLICT(submission_sha256) DO NOTHING
 RETURNING id,submission_sha256,repository_key,state,created_at
),
linked AS (
 INSERT INTO are_eval.private_task_submissions(task_id,run_id)
 SELECT p.id,c.id FROM permitted p CROSS JOIN created c
 ON CONFLICT DO NOTHING RETURNING task_id,run_id
)
SELECT COALESCE(
 (SELECT row_to_json(c) FROM created c JOIN linked l ON l.run_id=c.id),
 (SELECT row_to_json(e) FROM (
  SELECT r.id,r.submission_sha256,r.repository_key,r.state,r.created_at
  FROM permitted p JOIN are_eval.private_task_submissions l ON l.task_id=p.id
   JOIN are_eval.private_evaluation_runs r ON r.id=l.run_id
   WHERE r.submission_sha256=$2 LIMIT 1
 ) e),'null'::json)::text`;

export const TASK_RECEIPT_SQL=`SELECT COALESCE((SELECT row_to_json(r) FROM (
 SELECT s.run_id AS id,p.repository_key,r.state,r.submission_sha256,r.source_revision,r.created_at,
   r.decisive_count,r.verified_task_count
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
   assessor_organization:assignment.assessor_organization,created_at:assignment.created_at,expires_at:assignment.expires_at,plan:assignment.plan_snapshot};
 if(path==="/v3/task/read"&&req.method==="POST")return {status:200,data:{ok:true,task,criteria_version:"pilot-2026-11-18",
   assessment_mode:"ARE_INDEPENDENT",track:"product",task_token_echoed:false,
   workflow:["are_get_task","are_get_criteria","are_checkpoint","are_submit_assessment","are_get_submission"],
   constraints:["Only authorized non-destructive operations","Record UNKNOWN/NOT_TESTED rather than fabricate results",
      "No public release of a third-party independent report without owner approval"],
   evidence_schema:"are.assessment.result.v1",private:true,
   test_plan:(await import("./pipeline-service.mjs")).estimatePlan(Number(task.plan?.declared_tool_count||0),task.plan?.auth_mode||"UNKNOWN",task.plan?.risk_level||"LOW"),
   required_additional_fields:["tool_coverage","test_blockers","test_metadata"],
   evidence_package_template:{
     cohort_id:task.cohort_id,repository_key:task.repository_key,summary:"",
     recommendations:[],agent_tasks:[],source_binding:{verified:false},
     contact_route:{url:"https://github.com/"+task.repository_key},
     report:{schema:"are.assessment.result.v1",mode:"ARE_INDEPENDENT",track:"product",
       criteria_version:"pilot-2026-11-18",maturity_level:null,certification:false,
       public_release_authorized:false,
       target:{id:task.repository_key,source_revision:"REPLACE_WITH_ACTUAL_40_HEX_GIT_SHA",
          observed_version:"REPLACE_WITH_ACTUALLY_OBSERVED_VERSION",
          owner_organization:"REPLACE_WITH_SOURCE_PROJECT_ORG",endpoint:""},
       assessor:{id:task.assignee_id,organization:task.assessor_organization},
       findings:criteria.map(c=>({check_id:c.id,status:"NOT_TESTED",
         evaluator_mode:"ARE_INDEPENDENT",
         evidence_class:"ASSESSOR_DECLARED_PROVENANCE_NOT_EXTERNALLY_ATTESTED"}))}
    }
 }};
 if(path==="/v3/task/criteria"&&req.method==="POST"){
  const input=await jsonBody(req);const offset=input?.offset??0;
  if(!Number.isInteger(offset)||offset<0||offset>criteria.length||Object.keys(input||{}).some(k=>k!=="offset"))
    error("invalid_criteria_cursor");
  const page=criteria.slice(offset,offset+8);
  return {status:200,data:{ok:true,criteria_version:"pilot-2026-11-18",total:criteria.length,offset,
     criteria:page,next:offset+page.length<criteria.length?offset+page.length:null}};
 }
 if(path==="/v3/task/receipt"&&req.method==="POST"){
  const input=await jsonBody(req),id=input?.submission_id??null;
  if(id!==null&&!taskIdPattern.test(id))error("invalid_submission_id");
  const receipt=await sql(TASK_RECEIPT_SQL,[digest,id]);
  return {status:receipt?200:404,data:{ok:!!receipt,receipt,private:true,public_release_authorized:false}};
 }
 if(path==="/v3/task/submit"&&req.method==="POST"){
  const input=await jsonBody(req);
  const {validateCoverage}=await import("./pipeline-service.mjs");
  if(!input||!input.test_metadata||!Number.isInteger(input.test_metadata.discovered_tool_count)||
     !Number.isInteger(input.test_metadata.minutes_used)||
     input.test_metadata.minutes_used<0||input.test_metadata.minutes_used>1440)
    error("missing_full_test_metadata");
  const coverage=validateCoverage(input.tool_coverage,input.test_blockers,input.test_metadata.discovered_tool_count);
  if(coverage.total===0&&input.report?.target?.endpoint)error("tool_discovery_missing");
  const extended={...input,report:{...input.report,tool_coverage:input.tool_coverage,
    test_blockers:input.test_blockers,test_metadata:input.test_metadata}};
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
  if(!submitted)return {status:409,data:{error:"submission_capacity_or_task_state_changed"}};
  return {status:200,data:{ok:true,submission_id:submitted.id,task_id:task.id,
    repository_key:submitted.repository_key,stage:submitted.state,
    content_sha256:taskScopedDigest,private:true,public_release_authorized:false}};
 }
 return {status:404,data:{error:"unknown_task_operation"}};
}
