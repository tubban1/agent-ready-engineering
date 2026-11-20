import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {makeHandler} from "./index.mjs";
import * as Q from "./pipeline-queries.mjs";
const session="ares_"+("A".repeat(43));
const sessionHash=createHash("sha256").update(session).digest("hex");
const owner="ario_"+("Z".repeat(64));
const hash=createHash("sha256").update(owner).digest("hex");
const tester={id:"11111111-2222-4333-8444-555555555555",tester_id:"tester_abcdef012345",display_name:"Test person",organization:"ARE Independent"};
const task={id:"22222222-2222-4222-8222-222222222222",cohort_id:"ARE100-VALUE-20261115",
  repository_key:"gribstream/gribstream-mcp",assignee_id:tester.tester_id,assessor_organization:tester.organization,
  plan_snapshot:{declared_tool_count:12,auth_mode:"NONE",risk_level:"LOW",runtime_endpoint:"https://gribstream.com/mcp"}};
function rq(path,{method="GET",data,cookie,bearer}={}){
 return new Request("https://example.org"+path,{method,headers:{"Content-Type":"application/json",
  ...(cookie?{"Cookie":cookie}:{}),...(bearer?{"Authorization":"Bearer "+bearer}:{})},
  ...(data===undefined?{}:{body:JSON.stringify(data)})});
}
test("Public page and project pool work without Owner login, but private owner endpoints remain secured",async()=>{
 const sql=async q=>{
  if(q===Q.PUBLIC_POOL)return {projects:[{repository_key:"gribstream/gribstream-mcp",display_name:"GribStream",availability:"AVAILABLE",tool_count:12,auth_mode:"NONE"}],
    stats:{candidates:100,eligible:3,available:2,claimed:1,held:1}};
  throw Error("unexpected database read");
 };
 const api=makeHandler({env:{ARE_INTAKE_OWNER_HASH:hash},sql});
 const r=await api(rq("/v3/board"));
 assert.equal(r.status,200);
 const html=await r.text();
 assert.match(html,/id="testerView"/);
 assert.match(html,/id="testerDashboard"/);
 assert.match(html,/id="login" hidden/);
 assert.match(html,/\/v3\/tester\/claim/);
 assert.match(html,/claimNext/);
 const p=await api(rq("/v3/tester/pool"));
 assert.equal(p.status,200);
 const data=await p.json();
 assert.equal(data.projects[0].repository_key,"gribstream/gribstream-mcp");
 assert.equal(data.stats.available,2);
 assert.ok(!JSON.stringify(data).includes("token_sha256"));
 for(const path of ["/v3/pool","/v3/review","/v3/tasks"]){
  assert.equal((await api(rq(path))).status,401);
 }
});
test("Public tester creates HttpOnly scoped browser session, cookie is not in JSON",async()=>{
 let createArgs=[];
 const sql=async(q,args)=>{
  if(q===Q.TESTER_SESSION_CREATE){createArgs=args;return tester}
  throw Error("unexpected SQL");
 };
 const api=makeHandler({env:{ARE_INTAKE_OWNER_HASH:hash},sql});
 const r=await api(rq("/v3/tester/session",{method:"POST",data:{display_name:"Test person",organization:"ARE Independent"}}));
 assert.equal(r.status,200);
 const body=await r.json();
 assert.equal(body.tester.tester_id,tester.tester_id);
 assert.equal(body.created,true);
 assert.match(r.headers.get("set-cookie"),/^are_tester=ares_[A-Za-z0-9_-]{43}; HttpOnly; Secure; SameSite=Lax/);
 assert.ok(!JSON.stringify(body).includes("ares_"));
 assert.match(createArgs[0],/^[a-f0-9]{64}$/);
});

test("Tester session and owned tasks are isolated by cookie hash",async()=>{
 const got=[];
 const sql=async(q,args)=>{
  got.push({q,args});
  if(q===Q.TESTER_SESSION_READ)return tester;
  if(q===Q.TESTER_MY_TASKS)return {tasks:[{id:task.id,repository_key:task.repository_key,submissions:0}]};
  return null;
 };
 const api=makeHandler({env:{ARE_INTAKE_OWNER_HASH:hash},sql});
 assert.equal((await api(rq("/v3/tester/me"))).status,401);
 const r=await api(rq("/v3/tester/me",{cookie:"are_tester="+session}));
 assert.equal(r.status,200);
 assert.equal((await r.json()).tasks[0].repository_key,task.repository_key);
 assert.equal(got[0].args[0],sessionHash);
 assert.equal(got[1].args[0],sessionHash);
});
test("Tester can claim independently without Owner Token, with per-project one-time Task Token",async()=>{
 const got=[];
 const sql=async(q,args)=>{
  got.push({q,args});if(q===Q.PUBLIC_CLAIM)return task;return null;
 };
 const api=makeHandler({env:{ARE_INTAKE_OWNER_HASH:hash},sql});
 const claim={repository_key:task.repository_key,max_minutes:240,allow_oauth:true};
 assert.equal((await api(rq("/v3/tester/claim",{method:"POST",data:claim}))).status,401);
 const r=await api(rq("/v3/tester/claim",{method:"POST",data:claim,cookie:"are_tester="+session}));
 assert.equal(r.status,200);
 const response=await r.json();
 assert.equal(response.task.repository_key,task.repository_key);
 assert.equal(response.visible_once,true);
 assert.match(response.task_token,/^aret_[A-Za-z0-9_-]{43}$/);
 assert.equal(got[0].q,Q.PUBLIC_CLAIM);
 assert.equal(got[0].args[0],sessionHash);
 assert.equal(got[0].args[1],task.repository_key);
 assert.notEqual(got[0].args[2],response.task_token);
 assert.ok(!JSON.stringify(response.task).includes(response.task_token));
});
test("No eligible match, quota or concurrent race must deny a new claim",async()=>{
 const sql=async(q)=>q===Q.PUBLIC_CLAIM?null:null;
 const api=makeHandler({env:{ARE_INTAKE_OWNER_HASH:hash},sql});
 const r=await api(rq("/v3/tester/claim",{method:"POST",data:{repository_key:"",max_minutes:150,allow_oauth:true},
  cookie:"are_tester="+session}));
 assert.equal(r.status,409);
 assert.equal((await r.json()).error,"no_eligible_matching_project_or_parallel_limit_reached");
});
test("SQL enforces safe parallel claims and one active token per repository, never publishes",()=>{
 assert.match(Q.PUBLIC_CLAIM,/FOR UPDATE OF p SKIP LOCKED/);
 assert.match(Q.PUBLIC_CLAIM,/session_sha256=\$1 AND expires_at>now\(\) FOR UPDATE/);
 assert.match(Q.PUBLIC_CLAIM,/count\(\*\).*< 3/);
 assert.match(Q.PUBLIC_CLAIM,/count\(\*\).*< 6/);
 assert.match(Q.PUBLIC_CLAIM,/count\(\*\).*< 12/);
 assert.match(Q.PUBLIC_CLAIM,/claimed_task_id IS NULL/);
 assert.match(Q.PUBLIC_CLAIM,/UPDATE are_eval.private_project_pool/);
 assert.match(Q.PUBLIC_CLAIM,/NOT EXISTS .*VERIFIED/);
 assert.doesNotMatch(Q.PUBLIC_POOL,/token_sha256|source_binding|private_evaluation_runs/);
});
