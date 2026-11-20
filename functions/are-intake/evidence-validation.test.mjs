import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {preflightAssessment} from "./evidence-validation.mjs";
import {PRODUCT_CHECKS,validateSubmission} from "./index.mjs";
import {taskAgentAction,TASK_READ_SQL,TASK_SUBMIT_SQL} from "./task-service.mjs";
const digest=x=>createHash("sha256").update(x).digest("hex");
const token="aret_"+"B".repeat(43),cohort="ARE100-VALUE-20261115",repo="cooyun/etuki-gate",sha="eae054b5b99568f85879733d15b7206d5af45d1b",endpoint="https://www.etuki.com/api/v1/mcp";
function artifact(id,kind,content,extra={}){
 return {id,kind,content,sha256:digest(content),
 provenance:"Recorded by isolated test harness with independent verification",...extra};
}
export function samplePackage(){
 const trace=artifact("trace-tool","trace","Fixture run: call list_models({provider:'all'}), observed response 200 with 2 entries.");
 const oracle=artifact("oracle-models","oracle","Fixture expected 2 known fixture rows from separate local source, compared to observed tool values.",{oracle_method:"known_fixture"});
 const binding=artifact("source-binding","source_binding","Fixture: local source route and service response header list same project build digest with source map.");
 const task=artifact("agent-task-1","agent_task","Fixture agent asked to list and compare models with known independent fixture; 2 results matched.");
 return {cohort_id:cohort,repository_key:repo,summary:"Fixture-only assessment (NOT a real third-party verdict)",
  source_binding:{verified:true,evidence_ref:binding.id},contact_route:{url:"https://github.com/"+repo},recommendations:[],
  evidence_artifacts:[trace,oracle,binding,task],
  tool_coverage:[{name:"list_supported_models",status:"PASS",trace_ref:trace.id,oracle_ref:oracle.id}],
  test_blockers:[],
  test_metadata:{discovered_tool_count:1,minutes_used:12,auth_mode:"NONE"},
  agent_tasks:[{goal:"Compare returned models against a separate known fixture list",trace_ref:task.id,oracle_ref:oracle.id,
    authorized:true,status:"PASS",oracle_verified:true,agent:"test-agent"}],
  report:{schema:"are.assessment.result.v1",mode:"ARE_INDEPENDENT",track:"product",
    criteria_version:"pilot-2026-11-18",certification:false,maturity_level:null,public_release_authorized:false,
    target:{id:repo,source_revision:sha,observed_version:"1.2.0",owner_organization:"Etuki Gate Org",endpoint},
    assessor:{id:"colleague-01",organization:"ARE Research"},
    findings:PRODUCT_CHECKS.map(id=>id==="MCP-L1-V4"?{check_id:id,status:"PASS",evidence_ref:trace.id,
      evaluator_mode:"ARE_INDEPENDENT",evidence_class:"ASSESSOR_DECLARED_PROVENANCE_NOT_EXTERNALLY_ATTESTED"}:{
      check_id:id,status:"NOT_APPLICABLE",reason:"Fixture-only case: this pilot criterion is not executed; human must review applicability.",
      evaluator_mode:"ARE_INDEPENDENT",evidence_class:"ASSESSOR_DECLARED_PROVENANCE_NOT_EXTERNALLY_ATTESTED"})}};
}
const config={assigneeId:"colleague-01",organization:"ARE Research",repositoryKey:repo,expectedEndpoint:endpoint,
  authMode:"NONE",baseValidate:validateSubmission};
