import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {authorizationRequestData,authRequired,AUTH_REQUEST_SQL,AUTH_STATUS_SQL,AUTH_DECIDE_SQL} from "./authorization-service.mjs";
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
test("Any observed authentication denial triggers human consent even if declared mode is UNKNOWN",()=>{
 const p=blockedPacket();
 assert.equal(authRequired(p,"UNKNOWN"),true);
 const r=preflightAssessment(p,cfg);
 assert.equal(r.valid,false);
 assert.ok(r.errors.some(x=>x.code==="human_authorization_request_missing"),JSON.stringify(r.errors));
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
 assert.equal(r.completion.authorization,"AWAITING_USER_DECISION");
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
 assert.equal(r.completion.authorization,"USER_DECLINED");
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
test("Authorization request API writes scoped pending state and read-only polling returns actual DB state",async()=>{
 const readOnly=[],saved={task_id:tid,decision:"PENDING",reason:"Need official OAuth for all protected tools",requested_scopes:[]};
 const sql=async(q,params)=>{
  if(q===TASK_READ_SQL)return assignment;
  if(q===AUTH_REQUEST_SQL){assert.equal(params[0],sha(secret));assert.equal(params[1],tid);return saved;}
  if(q===AUTH_STATUS_SQL){readOnly.push(params);return saved;}
  throw Error("unexpected DB");
 };
 const deps={validateSubmission,githubVerify:async()=>true,criteria:TASK_CRITERIA};
 const r=await taskAgentAction("/v3/task/auth/request",post("/v3/task/auth/request",{
  reason:saved.reason,requested_scopes:[]},{bearer:secret}),sql,deps);
 assert.equal(r.status,200);
 assert.equal(r.data.authorization.decision,"PENDING");
 const status=await taskAgentAction("/v3/task/auth/status",
  post("/v3/task/auth/status",{}, {bearer:secret}),sql,deps);
 assert.equal(status.status,200);
 assert.equal(status.data.credential_granted_by_provider,false);
 assert.equal(readOnly.length,1);
 assert.deepEqual(authorizationRequestData({reason:saved.reason,requested_scopes:["read","read"]}).scopes,["read"]);
 assert.equal(authorizationRequestData({reason:saved.reason,requested_scopes:[],auth_scheme:"OAUTH"}).scheme,"OAUTH");
 assert.equal(authorizationRequestData({reason:saved.reason,requested_scopes:[]}).scheme,"UNKNOWN");
 assert.throws(()=>authorizationRequestData({reason:saved.reason,requested_scopes:[],auth_scheme:"DISABLE_SECURITY"}),/invalid_authorization_request/);
 assert.match(AUTH_REQUEST_SQL,/\$5='OAUTH'/);
 assert.match(AUTH_REQUEST_SQL,/oauth_allowed/);
 assert.throws(()=>authorizationRequestData({reason:saved.reason,requested_scopes:[],decision:"GRANTED"}),/invalid_authorization_request/);
});
test("Only owner browser can GRANT or DECLINE; an Agent's Token cannot decide for user",async()=>{
 let writes=0;
 const sql=async(q,params)=>{
  if(q===AUTH_DECIDE_SQL){writes++;assert.equal(params[0],sessionHash);
    return {task_id:tid,decision:params[2],reason:"Third party OAuth request"};}
  return null;
 };
 const h=makeHandler({env:{ARE_INTAKE_OWNER_HASH:sha("ario_"+("Z".repeat(64)))},sql});
 const payload={task_id:tid,decision:"GRANTED"},origin="https://br-raspy-hat-b96bluqn-areintake.compute.c-7.eu-central-1.aws.neon.tech";
 assert.equal((await h(post("/v3/tester/auth/decide",payload,{origin}))).status,401);
 assert.equal((await h(post("/v3/tester/auth/decide",payload,{cookie:"are_tester="+userCookie,origin:"https://evil.example"}))).status,403);
 assert.equal((await h(post("/v3/tester/auth/decide",{...payload,extra:true},{cookie:"are_tester="+userCookie,origin}))).status,400);
 assert.equal((await h(post("/v3/tester/auth/decide",{...payload,decision:"PENDING"},{cookie:"are_tester="+userCookie,origin}))).status,400);
 assert.equal(writes,0);
 const granted=await h(post("/v3/tester/auth/decide",payload,{cookie:"are_tester="+userCookie,origin}));
 assert.equal(granted.status,200);
 const body=await granted.json();
 assert.equal(body.provider_oauth_completed,false);
 assert.equal(body.authorization.decision,"GRANTED");
 assert.equal(writes,1);
 assert.match(AUTH_DECIDE_SQL,/session_sha256=\$1/);
 assert.match(AUTH_DECIDE_SQL,/a.decision='PENDING'/);
 assert.match(AUTH_DECIDE_SQL,/FOR UPDATE OF t/);
 assert.doesNotMatch(AUTH_DECIDE_SQL,/token_sha256/);
 const html=await (await h(new Request("https://example.invalid/v3/board"))).text();
 assert.ok(html.includes("允许 Agent 在第三方官方页面发起授权"));
 assert.ok(html.includes("拒绝授权，保留部分测试"));
});

test("Actual task endpoint refuses silent OAuth skip; pending human request permits PARTIAL private submission",async()=>{
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
 assert.ok(noConsent.data.issues.some(e=>e.code==="human_authorization_request_missing"));
 assert.equal(writes.length,0);
 authorization={decision:"PENDING",reason:"Request official protected read permissions",requested_scopes:[]};
 const withPending=await taskAgentAction("/v3/task/submit",post("/v3/task/submit",p,{bearer:secret}),sql,deps);
 assert.equal(withPending.status,200,JSON.stringify(withPending.data).slice(0,2400));
 assert.equal(withPending.data.stage,"READY_FOR_REVIEW");
 assert.equal(withPending.data.test_completion.status,"PARTIAL");
 assert.equal(writes.length,1);
 const stored=JSON.parse(writes[0][10]);
 assert.equal(stored.test_completion.status,"PARTIAL");
 assert.equal(stored.test_completion.authorization,"AWAITING_USER_DECISION");
 assert.equal(stored.test_completion.tools_executed,0);
 assert.equal(stored.test_completion.total_tools,1);
 assert.equal(stored.test_metadata.duration.kind,"UNMEASURED");
 assert.equal(stored.test_metadata.server_observed_minutes>=0,true);
 assert.equal(stored.test_completion.wall_clock_minutes>=0,true);
 assert.ok(steps.includes(AUTH_STATUS_SQL));
});
