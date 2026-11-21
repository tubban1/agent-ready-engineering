import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {preflightAssessment} from "./evidence-validation.mjs";
import {PRODUCT_CHECKS,validateSubmission} from "./index.mjs";
import {TASK_CRITERIA} from "./criteria-compact.mjs";
import {FACT_NAMES,RAW_OBSERVATION_PROTOCOL} from "./evaluation-contract-v51.mjs";
import {taskAgentAction,TASK_READ_SQL,TASK_SUBMIT_SQL} from "./task-service.mjs";
import {CAPTURE_READ_SQL} from "./capture-v5.mjs";
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
 return {evidence_protocol:"are.evidence.v5.1",cohort_id:cohort,repository_key:repo,
  summary:"Fixture-only assessment, not an external vendor verdict",
  source_binding:{verified:false,reason:"Vendor documentation associates endpoint with repo, but live binary source commit is not proven"},
  contact_route:{url:"https://github.com/"+repo},recommendations:[],
  evidence_artifacts:[discovery,tool,oracle,task],
  tool_coverage:[{name:"list_supported_models",status:"PASS",annotations:attr,trace_ref:tool.id,oracle_ref:oracle.id}],
  test_blockers:[],
  test_metadata:{discovered_tool_count:1,minutes_used:0,auth_mode:"NONE",
   duration:{kind:"UNMEASURED",source:"UNKNOWN",active_minutes:null},applicability_facts:facts},
  agent_tasks:[{goal:"Compare returned models against independent test fixture",
   trace_ref:task.id,oracle_ref:oracle.id,authorized:true,status:"PASS",oracle_verified:true,agent:"test-agent"}],
  report:{schema:"are.assessment.result.v3",mode:"ARE_INDEPENDENT",track:"product",
   criteria_version:"pilot-2026-11-21",certification:false,maturity_level:null,public_release_authorized:false,
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
 p.tool_coverage=[];p.test_metadata={auth_mode:"OAUTH",discovered_tool_count:0,minutes_used:0,
  duration:{kind:"UNMEASURED",source:"UNKNOWN",active_minutes:null},
  authorization_events:[{status:"CONSENT_REQUIRED",evidence_ref:"auth-challenge"}],applicability_facts:{}};
 p.evidence_artifacts=[artifact("auth-challenge","authorization","HTTP 401 WWW-Authenticate resource metadata response; user has not consented"),
  artifact("agent-block","agent_task",{goal:"Try to initialize MCP",steps:[],status:"BLOCKED_AUTH"})];
 p.source_binding={verified:false,reason:"OAuth consent unavailable, code-to-deployment binding unknown"};
 p.agent_tasks=[{goal:"Inspect authorized tools after consent",trace_ref:"agent-block",
  status:"BLOCKED_AUTH",authorized:false,agent:"test-agent",oracle_verified:false}];
 p.test_blockers=[{cause:"OAUTH",reason:"Human authorization required",trace_ref:"auth-challenge"}];
 p.report.findings=p.report.findings.map(f=>({...f,status:"NOT_TESTED",reason:"MCP OAuth consent has not been granted"}));
 const r=preflightAssessment(p,{...config,authMode:"OAUTH",
  authorization:{decision:"DECLINED",reason:"User explicitly refused an interactive provider login"}});
 assert.equal(r.valid,true,JSON.stringify(r.errors));
 assert.equal(r.readiness,"NEEDS_EVIDENCE");
 assert.equal(r.metrics.criteria.PASS,0);
});

