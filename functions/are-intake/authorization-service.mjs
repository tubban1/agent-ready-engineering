// Auth decision is a real task owner's browser action, not an Agent-authored assertion.
// GRANTED allows initiating the provider's official login; it never means OAuth succeeded.
export const AUTH_REQUEST_SQL=[
 "WITH permitted AS (SELECT t.id,t.plan_snapshot FROM are_eval.private_assessment_tasks t",
 "WHERE t.token_sha256=$1 AND t.id=$2::uuid AND t.revoked_at IS NULL AND t.expires_at>now()",
 "AND t.plan_snapshot->>'version'='are.test-plan.v3'),",
 "inserted AS (INSERT INTO are_eval.private_task_authorization_requests",
 "(task_id,reason,requested_scopes,auth_scheme,decision,decided_at)",
 "SELECT id,$3,$4::jsonb,$5,",
 "CASE WHEN plan_snapshot->>'oauth_allowed'='true' AND $5='OAUTH' THEN 'GRANTED' ELSE 'PENDING' END,",
 "CASE WHEN plan_snapshot->>'oauth_allowed'='true' AND $5='OAUTH' THEN now() ELSE NULL END FROM permitted",
 "ON CONFLICT(task_id) DO NOTHING RETURNING task_id,decision,reason,requested_scopes,auth_scheme,requested_at,decided_at),",
 "visible AS (SELECT task_id,decision,reason,requested_scopes,auth_scheme,requested_at,decided_at FROM inserted",
 "UNION ALL SELECT a.task_id,a.decision,a.reason,a.requested_scopes,a.auth_scheme,a.requested_at,a.decided_at",
 "FROM are_eval.private_task_authorization_requests a JOIN permitted p ON p.id=a.task_id",
 "WHERE NOT EXISTS (SELECT 1 FROM inserted))",
 "SELECT COALESCE((SELECT row_to_json(visible) FROM visible),'null'::json)::text"
].join(' ');
export const AUTH_STATUS_SQL=[
 "SELECT COALESCE((SELECT row_to_json(a) FROM (",
 "SELECT r.task_id,r.decision,r.reason,r.requested_scopes,r.auth_scheme,r.requested_at,r.decided_at",
 "FROM are_eval.private_task_authorization_requests r",
 "JOIN are_eval.private_assessment_tasks t ON t.id=r.task_id",
 "WHERE t.token_sha256=$1 AND t.id=$2::uuid AND t.revoked_at IS NULL",
 "AND t.expires_at>now()) a),'null'::json)::text"
].join(' ');
export const AUTH_DECIDE_SQL=[
 "WITH owned AS (SELECT t.id FROM are_eval.private_assessment_tasks t",
 "JOIN are_eval.private_tester_sessions s ON s.id::text=t.plan_snapshot->>'tester_session_id'",
 "WHERE s.session_sha256=$1 AND s.expires_at>now() AND t.id=$2::uuid",
 "AND t.expires_at>now() AND t.revoked_at IS NULL FOR UPDATE OF t),",
 "updated AS (UPDATE are_eval.private_task_authorization_requests a SET decision=$3,decided_at=now()",
 "FROM owned WHERE a.task_id=owned.id AND a.decision='PENDING'",
 "RETURNING a.task_id,a.decision,a.reason,a.requested_scopes,a.requested_at,a.decided_at)",
 "SELECT COALESCE((SELECT row_to_json(updated) FROM updated),'null'::json)::text"
].join(' ');
const humanDecision= x=>x==="GRANTED"||x==="DECLINED";
export function authRequired(payload,taskMode="UNKNOWN"){
 return ['OAUTH','API_KEY'].includes(taskMode)||
 ['OAUTH','API_KEY'].includes(payload?.test_metadata?.auth_mode)||
 (payload?.tool_coverage||[]).some(x=>x?.status==="BLOCKED_AUTH")||
 (payload?.test_blockers||[]).some(x=>x?.cause==="OAUTH")||
 (payload?.evidence_artifacts||[]).some(x=>{
  if(x?.kind!=="trace"||typeof x.content!=="string")return false;
  try{
   const raw=JSON.parse(x.content);
   const error=JSON.stringify(raw?.response?.error||{});
   return /missing[_ -]?(bearer[_ -]?)?token|unauthori[sz]ed|oauth|bearer|authentication.required|http.?401/i.test(error)
  }catch{return false}
 });
}
export function authorizationCompletion(auth){
 return !auth?"NOT_REQUESTED":auth.decision==="GRANTED"?"USER_ALLOWED_PROVIDER_LOGIN":
  auth.decision==="DECLINED"?"USER_DECLINED":"AWAITING_USER_DECISION";
}
export function validateAuth(payload,mode,auth,issue){
 if(!authRequired(payload,mode))return {required:false,state:"NOT_REQUIRED"};
 if(!auth||!["PENDING","GRANTED","DECLINED"].includes(auth.decision)){
  issue("test_metadata.authorization","human_authorization_request_missing",
   "Request human authorization using are_request_authorization; never silently skip OAuth/API key and claim complete testing.");
  return {required:true,state:"NOT_REQUESTED"};
 }
 if(auth.decision!=="GRANTED"){
  issue("test_metadata.authorization","authorization_not_granted",
   "Partial submission is allowed after authorization was requested; blocked tools remain untested until consent and real provider sign-in.",'warning');
 }
 return {required:true,state:authorizationCompletion(auth)};
}
export function authorizationRequestData(data){
 if(!data||!["reason,requested_scopes","auth_scheme,reason,requested_scopes"].includes(Object.keys(data).sort().join(","))||
   !["OAUTH","API_KEY","UNKNOWN"].includes(data.auth_scheme||"UNKNOWN")||
   typeof data.reason!=="string"||data.reason.trim().length<12||data.reason.length>500||
   !Array.isArray(data.requested_scopes)||data.requested_scopes.length>20||
   data.requested_scopes.some(s=>typeof s!=="string"||s.length<1||s.length>100||/[^A-Za-z0-9:._/-]/.test(s)))
    throw Object.assign(new Error("invalid_authorization_request"),{code:"invalid_authorization_request"});
 return {reason:data.reason.trim(),scopes:[...new Set(data.requested_scopes)],scheme:data.auth_scheme||"UNKNOWN"};
}
export function mustBeHumanConsent(value){
 if(!humanDecision(value))throw Object.assign(new Error("invalid_human_authorization_decision"),{code:"invalid_human_authorization_decision"});
 return value;
}

// Owner-issued tasks have no tester browser session; the human Owner can
// decide these requests through their authenticated ARE admin workspace.
export const AUTH_OWNER_DECIDE_SQL=[
 "WITH owned AS (SELECT t.id FROM are_eval.private_assessment_tasks t",
 "WHERE t.id=$1::uuid AND t.plan_snapshot->>'version'='are.test-plan.v3'",
 "AND (t.plan_snapshot->>'tester_session_id') IS NULL",
 "AND t.expires_at>now() AND t.revoked_at IS NULL FOR UPDATE),",
 "updated AS (UPDATE are_eval.private_task_authorization_requests a SET decision=$2,decided_at=now()",
 "FROM owned WHERE a.task_id=owned.id AND a.decision='PENDING'",
 "RETURNING a.task_id,a.decision,a.reason,a.requested_scopes,a.requested_at,a.decided_at)",
 "SELECT COALESCE((SELECT row_to_json(updated) FROM updated),'null'::json)::text"
].join(' ');
