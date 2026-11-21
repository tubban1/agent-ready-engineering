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
function rq(path,{method="GET",data,cookie,bearer,origin}={}){
 return new Request("https://example.org"+path,{method,headers:{"Content-Type":"application/json",
  ...(cookie?{"Cookie":cookie}:{}),...(bearer?{"Authorization":"Bearer "+bearer}:{}),
  ...(origin?{"Origin":origin}:{})},
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
test("Tester-owned receipts come from scoped SQL and show review without exposing evidence",async()=>{
 const receipt={submission_id:"33333333-3333-4333-8333-333333333333",
 submitted_at:"2026-11-21T09:00:00Z",evidence_state:"READY_FOR_REVIEW",
 review_decision:"NEEDS_RETEST",review_reason:"Need additional independent oracle",
 criteria_counts:{PASS:5,FAIL:1,UNKNOWN:26},tool_counts:{PASS:3,FAIL:1},total_tools:4};
 const sql=async(q,args)=>{
  if(q===Q.TESTER_SESSION_READ)return tester;
  if(q===Q.TESTER_MY_TASKS){
   assert.equal(args[0],sessionHash);
   return {tasks:[{id:task.id,repository_key:task.repository_key,submissions:1,receipts:[receipt]}]};
  }
  throw Error("unexpected SQL");
 };
 const api=makeHandler({env:{ARE_INTAKE_OWNER_HASH:hash},sql});
 const r=await api(rq("/v3/tester/me",{cookie:"are_tester="+session}));
 assert.equal(r.status,200);
 assert.deepEqual((await r.json()).tasks[0].receipts[0],receipt);
 assert.equal((await api(rq("/v3/tester/me"))).status,401);
 assert.match(Q.TESTER_MY_TASKS,/private_task_submissions/);
 assert.match(Q.TESTER_MY_TASKS,/private_review_verdicts/);
 assert.match(Q.TESTER_MY_TASKS,/s.session_sha256=\$1/);
 assert.doesNotMatch(Q.TESTER_MY_TASKS,/r.report(?!->)/);
 const html=await (await api(rq("/v3/board"))).text();
 for(const word of ["刷新任务状态","复制提交编号","已成功入库","退回补测","预检不会写入数据库"])assert.ok(html.includes(word),word);
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
test("Claimed-task prompt recovery explicitly rotates only the signed-in tester\'s active Task Token",async()=>{
 const got=[];
 const sql=async(query,args)=>{
  got.push({query,args});
  if(query===Q.TESTER_ROTATE_TASK)return {...task,expires_at:"2026-11-23T00:05:18Z",
   plan_snapshot:{...task.plan_snapshot,estimated_minutes:150,token_rotated_at:"2026-11-21T11:00:00Z"}};
  throw Error("unexpected SQL");
 };
 const api=makeHandler({env:{ARE_INTAKE_OWNER_HASH:hash},sql});
 const body={task_id:task.id,confirmation:"ROTATE MY TASK TOKEN"};
 const origin="https://are.world2.co";
 const rotate=(cookie,originValue,data=body)=>rq("/v3/tester/rotate",{
  method:"POST",cookie,data,origin:originValue});
 const before=await api(rotate("are_tester="+session,"https://evil.example"));
 assert.equal(before.status,403);
 const noCookie=await api(rotate(undefined,origin));
 assert.equal(noCookie.status,401);
 const forged=await api(rotate("are_tester="+session,origin,{...body,repository_key:"another/repo"}));
 assert.equal(forged.status,400);
 const noConfirm=await api(rotate("are_tester="+session,origin,{task_id:task.id,confirmation:"YES"}));
 assert.equal(noConfirm.status,400);
 assert.equal(got.length,0,"unauthorized/unclear actions must not touch database");
 const issued=await api(rotate("are_tester="+session,origin));
 assert.equal(issued.status,200);
 const data=await issued.json();
 assert.equal(data.task.id,task.id);
 assert.equal(data.task.repository_key,task.repository_key);
 assert.equal(data.task.assignee_id,task.assignee_id);
 assert.equal(data.task.expires_at,"2026-11-23T00:05:18Z");
 assert.equal(data.rotated,true);
 assert.equal(data.old_token_invalidated,true);
 assert.equal(data.task_progress_preserved,true);
 assert.equal(data.visible_once,true);
 assert.match(data.task_token,/^aret_[A-Za-z0-9_-]{43}$/);
 assert.equal(got[0].query,Q.TESTER_ROTATE_TASK);
 assert.equal(got[0].args[0],sessionHash);
 assert.equal(got[0].args[1],task.id);
 assert.equal(got[0].args[2],createHash("sha256").update(data.task_token).digest("hex"));
 assert.ok(!JSON.stringify(data.task).includes(data.task_token));
});
test("Rotation fails closed for inactive, mismatched or recently rotated tasks",async()=>{
 const api=makeHandler({env:{ARE_INTAKE_OWNER_HASH:hash},
  sql:async query=>query===Q.TESTER_ROTATE_TASK?null:null});
 const r=await api(rq("/v3/tester/rotate",{method:"POST",
  cookie:"are_tester="+session,origin:"https://are.world2.co",
  data:{task_id:task.id,confirmation:"ROTATE MY TASK TOKEN"}}));
 assert.equal(r.status,409);
 assert.equal((await r.json()).error,"task_unavailable_or_rotation_cooldown");
 assert.match(Q.TESTER_ROTATE_TASK,/s.session_sha256=\$1/);
 assert.match(Q.TESTER_ROTATE_TASK,/t.id=\$2::uuid/);
 assert.match(Q.TESTER_ROTATE_TASK,/t.revoked_at IS NULL AND t.expires_at>now\(\)/);
 assert.match(Q.TESTER_ROTATE_TASK,/FOR UPDATE OF t/);
 assert.match(Q.TESTER_ROTATE_TASK,/token_rotated_at/);
 assert.match(Q.TESTER_ROTATE_TASK,/UPDATE are_eval.private_assessment_tasks/);
 assert.doesNotMatch(Q.TESTER_ROTATE_TASK,/INSERT INTO are_eval.private_assessment_tasks|DELETE FROM/);
 const html=await (await api(rq("/v3/board"))).text();
 for(const snippet of ["重新生成并复制完整提示词","旧 Task Token 将立即失效","/v3/tester/rotate",
  "完整评测提示词（新领取或重新生成后显示）"])assert.ok(html.includes(snippet),snippet);
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