test("V5 refuses PASS for a semantic check without criterion-attributed raw assertions",()=>{
 const x=samplePackage();
 const f=x.report.findings.find(r=>r.check_id==="MCP-L4-R4");
 const tool2=artifact("raw-tool-2","trace",traceData(4,"tools/call",{name:"list_supported_models",arguments:{}},
   {content:[{type:"text",text:JSON.stringify({total:2})}],isError:false}));
 x.evidence_artifacts.push(tool2);
 Object.assign(f,{status:"PASS",evidence_ref:"raw-tool",
   observation:{metric:"agent_guide_covers_tools_flows_errors",value:true,evidence_ref:"raw-tool"},
   samples:[{trace_ref:"raw-tool"},{trace_ref:"raw-tool-2"}]});
 const r=preflightAssessment(x,config);
 assert.equal(r.valid,false);
 assert.ok(r.errors.some(e=>e.code==="unattributed_criterion_test"),JSON.stringify(r.errors));
});
test("V5.1 rejects normative PASS on uncalibrated token threshold even with instrumented raw data",()=>{
 const x=samplePackage();
 const f=x.report.findings.find(r=>r.check_id==="MCP-L2-X4");
 const first=x.evidence_artifacts.find(a=>a.id==="raw-tool"),frame=JSON.parse(first.content);
 frame.response.result.content[0].text=JSON.stringify({total:2,output_tokens:2});
 frame.wire_response=JSON.stringify(frame.response);first.content=JSON.stringify(frame);first.sha256=sha(first.content);
 const tool2=artifact("raw-tool-2","trace",traceData(4,"tools/call",{name:"list_supported_models",arguments:{}},
   {content:[{type:"text",text:JSON.stringify({total:2,output_tokens:2})}],isError:false}));
 x.evidence_artifacts.push(tool2);
 Object.assign(f,{status:"PASS",evidence_ref:"raw-tool",
   observation:{metric:"measured_default_read_context_cost",value:500,evidence_ref:"raw-tool"},
   samples:["raw-tool","raw-tool-2"].map(trace_ref=>({trace_ref,criterion_id:f.check_id,
     case_label:"Instrumented default read output",expected_source:"Independent test tokenizer counts",
     tokenizer_id:"tiktoken-cl100k-base",numeric_pointer:"/result/content/0/text#/output_tokens"}))});
 const r=preflightAssessment(x,config);
 assert.equal(r.valid,false);
 assert.ok(r.errors.some(e=>e.code==="uncalibrated_threshold_not_scoreable"),JSON.stringify(r.errors));
});
test("V5 does not accept first-page-only discovery as complete native inventory",()=>{
 const x=samplePackage(),a=x.evidence_artifacts.find(a=>a.id==="raw-discovery");
 const raw=JSON.parse(a.content);raw.response.result.nextCursor="page-2";
 raw.wire_response=JSON.stringify(raw.response);a.content=JSON.stringify(raw);a.sha256=sha(a.content);
 const r=preflightAssessment(x,config);
 assert.equal(r.valid,false);
 assert.ok(r.errors.some(e=>e.code==="incomplete_native_discovery"));
});
test("a real 5 KB MCP response no longer fails an artificial 4 KB artifact limit",()=>{
 const x=samplePackage();
 x.evidence_artifacts.push(artifact("large-native-frame","trace",traceData(5,"tools/call",
  {name:"list_supported_models",arguments:{limit:300}},
  {content:[{type:"text",text:"x".repeat(5400)}],isError:false})));
 const r=preflightAssessment(x,config);
 assert.equal(r.valid,true,JSON.stringify(r.errors));
});
test("task-scoped capture-only reference hydrates persisted originals and rejects mismatched hashes",async()=>{
 const x=samplePackage(),a=x.evidence_artifacts.find(a=>a.id==="raw-tool");
 const receipt={id:"33333333-3333-4333-8333-333333333333",
  task_id:taskId,method:"tools/call",tool_name:"list_supported_models",
  content:a.content,sha256:a.sha256};
 a.capture_id=receipt.id;
 delete a.content;delete a.sha256;delete a.provenance;
 const calls=[],sql=async(q)=>{calls.push(q);
  if(q===TASK_READ_SQL)return fakeTask;
  if(q===CAPTURE_READ_SQL)return {rows:[receipt]};
  throw Error("Unexpected DB operation")};
 const valid=await taskAgentAction("/v3/task/validate",request("/v3/task/validate",x),sql,
  {validateSubmission,githubVerify:async()=>true,criteria:TASK_CRITERIA});
 assert.equal(valid.status,200);
 assert.equal(valid.data.valid,true,JSON.stringify(valid.data.errors));
 assert.deepEqual(calls,[TASK_READ_SQL,CAPTURE_READ_SQL]);
 a.sha256="f".repeat(64);
 const forged=await taskAgentAction("/v3/task/validate",request("/v3/task/validate",x),sql,
  {validateSubmission,githubVerify:async()=>true,criteria:TASK_CRITERIA});
 assert.equal(forged.data.valid,false);
 assert.ok(forged.data.errors.some(e=>e.code==="unverified_capture_receipt"||e.code==="content_hash_mismatch"));
});