test("ARE preflight recognizes the fully-linked simulated packet and creates canonical report from 32 rows",()=>{
 const packet=samplePackage(),r=preflightAssessment(packet,config);
 assert.equal(r.valid,true,JSON.stringify(r.errors).slice(0,750));
 assert.equal(r.metrics.criteria.PASS,1);
 assert.equal(r.metrics.criteria.NOT_APPLICABLE,31);
 assert.equal(r.metrics.tools.PASS,1);
 assert.match(r.report_preview,/Criteria PASS/);
 assert.match(r.report_preview,/\\| 1 \\| 0 \\| 31 \\|/);
 assert.equal(r.normalized_summary.includes("1 criteria PASS"),true);
 assert.equal(r.public_release_authorized,false);
});
test("no primary artifact, hash, fake independent Oracle, source binding or actual agent goal => blocked",()=>{
 const alterations=[
  x=>delete x.evidence_artifacts,
  x=>x.evidence_artifacts[0].sha256="0".repeat(64),
  x=>x.evidence_artifacts[1].oracle_method="unverified",
  x=>x.source_binding.verified=false,
  x=>x.agent_tasks=[],
  x=>x.report.findings[1].reason="",
  x=>x.tool_coverage[0].oracle_ref="missing-oracle",
  x=>x.report.target.endpoint="https://unauthorized.example/mcp"
 ];
 for(const modify of alterations){
  const data=samplePackage();modify(data);
  const r=preflightAssessment(data,config);
  assert.equal(r.valid,false,"Should fail "+String(modify));
  assert.ok(r.errors.some(e=>typeof e.path==="string"&&e.code));
 }
});
test("ARE token preflight does not write, use revision quota or leak third-party publish access",async()=>{
 const calls=[],assignment={id:"11111111-2222-4333-8444-555555555555",cohort_id:cohort,repository_key:repo,
  assignee_id:"colleague-01",assessor_organization:"ARE Research",created_at:"2026-11-20T09:00:00Z",
  plan_snapshot:{version:"are.test-plan.v3",runtime_endpoint:endpoint,auth_mode:"NONE",declared_tool_count:1},expires_at:"2026-11-27T00:00:00Z"};
 const sql=async(query,args)=>{calls.push({query,args});if(query===TASK_READ_SQL)return assignment;throw Error("SQL write in no-write preflight")};
 const request=payload=>new Request("https://example.invalid/v3/task/validate",{method:"POST",headers:{Authorization:"Bearer "+token},body:JSON.stringify(payload)});
 const response=await taskAgentAction("/v3/task/validate",request(samplePackage()),sql,
   {validateSubmission,githubVerify:async()=>{throw Error("should not contact Github in validate")},criteria:[]});
 assert.equal(response.status,200);
 assert.equal(response.data.valid,true);
 assert.equal(response.data.side_effects,false);
 assert.equal(response.data.revisions_consumed,0);
 assert.equal(calls.length,1);
 assert.equal(calls[0].query,TASK_READ_SQL);
 const bad=samplePackage();bad.evidence_artifacts[0].content="tampered";
 const invalid=await taskAgentAction("/v3/task/validate",request(bad),sql,{validateSubmission,githubVerify:async()=>true,criteria:[]});
 assert.equal(invalid.status,200);
 assert.equal(invalid.data.valid,false);
 assert.ok(invalid.data.errors.some(x=>x.path.includes("sha256")));
});
test("formal submission rejects incomplete Antigravity-like payload before DB writes",async()=>{
 const packet=samplePackage();
 packet.report.findings=packet.report.findings.map((f,i)=>i===0?f:{...f,status:"NOT_TESTED",reason:"Not tested"});
 packet.agent_tasks=[];packet.source_binding.verified=false;packet.evidence_artifacts=[];
 const queries=[],assignment={id:"11111111-2222-4333-8444-555555555555",cohort_id:cohort,repository_key:repo,assignee_id:"colleague-01",
 assessor_organization:"ARE Research",created_at:"2026-11-20T09:00:00Z",plan_snapshot:{version:"are.test-plan.v3",runtime_endpoint:endpoint,auth_mode:"NONE"}};
 const sql=async q=>{queries.push(q);if(q===TASK_READ_SQL)return assignment;throw Error("Cannot INSERT invalid packet")};
 const req=new Request("https://example.invalid/v3/task/submit",{method:"POST",headers:{Authorization:"Bearer "+token},body:JSON.stringify(packet)});
 const res=await taskAgentAction("/v3/task/submit",req,sql,{validateSubmission,githubVerify:async()=>true,criteria:[]});
 assert.equal(res.status,422);
 assert.equal(res.data.error,"assessment_preflight_failed");
 assert.ok(res.data.issues.some(i=>i.path==="agent_tasks"));
 assert.deepEqual(queries,[TASK_READ_SQL]);
});
test("formal accepted report writes deterministic summary and stored evidence, not agent prose",async()=>{
 const packet=samplePackage(),received=[],assignment={id:"11111111-2222-4333-8444-555555555555",cohort_id:cohort,repository_key:repo,
 assignee_id:"colleague-01",assessor_organization:"ARE Research",created_at:"2026-11-20T09:00:00Z",
 plan_snapshot:{version:"are.test-plan.v3",runtime_endpoint:endpoint,auth_mode:"NONE"}};
 const sql=async(query,args)=>{received.push({query,args});if(query===TASK_READ_SQL)return assignment;
  if(query===TASK_SUBMIT_SQL)return {id:"22222222-2222-4222-8222-222222222222",repository_key:repo,state:"READY_FOR_OUTREACH"};
  throw Error("Unexpected database SQL")};
 const req=new Request("https://example.invalid/v3/task/submit",{method:"POST",headers:{Authorization:"Bearer "+token},body:JSON.stringify(packet)});
 const result=await taskAgentAction("/v3/task/submit",req,sql,{validateSubmission,githubVerify:async()=>true,criteria:[]});
 assert.equal(result.status,200,JSON.stringify(result.data).slice(0,1000));
 assert.match(result.data.canonical_report,/\\| 1 \\| 0 \\| 31 \\|/);
 const stored=received.find(x=>x.query===TASK_SUBMIT_SQL);
 assert.ok(stored);
 assert.match(stored.args[15],/1 criteria PASS/);
 assert.ok(!stored.args[15].includes("Fixture-only"));
 const report=JSON.parse(stored.args[10]);
 assert.equal(report.evidence_artifacts.length,4);
 assert.equal(report.test_metadata.server_observed_minutes>=0,true);
 assert.equal(result.data.public_release_authorized,false);
});

