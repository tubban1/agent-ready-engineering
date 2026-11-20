import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {preflightAssessment} from "./evidence-validation.mjs";
import {PRODUCT_CHECKS,validateSubmission} from "./index.mjs";
import {TASK_CRITERIA} from "./criteria-compact.mjs";
import {FACT_NAMES,RAW_OBSERVATION_PROTOCOL} from "./evaluation-contract-v5.mjs";
import {taskAgentAction,TASK_READ_SQL,TASK_SUBMIT_SQL} from "./task-service.mjs";
const sha=x=>createHash("sha256").update(x).digest("hex");
const token="aret_"+"B".repeat(43),cohort="ARE100-VALUE-20261115",repo="cooyun/etuki-gate";
const rev="eae054b5b99568f85879733d15b7206d5af45d1b",endpoint="https://www.etuki.com/api/v1/mcp",taskId="11111111-2222-4333-8444-555555555555";
const attr={readOnlyHint:true,destructiveHint:false,openWorldHint:false};
const traceData=(id,method,params,result)=>{
 const request={jsonrpc:"2.0",id,method,params},response={jsonrpc:"2.0",id,result};
 return {protocol:RAW_OBSERVATION_PROTOCOL,observed_at:"2026-11-20T18:40:00Z",endpoint,transport:"http",
  request,response,wire_request:JSON.stringify(request),wire_response:JSON.stringify(response)};
};
function artifact(id,kind,content,extra={}){
 return {id,kind,content:typeof content==="string"?content:JSON.stringify(content),
  sha256:sha(typeof content==="string"?content:JSON.stringify(content)),
  provenance:"Fixture captured by isolated test runner from supported public MCP endpoint",...extra};
}
export function samplePackage(){
 const discovery=artifact("raw-discovery","trace",traceData(1,"tools/list",{},
   {tools:[{name:"list_supported_models",inputSchema:{type:"object"},annotations:attr}]}));
 const tool=artifact("raw-tool","trace",traceData(2,"tools/call",{name:"list_supported_models",arguments:{provider:"all"}},
   {content:[{type:"text",text:JSON.stringify({total:2})}],isError:false}));
 const oracle=artifact("oracle-models","oracle",{method_description:"Recompute count from an independently recorded known fixture",
   source:"https://example.org/independent-qa-fixture-v1",trace_ref:"raw-tool",
   actual_pointer:"/result/content/0/text#/total",expected:2,actual:2,
   comparison:{operator:"eq",passed:true}},{oracle_method:"known_fixture"});
 const task=artifact("agent-task-1","agent_task",{goal:"Compare models returned against an external fixture",
   steps:[{trace_ref:tool.id}],result:"2 verified model rows"});
 const facts=Object.fromEntries(FACT_NAMES.filter(f=>!["tool_count","has_tools","has_callable_tools",
      "has_large_list_results","can_truncate_results","ingress_count"].includes(f))
   .map(f=>[f,{value:f==="ingress_count"?1:f==="has_read_tools",evidence_ref:discovery.id}]));
 const findings=TASK_CRITERIA.map(c=>{
  const applicable=c.applies_when.every(rule=>{
    const actual=rule.fact==="tool_count"?1:["has_tools","has_callable_tools"].includes(rule.fact)?true:facts[rule.fact]?.value;
    if(rule.op==="eq")return actual===rule.value;
    if(rule.op==="gte")return actual>=rule.value;
    if(rule.op==="lte")return actual<=rule.value;
    return false;
  });
  const base={check_id:c.id,evaluator_mode:"ARE_INDEPENDENT",
    evidence_class:"ASSESSOR_DECLARED_PROVENANCE_NOT_EXTERNALLY_ATTESTED"};
  if(c.id==="MCP-L1-V4")return {...base,status:"PASS",evidence_ref:discovery.id,
    observation:{metric:c.pass_if.metric,value:true,evidence_ref:discovery.id},
    samples:[{trace_ref:discovery.id}]};
  if(c.applies_when.some(rule=>rule.fact!=="tool_count"&&!["has_tools","has_callable_tools"].includes(rule.fact)&&!facts[rule.fact]))
   return {...base,status:"UNKNOWN",reason:"Not enough measured raw evidence to decide this applicability fact"};
  if(!applicable)return {...base,status:"NOT_APPLICABLE",reason:"Observed project contract does not meet the required applies_when fact conditions."};
  return {...base,status:"NOT_TESTED",reason:"Fixture does not execute this applicable criterion; reviewer must not infer PASS."};
 });
 return {evidence_protocol:"are.evidence.v5",cohort_id:cohort,repository_key:repo,
  summary:"Fixture-only assessment, not an external vendor verdict",
  source_binding:{verified:false,reason:"Vendor documentation associates endpoint with repo, but live binary source commit is not proven"},
  contact_route:{url:"https://github.com/"+repo},recommendations:[],
  evidence_artifacts:[discovery,tool,oracle,task],
  tool_coverage:[{name:"list_supported_models",status:"PASS",annotations:attr,trace_ref:tool.id,oracle_ref:oracle.id}],
  test_blockers:[],
  test_metadata:{discovered_tool_count:1,minutes_used:12,auth_mode:"NONE",applicability_facts:facts},
  agent_tasks:[{goal:"Compare returned models against independent test fixture",
   trace_ref:task.id,oracle_ref:oracle.id,authorized:true,status:"PASS",oracle_verified:true,agent:"test-agent"}],
  report:{schema:"are.assessment.result.v2",mode:"ARE_INDEPENDENT",track:"product",
   criteria_version:"pilot-2026-11-18",certification:false,maturity_level:null,public_release_authorized:false,
   target:{id:repo,source_revision:rev,observed_version:"1.0.2",owner_organization:"Etuki Gate Org",endpoint},
   assessor:{id:"colleague-01",organization:"ARE Research"},findings}};
}
const config={assigneeId:"colleague-01",organization:"ARE Research",
 repositoryKey:repo,expectedEndpoint:endpoint,taskId,authMode:"NONE",baseValidate:validateSubmission};