test("two-page tools/list capture computes one complete native inventory",()=>{
 const x=samplePackage(),first=x.evidence_artifacts.find(a=>a.id==="raw-discovery");
 const raw=JSON.parse(first.content);
 raw.response.result.nextCursor="cursor-next";
 raw.wire_response=JSON.stringify(raw.response);
 first.content=JSON.stringify(raw);first.sha256=sha(first.content);
 const second=artifact("raw-discovery-page2","trace",traceData(11,"tools/list",{cursor:"cursor-next"},
  {tools:[{name:"read_details",inputSchema:{type:"object"},annotations:attr}]}));
 x.evidence_artifacts.push(second);
 x.test_metadata.discovered_tool_count=2;
 x.tool_coverage.push({name:"read_details",status:"NOT_TESTED",reason:"Independent fixture did not attempt additional tool"});
 const inventory=x.report.findings.find(f=>f.check_id==="MCP-L1-V4");
 inventory.samples.push({trace_ref:second.id});
 const r=preflightAssessment(x,config);
 assert.equal(r.valid,true,JSON.stringify(r.errors));
 assert.equal(r.metrics.semantic.criteria.PASS,1);
});

test("criterion-specific positive raw assertions produce a valid independently reviewable PASS",()=>{
 const x=samplePackage();
 const f=x.report.findings.find(r=>r.check_id==="MCP-L4-R4");
 for(const [i,toolArgs] of [{guide:"tools"},{guide:"errors"}].entries()){
  x.evidence_artifacts.push(artifact("raw-guide-"+i,"trace",traceData(20+i,"tools/call",
   {name:"list_supported_models",arguments:toolArgs},
   {structuredContent:{has_agent_guide:true,includes_error_recovery:true},isError:false})));
 }
 Object.assign(f,{status:"PASS",evidence_ref:"raw-guide-0",
   observation:{metric:"agent_guide_covers_tools_flows_errors",value:true,evidence_ref:"raw-guide-0"},
   samples:[0,1].map(i=>({trace_ref:"raw-guide-"+i,criterion_id:f.check_id,
    case_label:i===0?"Read verified tool documentation":"Read documented error recovery workflow",
    expected_source:"Version-pinned independently reviewed documentation fixture",
    assertions:[{pointer:"/result/structuredContent/has_agent_guide",operator:"eq",expected:true},
     {pointer:"/result/structuredContent/includes_error_recovery",operator:"eq",expected:true}]}))});
 const r=preflightAssessment(x,config);
 assert.equal(r.valid,true,JSON.stringify(r.errors));
 assert.equal(r.metrics.criteria.PASS,2);
 assert.equal(r.readiness,"READY_FOR_REVIEW");
});

test("full token-scoped receipt-only validation then submission persists original immutable raw bytes",async()=>{
 const x=samplePackage(),a=x.evidence_artifacts.find(a=>a.id==="raw-tool");
 const receipt={id:"33333333-3333-4333-8333-333333333333",task_id:taskId,
  method:"tools/call",tool_name:"list_supported_models",content:a.content,sha256:a.sha256};
 a.capture_id=receipt.id;delete a.content;delete a.sha256;delete a.provenance;
 const calls=[],sql=async(q,args)=>{calls.push({q,args});
  if(q===TASK_READ_SQL)return fakeTask;
  if(q===CAPTURE_READ_SQL)return {rows:[receipt]};
  if(q===TASK_SUBMIT_SQL)return {id:"22222222-2222-4222-8222-222222222222",
   repository_key:repo,state:"READY_FOR_REVIEW"};
  throw Error("Unexpected DB operation")};
 const validated=await taskAgentAction("/v3/task/validate",request("/v3/task/validate",x),sql,
  {validateSubmission,githubVerify:async()=>true,criteria:TASK_CRITERIA});
 assert.equal(validated.data.valid,true,JSON.stringify(validated.data.errors));
 const submitted=await taskAgentAction("/v3/task/submit",request("/v3/task/submit",x),sql,
  {validateSubmission,githubVerify:async()=>true,criteria:TASK_CRITERIA});
 assert.equal(submitted.status,200,JSON.stringify(submitted.data));
 assert.equal(submitted.data.stage,"READY_FOR_REVIEW");
 const insert=calls.find(c=>c.q===TASK_SUBMIT_SQL);
 assert.ok(insert);
 const persisted=JSON.parse(insert.args[10]).evidence_artifacts.find(a=>a.id==="raw-tool");
 assert.equal(persisted.content,receipt.content);
 assert.equal(persisted.sha256,receipt.sha256);
 assert.equal(persisted.capture_id,receipt.id);
 assert.deepEqual(calls.map(x=>x.q).filter(q=>q===TASK_SUBMIT_SQL),[TASK_SUBMIT_SQL]);
});


