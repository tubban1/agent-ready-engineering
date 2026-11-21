import vm from "node:vm";
import {pipelinePage} from "./pipeline-page.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {makeHandler,PRODUCT_CHECKS} from "./index.mjs";
import {estimatePlan,validateCoverage} from "./pipeline-service.mjs";
import * as Q from "./pipeline-queries.mjs";
const h=x=>createHash("sha256").update(x).digest("hex");
const owner="ario_"+("Z".repeat(64)),task="aret_"+("B".repeat(43));
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
 const r=await api(request("/v3/board"));
 assert.equal(r.status,200);
 assert.equal(r.headers.get("cache-control"),"no-store");
 const html=await r.text();
 for(const section of ["项目过滤","生成一个测试任务","项目测试进度","独立结果验证","待发布信息"])
   assert.ok(html.includes(section),section);
 assert.ok(html.includes("issueButton"));
 assert.ok(html.includes("一个项目"));
 assert.ok(!html.includes("个人邀请 Token"));
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
test("only Owner can generate one project-scoped task Token and complete-prompt metadata",async()=>{
 const calls=[],sql=async(query,args=[])=>{
  calls.push({query,args});
  if(query===Q.FILTER)return {repository_key:repo,decision:"ELIGIBLE"};
  if(query===Q.ISSUE)return taskRow;
  if(query===Q.POOL)return {projects:[]};
  return null;
 };
 const api=makeHandler({env,sql});
 const pool={repository_key:repo,decision:"ELIGIBLE",reason:"read-only public MCP",
   tool_count:3,auth_mode:"NONE",risk_level:"LOW",runtime_endpoint:"https://agentconnectors.dev/mcp",priority:80};
 assert.equal((await api(request("/v3/pool/filter",undefined,pool))).status,401);
 assert.equal((await api(request("/v3/pool/filter",owner,pool))).status,200);
 const issue={repository_key:repo,tester_id:"colleague-01",tester_organization:"ARE Research",
   max_minutes:90,allow_oauth:false,expires_days:7};
 assert.equal((await api(request("/v3/tasks/issue",undefined,issue))).status,401);
 const result=await unpack(await api(request("/v3/tasks/issue",owner,issue)));
 assert.equal(result.task.repository_key,repo);
 assert.match(result.task_token,/^aret_[a-zA-Z0-9_-]{43}$/);
 assert.equal(result.visible_once,true);
 assert.equal(result.plan.estimated_minutes,75);
 const stored=calls.find(x=>x.query===Q.ISSUE).args;
 assert.equal(stored[0],repo);
 assert.equal(stored[3],h(result.task_token));
 assert.ok(!JSON.stringify(result.task).includes(result.task_token));
 assert.equal((await api(request("/v2/draw",owner,{invite_token:"any"}))).status,404);
 assert.equal((await api(request("/v2/invites/create",owner,{}))).status,404);
});
test("an ineligible, claimed or time-exceeding project cannot issue a second Token",async()=>{
 const api=makeHandler({env,sql:async query=>query===Q.ISSUE?null:null});
 const obj={repository_key:repo,tester_id:"colleague-01",tester_organization:"ARE Research",
  max_minutes:90,allow_oauth:true,expires_days:1};
 const r=await api(request("/v3/tasks/issue",owner,obj));
 assert.equal(r.status,409);
 assert.equal((await r.json()).error,"project_not_eligible_or_quality_source_unverified_or_exceeds_test_budget");
});
test("task-only credential cannot read owner verification, release or other tasks",async()=>{
 const api=makeHandler({env,sql:async()=>{throw Error("not authorized")}});
 for(const path of ["/v3/review","/v3/pool","/v3/tasks"]){
  assert.equal((await api(request(path,task))).status,401);
 }
 for(const path of ["/v3/release/draft","/v3/release/approve","/v3/review/decision"]){
  assert.equal((await api(request(path,task,{}))).status,401);
 }
});
test("owner verified review requires actual complete tool inventory; draft remains private",async()=>{
 const calls=[],report={runs:[{id:uid,state:"READY_FOR_REVIEW",decisive_count:1,verified_task_count:1,
  integrity_readiness:"READY_FOR_REVIEW",integrity_metrics:{raw_agent_tasks:1,raw_tool_traces:1},
  tool_coverage:[{name:"get",status:"PASS",oracle_ref:"source-oracle"}],
  blockers:[],test_metadata:{discovered_tool_count:1},
  findings:PRODUCT_CHECKS.map(check_id=>({check_id,status:"NOT_APPLICABLE"})),
  evidence_artifacts:[{id:"test",kind:"trace",content:"fixture"}],
  source_binding:{verified:true,evidence_ref:"test"},
  agent_tasks:[{goal:"verify tool",status:"PASS"}]}]};
 const sql=async(query,args=[])=>{
  calls.push({query,args});
  if(query===Q.REVIEWS)return report;
  if(query===Q.REVIEW_INSERT)return {run_id:uid,decision:args[1]};
  if(query===Q.PUBLICATION_DRAFT)return {run_id:uid,status:"DRAFT"};
  if(query===Q.PUBLICATION_APPROVE)return {run_id:uid,status:"APPROVED_FOR_MANUAL_RELEASE"};
  return null;
 };
 const api=makeHandler({env,sql});
 const verify=await api(request("/v3/review/decision",owner,{id:uid,decision:"VERIFIED",explanation:"all source and tool evidence inspected"}));
 assert.equal(verify.status,200);
 const draft=await unpack(await api(request("/v3/release/draft",owner,{id:uid,summary:"Private evidence-only draft"})));
 assert.equal(draft.published,false);
 const denied=await api(request("/v3/release/approve",owner,{id:uid,confirm:"YES"}));
 assert.equal(denied.status,400);
 const approved=await unpack(await api(request("/v3/release/approve",owner,{id:uid,confirm:"I APPROVE MANUAL PUBLICATION"})));
 assert.equal(approved.published,false);
 assert.equal(approved.approval.status,"APPROVED_FOR_MANUAL_RELEASE");
 report.runs=[{...report.runs[0],tool_coverage:[],test_metadata:{discovered_tool_count:1}}];
 const incomplete=await api(request("/v3/review/decision",owner,{id:uid,decision:"VERIFIED",explanation:"attempt to approve incomplete evidence"}));
 assert.equal(incomplete.status,400);
});
test("no legacy routes, no auto-public third-party publication, private result validator still enforces 32 checks",async()=>{
 const api=makeHandler({env,sql:async()=>{throw Error("must not run")}});
 assert.equal((await api(request("/v1/submit",owner,{}))).status,404);
 assert.equal((await api(request("/v1/owner",owner))).status,404);
 assert.equal((await api(request("/v1/tasks/create",owner,{}))).status,404);
 assert.equal((await api(request("/v2/invites/create",owner,{}))).status,404);
 assert.equal((await api(request("/v2/draw",undefined,{}))).status,401);
 assert.equal(PRODUCT_CHECKS.length,32);
 const publish=await api(request("/v3/release/publish",owner,{}));
 assert.equal(publish.status,404);
});