const fakeTask={id:taskId,cohort_id:cohort,repository_key:repo,
 assignee_id:"colleague-01",assessor_organization:"ARE Research",
 created_at:"2026-11-20T18:20:00Z",expires_at:"2026-11-21T00:00:00Z",
 plan_snapshot:{version:"are.test-plan.v3",runtime_endpoint:endpoint,auth_mode:"NONE",declared_tool_count:1}};
const request=(route,payload)=>new Request("https://example.invalid"+route,{method:"POST",
 headers:{Authorization:"Bearer "+token},body:JSON.stringify(payload)});
test("valid V5 independent assessor trace+fact+oracle packet is reviewer-ready, never auto published",()=>{
 const x=samplePackage(),r=preflightAssessment(x,config);
 assert.equal(r.valid,true,JSON.stringify(r.errors).slice(0,2000));
 assert.equal(r.readiness,"READY_FOR_REVIEW");
 assert.equal(r.metrics.criteria.PASS,1);
 assert.ok(r.metrics.criteria.NOT_TESTED>0);
 assert.equal(r.metrics.semantic.raw_tool_traces,1);
 assert.equal(r.metrics.semantic.raw_agent_tasks,1);
 assert.equal(r.public_release_authorized,false);
});
test("ARE V5 disallows missing evidence, content-hash tamper, fake oracles, missing agent goal, and changed endpoint",()=>{
 const mods=[
  x=>delete x.evidence_artifacts,
  x=>x.evidence_artifacts[0].sha256="0".repeat(64),
  x=>x.evidence_artifacts[2].oracle_method="unverified",
  x=>x.agent_tasks=[],
  x=>x.report.findings[1].reason="",
  x=>x.tool_coverage[0].oracle_ref="missing-oracle",
  x=>x.report.target.endpoint="https://other.example.org/mcp",
  x=>x.report.schema="are.assessment.result.v1",
  x=>x.source_binding={verified:true,evidence_ref:"raw-discovery"},
  x=>x.evidence_artifacts[1].content=JSON.stringify({name:"list_supported_models",input:{provider:"all"},output:{total:2}})
 ];
 for(const mutate of mods){const x=samplePackage();mutate(x);const r=preflightAssessment(x,config);
  assert.equal(r.valid,false,"Expected V5 rejection for "+String(mutate));
  assert.ok(r.errors.length>0);
 }
});
test("Antigravity-like misplaced PASS, fabricated N/A, synthesized JSON and missing samples all rejected",()=>{
 const changes=[
  x=>{const f=x.report.findings.find(f=>f.check_id==="MCP-L2-X4");f.status="PASS";
   f.observation={metric:"clear_tool_names",value:true,evidence_ref:"raw-discovery"};f.evidence_ref="raw-discovery";f.samples=[{trace_ref:"raw-discovery"},{trace_ref:"raw-tool"}]},
  x=>{const f=x.report.findings.find(f=>f.check_id==="MCP-L4-R4");f.status="NOT_APPLICABLE";f.reason="No writes"},
  x=>{const f=x.report.findings.find(f=>f.check_id==="MCP-L2-X1");f.status="NOT_APPLICABLE";f.reason="Only 1 tool";delete x.test_metadata.applicability_facts.has_large_list_results},
  x=>{const f=x.report.findings.find(f=>f.check_id==="MCP-L1-V4");f.samples=[]},
  x=>{const f=x.report.findings.find(f=>f.check_id==="MCP-L1-V4");f.observation.value=false},
  x=>{const f=x.report.findings.find(f=>f.check_id==="MCP-L1-V4");f.status="FAIL";f.observation.value=true}
 ];
 for(const mutate of changes){const x=samplePackage();mutate(x);
  const r=preflightAssessment(x,config);
  assert.equal(r.valid,false,"Antigravity-style semantic false positive must be rejected");
  assert.ok(r.errors.some(e=>/criterion|na_|samples|metric|applicability/.test(e.code)),JSON.stringify(r.errors).slice(0,300));
 }
});
test("client-supplied raw trace is permitted for private review but never claimed to be ARE origin attested",()=>{
 const x=samplePackage(),r=preflightAssessment(x,config);
 assert.equal(r.valid,true);
 assert.equal(r.metrics.semantic.server_attested_traces,0);
 assert.ok(r.metrics.semantic.self_reported_raw_traces>0);
 assert.ok(r.warnings.some(e=>e.code==="self_reported_raw_not_attested"));
});
test("forged capture_id is blocked; genuine same-task origin record is trusted",()=>{
 const x=samplePackage(),a=x.evidence_artifacts[1],captureId="33333333-3333-4333-8333-333333333333";
 a.capture_id=captureId;
 let r=preflightAssessment(x,config);
 assert.equal(r.valid,false);
 assert.ok(r.errors.some(e=>e.code==="unverified_capture_receipt"));
 const receipt={id:captureId,task_id:taskId,method:"tools/call",tool_name:"list_supported_models",content:a.content,sha256:a.sha256};
 r=preflightAssessment(x,{...config,captures:[receipt]});
 assert.equal(r.valid,true,JSON.stringify(r.errors));
 assert.equal(r.metrics.semantic.server_attested_traces,1);
});
test("preflight is read-only and issues explainable errors without consuming slots",async()=>{
 const calls=[],sql=async(q,args)=>{calls.push({q,args});if(q===TASK_READ_SQL)return fakeTask;throw Error("Unexpected SQL write")};
 const x=samplePackage();
 const response=await taskAgentAction("/v3/task/validate",request("/v3/task/validate",x),sql,
  {validateSubmission,githubVerify:async()=>{throw Error("No git in validate")},criteria:TASK_CRITERIA});
 assert.equal(response.status,200);
 assert.equal(response.data.valid,true,JSON.stringify(response.data.errors));
 assert.equal(response.data.revisions_consumed,0);
 assert.equal(calls.length,1);
 const bad=samplePackage();bad.evidence_artifacts[1].content="tampered";
 const invalid=await taskAgentAction("/v3/task/validate",request("/v3/task/validate",bad),sql,
  {validateSubmission,githubVerify:async()=>true,criteria:TASK_CRITERIA});
 assert.equal(invalid.data.valid,false);
});
test("invalid formal submit is denied before INSERT",async()=>{
 const packet=samplePackage();packet.report.findings=packet.report.findings.map(f=>({...f,
  status:"NOT_TESTED",reason:"Not performed"}));packet.agent_tasks=[];
 const calls=[],sql=async(q)=>{calls.push(q);if(q===TASK_READ_SQL)return fakeTask;throw Error("Unexpected write")};
 const res=await taskAgentAction("/v3/task/submit",request("/v3/task/submit",packet),sql,
  {validateSubmission,githubVerify:async()=>true,criteria:TASK_CRITERIA});
 assert.equal(res.status,422);
 assert.equal(res.data.error,"assessment_preflight_failed");
 assert.deepEqual(calls,[TASK_READ_SQL]);
});
test("V5 valid private submit persists semantic integrity and consistent canonical metrics",async()=>{
 const packet=samplePackage(),calls=[],sql=async(q,args)=>{calls.push({q,args});
  if(q===TASK_READ_SQL)return fakeTask;
  if(q===TASK_SUBMIT_SQL)return {id:"22222222-2222-4222-8222-222222222222",repository_key:repo,state:"READY_FOR_REVIEW"};
  throw Error("Unexpected SQL")};
 const r=await taskAgentAction("/v3/task/submit",request("/v3/task/submit",packet),sql,
  {validateSubmission,githubVerify:async()=>true,criteria:TASK_CRITERIA});
 assert.equal(r.status,200,JSON.stringify(r.data).slice(0,1250));
 assert.equal(r.data.stage,"READY_FOR_REVIEW");
 const inserted=calls.find(x=>x.q===TASK_SUBMIT_SQL);
 assert.ok(inserted);
 assert.match(inserted.args[15],/1 criteria PASS/);
 const report=JSON.parse(inserted.args[10]);
 assert.equal(report.integrity_readiness,"READY_FOR_REVIEW");
 assert.equal(report.integrity_metrics.raw_agent_tasks,1);
 assert.equal(report.evidence_artifacts.length,4);
 assert.equal(r.data.public_release_authorized,false);
});
test("OAuth denied is recordable as private NEEDS_EVIDENCE without pretending to pass any criteria",()=>{
 const p=samplePackage();
 p.tool_coverage=[];p.test_metadata={auth_mode:"OAUTH",discovered_tool_count:0,minutes_used:7,
  authorization_events:[{status:"CONSENT_REQUIRED",evidence_ref:"auth-challenge"}],applicability_facts:{}};
 p.evidence_artifacts=[artifact("auth-challenge","authorization","HTTP 401 WWW-Authenticate resource metadata response; user has not consented"),
  artifact("agent-block","agent_task",{goal:"Try to initialize MCP",steps:[],status:"BLOCKED_AUTH"})];
 p.source_binding={verified:false,reason:"OAuth consent unavailable, code-to-deployment binding unknown"};
 p.agent_tasks=[{goal:"Inspect authorized tools after consent",trace_ref:"agent-block",
  status:"BLOCKED_AUTH",authorized:false,agent:"test-agent",oracle_verified:false}];
 p.test_blockers=[{cause:"OAUTH",reason:"Human authorization required",trace_ref:"auth-challenge"}];
 p.report.findings=p.report.findings.map(f=>({...f,status:"NOT_TESTED",reason:"MCP OAuth consent has not been granted"}));
 const r=preflightAssessment(p,{...config,authMode:"OAUTH"});
 assert.equal(r.valid,true,JSON.stringify(r.errors));
 assert.equal(r.readiness,"NEEDS_EVIDENCE");
 assert.equal(r.metrics.criteria.PASS,0);
});