test("V5.1 criteria carry explicit scoped sources and implementation-neutral behavior policy",()=>{
 assert.equal(TASK_CRITERIA.length,32);
 for(const rule of TASK_CRITERIA){
  assert.equal(rule.evidence_basis.implementation_policy,"EQUIVALENT_BEHAVIOR_ACCEPTED");
  assert.equal(rule.evidence_basis.evaluated_outcome,rule.pass_if.metric);
  assert.ok(Array.isArray(rule.evidence_basis.source_ids));
 }
 for(const id of ["MCP-L2-X3","MCP-L2-X4"])
  assert.equal(TASK_CRITERIA.find(c=>c.id===id).evidence_basis.verdict_policy,"MEASURE_ONLY");
});

test("V5.1 accepts no vendor FAIL without attributable source-side raw evidence",()=>{
 const x=samplePackage();
 const f=x.report.findings.find(c=>c.check_id==="MCP-L2-C2");
 f.status="FAIL";
 f.evidence_ref="raw-tool";
 f.observation={metric:TASK_CRITERIA.find(c=>c.id===f.check_id).pass_if.metric,value:false,evidence_ref:"raw-tool"};
 f.samples=[{trace_ref:"raw-tool",criterion_id:f.check_id,scenario:"invalid_request",
    case_label:"A reproducible invalid argument",expected_source:"Independent contract and observed outcome",
    assertions:[{pointer:"/result/isError",operator:"eq",expected:true}]}];
 let r=preflightAssessment(x,config);
 assert.equal(r.valid,false);
 assert.ok(r.errors.some(e=>e.code==="failed_vendor_attribution_unproven"),JSON.stringify(r.errors));
 f.attribution={surface:"HOST_ADAPTER",failure_mode:"Unrecoverable host response",evidence_ref:"raw-tool"};
 r=preflightAssessment(x,config);
 assert.ok(r.errors.some(e=>e.code==="failed_vendor_attribution_unproven"),JSON.stringify(r.errors));
 f.protocol_violation=true;
 r=preflightAssessment(x,config);
 assert.ok(r.errors.some(e=>e.code==="are_quality_not_mcp_violation"),JSON.stringify(r.errors));
});

test("V5.1 full PASS requires all generic failure-mode scenarios, not a convenient subset",()=>{
 const x=samplePackage();
 const rule=TASK_CRITERIA.find(c=>c.id==="MCP-L2-C2");
 const f=x.report.findings.find(c=>c.check_id===rule.id);
 const second=x.evidence_artifacts.find(c=>c.id==="raw-tool");
 const raw=JSON.parse(second.content);raw.request.id=15;raw.response.id=15;
 raw.wire_request=JSON.stringify(raw.request);raw.wire_response=JSON.stringify(raw.response);
 x.evidence_artifacts.push(artifact("raw-tool-again","trace",raw));
 f.status="PASS";f.evidence_ref="raw-tool";
 f.observation={metric:rule.pass_if.metric,value:true,evidence_ref:"raw-tool"};
 f.samples=["raw-tool","raw-tool-again"].map(trace_ref=>({
  trace_ref,criterion_id:rule.id,scenario:"invalid_request",
  case_label:"A reproducible negative and recovery test",
  expected_source:"Independent fixture expected response assertion",
  assertions:[{pointer:"/result/isError",operator:"eq",expected:false}]
 }));
 const r=preflightAssessment(x,config);
 assert.equal(r.valid,false);
 assert.ok(r.errors.some(e=>e.code==="required_failure_modes_untested"),JSON.stringify(r.errors));
});

test("V5.1 old evidence protocol and result schema are rejected without compatibility fallback",()=>{
 const x=samplePackage();x.evidence_protocol="are.evidence.v5";
 let r=preflightAssessment(x,config);
 assert.equal(r.valid,false);
 x.evidence_protocol="are.evidence.v5.1";x.report.schema="are.assessment.result.v2";
 r=preflightAssessment(x,config);
 assert.equal(r.valid,false);
});

