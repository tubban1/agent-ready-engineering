import {randomBytes,createHash} from "node:crypto";
import * as Q from "./pipeline-queries.mjs";
import {estimatePlan} from "./pipeline-service.mjs";
const sha=x=>createHash("sha256").update(x).digest("hex");
const fail=code=>{const e=new Error(code);e.code=code;throw e};
const valid=(s,min,max)=>typeof s==="string"&&s.trim().length>=min&&s.length<=max;
const sessionPattern=/^ares_[A-Za-z0-9_-]{43}$/;
function getCookie(req){
 const value=req.headers.get("cookie")||"";
 const match=value.split(";").map(s=>s.trim()).find(s=>s.startsWith("are_tester="));
 if(!match)return null;
 const secret=match.slice("are_tester=".length);
 return sessionPattern.test(secret)?sha(secret):null;
}
async function parseJson(req){
 const raw=await req.text();
 if(Buffer.byteLength(raw)>3000)fail("tester_payload_too_large");
 try{return JSON.parse(raw)}catch{fail("invalid_json")}
}
export async function publicTesterAction(path,req,sql){
 if(path==="/v3/tester/pool"&&req.method==="GET"){
  const data=await sql(Q.PUBLIC_POOL);
  return {status:200,data:{ok:true,projects:data?.projects||[],stats:data?.stats||{}}};
 }
 if(path==="/v3/tester/me"&&req.method==="GET"){
  const sessionHash=getCookie(req);
  if(!sessionHash)return {status:401,data:{error:"tester_session_required"}};
  const session=await sql(Q.TESTER_SESSION_READ,[sessionHash]);
  if(!session)return {status:401,data:{error:"tester_session_expired"}};
  const tasks=await sql(Q.TESTER_MY_TASKS,[sessionHash]);
  return {status:200,data:{ok:true,tester:session,tasks:tasks?.tasks||[],private:true}};
 }
 if(path==="/v3/tester/session"&&req.method==="POST"){
  const prevHash=getCookie(req);
  if(prevHash){
   const previous=await sql(Q.TESTER_SESSION_READ,[prevHash]);
   if(previous)return {status:200,data:{ok:true,tester:previous,reused:true}};
  }
  const d=await parseJson(req);
  if(!valid(d?.display_name,2,80)||!valid(d.organization,2,150)||
     /[<>\r\n]/.test(d.display_name+d.organization))fail("invalid_tester_profile");
  const secret="ares_"+randomBytes(32).toString("base64url");
  const session=await sql(Q.TESTER_SESSION_CREATE,[sha(secret),d.display_name.trim(),d.organization.trim()]);
  if(!session)return {status:429,data:{error:"tester_sessions_rate_limited"}};
  return {status:200,data:{ok:true,tester:session,created:true},
   setCookie:"are_tester="+secret+"; HttpOnly; Secure; SameSite=Lax; Path=/v3; Max-Age=1209600"};
 }
 if(path==="/v3/tester/rotate"&&req.method==="POST"){
  // A changing, cookie-authenticated action is never exposed to cross-site forms.
  if(req.headers.get("origin")!=="https://are.world2.co")
   return {status:403,data:{error:"same_origin_required"}};
  const sessionHash=getCookie(req);
  if(!sessionHash)return {status:401,data:{error:"tester_session_required"}};
  const data=await parseJson(req);
  if(!data||Object.keys(data).sort().join(",")!=="confirmation,task_id"||
     !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.task_id||"")||
     data.confirmation!=="ROTATE MY TASK TOKEN")fail("explicit_rotation_confirmation_required");
  const secret="aret_"+randomBytes(32).toString("base64url");
  const task=await sql(Q.TESTER_ROTATE_TASK,[sessionHash,data.task_id,sha(secret)]);
  if(!task)return {status:409,data:{error:"task_unavailable_or_rotation_cooldown",
   hint:"Only an active, session-owned task can be rotated; retry after one minute if just rotated."}};
  return {status:200,data:{ok:true,task,task_token:secret,visible_once:true,
   rotated:true,old_token_invalidated:true,task_progress_preserved:true,
   plan:estimatePlan(Number(task.plan_snapshot?.declared_tool_count??0),
    task.plan_snapshot?.auth_mode||"UNKNOWN",task.plan_snapshot?.risk_level||"LOW"),
   private:true,published:false}};
 }
 if(path==="/v3/tester/claim"&&req.method==="POST"){
  const sessionHash=getCookie(req);
  if(!sessionHash)return {status:401,data:{error:"tester_session_required"}};
  const d=await parseJson(req),repo=d?.repository_key??"";
  if(typeof repo!=="string"||repo.length>160||(repo&&!/^[a-z\d_.-]+\/[a-z\d_.-]+$/i.test(repo))||
     ![90,150,240].includes(d.max_minutes)||typeof d.allow_oauth!=="boolean")
    fail("invalid_claim_request");
  const secret="aret_"+randomBytes(32).toString("base64url");
  const task=await sql(Q.PUBLIC_CLAIM,[sessionHash,repo,sha(secret),d.max_minutes,d.allow_oauth]);
  if(!task)return {status:409,data:{error:"no_eligible_matching_project_or_parallel_limit_reached",
    hint:"Available project may be claimed, your maximum is 3 active and 6 daily projects, and the global pilot cap is 12 claims/hour"}};
  return {status:200,data:{ok:true,task,task_token:secret,visible_once:true,private:true,
   plan:estimatePlan(Number(task.plan_snapshot?.declared_tool_count??0),
    task.plan_snapshot?.auth_mode||"UNKNOWN",task.plan_snapshot?.risk_level||"LOW"),
   mcp_url:"https://are.world2.co/mcp",published:false}};
 }
 return {status:404,data:{error:"unknown_tester_operation"}};
}
