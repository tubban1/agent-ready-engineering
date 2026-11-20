import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {makeHandler,PRODUCT_CHECKS} from "./index.mjs";
import {estimatePlan,validateCoverage} from "./pipeline-service.mjs";
import * as Q from "./pipeline-queries.mjs";
const h=x=>createHash("sha256").update(x).digest("hex");
const owner="ario_"+("Z".repeat(64)),invite="arei_"+("A".repeat(43)),task="aret_"+("B".repeat(43));
const env={ARE_INTAKE_OWNER_HASH:h(owner)};
const uid="11111111-2222-4333-8444-555555555555";
const repo="janijegoroff/agent-connectors-mcp";
const taskRow={id:uid,cohort_id:"ARE100-VALUE-20261115",repository_key:repo,
 title:"ARE complete independent MCP evaluation",instructions:"No destructive writes",
 assignee_id:"colleague-01",assessor_organization:"ARE Research",
 expires_at:"2026-12-01T00:00:00Z",created_at:"2026-11-20T00:00:00Z",
 plan_snapshot:{estimated_minutes:75,declared_tool_count:3,auth_mode:"NONE",risk_level:"LOW"}};
const request=(route,token,body)=>new Request("https://neon.example"+route,{
 method:body===undefined?"GET":"POST",headers:{"Content-Type":"application/json",
 ...(token?{Authorization:"Bearer "+token}:{})},
 ...(body===undefined?{}:{body:JSON.stringify(body)})});