test("V5.1 accepts actionable plain-text tool errors after a real corrected retry; JSON envelope is optional",()=>{
 const x=samplePackage();
 const rule=TASK_CRITERIA.find(c=>c.id==="MCP-L2-C2"),f=x.report.findings.find(c=>c.check_id===rule.id);
 const bad=artifact("raw-invalid-text","trace",traceData(70,"tools/call",
  {name:"list_supported_models",arguments:{provider:"invalid"}},
  {content:[{type:"text",text:"Invalid provider: choose 'all'. Do not retry with an unknown value."}],isError:true}));
 const good=artifact("raw-corrected","trace",traceData(71,"tools/call",
  {name:"list_supported_models",arguments:{provider:"all"}},
  {content:[{type:"text",text:"List returned 2 supported models"}],isError:false}));
 x.evidence_artifacts.push(bad,good);
 Object.assign(f,{status:"PASS",evidence_ref:bad.id,
   observation:{metric:rule.pass_if.metric,value:true,evidence_ref:bad.id},
   samples:[
    {trace_ref:bad.id,criterion_id:rule.id,scenario:"invalid_request",case_label:"Negative tool argument rejected",
      expected_source:"Independent allowed provider enum contract",
      assertions:[{pointer:"/result/isError",operator:"eq",expected:true}]},
    {trace_ref:good.id,criterion_id:rule.id,scenario:"corrected_retry",case_label:"Corrected tool argument accepted",
      expected_source:"Independent allowed provider enum contract",
      assertions:[{pointer:"/result/isError",operator:"eq",expected:false}]}
   ]});
 const result=preflightAssessment(x,config);
 assert.equal(result.valid,true,JSON.stringify(result.errors).slice(0,1800));
 assert.ok(!JSON.stringify(bad).includes("structuredContent"));
});

test("V5.1 accepts deterministic offset/line-range continuation without nextCursor fields",()=>{
 const x=samplePackage();
 const rule=TASK_CRITERIA.find(c=>c.id==="MCP-L2-X2"),f=x.report.findings.find(c=>c.check_id===rule.id);
 const a=artifact("raw-first-lines","trace",traceData(82,"tools/call",
   {name:"list_supported_models",arguments:{offset:0,limit:2}},
   {content:[{type:"text",text:"items A,B; more lines remain; range 0-2"}],isError:false}));
 const b=artifact("raw-next-lines","trace",traceData(83,"tools/call",
   {name:"list_supported_models",arguments:{offset:2,limit:2}},
   {content:[{type:"text",text:"items C,D; complete range 2-4"}],isError:false}));
 x.evidence_artifacts.push(a,b);
 x.test_metadata.applicability_facts.can_truncate_results={value:true,evidence_ref:a.id};
 Object.assign(f,{status:"PASS",evidence_ref:a.id,
   observation:{metric:rule.pass_if.metric,value:true,evidence_ref:a.id},
   samples:[
    {trace_ref:a.id,criterion_id:rule.id,scenario:"bounded_read",case_label:"Initial bounded offset read",
     expected_source:"Four-item independent known fixture; offsets 0 and 2",
     assertions:[{pointer:"/result/content/0/text",operator:"contains",expected:"A,B"}]},
    {trace_ref:b.id,criterion_id:rule.id,scenario:"continued_read",case_label:"Continuation at next offset",
     expected_source:"Four-item independent known fixture; offsets 0 and 2",
     assertions:[{pointer:"/result/content/0/text",operator:"contains",expected:"C,D"}]}
   ]});
 const result=preflightAssessment(x,config);
 assert.equal(result.valid,true,JSON.stringify(result.errors).slice(0,2400));
 assert.ok(!JSON.stringify(a).includes("nextCursor"));
});

