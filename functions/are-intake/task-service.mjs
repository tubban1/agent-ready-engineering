import {randomBytes,createHash} from "node:crypto";

const cohort="ARE100-VALUE-20261115";
const repository=/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
const tokenPattern=/^aret_[a-zA-Z0-9_-]{43}$/;
const taskIdPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sha=x=>createHash("sha256").update(x).digest("hex");
function error(code){const e=new Error(code);e.code=code;throw e;}
async function jsonBody(req){
 const raw=await req.text();
 if(Buffer.byteLength(raw)>130000)error("payload_too_large");
 try{return JSON.parse(raw)}catch{error("malformed_json")}
}
const txt=(x,max=160)=>typeof x==="string"&&x.trim().length>0&&x.length<=max;

export const TASK_CREATE_SQL=`WITH created AS (
INSERT INTO are_eval.private_assessment_tasks
 (cohort_id,repository_key,title,instructions,assignee_id,assessor_organization,token_sha256,expires_at)
SELECT $1,$2,$3,$4,$5,$6,$7,now()+($8::integer*interval '1 day')
FROM are_eval.benchmark_study_candidates c
WHERE c.cohort_id=$1 AND c.repository_key=$2
RETURNING id,cohort_id,repository_key,title,instructions,assignee_id,assessor_organization,expires_at,created_at)
SELECT COALESCE((SELECT row_to_json(created) FROM created),'null'::json)::text`;

export const TASK_LIST_SQL=`SELECT json_build_object('tasks',COALESCE(json_agg(row_to_json(q) ORDER BY q.created_at DESC),'[]'::json))::text
FROM (SELECT t.id,t.cohort_id,t.repository_key,t.title,t.instructions,t.assignee_id,t.assessor_organization,
  t.created_at,t.expires_at,t.revoked_at,
  (SELECT COUNT(*)::integer FROM are_eval.private_task_submissions s WHERE s.task_id=t.id) AS submissions,
  (SELECT r.state FROM are_eval.private_task_submissions s
     JOIN are_eval.private_evaluation_runs r ON r.id=s.run_id
     WHERE s.task_id=t.id ORDER BY s.created_at DESC LIMIT 1) AS latest_stage
  FROM are_eval.private_assessment_tasks t
  ORDER BY t.created_at DESC LIMIT 100) q`;

export const TASK_CANDIDATES_SQL=`SELECT json_build_object('candidates',COALESCE(json_agg(row_to_json(c) ORDER BY c.repository_key),'[]'::json))::text FROM (
 SELECT repository_key,display_name FROM are_eval.benchmark_study_candidates
 WHERE cohort_id='ARE100-VALUE-20261115' ORDER BY repository_key LIMIT 100) c`;

export const TASK_REVOKE_SQL=`WITH canceled AS
(UPDATE are_eval.private_assessment_tasks SET revoked_at=now()
 WHERE id=$1::uuid AND revoked_at IS NULL RETURNING id,repository_key,revoked_at)
SELECT COALESCE((SELECT row_to_json(canceled) FROM canceled),'null'::json)::text`;

export const TASK_READ_SQL=`SELECT COALESCE((SELECT row_to_json(a) FROM (
 SELECT id,cohort_id,repository_key,title,instructions,assignee_id,assessor_organization,
 created_at,expires_at FROM are_eval.private_assessment_tasks
 WHERE token_sha256=$1 AND expires_at>now() AND revoked_at IS NULL) a),'null'::json)::text`;

export const TASK_SUBMIT_SQL=`WITH permitted AS (
 SELECT t.id FROM are_eval.private_assessment_tasks t
 WHERE t.token_sha256=$1 AND t.revoked_at IS NULL AND t.expires_at>now()
   AND t.cohort_id=$3 AND t.repository_key=$4 AND t.assignee_id=$5 AND t.assessor_organization=$6
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
   AND ($2::uuid IS NULL OR s.run_id=$2::uuid)
 ORDER BY s.created_at DESC LIMIT 1) r),'null'::json)::text`;

