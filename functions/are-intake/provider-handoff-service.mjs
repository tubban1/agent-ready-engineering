// An Agent-host action receipt, never a claim that ARE saw the actual browser UI.
const bad=code=>{throw Object.assign(new Error(code),{code})};
const isText=(s,min,max)=>typeof s==="string"&&s.trim().length>=min&&s.length<=max;
export function safeOfficialUrl(value,{allowMetadata=false}={}){
 if(value===null||value===undefined)return null;
 if(!isText(value,14,450))bad("unsafe_provider_url");
 let u;
 try{u=new URL(value)}catch{bad("unsafe_provider_url")}
 const host=u.hostname.toLowerCase();
 if(u.protocol!=="https:"||u.username||u.password||u.port||
    u.search||u.hash||host==="localhost"||host.endsWith(".localhost")||
    host.endsWith(".local")||host.endsWith(".internal")||!host.includes(".")||
    /^[0-9.]+$/.test(host)||host.includes(":")||
    /(?:oauth|api|auth|access)[_-]?(?:token|key)=/i.test(value))
   bad("unsafe_provider_url");
 // RFC 9728 protected-resource metadata describes where authorization can be
 // discovered; it is NOT a user-visible OAuth authorization/consent page.
 if(!allowMetadata&&/\/\.well-known\/(?:oauth-protected-resource|oauth-authorization-server)(?:\/|$)/i.test(u.pathname))
   bad("provider_metadata_not_consent_page");
 return u.toString();
}
export function handoffStartData(raw){
 if(!raw||Object.keys(raw).sort().join(",")!=="auth_scheme,host_action,host_action_ref,note,provider_url,source_url"||
    !["OAUTH","API_KEY"].includes(raw.auth_scheme)||
    !["BROWSER_OPENED","VERIFIED_LINK_SHOWN","HOST_UNSUPPORTED","PRECONFIGURED_CREDENTIAL"].includes(raw.host_action)||
    !isText(raw.host_action_ref,8,240)||!isText(raw.note,20,600)||
    /(ow_live_|Bearer\s+\S+|api[_-]?key\s*[:=]\s*\S+)/i.test(raw.note+" "+raw.host_action_ref))bad("invalid_provider_handoff_start");
 const provider=safeOfficialUrl(raw.provider_url),source=safeOfficialUrl(raw.source_url,{allowMetadata:true});
 if(raw.host_action!=="PRECONFIGURED_CREDENTIAL"&&(!provider||!source))
    bad("verified_provider_link_required");
 if(raw.host_action==="PRECONFIGURED_CREDENTIAL"&&(!source||provider))bad("preconfigured_credential_provenance_required");
 return {scheme:raw.auth_scheme,action:raw.host_action,ref:raw.host_action_ref,note:raw.note,
  provider_url:provider,source_url:source};
}
export function handoffFinishData(raw){
 if(!raw||Object.keys(raw).sort().join(",")!=="note,outcome,outcome_ref"||
    !["AUTHENTICATED","USER_DECLINED","PROVIDER_FAILED","HOST_UNSUPPORTED","CREDENTIAL_UNAVAILABLE"].includes(raw.outcome)||
    !isText(raw.outcome_ref,8,240)||!isText(raw.note,20,600)||
    /(ow_live_|Bearer\s+\S+|api[_-]?key\s*[:=]\s*\S+)/i.test(raw.note+" "+raw.outcome_ref))bad("invalid_provider_handoff_finish");
 // Any text passed through this Agent tool is authored by the assessor.
 // Without a cryptographically verified user/provider/host callback,
 // accepting USER_DECLINED would invent a real human's decision.
 if(raw.outcome==="USER_DECLINED")bad("user_decision_requires_trusted_attestation");
 return {outcome:raw.outcome,ref:raw.outcome_ref,note:raw.note};
}
export const HANDOFF_START_SQL=[
 "WITH permitted AS (SELECT t.id FROM are_eval.private_assessment_tasks t",
 "JOIN are_eval.private_task_authorization_requests a ON a.task_id=t.id",
 "WHERE t.token_sha256=$1 AND t.id=$2::uuid AND t.revoked_at IS NULL AND t.expires_at>now()",
 "AND a.auth_scheme=$3 AND t.plan_snapshot->>'version'='are.test-plan.v3'),",
 "written AS (INSERT INTO are_eval.private_task_provider_auth_handoffs",
 "(task_id,auth_scheme,provider_url,source_url,host_action,host_action_ref,note)",
 "SELECT id,$3,$4,$5,$6,$7,$8 FROM permitted",
 "ON CONFLICT(task_id) DO UPDATE SET auth_scheme=EXCLUDED.auth_scheme,",
 "provider_url=EXCLUDED.provider_url,source_url=EXCLUDED.source_url,",
 "host_action=EXCLUDED.host_action,host_action_ref=EXCLUDED.host_action_ref,note=EXCLUDED.note,",
 "started_at=now(),outcome='WAITING_FOR_USER',outcome_ref=NULL,outcome_note=NULL,finished_at=NULL",
 "RETURNING task_id,auth_scheme,provider_url,source_url,host_action,host_action_ref,started_at,outcome)",
 "SELECT COALESCE((SELECT row_to_json(written) FROM written),'null'::json)::text"
].join(" ");
export const HANDOFF_FINISH_SQL=[
 "WITH permitted AS (SELECT t.id FROM are_eval.private_assessment_tasks t",
 "WHERE t.token_sha256=$1 AND t.id=$2::uuid AND t.revoked_at IS NULL AND t.expires_at>now()",
 "AND t.plan_snapshot->>'version'='are.test-plan.v3'),",
 "updated AS (UPDATE are_eval.private_task_provider_auth_handoffs h",
 "SET outcome=$3,outcome_ref=$4,outcome_note=$5,finished_at=now()",
 "FROM permitted p WHERE h.task_id=p.id AND h.outcome='WAITING_FOR_USER'",
 "AND NOT (h.host_action='PRECONFIGURED_CREDENTIAL' AND $3='USER_DECLINED')",
 "RETURNING h.task_id,h.auth_scheme,h.provider_url,h.source_url,h.host_action,",
 "h.host_action_ref,h.started_at,h.outcome,h.outcome_ref,h.finished_at)",
 "SELECT COALESCE((SELECT row_to_json(updated) FROM updated),'null'::json)::text"
].join(" ");
export const HANDOFF_STATUS_SQL=[
 "SELECT COALESCE((SELECT row_to_json(h) FROM (",
 "SELECT a.task_id,a.auth_scheme,a.provider_url,a.source_url,a.host_action,a.host_action_ref,",
 "a.started_at,a.outcome,a.outcome_ref,a.finished_at",
 "FROM are_eval.private_task_provider_auth_handoffs a",
 "JOIN are_eval.private_assessment_tasks t ON t.id=a.task_id",
 "WHERE t.token_sha256=$1 AND t.id=$2::uuid AND t.revoked_at IS NULL AND t.expires_at>now()",
 ") h),'null'::json)::text"
].join(" ");
const FINISHED=new Set(["AUTHENTICATED","USER_DECLINED","PROVIDER_FAILED","HOST_UNSUPPORTED","CREDENTIAL_UNAVAILABLE"]);
export function handoffBlockingError(h,scheme){
 if(!h)return "provider_handoff_not_started";
 if(scheme&&["OAUTH","API_KEY"].includes(scheme)&&h.auth_scheme!==scheme)return "provider_auth_scheme_mismatch";
 if(h.outcome==="USER_DECLINED")return "user_decision_not_independently_attested";
 if(!FINISHED.has(h.outcome))return "provider_handoff_waiting_for_user";
 if(!h.finished_at||!h.outcome_ref)return "provider_handoff_evidence_missing";
 if(!h.source_url)return "provider_official_source_missing";
 if(h.host_action!=="PRECONFIGURED_CREDENTIAL"&&!h.provider_url)return "provider_official_link_missing";
 return null;
}
