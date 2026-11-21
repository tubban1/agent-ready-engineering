import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {authorizationRequestData,authRequired,AUTH_REQUEST_SQL,AUTH_STATUS_SQL} from "./authorization-service.mjs";
import {preflightAssessment} from "./evidence-validation.mjs";
import {samplePackage} from "./evidence-validation.test.mjs";
import {taskAgentAction,TASK_READ_SQL,TASK_SUBMIT_SQL} from "./task-service.mjs";
import {makeHandler,validateSubmission} from "./index.mjs";
import {TASK_CRITERIA} from "./criteria-compact.mjs";
const sha=x=>createHash("sha256").update(x).digest("hex");
const repo="cooyun/etuki-gate",cohort="ARE100-VALUE-20261115";
const endpoint="https://www.etuki.com/api/v1/mcp",secret="aret_"+"B".repeat(43);
const tid="11111111-2222-4333-8444-555555555555";
const userCookie="ares_"+"A".repeat(43),sessionHash=sha(userCookie);
const user={id:"b2222222-2222-4222-8222-222222222222",tester_id:"tester_abc123",display_name:"Tester",organization:"ARE Research"};
const assignment={id:tid,cohort_id:cohort,repository_key:repo,assignee_id:"colleague-01",
 assessor_organization:"ARE Research",created_at:"2026-11-21T12:20:00Z",
 plan_snapshot:{version:"are.test-plan.v3",runtime_endpoint:endpoint,auth_mode:"UNKNOWN",declared_tool_count:1}};
const cfg={assigneeId:"colleague-01",organization:"ARE Research",repositoryKey:repo,expectedEndpoint:endpoint,
 taskId:tid,authMode:"UNKNOWN",baseValidate:validateSubmission};
const post=(path,data,{cookie,origin,bearer}={})=>new Request("https://example.invalid"+path,{method:"POST",
 headers:{"Content-Type":"application/json",...(cookie?{Cookie:cookie}:{}),
 ...(origin?{Origin:origin}:{}),...(bearer?{Authorization:"Bearer "+bearer}:{})},body:JSON.stringify(data)});