test("one active token per project is enforced by atomic row lock; VERIFIED consumes token",()=>{
 assert.match(Q.ISSUE,/FOR UPDATE OF p/);
 assert.match(Q.ISSUE,/claimed_task_id IS NULL/);
 assert.match(Q.ISSUE,/UPDATE are_eval.private_project_pool/);
 assert.match(Q.REVIEW_INSERT,/UPDATE are_eval.private_assessment_tasks/);
 assert.match(Q.REVIEW_INSERT,/x.decision='VERIFIED'/);
 assert.doesNotMatch(Q.ISSUE,/invitation|invite_id|draw/i);
 assert.doesNotMatch(Q.TASK_LIST,/invite_id/);
});

test("generated Agent prompt is genuinely generic across unrelated MCP projects",()=>{
 const html=pipelinePage();
 const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script,"script must be embedded");
 const start=script.indexOf("function prompt(task,secret,plan){");
 const end=script.indexOf("\nasync function load()",start);
 assert.ok(start>=0&&end>start,"prompt function must exist");
 const generator=vm.runInNewContext(script.slice(start,end)+"\nprompt");
 const plans={estimated_minutes:135,tool_count:23,auth_mode:"OAUTH"};
 for(const repoName of ["alpha/research-api","beta/robotics-mcp"]){
  const message=generator({repository_key:repoName,id:"11111111-2222-4333-8444-555555555555",
    assignee_id:"colleague-01"},"aret_"+"Q".repeat(43),plans);
  assert.ok(message.includes("https://github.com/"+repoName));
  assert.ok(message.includes("aret_"+"Q".repeat(43)));
  assert.ok(message.includes("are_submit_assessment"));
  assert.ok(message.includes("are_checkpoint"));
  assert.ok(message.includes("OAuth"));
  assert.ok(message.includes("BLOCKED_AUTH"));
  assert.ok(message.includes("BLOCKED_ENVIRONMENT"));
  assert.ok(message.includes("BLOCKED_DESIGN"));
  assert.ok(message.includes("FAIL"));
  assert.ok(message.includes("NOT_TESTED"));
  assert.ok(message.includes("10 分钟"));
  assert.ok(message.includes("最多重试 2 次"));
  assert.ok(message.includes("最小可复现步骤"));
  assert.ok(message.includes("前后状态"));
  assert.ok(message.includes("继续剩余工具"));
  assert.doesNotMatch(message,/Planner\s*5D|如果遇到类似|目录后位置失效|拖放坐标漂移/iu);
  assert.doesNotMatch(message,/成功等同于 HTTP 200/iu);
 }
});
test("backend stop rules do not force every failure into a tool design finding",()=>{
 const plan=estimatePlan(21,"OAUTH","MEDIUM");
 assert.ok(plan.stop_rules.some(x=>x.includes("BLOCKED_AUTH")));
 assert.ok(plan.stop_rules.some(x=>x.includes("BLOCKED_ENVIRONMENT")));
 assert.ok(plan.stop_rules.some(x=>x.includes("BLOCKED_DESIGN")));
 assert.ok(plan.stop_rules.some(x=>x.includes("independently confirmed")));
 assert.ok(plan.stop_rules.some(x=>x.includes("trace")));
 assert.ok(plan.stop_rules.some(x=>x.includes("Retry only if safe")));
 assert.ok(plan.stop_rules.every(x=>!x.includes("Planner5D")));
});
