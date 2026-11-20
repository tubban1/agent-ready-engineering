import {createHash} from "node:crypto";
import {isIP} from "node:net";
import {lookup} from "node:dns/promises";
import {RAW_OBSERVATION_PROTOCOL} from "./evaluation-contract-v51.mjs";

// Each SQL expression returns a single JSON cell, matching the Neon Function SQL adapter.
export const CAPTURE_RESERVE_SQL=[
"WITH permitted AS (SELECT id FROM are_eval.private_assessment_tasks WHERE token_sha256=$1 AND id=$2::uuid",
"AND revoked_at IS NULL AND expires_at>now() AND plan_snapshot->>'auth_mode'='NONE'),",
"saved AS (INSERT INTO are_eval.private_mcp_capture_usage(task_id,used_count,window_used,window_started_at)",
"SELECT id,1,1,now() FROM permitted ON CONFLICT(task_id) DO UPDATE SET",
"used_count=are_eval.private_mcp_capture_usage.used_count+1,",
"window_used=CASE WHEN are_eval.private_mcp_capture_usage.window_started_at<now()-interval '1 minute'",
"THEN 1 ELSE are_eval.private_mcp_capture_usage.window_used+1 END,",
"window_started_at=CASE WHEN are_eval.private_mcp_capture_usage.window_started_at<now()-interval '1 minute'",
"THEN now() ELSE are_eval.private_mcp_capture_usage.window_started_at END",
"WHERE are_eval.private_mcp_capture_usage.used_count<80 AND",
"(are_eval.private_mcp_capture_usage.window_started_at<now()-interval '1 minute'",
"OR are_eval.private_mcp_capture_usage.window_used<8) RETURNING task_id,used_count)",
"SELECT COALESCE((SELECT row_to_json(s) FROM saved s),'null'::json)::text"
].join(" ");
export const CAPTURE_INSERT_SQL=[
"WITH permitted AS (SELECT id FROM are_eval.private_assessment_tasks WHERE token_sha256=$1 AND id=$2::uuid",
"AND revoked_at IS NULL AND expires_at>now()),",
"saved AS (INSERT INTO are_eval.private_mcp_observations(task_id,endpoint,method,tool_name,content,sha256)",
"SELECT p.id,$3,$4,$5,$6,$7 FROM permitted p",
"RETURNING id,task_id,method,tool_name,content,sha256,observed_at)",
"SELECT COALESCE((SELECT row_to_json(s) FROM saved s),'null'::json)::text"
].join(" ");
export const CAPTURE_READ_SQL=[
"SELECT json_build_object('rows',COALESCE(json_agg(row_to_json(x)),'[]'::json))::text",
"FROM (SELECT o.id,o.task_id,o.method,o.tool_name,o.content,o.sha256",
"FROM are_eval.private_mcp_observations o",
"JOIN are_eval.private_assessment_tasks t ON t.id=o.task_id",
"WHERE t.token_sha256=$1 AND t.id=$2::uuid",
"AND o.id=ANY($3::uuid[]) AND t.revoked_at IS NULL AND t.expires_at>now()",
"ORDER BY o.observed_at DESC LIMIT 100) x"
].join(" ");
const sha=x=>createHash("sha256").update(x).digest("hex");
const id=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const safeName=/^[A-Za-z0-9_.\/-]{1,128}$/;
const forbiddenName=/(?:delete|remove|send|purchase|payment|charge|order|write|update|modify|create|register|refund|execute|shell|run_command|terminal|upload|deploy|grant|transfer|approve|post|publish|reserve|booking|subscribe|cancel)/i;
const sensitive=/(sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|Bearer\s+[A-Za-z0-9._-]{16,}|(?:api[_-]?key|authorization|access_token|refresh_token)["']?\s*[:=]\s*["']?[A-Za-z0-9_\-]{12,})/i;
const fail=code=>{const e=new Error(code);e.code=code;throw e};
function allowedEndpoint(endpoint){
 try{
  const u=new URL(endpoint);
  return u.protocol==="https:"&&!u.username&&!u.password&&!u.search&&!u.hash&&!u.port&&
   !isIP(u.hostname)&&u.hostname.includes(".")&&!/(?:^localhost$|\.localhost$|\.local$|\.internal$|\.onion$|\.test$|\.invalid$|\.example$)/i.test(u.hostname)&&
   endpoint.length<480;
 }catch{return false}
}
function privateIp(ip){
 if(ip.includes(":")){
  const s=ip.toLowerCase();
  return s==="::1"||s==="::"||s.startsWith("fc")||s.startsWith("fd")||
   s.startsWith("fe8")||s.startsWith("fe9")||s.startsWith("fea")||s.startsWith("feb")||
   s.startsWith("::ffff:");
 }
 const parts=ip.split(".").map(Number);
 if(parts.length!==4)return true;
 const [a,b]=parts;
 return a===0||a===10||a===127||a>=224||a===169&&b===254||
   a===172&&b>=16&&b<=31||a===192&&b===168||a===100&&b>=64&&b<=127||
   a===192&&b===0||a===198&&[18,19].includes(b);
}
async function publicDnsOnly(endpoint){
 const host=new URL(endpoint).hostname;
 let addresses;
 try{addresses=await lookup(host,{all:true,verbatim:true})}
 catch{fail("target_dns_unavailable_for_safe_capture")}
 if(!addresses.length||addresses.some(x=>privateIp(x.address)))fail("target_dns_not_public");
}
async function limitedText(res,limit){
 if(!res.body)fail("target_response_empty");
 const reader=res.body.getReader();
 let size=0,parts=[];
 try{
  for(;;){
   const {done,value}=await reader.read();
   if(done)break;
   size+=value.byteLength;
   if(size>limit)fail("target_response_too_large");
   parts.push(value);
  }
 }finally{reader.releaseLock()}
 return new TextDecoder().decode(Buffer.concat(parts.map(x=>Buffer.from(x))));
}
async function fetchRaw(endpoint,method,params,fetcher){
 const request={jsonrpc:"2.0",id:1,method,params};
 const wire=JSON.stringify(request);
 if(sensitive.test(wire))fail("capture_request_contains_possible_credentials");
 const res=await fetcher(endpoint,{method:"POST",headers:{
   "Content-Type":"application/json","Accept":"application/json,text/event-stream",
   "MCP-Protocol-Version":"2025-06-18","User-Agent":"ARE-independent-readonly-capture/5.0"},
  body:wire,redirect:"error",cache:"no-store",signal:AbortSignal.timeout(12000)});
 if(res.status!==200)fail(res.status===401||res.status===403?"target_requires_user_auth":"target_capture_http_failure");
 if(Number(res.headers.get("content-length")||0)>64000)fail("target_response_too_large");
 let body=await limitedText(res,64000);
 const rawWire=body;
 if(res.headers.get("content-type")?.includes("text/event-stream")){
  const events=body.split(/\r?\n/).filter(line=>line.startsWith("data:"));
  if(!events.length)fail("mcp_sse_capture_unavailable");
  body=events.at(-1).slice(5).trim();
 }
 let parsed;
 try{parsed=JSON.parse(body)}catch{fail("unparseable_target_mcp_response")}
 if(parsed.jsonrpc!=="2.0"||parsed.id!==request.id||(!parsed.result&&!parsed.error))
  fail("unexpected_mcp_result_envelope");
 if(sensitive.test(rawWire))fail("capture_contains_possible_credentials");
 const content=JSON.stringify({protocol:RAW_OBSERVATION_PROTOCOL,observed_at:new Date().toISOString(),
  transport:res.headers.get("content-type")?.includes("event-stream")?"sse":"http",
  endpoint,request,response:parsed,wire_request:wire,wire_response:rawWire});
 if(content.length>70000)fail("capture_content_oversize");
 return {request,response:parsed,content,sha256:sha(content)};
}
export async function captureReadOnly(input,{assignment,tokenDigest,sql,fetcher=fetch,dnsCheck=publicDnsOnly}){
 const endpoint=assignment?.plan_snapshot?.runtime_endpoint||assignment?.screened_endpoint||"";
 if(!allowedEndpoint(endpoint))fail("screened_https_endpoint_required");
 if(assignment?.plan_snapshot?.auth_mode!=="NONE")
  fail("oauth_or_api_key_targets_require_human_host_capture");
 if(input?.method!=="tools/list"&&input?.method!=="tools/call")
  fail("capture_method_not_allowed");
 if(input.cursor!==undefined&&(input.method!=="tools/list"||typeof input.cursor!=="string"||
    input.cursor.length<1||input.cursor.length>500))fail("invalid_tools_list_cursor");
 if(input.method==="tools/call"){
  if(!safeName.test(input.tool_name||"")||forbiddenName.test(input.tool_name))
   fail("unapproved_tool_name_for_read_capture");
  if(input.user_authorized!==true||!input.arguments||typeof input.arguments!=="object"||
     Array.isArray(input.arguments)||JSON.stringify(input.arguments).length>5000)
   fail("read_call_requires_explicit_authorization_and_small_args");
 }
 await dnsCheck(endpoint);
 const reserved=await sql(CAPTURE_RESERVE_SQL,[tokenDigest,assignment.id]);
 if(!reserved)fail("capture_quota_or_task_expired");
 if(input.method==="tools/call"){
  const discovery=await fetchRaw(endpoint,"tools/list",{},fetcher);
  const candidate=discovery.response?.result?.tools?.find(t=>t.name===input.tool_name);
  if(!candidate||candidate.annotations?.readOnlyHint!==true||
    candidate.annotations?.destructiveHint!==false||
    candidate.annotations?.openWorldHint!==false)
   fail("tool_not_explicitly_declared_safe_readonly");
 }
 const name=input.method==="tools/call"?input.tool_name:null;
 const raw=await fetchRaw(endpoint,input.method,
  input.method==="tools/call"?{name,arguments:input.arguments}:input.cursor?{cursor:input.cursor}:{},fetcher);
 const row=await sql(CAPTURE_INSERT_SQL,
  [tokenDigest,assignment.id,endpoint,input.method,name,raw.content,raw.sha256]);
 if(!row||!id.test(row.id))fail("capture_persistence_failed");
 return {ok:true,capture_id:row.id,
  artifact:{id:"are-capture-"+row.id,kind:"trace",capture_id:row.id,sha256:raw.sha256,
   provenance:"ARE server-origin observation; fetched from screened endpoint, no user credentials",
   content:raw.content},
  tool_name:name,method:input.method,endpoint,read_only:true,
  warning:"This confirms raw target bytes, not independent business correctness or source-to-deployment identity."};
}
export function validCaptureId(x){return id.test(x||"")}