function authTrace(id,toolName){
 const request={jsonrpc:"2.0",id:11,method:"tools/call",params:{name:toolName,arguments:{}}};
 const response={jsonrpc:"2.0",id:11,error:{code:-32000,message:"missing_bearer_token"}};
 const content=JSON.stringify({protocol:"mcp.raw-observation.v1",observed_at:"2026-11-21T12:24:00Z",
  endpoint,transport:"http",request,response,wire_request:JSON.stringify(request),wire_response:JSON.stringify(response)});
 return {id,kind:"trace",content,sha256:sha(content),provenance:"Agent-host original protocol observation pending external verification"};
}
function blockedPacket(){
 const p=samplePackage();
 p.evidence_artifacts.push(authTrace("gateway-denial","representative_read"));
 p.tool_coverage[0]={name:"list_supported_models",status:"BLOCKED_AUTH",blocking_scope:"ENDPOINT",
  trace_ref:"gateway-denial",reason:"Remote MCP gateway requires delegated OAuth consent before tool calls"};
 p.test_blockers=[{cause:"OAUTH",reason:"Gateway credential requirement observed on actual protocol trace",trace_ref:"gateway-denial"}];
 p.test_metadata.auth_mode="UNKNOWN";
 return p;
}
test("Observed auth challenge requires Agent to record provider handoff, no ARE click",()=>{
 const p=blockedPacket();
 assert.equal(authRequired(p,"UNKNOWN"),true);
 const r=preflightAssessment(p,cfg);
 assert.equal(r.valid,false);
 assert.ok(r.errors.some(x=>x.code==="auth_handoff_unrecorded"),JSON.stringify(r.errors));
 assert.equal(r.completion.status,"PARTIAL");
});
test("Endpoint-wide 401 may be shared with explicit scope, but never implies a per-tool native attempt",()=>{
 const p=blockedPacket();
 const waiting={decision:"PENDING",reason:"Request official test-account sign-in",
  requested_scopes:[]};
 const r=preflightAssessment(p,{...cfg,authorization:waiting});
 assert.equal(r.valid,true,JSON.stringify(r.errors));
 assert.equal(r.completion.status,"PARTIAL");
 assert.ok(r.completion.reasons.includes("TOOLS_INCOMPLETE"));
 assert.equal(r.completion.authorization,"LEGACY_PENDING");
 p.tool_coverage[0].blocking_scope="TOOL";
 const bad=preflightAssessment(p,{...cfg,authorization:waiting});
 assert.equal(bad.valid,false);
 assert.ok(bad.errors.some(x=>x.code==="tool_auth_trace_name_mismatch"));
 delete p.tool_coverage[0].blocking_scope;
 const noScope=preflightAssessment(p,{...cfg,authorization:waiting});
 assert.ok(noScope.errors.some(x=>x.code==="auth_scope_required"));
});
test("A permitted official sign-in attempt does not prove protected tool tests succeeded",()=>{
 const p=blockedPacket(),r=preflightAssessment(p,{...cfg,authorization:{decision:"GRANTED"}});
 assert.equal(r.valid,true,JSON.stringify(r.errors));
 assert.equal(r.completion.status,"PARTIAL");
 assert.ok(r.completion.reasons.includes("PROVIDER_AUTH_OR_EXECUTION_NOT_COMPLETED"));
});
test("Generic local STDIO API-key errors may block the exact tool, never the unrelated remote gateway",()=>{
 const p=blockedPacket();
 const toolName="list_supported_models";
 const request={jsonrpc:"2.0",id:13,method:"tools/call",params:{name:toolName,arguments:{}}};
 const response={jsonrpc:"2.0",id:13,error:{code:-32000,message:"missing_api_key"}};
 const content=JSON.stringify({protocol:"mcp.raw-observation.v1",observed_at:"2026-11-21T12:24:00Z",
   endpoint:"stdio://local-provider",transport:"stdio",request,response,
   wire_request:JSON.stringify(request),wire_response:JSON.stringify(response)});
 p.evidence_artifacts.push({id:"stdio-missing-api-key",kind:"trace",content,sha256:sha(content),
  provenance:"Agent host recorded local original MCP frames pending external attestation"});
 p.tool_coverage[0].trace_ref="stdio-missing-api-key";
 p.tool_coverage[0].blocking_scope="TOOL";
 const allowed=preflightAssessment(p,{...cfg,authorization:{decision:"DECLINED"}});
 assert.equal(allowed.valid,true,JSON.stringify(allowed.errors));
 p.tool_coverage[0].blocking_scope="ENDPOINT";
 const bad=preflightAssessment(p,{...cfg,authorization:{decision:"DECLINED"}});
 assert.ok(bad.errors.some(x=>x.code==="auth_denial_endpoint_mismatch"));
});
test("Human decline still allows an explicit private partial evidence report",()=>{
 const p=blockedPacket(),r=preflightAssessment(p,{...cfg,authorization:{decision:"DECLINED"}});
 assert.equal(r.valid,true,JSON.stringify(r.errors));
 assert.equal(r.readiness,"READY_FOR_REVIEW");
 assert.equal(r.completion.status,"PARTIAL");
 assert.equal(r.completion.authorization,"LEGACY_USER_DECLINED");
});
test("Measured duration needs matching instrument artifact and cannot be invented from task age/budget",()=>{
 const p=samplePackage(),source="AGENT_HOST_TIMER",active_minutes=12;
 p.test_metadata.minutes_used=12;
 p.test_metadata.duration={kind:"MEASURED",source,active_minutes,evidence_ref:"timer-1"};
 const content=JSON.stringify({source,active_minutes,instrument:"Host task active-time counter",recorded_at:"2026-11-21T12:38:00Z"});
 p.evidence_artifacts.push({id:"timer-1",kind:"duration",content,sha256:sha(content),provenance:"Measured host timer result supplied by runner; independent attestation pending"});
 let r=preflightAssessment(p,cfg);
 assert.equal(r.valid,true,JSON.stringify(r.errors));
 assert.equal(r.completion.active_minutes,12);
 p.test_metadata.minutes_used=65;
 r=preflightAssessment(p,cfg);
 assert.ok(r.errors.some(x=>x.code==="active_duration_mismatch"));
 p.test_metadata.minutes_used=0;
 p.test_metadata.duration={kind:"UNMEASURED",source:"UNKNOWN",active_minutes:null};
 r=preflightAssessment(p,cfg);
 assert.equal(r.valid,true,JSON.stringify(r.errors));
 assert.ok(r.completion.reasons.includes("ACTIVE_TIME_UNMEASURED"));
});
test("Agent records OAuth challenge and directly receives provider browser handoff",async()=>{
 const readOnly=[],saved={task_id:tid,decision:"GRANTED",auth_scheme:"OAUTH",reason:"Official OAuth required",requested_scopes:[]};
 const sql=async(q,params)=>{
  if(q===TASK_READ_SQL)return assignment;
  if(q===AUTH_REQUEST_SQL){assert.equal(params[0],sha(secret));assert.equal(params[1],tid);return saved;}
  if(q===AUTH_STATUS_SQL){readOnly.push(params);return saved;}
  throw Error("unexpected DB");
 };
 const deps={validateSubmission,githubVerify:async()=>true,criteria:TASK_CRITERIA};
 const r=await taskAgentAction("/v3/task/auth/request",post("/v3/task/auth/request",{
  reason:saved.reason,requested_scopes:[],auth_scheme:"OAUTH"},{bearer:secret}),sql,deps);
 assert.equal(r.status,200);
 assert.equal(r.data.authorization.decision,"GRANTED");
 assert.equal(r.data.are_approval_required,false);
 assert.equal(r.data.next_action,"OPEN_PROVIDER_OAUTH_IN_AGENT_HOST_BROWSER");
 assert.match(r.data.instruction,/provider.*page|provider.*consent|provider.*login/i);
 const status=await taskAgentAction("/v3/task/auth/status",
  post("/v3/task/auth/status",{}, {bearer:secret}),sql,deps);
 assert.equal(status.status,200);
 assert.equal(status.data.credential_granted_by_provider,false);
 assert.equal(readOnly.length,1);
 assert.deepEqual(authorizationRequestData({reason:saved.reason,requested_scopes:["read","read"]}).scopes,["read"]);
 assert.equal(authorizationRequestData({reason:saved.reason,requested_scopes:[],auth_scheme:"OAUTH"}).scheme,"OAUTH");
 assert.equal(authorizationRequestData({reason:saved.reason,requested_scopes:[]}).scheme,"UNKNOWN");
 assert.throws(()=>authorizationRequestData({reason:saved.reason,requested_scopes:[],auth_scheme:"DISABLE_SECURITY"}),/invalid_authorization_request/);
 assert.match(AUTH_REQUEST_SQL,/ON CONFLICT\(task_id\) DO UPDATE/);
 assert.match(AUTH_REQUEST_SQL,/GRANTED/);
 assert.doesNotMatch(AUTH_REQUEST_SQL,/oauth_allowed/);
 assert.throws(()=>authorizationRequestData({reason:saved.reason,requested_scopes:[],decision:"GRANTED"}),/invalid_authorization_request/);
});
test("Tester and Owner ARE pages have NO redundant OAuth approval controls",async()=>{
 const h=makeHandler({env:{ARE_INTAKE_OWNER_HASH:sha("ario_"+("Z".repeat(64)))}});
 const html=await (await h(new Request("https://example.invalid/v3/board"))).text();
 for(const old of ["允许 Agent 在第三方官方页面发起授权","拒绝授权，保留部分测试",
  "允许 Agent 发起官方授权","拒绝授权，保持部分评测",
  "testerAllowOAuth","auth/decide","decideAuthorization("])
  assert.equal(html.includes(old),false,old);
 assert.ok(html.includes("用户在服务商页面决定是否授权"));
});
test("Formal submit refuses unrecorded auth challenge; recorded legacy partial remains honest",async()=>{
 const p=blockedPacket(),writes=[],steps=[];
 let authorization=null;
 const sql=async(q,args)=>{
  steps.push(q);
  if(q===TASK_READ_SQL)return assignment;
  if(q===AUTH_STATUS_SQL)return authorization;
  if(q===TASK_SUBMIT_SQL){writes.push(args);return {id:"11111111-3333-4333-8333-333333333333",state:"READY_FOR_REVIEW",repository_key:repo};}
  throw Error("Unknown SQL query");
 };
 const deps={validateSubmission,githubVerify:async()=>true,criteria:TASK_CRITERIA};
 const noConsent=await taskAgentAction("/v3/task/submit",post("/v3/task/submit",p,{bearer:secret}),sql,deps);
 assert.equal(noConsent.status,422);
 assert.ok(noConsent.data.issues.some(e=>e.code==="auth_handoff_unrecorded"));
 assert.equal(writes.length,0);
 authorization={decision:"PENDING",reason:"Request official protected read permissions",requested_scopes:[]};
 const withPending=await taskAgentAction("/v3/task/submit",post("/v3/task/submit",p,{bearer:secret}),sql,deps);
 assert.equal(withPending.status,200,JSON.stringify(withPending.data).slice(0,2400));
 assert.equal(withPending.data.stage,"READY_FOR_REVIEW");
 assert.equal(withPending.data.test_completion.status,"PARTIAL");
 assert.equal(writes.length,1);
 const stored=JSON.parse(writes[0][10]);
 assert.equal(stored.test_completion.status,"PARTIAL");
 assert.equal(stored.test_completion.authorization,"LEGACY_PENDING");
 assert.equal(stored.test_completion.tools_executed,0);
 assert.equal(stored.test_completion.total_tools,1);
 assert.equal(stored.test_metadata.duration.kind,"UNMEASURED");
 assert.equal(stored.test_metadata.server_observed_minutes>=0,true);
 assert.equal(stored.test_completion.wall_clock_minutes>=0,true);
 assert.ok(steps.includes(AUTH_STATUS_SQL));
});
