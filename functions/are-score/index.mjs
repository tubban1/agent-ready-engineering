/**
 * ARE Benchmark public preflight. Read-only source retrieval, never third-party
 * tools/call. Source declarations are not certifications.
 */
import {randomBytes,createHash,timingSafeEqual} from "node:crypto";
import {probeMcpTools,readPublicProof} from "./probe.mjs";
const VERSION="are-preflight-v2-endpoint-only";
const ORIGINS=new Set(["https://are.world2.co","https://are.fde.fan","https://agent-ready-engineering.vercel.app"]);
const sha=x=>createHash("sha256").update(String(x)).digest("hex");
const same=(a,b)=>typeof a==="string"&&typeof b==="string"&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
function res(req,status,data) {
 const o=req.headers.get("origin");
 return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8",
 "X-Content-Type-Options":"nosniff","Cache-Control":"no-store",
 ...(ORIGINS.has(o)?{"Access-Control-Allow-Origin":o,"Vary":"Origin"}:{})}});
}
async function sql(query,params=[]) {
 const conn=process.env.DATABASE_URL;
 if(!conn)throw Error("database_not_configured");
 const host=new URL(conn).hostname;
 if(!/\.neon\.tech$/.test(host))throw Error("invalid_database_host");
 const endpoint="https://"+host.replace(/^[^.]+\./,"api.")+"/sql";
 const r=await fetch(endpoint,{method:"POST",redirect:"error",
 headers:{"Content-Type":"application/json","Neon-Connection-String":conn,
 "Neon-Raw-Text-Output":"true","Neon-Array-Mode":"true"},
 body:JSON.stringify({query,params}),signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw Error("database_unavailable");
 const d=await r.json();
 if(d.rows?.[0]?.[0]===undefined)throw Error("invalid_database_result");
 return JSON.parse(d.rows[0][0]);
}
export function normalize(text){
 if(typeof text!=="string"||text.length>350)throw Error("invalid_target");
 let u;try{u=new URL(text.trim());}catch{throw Error("invalid_target");}
 if(u.protocol!=="https:"||u.username||u.password||u.hash||u.search)throw Error("https_mcp_endpoint_required");
 if(u.hostname.toLowerCase()==="github.com")throw Error("github_repository_not_supported_use_https_mcp_endpoint");
 const h=u.hostname.toLowerCase();
 if(h.length>150||!h.includes(".")||/[^a-z0-9.-]/.test(h)||
    /(^|\.)(localhost|local|internal|onion|test|invalid)$/.test(h)||
    /^(?:\d{1,3}\.){3}\d{1,3}$/.test(h)||u.port||
    u.pathname.length>180||/%2f|%5c|%00/i.test(u.pathname))throw Error("public_https_domain_required");
 const url=u.origin+u.pathname.replace(/\/+$/,"");
 return {url,identity:"url:"+url.toLowerCase()};
}
const CHECK_IDS=("L1-V1 L1-V2 L1-V3 L1-V4 L1-A1 L1-C1 L2-C1 L2-C2 L2-X1 L2-X2 L2-X3 L2-X4 L2-A1 L2-A2 L2-I1 L2-O1 L2-O2 L3-C1 L3-C2 L3-C3 L3-C4 L3-S1 L3-S2 L3-S3 L3-S4 L3-A1 L3-A2 L3-A3 L3-A4 L3-O1 L3-O2 L4-O1 L4-O2 L4-I1 L4-I2 L4-R1 L4-R2 L4-R3 L4-R4").split(" ");
export function staticScore(t){
 if(!Array.isArray(t)||!t.length||t.length>250)throw Error("invalid_tool_manifest");
 const n=t.length,bytes=Buffer.byteLength(JSON.stringify({tools:t}));
 const names=t.filter(x=>/^[A-Za-z][\w.-]{0,99}$/.test(String(x?.name||""))).length;
 const unique=new Set(t.map(x=>x?.name)).size;
 const valid=t.filter(x=>x?.inputSchema?.type==="object").length;
 const described=t.filter(x=>String(x?.description||"").trim().length>=28).length;
 const annotated=t.filter(x=>typeof x?.annotations?.readOnlyHint==="boolean" &&
   typeof x?.annotations?.destructiveHint==="boolean").length;
 const contradiction=t.filter(x=>x?.annotations?.readOnlyHint===true&&x?.annotations?.destructiveHint===true).length;
 const parts={contract:Math.round(35*(0.3*names/n+0.5*valid/n+0.2*(unique===n?1:0))),
  tool_guidance:Math.round(25*described/n),
  annotations:Math.max(0,Math.round(20*annotated/n)-contradiction*5),
  payload_footprint:bytes<=8192?20:bytes<=32768?16:bytes<=65536?10:bytes<=131072?5:0};
 const findings=[];
 if(valid<n)findings.push({code:"schema_review",status:"observed",note:(n-valid)+" tools have no observed object inputSchema."});
 if(described<n)findings.push({code:"description_review",status:"heuristic",note:(n-described)+" tools have short/missing descriptions; test Agent tool selection."});
 if(annotated<n)findings.push({code:"annotations_review",status:"observed",note:(n-annotated)+" tools lack explicit readOnlyHint/destructiveHint declarations; source review required."});
 if(contradiction)findings.push({code:"annotation_conflict",status:"observed",note:contradiction+" tools have contradictory read-only and destructive declarations."});
 if(bytes>32768)findings.push({code:"context_hypothesis",status:"hypothesis",note:"Serialized tool manifest is "+bytes+" bytes; measure actual Host tokens before recommending progressive discovery."});
 if(!findings.length)findings.push({code:"unknown_runtime",status:"unknown",note:"Limited static scan found no signals; actual task behavior, security and recovery are unverified."});
 return {score:Object.values(parts).reduce((a,b)=>a+b,0),parts,n,bytes,findings};
}
async function prepare(target){
 const parsed=normalize(target);
 let observed;
 try{observed=await probeMcpTools(parsed.url);}
 catch{throw Error("mcp_endpoint_unavailable_or_auth_required");}
 if(!Array.isArray(observed.tools)||observed.tools.length===0)
  throw Error("mcp_tools_list_required");
 const a=staticScore(observed.tools);
 return {parsed,name:new URL(parsed.url).hostname,version:observed.version,
   status:"preflight_scored",...a,provenance:"live_mcp_tools_list",evidence:observed.evidence};
}

const UPSERT="WITH i AS (INSERT INTO are_eval.benchmark_targets(identity,submitted_url,display_name,is_public) VALUES($1,$2,$3,false) ON CONFLICT(identity) DO NOTHING RETURNING id) SELECT json_build_object('id',COALESCE((SELECT id FROM i),(SELECT id FROM are_eval.benchmark_targets WHERE identity=$1)),'created',EXISTS(SELECT 1 FROM i))::text";
async function record(study,force=false){
 const p=study.parsed;
 const target=await sql(UPSERT,[p.identity,p.url,study.name]);
 if(!target.created&&!force)return {target_id:target.id,existing:true,note:"Existing submissions cannot be re-scored anonymously; prove control of the endpoint hostname to run reassessment."};
 const unknown=Object.fromEntries(CHECK_IDS.map(id=>[id,{status:"unknown",reason:"needs_independent_evidence"}]));
 const q="WITH r AS (INSERT INTO are_eval.benchmark_runs(target_id,evaluator_version,status,score,score_components,observed_tools,manifest_bytes,findings,evidence,maturity_checks,source_version,source_provenance) VALUES($1::uuid,$2,$3,$4::integer,$5::jsonb,$6::integer,$7::integer,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12) RETURNING id,created_at) SELECT row_to_json(r)::text FROM r";
 const run=await sql(q,[target.id,VERSION,study.status,study.score,JSON.stringify(study.parts),
  study.n,study.bytes,JSON.stringify(study.findings),JSON.stringify(study.evidence),
  JSON.stringify(unknown),study.version,study.provenance]);
 return {target_id:target.id,run_id:run.id,created_at:run.created_at,
  status:study.status,score:study.score,score_components:study.parts,
  observed_tools:study.n,manifest_bytes:study.bytes,findings:study.findings,
  evidence:study.evidence,provenance:study.provenance,
  maturity_level:null,maturity_checks_verified:0,maturity_checks_total:CHECK_IDS.length,
  public:false,owner_claim_required:true};
}
const OVERVIEW="SELECT json_build_object('schema','are.benchmark.v2','generated_at',now(),'cohort_count',(SELECT COUNT(*) FROM are_eval.benchmark_study_candidates WHERE cohort_id='ARE100-VALUE-20261115'),'cohort_tools',(SELECT COALESCE(SUM(observed_tool_count),0) FROM are_eval.benchmark_study_candidates WHERE cohort_id='ARE100-VALUE-20261115'),'public_submissions',(SELECT COUNT(*) FROM are_eval.benchmark_targets WHERE is_public),'recent',(SELECT COALESCE(json_agg(x ORDER BY x.created_at DESC),'[]'::json) FROM (SELECT t.id,t.display_name,t.submitted_url,t.owner_proof_status,t.created_at,r.score,r.status,r.observed_tools,r.manifest_bytes,r.created_at AS assessed_at FROM are_eval.benchmark_targets t LEFT JOIN LATERAL (SELECT score,status,observed_tools,manifest_bytes,created_at FROM are_eval.benchmark_runs WHERE target_id=t.id ORDER BY created_at DESC LIMIT 1) r ON true WHERE t.is_public ORDER BY t.created_at DESC LIMIT 70) x),'cohort_preview',(SELECT COALESCE(json_agg(z ORDER BY z.manifest_bytes DESC),'[]'::json) FROM (SELECT repository_key,display_name,tool_count,manifest_bytes,sampling_bucket,stage,repository_match_verified,source_probe_checked_at FROM are_eval.benchmark_study_candidates WHERE cohort_id='ARE100-VALUE-20261115' ORDER BY manifest_bytes DESC LIMIT 100) z))::text";
const REPORT="SELECT COALESCE((SELECT json_build_object('target',row_to_json(t),'runs',(SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.created_at DESC),'[]'::json) FROM (SELECT id,created_at,status,score,score_components,observed_tools,manifest_bytes,findings,evidence,maturity_checks,source_version,source_provenance FROM are_eval.benchmark_runs WHERE target_id=t.id ORDER BY created_at DESC LIMIT 20) r)) FROM (SELECT id,display_name,submitted_url,owner_proof_status,created_at FROM are_eval.benchmark_targets WHERE id=$1::uuid AND is_public=true) t),'null'::json)::text";
const HISTORY="SELECT json_build_object('target',(SELECT row_to_json(t) FROM (SELECT id,display_name,submitted_url,owner_proof_status,is_public,created_at FROM are_eval.benchmark_targets WHERE id=$1::uuid) t),'runs',(SELECT COALESCE(json_agg(r ORDER BY r.created_at DESC),'[]'::json) FROM (SELECT id,evaluator_version,status,score,score_components,observed_tools,manifest_bytes,findings,source_provenance,source_version,created_at FROM are_eval.benchmark_runs WHERE target_id=$1::uuid ORDER BY created_at DESC LIMIT 30) r),'events',(SELECT COALESCE(json_agg(e ORDER BY e.created_at DESC),'[]'::json) FROM (SELECT id,event_type,details,created_at FROM are_eval.benchmark_submission_events WHERE target_id=$1::uuid ORDER BY created_at DESC LIMIT 70) e))::text";
async function limitWrites(){
 for(const [bucket,window,max] of [["minute","minute",8],["day","day",90]]){
  const q="WITH t AS (INSERT INTO are_eval.benchmark_request_budget(bucket,window_at,used) VALUES($1,date_trunc($2::text,now()),1) ON CONFLICT(bucket,window_at) DO UPDATE SET used=are_eval.benchmark_request_budget.used+1 WHERE are_eval.benchmark_request_budget.used<$3 RETURNING used) SELECT json_build_object('allowed',EXISTS(SELECT 1 FROM t))::text";
  const result=await sql(q,[bucket,window,max]);
  if(!result.allowed)throw Error("rate_limit_exceeded");
 }
}
async function ownerRequired(id,token){
 if(!/^[0-9a-f-]{36}$/i.test(id||"")||typeof token!=="string"||!/^[0-9a-f]{64}$/.test(token))throw Error("owner_proof_required");
 const info=await sql("SELECT COALESCE((SELECT json_build_object('hash',owner_token_hash,'verified',verified_at IS NOT NULL) FROM are_eval.benchmark_claims WHERE target_id=$1::uuid),'null'::json)::text",[id]);
 if(!info?.verified||!same(sha(token),info.hash))throw Error("owner_proof_required");
 return true;
}
async function claimStart(id){
 if(!/^[0-9a-f-]{36}$/i.test(id||""))throw Error("invalid_target_id");
 const t=await sql("SELECT COALESCE((SELECT json_build_object('id',id,'url',submitted_url,'proof',owner_proof_status) FROM are_eval.benchmark_targets WHERE id=$1::uuid),'null'::json)::text",[id]);
 if(!t)throw Error("unknown_target");
 if(!["unclaimed","domain_verified"].includes(t.proof))throw Error("invalid_claim_state");
 const challenge="are-verification="+randomBytes(18).toString("hex");
 const q="WITH c AS (INSERT INTO are_eval.benchmark_claims(target_id,challenge_hash,challenge_expires_at) VALUES($1::uuid,$2,now()+interval '30 minutes') ON CONFLICT(target_id) DO UPDATE SET challenge_hash=EXCLUDED.challenge_hash,challenge_expires_at=EXCLUDED.challenge_expires_at,updated_at=now() WHERE are_eval.benchmark_claims.challenge_expires_at<now() AND are_eval.benchmark_claims.updated_at<now()-interval '2 minutes' RETURNING target_id) SELECT json_build_object('issued',EXISTS(SELECT 1 FROM c))::text";
 const result=await sql(q,[id,sha(challenge)]);
 if(!result.issued)throw Error("active_claim_challenge_exists");
 return {target_id:id,challenge,expires_in_minutes:30,
  instruction:"Serve the exact challenge text at https://YOUR-MCP-HOST/.well-known/are-verification.txt on the same MCP host.",
  verification_status:"not_yet_verified"};
}
async function claimVerify(id,challenge){
 if(!/^[0-9a-f-]{36}$/i.test(id||"")||typeof challenge!=="string"||!/^are-verification=[0-9a-f]{36}$/.test(challenge))throw Error("invalid_challenge");
 const t=await sql("SELECT COALESCE((SELECT json_build_object('url',b.submitted_url,'hash',c.challenge_hash,'expires',c.challenge_expires_at,'verified',c.verified_at,'updated',c.updated_at) FROM are_eval.benchmark_targets b JOIN are_eval.benchmark_claims c ON c.target_id=b.id WHERE b.id=$1::uuid),'null'::json)::text",[id]);
 if(!t||new Date(t.expires)<=new Date()||!same(sha(challenge),t.hash)||
    (t.verified&&new Date(t.updated)<=new Date(t.verified)))throw Error("invalid_claim");
 const txt=await readPublicProof(new URL(t.url).origin+"/.well-known/are-verification.txt");
 if(txt.length>4000||!txt.split(/\r?\n/).some(x=>x.trim()===challenge))throw Error("verification_file_mismatch");
 const token=randomBytes(32).toString("hex");
 const proof="domain_control";
 const verified_status="domain_verified";
 const q="WITH v AS (UPDATE are_eval.benchmark_claims SET verified_at=now(),owner_token_hash=$3,proof_kind=$4,challenge_expires_at=now(),updated_at=now() WHERE target_id=$1::uuid AND challenge_hash=$2 AND challenge_expires_at>now() AND (verified_at IS NULL OR updated_at>verified_at) RETURNING target_id) SELECT json_build_object('verified',EXISTS(SELECT 1 FROM v))::text";
 const done=await sql(q,[id,sha(challenge),sha(token),proof]);
 if(!done.verified)throw Error("claim_race_or_expired");
 await sql("WITH u AS (UPDATE are_eval.benchmark_targets SET owner_proof_status=$2,updated_at=now() WHERE id=$1::uuid RETURNING id) SELECT json_build_object('ok',EXISTS(SELECT 1 FROM u))::text",[id,verified_status]);
 return {target_id:id,proof,owner_token:token,
  warning:"This token is displayed once. It confirms HTTPS endpoint hostname control, not engineering quality or ARE certification."};
}
async function ownedTarget(id){
 return sql("SELECT COALESCE((SELECT json_build_object('url',submitted_url) FROM are_eval.benchmark_targets WHERE id=$1::uuid),'null'::json)::text",[id]);
}

export function assertFields(body,keys){
 if(!body||typeof body!=="object"||Array.isArray(body)||
    Object.keys(body).some(k=>!keys.includes(k))||
    keys.some(k=>!Object.hasOwn(body,k)))throw Error("invalid_request_schema");
}
async function postBody(req){
 if(Number(req.headers.get("content-length")||0)>20000)throw Error("request_too_large");
 const raw=await req.text();
 if(raw.length>20000)throw Error("request_too_large");
 let data;try{data=JSON.parse(raw);}catch{throw Error("invalid_json_body");}
 if(!data||typeof data!=="object"||Array.isArray(data))throw Error("invalid_json_body");
 return data;
}
async function serve(req){
 const u=new URL(req.url);
 const origin=req.headers.get("origin");
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{
  ...(ORIGINS.has(origin)?{"Access-Control-Allow-Origin":origin}:{}),
  "Access-Control-Allow-Methods":"GET,POST,OPTIONS",
  "Access-Control-Allow-Headers":"Content-Type","Access-Control-Max-Age":"600"}});
 if(req.method==="GET"){
  if(u.pathname==="/v2/health")return res(req,200,{ok:true,source:"neon",version:VERSION});
  if(u.pathname==="/v2/overview")return res(req,200,await sql(OVERVIEW));
  if(u.pathname==="/v2/report"){
   const id=u.searchParams.get("id")||"";
   if(!/^[0-9a-f-]{36}$/i.test(id))throw Error("invalid_target_id");
   const report=await sql(REPORT,[id]);
   return res(req,report?200:404,report||{error:"not_public_or_not_found"});
  }
  return res(req,404,{error:"not_found"});
 }
 if(req.method!=="POST")return res(req,405,{error:"method_not_allowed"});
 if(origin&&!ORIGINS.has(origin))return res(req,403,{error:"origin_not_allowed"});
 await limitWrites();
 const body=await postBody(req);
 if(u.pathname==="/v2/submit"){
  assertFields(body,["endpoint"]);
  const prepared=await prepare(body.endpoint);
  return res(req,201,{ok:true,...await record(prepared)});
 }
 if(u.pathname==="/v2/claim/start"){
  assertFields(body,["target_id"]);
  return res(req,200,{ok:true,...await claimStart(body.target_id)});
 }
 if(u.pathname==="/v2/claim/verify"){
  assertFields(body,["target_id","challenge"]);
  return res(req,200,{ok:true,...await claimVerify(body.target_id,body.challenge)});
 }
 if(u.pathname==="/v2/history"){
  assertFields(body,["target_id","owner_token"]);
  await ownerRequired(body.target_id,body.owner_token);
  return res(req,200,{ok:true,...await sql(HISTORY,[body.target_id])});
 }
 if(u.pathname==="/v2/reassess"){
  assertFields(body,["target_id","owner_token"]);
  await ownerRequired(body.target_id,body.owner_token);
  const t=await ownedTarget(body.target_id);
  if(!t)throw Error("unknown_target");
  const prepared=await prepare(t.url);
  return res(req,200,{ok:true,...await record(prepared,true),authorized_retest:true});
 }
 if(u.pathname==="/v2/publish"){
  assertFields(body,["target_id","owner_token","public"]);
  await ownerRequired(body.target_id,body.owner_token);
  if(typeof body.public!=="boolean")throw Error("public_boolean_required");
  const update=await sql("WITH u AS (UPDATE are_eval.benchmark_targets SET is_public=$2,updated_at=now() WHERE id=$1::uuid RETURNING id,is_public) SELECT row_to_json(u)::text FROM u",[body.target_id,body.public]);
  return res(req,200,{ok:true,...update});
 }
 if(u.pathname==="/v2/evidence"){
  assertFields(body,["target_id","owner_token","evidence"]);
  await ownerRequired(body.target_id,body.owner_token);
  if(!Array.isArray(body.evidence)||!body.evidence.length||body.evidence.length>12)throw Error("invalid_evidence_count");
  for(const e of body.evidence){
   if(!CHECK_IDS.includes(e.check_id)||!["documented","inspected","tested","self_reported"].includes(e.kind)||
    typeof e.url!=="string"||e.url.length>500||!/^https:\/\//.test(e.url)||
    typeof e.note!=="string"||e.note.length>600)throw Error("invalid_evidence");
  }
  const evidence={evidence:body.evidence,trust:"submitter_unverified"};
  const event=await sql("WITH e AS (INSERT INTO are_eval.benchmark_submission_events(target_id,event_type,details) VALUES($1::uuid,'creator_evidence_submitted',$2::jsonb) RETURNING id) SELECT json_build_object('event_id',(SELECT id FROM e))::text",[body.target_id,JSON.stringify(evidence)]);
  return res(req,201,{ok:true,...event,independently_verified:0,review_status:"awaiting_independent_review"});
 }
 return res(req,404,{error:"not_found"});
}
export default {async fetch(req){
 try{return await serve(req);}
 catch(e){
  const error=String(e?.message||"unknown").slice(0,90);
  const expected=/^(invalid_|not_|request_|rate_limit|public_|github_|https_|mcp_|verification_|claim_|active_claim|owner_proof)/.test(error);
  if(!expected)console.error("ARE Benchmark function error:",error);
  return res(req,expected?(error==="rate_limit_exceeded"?429:400):503,
    {ok:false,error:expected?error:"service_temporarily_unavailable"});
 }
}};