test("V5.1 preserves measurable experimental data without scoring calibration hypotheses",()=>{
 const x=samplePackage(),rule=TASK_CRITERIA.find(c=>c.id==="MCP-L2-X4");
 const finding=x.report.findings.find(c=>c.check_id===rule.id);
 const a=artifact("token-sample-a","trace",traceData(82,"tools/call",
  {name:"list_supported_models",arguments:{}},
  {content:[{type:"text",text:JSON.stringify({output_tokens:300})}],isError:false}));
 const b=artifact("token-sample-b","trace",traceData(83,"tools/call",
  {name:"list_supported_models",arguments:{}},
  {content:[{type:"text",text:JSON.stringify({output_tokens:450})}],isError:false}));
 x.evidence_artifacts.push(a,b);
 finding.research_observation={metric:rule.pass_if.metric,value:450,evidence_ref:a.id};
 finding.research_samples=[a,b].map(trace=>({
  trace_ref:trace.id,criterion_id:rule.id,case_label:"Measured token output",
  expected_source:"Independent tokenizer measurement of raw default result",
  numeric_pointer:"/result/content/0/text#/output_tokens",tokenizer_id:"tiktoken-cl100k-base"
 }));
 const result=preflightAssessment(x,config);
 assert.equal(result.valid,true,JSON.stringify(result.errors).slice(0,2000));
 assert.deepEqual(result.metrics.semantic.research_metrics.map(r=>r.value),[450]);
 assert.ok(result.report_preview.includes("Non-scored calibration"));
 assert.equal(result.metrics.criteria.PASS,1);
});

test("V5.1 evidence gate accepts complete tools/list original wire and hash above 122 KB",()=>{
 const x=samplePackage(),d=x.evidence_artifacts.find(a=>a.id==="raw-discovery");
 const raw=JSON.parse(d.content);
 raw.response.result.tools[0].description="Large genuine native schema: "+"Q".repeat(135000);
 raw.wire_response=JSON.stringify(raw.response);
 d.content=JSON.stringify(raw);d.sha256=sha(d.content);
 assert.ok(Buffer.byteLength(d.content)>122279);
 assert.ok(Buffer.byteLength(raw.wire_response)>70000);
 const out=preflightAssessment(x,config);
 assert.equal(out.valid,true,JSON.stringify(out.errors).slice(0,1600));
});
test("V5.1 rejects a single host-side trace beyond explicit bounded total size",()=>{
 const x=samplePackage(),d=x.evidence_artifacts.find(a=>a.id==="raw-discovery");
 const raw=JSON.parse(d.content);
 raw.response.result.tools[0].description="Q".repeat(790000);
 raw.wire_response=JSON.stringify(raw.response);
 d.content=JSON.stringify(raw);d.sha256=sha(d.content);
 assert.ok(Buffer.byteLength(d.content)>1500000);
 const out=preflightAssessment(x,config);
 assert.equal(out.valid,false);
 assert.ok(out.errors.some(e=>e.code==="missing_primary_material"||e.code==="synthetic_trace_rejected"),
   JSON.stringify(out.errors).slice(0,2100));
});

test("large server-origin tools/list uses capture_id only through private task preflight, preserving exact original trace bytes",async()=>{
 const x=samplePackage(),a=x.evidence_artifacts.find(t=>t.id==="raw-discovery");
 const raw=JSON.parse(a.content);
 raw.response.result.tools[0].description="Native full tool contract "+("R".repeat(135000));
 raw.wire_response=JSON.stringify(raw.response);
 a.content=JSON.stringify(raw);a.sha256=sha(a.content);
 const receipt={id:"44444444-4444-4444-8444-444444444444",task_id:taskId,
  method:"tools/list",tool_name:null,content:a.content,sha256:a.sha256};
 a.capture_id=receipt.id;delete a.content;delete a.sha256;delete a.provenance;
 const calls=[],sql=async(q,args)=>{
  calls.push({q,args});
  if(q===TASK_READ_SQL)return fakeTask;
  if(q===CAPTURE_READ_SQL)return {rows:[receipt]};
  throw Error("Unexpected DB operation during read-only validation");
 };
 const result=await taskAgentAction("/v3/task/validate",request("/v3/task/validate",x),sql,
   {validateSubmission,githubVerify:async()=>true,criteria:TASK_CRITERIA});
 assert.equal(result.data.valid,true,JSON.stringify(result.data.errors).slice(0,2000));
 assert.equal(result.data.metrics.semantic.server_attested_traces,1);
 assert.equal(result.data.metrics.semantic.self_reported_raw_traces,1);
 assert.ok(Buffer.byteLength(receipt.content)>122279);
 assert.ok(calls.some(c=>c.q===CAPTURE_READ_SQL&&c.args[2].includes(receipt.id)));
 assert.equal(calls.some(c=>c.q===TASK_SUBMIT_SQL),false);
});