test("an OAuth consent denial is storable as a private evidence-backed blocked run, never READY",async()=>{
 const p=samplePackage();
 p.tool_coverage=[];
 p.test_metadata={auth_mode:"OAUTH",discovered_tool_count:0,minutes_used:7,
   authorization_events:[{status:"CONSENT_REQUIRED",evidence_ref:"auth-challenge"}]};
 p.evidence_artifacts=[
   artifact("auth-challenge","authorization","HTTP 401 WWW-Authenticate pointed at resource metadata; human consent was needed."),
   artifact("oauth-block","trace","No access token; tools/list was not executed. OAuth consent required before any tool call."),
   artifact("agent-block","agent_task","Agent tried to initialize protected endpoint; it stopped at a 401 challenge instead of requesting credentials.")
 ];
 p.source_binding={verified:false,reason:"No authenticated deployment access; cannot prove source-to-deployment binding yet"};
 p.agent_tasks=[{goal:"Inspect authorized target tools after OAuth user consent",trace_ref:"agent-block",
   status:"BLOCKED_AUTH",authorized:false,agent:"test-agent",oracle_verified:false}];
 p.test_blockers=[{cause:"OAUTH",reason:"Requires interactive human authorization",trace_ref:"oauth-block"}];
 p.report.findings=p.report.findings.map(f=>({...f,status:"NOT_TESTED",reason:"OAuth approval not yet granted; cannot verify this criterion"}));
 const configOAuth={...config,authMode:"OAUTH"};
 const validated=preflightAssessment(p,configOAuth);
 assert.equal(validated.valid,true,JSON.stringify(validated.errors));
 assert.equal(validated.metrics.criteria.PASS,0);
 assert.ok(validated.warnings.some(x=>x.code==="source_binding_unverified"));
 const assignment={id:"11111111-2222-4333-8444-555555555555",cohort_id:cohort,repository_key:repo,
  assignee_id:"colleague-01",assessor_organization:"ARE Research",created_at:"2026-11-20T09:00:00Z",
  plan_snapshot:{version:"are.test-plan.v3",runtime_endpoint:endpoint,auth_mode:"OAUTH"}};
 const queries=[],sql=async(q,args)=>{queries.push({q,args});if(q===TASK_READ_SQL)return assignment;
  if(q===TASK_SUBMIT_SQL)return {id:"33333333-3333-4333-8333-333333333333",state:"NEEDS_EVIDENCE",repository_key:repo};
  throw Error("unexpected SQL")};
 const req=new Request("https://example.invalid/v3/task/submit",{method:"POST",
  headers:{Authorization:"Bearer "+token},body:JSON.stringify(p)});
 const r=await taskAgentAction("/v3/task/submit",req,sql,{validateSubmission,githubVerify:async()=>true,criteria:[]});
 assert.equal(r.status,200,JSON.stringify(r.data));
 const insert=queries.find(x=>x.q===TASK_SUBMIT_SQL);
 assert.ok(insert);
 assert.equal(insert.args[9],"NEEDS_EVIDENCE");
 assert.equal(r.data.stage,"NEEDS_EVIDENCE");
 assert.equal(r.data.canonical_metrics.criteria.PASS,0);
 assert.equal(r.data.public_release_authorized,false);
});