export function validateTaskCreate(a){
 if(!a||typeof a!=="object"||Array.isArray(a))error("invalid_task");
 const id=a.assignee_id,days=a.expires_days??7;
 if(!repository.test(a.repository_key||"")||a.repository_key.length>160||
   !txt(a.title,120)||typeof a.instructions!=="string"||a.instructions.length>2000||
   !/^[a-z0-9_-]{3,40}$/.test(id||"")||
   !txt(a.assessor_organization,150)||a.assessor_organization.length<2||
   !Number.isInteger(days)||days<1||days>14)error("invalid_task_fields");
 return {cohort_id:cohort,repository_key:a.repository_key,title:a.title.trim(),
   instructions:a.instructions,assignee_id:id,assessor_organization:a.assessor_organization.trim(),expires_days:days};
}
export function tokenHash(token){
 if(!tokenPattern.test(token||""))error("invalid_task_token");
 return sha(token);
}
export function newTaskToken(){return "aret_"+randomBytes(32).toString("base64url");}
export function tokenPreview(){return "aret_…";} // no token value persistence.

export async function taskOwnerAction(path,req,sql){
 if(req.method==="GET"&&path==="/v1/tasks")return {tasks:(await sql(TASK_LIST_SQL))?.tasks||[]};
 if(req.method==="GET"&&path==="/v1/tasks/candidates")return {candidates:(await sql(TASK_CANDIDATES_SQL))?.candidates||[]};
 if(req.method==="POST"&&path==="/v1/tasks/create"){
  const data=validateTaskCreate(await jsonBody(req));
  const secret=newTaskToken();
  const task=await sql(TASK_CREATE_SQL,[data.cohort_id,data.repository_key,data.title,
    data.instructions,data.assignee_id,data.assessor_organization,sha(secret),data.expires_days]);
  if(!task)error("repository_not_in_catalog");
  return {task,task_token:secret,token_visible_once:true,mcp_url:"https://are.world2.co/mcp",public_release_authorized:false};
 }
 if(req.method==="POST"&&path==="/v1/tasks/revoke"){
  const input=await jsonBody(req);
  if(!taskIdPattern.test(input?.id||""))error("invalid_task_id");
  const task=await sql(TASK_REVOKE_SQL,[input.id]);
  return {revoked:!!task,task:task||null};
 }
 return null;
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
   assessor_organization:assignment.assessor_organization,created_at:assignment.created_at,expires_at:assignment.expires_at};
 if(path==="/v1/task/read"&&req.method==="POST")return {status:200,data:{ok:true,task,criteria_version:"pilot-2026-11-18",
   assessment_mode:"ARE_INDEPENDENT",track:"product",task_token_echoed:false,
   workflow:["are_get_task","are_get_criteria","are_submit_assessment","are_get_submission"],
   constraints:["Only authorized non-destructive operations","Record UNKNOWN/NOT_TESTED rather than fabricate results",
      "No public release of a third-party independent report without owner approval"],
   evidence_schema:"are.assessment.result.v1",private:true,
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
 if(path==="/v1/task/criteria"&&req.method==="POST"){
  const input=await jsonBody(req);const offset=input?.offset??0;
  if(!Number.isInteger(offset)||offset<0||offset>criteria.length||Object.keys(input||{}).some(k=>k!=="offset"))
    error("invalid_criteria_cursor");
  const page=criteria.slice(offset,offset+8);
  return {status:200,data:{ok:true,criteria_version:"pilot-2026-11-18",total:criteria.length,offset,
     criteria:page,next:offset+page.length<criteria.length?offset+page.length:null}};
 }
 if(path==="/v1/task/receipt"&&req.method==="POST"){
  const input=await jsonBody(req),id=input?.submission_id??null;
  if(id!==null&&!taskIdPattern.test(id))error("invalid_submission_id");
  const receipt=await sql(TASK_RECEIPT_SQL,[digest,id]);
  return {status:receipt?200:404,data:{ok:!!receipt,receipt,private:true,public_release_authorized:false}};
 }
 if(path==="/v1/task/submit"&&req.method==="POST"){
  const input=await jsonBody(req);
  const assessment=validateSubmission(input,task.assignee_id);
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