const unpack=async r=>r.json();
test("single landing page is unprivileged, has five stages and both roles",async()=>{
 const api=makeHandler({env,sql:async()=>{throw Error("HTML must not read DB");}});
 const r=await api(request("/v2/board"));
 assert.equal(r.status,200);
 assert.equal(r.headers.get("cache-control"),"no-store");
 const html=await r.text();
 for(const section of ["过滤项目","抽取一个适合自己的项目","测试执行进度","独立验证队列","发布信息"])
   assert.ok(html.includes(section),section);
 assert.ok(html.includes("testerRole"));
 assert.ok(html.includes("ownerRole"));
 assert.ok(!html.includes("cfac1539bdc273c5169e44528ac1b11ef4eb3823"));
 assert.equal((await api(request("/v1/tasks/board"))).status,401);
});
test("planning responds to tool count/OAuth/risk and prevents endless retries",()=>{
 assert.equal(estimatePlan(3,"NONE","LOW").estimated_minutes,75);
 assert.ok(estimatePlan(90,"OAUTH","HIGH").estimated_minutes>estimatePlan(3,"NONE","LOW").estimated_minutes);
 assert.equal(estimatePlan(2000,"OAUTH","HIGH").estimated_minutes,240);
 assert.equal(estimatePlan(3,"NONE","LOW").retry_limit_per_operation,2);
 assert.throws(()=>estimatePlan(-1),/invalid_plan_inputs/);
});
test("every tool must have unique named result, blockers have trace, success has oracle",()=>{
 const rows=[
 {name:"read",status:"PASS",oracle_ref:"sha256:independent",trace_ref:"trace-A"},
 {name:"place",status:"BLOCKED_DESIGN",trace_ref:"trace-coordinate-drift",reason:"stable selection absent"},
 {name:"write",status:"BLOCKED_AUTH",trace_ref:"oauth-ui-need-consent",reason:"requires user OAuth"}
 ];
 const blockers=[{cause:"TOOL_DESIGN",reason:"positioning after catalog insertion fails",trace_ref:"trace-coordinate-drift"}];
 const v=validateCoverage(rows,blockers,3);
 assert.deepEqual([v.pass,v.blocked,v.accounted],[1,2,3]);
 assert.throws(()=>validateCoverage(rows,blockers,4),/invalid_tool_inventory/);
 assert.throws(()=>validateCoverage([...rows,rows[0]],blockers,4),/invalid_tool_row/);
 assert.throws(()=>validateCoverage([{name:"test",status:"PASS"}],[],1),/invalid_tool_row/);
 assert.throws(()=>validateCoverage([{name:"test",status:"NOT_TESTED"}],[],1),/invalid_tool_row/);
});
test("owner can filter, mint unique invite and revoke; tester cannot call owner APIs",async()=>{
 const calls=[],sql=async(query,args=[])=>{
  calls.push({query,args});
  if(query===Q.FILTER)return {repository_key:repo,decision:"ELIGIBLE"};
  if(query===Q.INVITE_CREATE)return {id:uid,label:"Pilot",tester_id:"colleague-01"};
  if(query===Q.INVITE_REVOKE)return {id:uid,revoked_at:"now"};
  if(query===Q.INVITES)return {invites:[]};
  return null;
 };
 const api=makeHandler({env,sql});
 const pool={repository_key:repo,decision:"ELIGIBLE",reason:"read-only public MCP",
   tool_count:3,auth_mode:"NONE",risk_level:"LOW",runtime_endpoint:"https://agentconnectors.dev/mcp",priority:80};
 assert.equal((await api(request("/v2/pool/filter",undefined,pool))).status,401);
 assert.equal((await api(request("/v2/pool/filter",owner,pool))).status,200);
 const result=await unpack(await api(request("/v2/invites/create",owner,{
  label:"Pilot",tester_id:"colleague-01",tester_organization:"ARE Research",max_draws:1,expires_days:7
 })));
 assert.equal(result.visible_once,true);
 assert.match(result.invite_token,/^arei_[a-zA-Z0-9_-]{43}$/);
 const stored=calls.find(x=>x.query===Q.INVITE_CREATE).args[0];
 assert.equal(stored,h(result.invite_token));
 assert.equal((await api(request("/v2/invites/revoke",owner,{id:uid}))).status,200);
});
test("tester invitation filters time and OAuth; token is never echoed after draw",async()=>{
 const calls=[],sql=async(query,args=[])=>{
  calls.push({query,args});
  if(query===Q.DRAW)return taskRow;
  return null;
 };
 const api=makeHandler({env,sql});
 assert.equal((await api(request("/v2/draw",undefined,{invite_token:invite,max_minutes:75,allow_oauth:false}))).status,400);
 const result=await unpack(await api(request("/v2/draw",undefined,{invite_token:invite,max_minutes:90,allow_oauth:false})));
 assert.equal(result.task.repository_key,repo);
 assert.match(result.task_token,/^aret_[a-zA-Z0-9_-]{43}$/);
 assert.equal(result.visible_once,true);
 assert.equal(result.plan.estimated_minutes,75);
 assert.equal(calls[0].args[0],h(invite));
 assert.equal(calls[0].args[3],h(result.task_token));
 assert.ok(!JSON.stringify(result.task).includes(result.task_token));
});
test("task-only credential cannot read owner verification, release or invite lists",async()=>{
 const api=makeHandler({env,sql:async()=>{throw Error("not authorized")}});
 for(const path of ["/v2/review","/v2/pool","/v2/invites","/v2/tasks"]){
  assert.equal((await api(request(path,task))).status,401);
 }
 for(const path of ["/v2/release/draft","/v2/release/approve","/v2/review/decision"]){
  assert.equal((await api(request(path,task,{}))).status,401);
 }
});
test("owner verified review requires actual complete tool inventory; draft remains private",async()=>{
 const calls=[],report={runs:[{id:uid,tool_coverage:[{name:"get",status:"PASS",oracle_ref:"source-oracle"}],
  blockers:[],test_metadata:{discovered_tool_count:1}}]};
 const sql=async(query,args=[])=>{
  calls.push({query,args});
  if(query===Q.REVIEWS)return report;
  if(query===Q.REVIEW_INSERT)return {run_id:uid,decision:args[1]};
  if(query===Q.PUBLICATION_DRAFT)return {run_id:uid,status:"DRAFT"};
  if(query===Q.PUBLICATION_APPROVE)return {run_id:uid,status:"APPROVED_FOR_MANUAL_RELEASE"};
  return null;
 };
 const api=makeHandler({env,sql});
 const verify=await api(request("/v2/review/decision",owner,{id:uid,decision:"VERIFIED",explanation:"all source and tool evidence inspected"}));
 assert.equal(verify.status,200);
 const draft=await unpack(await api(request("/v2/release/draft",owner,{id:uid,summary:"Private evidence-only draft"})));
 assert.equal(draft.published,false);
 const denied=await api(request("/v2/release/approve",owner,{id:uid,confirm:"YES"}));
 assert.equal(denied.status,400);
 const approved=await unpack(await api(request("/v2/release/approve",owner,{id:uid,confirm:"I APPROVE MANUAL PUBLICATION"})));
 assert.equal(approved.published,false);
 assert.equal(approved.approval.status,"APPROVED_FOR_MANUAL_RELEASE");
 report.runs=[{...report.runs[0],tool_coverage:[],test_metadata:{discovered_tool_count:1}}];
 const incomplete=await api(request("/v2/review/decision",owner,{id:uid,decision:"VERIFIED",explanation:"attempt to approve incomplete evidence"}));
 assert.equal(incomplete.status,400);
});
test("no legacy routes, no auto-public third-party publication, private result validator still enforces 32 checks",async()=>{
 const api=makeHandler({env,sql:async()=>{throw Error("must not run")}});
 assert.equal((await api(request("/v1/submit",owner,{}))).status,404);
 assert.equal((await api(request("/v1/owner",owner))).status,404);
 assert.equal((await api(request("/v1/tasks/create",owner,{}))).status,404);
 assert.equal(PRODUCT_CHECKS.length,32);
 const publish=await api(request("/v2/release/publish",owner,{}));
 assert.equal(publish.status,404);
});
