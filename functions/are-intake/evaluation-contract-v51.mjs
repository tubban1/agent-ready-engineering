// ARE V5: semantics and evidence grammar are derived from the canonical 32 product criteria.
// This is a structural and reproducibility gate, NOT a claim that assessor-authored
// evidence proves an external service's truth. Only server-issued captures are attested.
import {TASK_CRITERIA} from "./criteria-compact.mjs";

export const EVIDENCE_PROTOCOL="are.evidence.v5.1";
export const RAW_OBSERVATION_PROTOCOL="mcp.raw-observation.v1";
export const CRITERIA_BY_ID=new Map(TASK_CRITERIA.map(c=>[c.id,c]));
export const FACT_NAMES=[...new Set(TASK_CRITERIA.flatMap(c=>c.applies_when.map(w=>w.fact)))].sort();
const method=(x)=>x==="external_source"||x==="known_fixture"||x==="state_readback"||x==="independent_calculation";
const nonblank=(x,min=1,max=1000)=>typeof x==="string"&&x.trim().length>=min&&x.length<=max;
const record=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
const status=new Set(["PASS","FAIL","NOT_APPLICABLE","UNKNOWN","NOT_TESTED","BLOCKED_AUTH","NOT_ASSESSED"]);
const toolStatus=new Set([...status,"BLOCKED_DESIGN","BLOCKED_ENVIRONMENT"]);
const operators={eq:(x,y)=>x===y,gte:(x,y)=>typeof x==="number"&&Number.isFinite(x)&&x>=y,
 lte:(x,y)=>typeof x==="number"&&Number.isFinite(x)&&x<=y};
const isoDate=x=>nonblank(x,19,36)&&!Number.isNaN(Date.parse(x));
function parsed(obj){try{return JSON.parse(obj)}catch{return null}}
function indexEvidence(evidence){return new Map((evidence||[]).filter(a=>nonblank(a?.id)).map(a=>[a.id,a]));}
function isRawCapture(a,{method:expectedMethod,toolName}={}){
 if(!a||a.kind!=="trace")return false;
 const c=parsed(a.content);
 if(!record(c)||c.protocol!==RAW_OBSERVATION_PROTOCOL||!isoDate(c.observed_at)||!nonblank(c.endpoint,8,500)||
  !["http","stdio","sse"].includes(c.transport)||!record(c.request)||!record(c.response))return false;
 const q=c.request,s=c.response;
 if(q.jsonrpc!=="2.0"||s.jsonrpc!=="2.0"||!Number.isInteger(q.id)&&!nonblank(q.id)||
  q.id!==s.id||!nonblank(q.method))return false;
 if(!(record(s.result)||record(s.error)))return false;
 if(!nonblank(c.wire_request,8,5000)||!nonblank(c.wire_response,8,64000))return false;
 try{
  if(JSON.stringify(JSON.parse(c.wire_request))!==JSON.stringify(q))return false;
  const lines=c.wire_response.split(/\r?\n/).filter(x=>x.startsWith("data:"));
  const responseWire=lines.length?lines.at(-1).slice(5).trim():c.wire_response;
  if(JSON.stringify(JSON.parse(responseWire))!==JSON.stringify(s))return false;
 }catch{return false}
 if(expectedMethod&&q.method!==expectedMethod)return false;
 if(toolName&&(q.method!=="tools/call"||q.params?.name!==toolName))return false;
 return true;
}
function checkEvidence(refs,id,kind){return nonblank(id)&&refs.get(id)?.kind===kind;}
function fromPointer(obj,pointer){
 if(!nonblank(pointer,2,230)||!pointer.startsWith("/"))return {valid:false};
 try{
  const [before,after]=pointer.split("#");
  const lookup=(node,path)=>path.split("/").slice(1).reduce((v,key)=>{
   const decoded=key.replace(/~1/g,"/").replace(/~0/g,"~");
   return v?.[decoded];
  },node);
  let value=lookup(obj,before);
  if(after!==undefined)value=lookup(JSON.parse(value),after);
  return {valid:value!==undefined,value};
 }catch{return {valid:false}}
}
function checkIndependentOracle(a,refs){
 if(!a||a.kind!=="oracle"||!method(a.oracle_method))return false;
 const c=parsed(a.content);
 if(!record(c)||!nonblank(c.method_description,10,1000)||
    !nonblank(c.source,8,1000)||c.expected===undefined||
    c.actual===undefined||!record(c.comparison)||!nonblank(c.trace_ref))return false;
 const capture=refs.get(c.trace_ref);
 if(!isRawCapture(capture,{method:"tools/call"}))return false;
 const raw=parsed(capture.content);
 const actual=fromPointer(raw.response,c.actual_pointer);
 if(!actual.valid||actual.value!==c.actual)return false;
 if(c.comparison.operator==="eq")return c.expected===c.actual && c.comparison.passed===true;
 if(c.comparison.operator==="approx")return typeof c.expected==="number"&&typeof c.actual==="number"&&
   Number.isFinite(c.expected)&&Number.isFinite(c.actual)&&typeof c.comparison.tolerance==="number"&&
   Math.abs(c.expected-c.actual)<=c.comparison.tolerance&&c.comparison.passed===true;
 if(c.comparison.operator==="contains")return typeof c.actual==="string"&&typeof c.expected==="string"&&
   c.actual.includes(c.expected)&&c.comparison.passed===true;
 return false;
}
// Avoid treating the project as "N/A" merely because a fact has not been tested.
function discoveryTools(refs,endpoint){
 const pages=[...refs.values()].filter(a=>isRawCapture(a,{method:"tools/list"})).map(artifact=>({artifact,raw:parsed(artifact.content)}))
  .filter(x=>!endpoint||x.raw.endpoint===endpoint);
 const first=pages.find(x=>!x.raw.request?.params?.cursor);
 if(!first)return null;
 const tools=[],artifacts=[],visited=new Set(),names=new Set();
 let current=first,complete=true;
 for(let i=0;i<100;i++){
  if(!current||visited.has(current.artifact.id)){complete=false;break}
  visited.add(current.artifact.id);artifacts.push(current.artifact);
  const result=current.raw.response?.result;
  if(!Array.isArray(result?.tools)){complete=false;break}
  for(const tool of result.tools){
   if(!nonblank(tool?.name,1,160)||names.has(tool.name)||
      !record(tool.inputSchema)){complete=false}
   if(nonblank(tool?.name,1,160))names.add(tool.name);
   tools.push(tool);
  }
  const cursor=result.nextCursor;
  if(cursor===undefined||cursor===null||cursor==="")break;
  if(!nonblank(cursor,1,500)){complete=false;break}
  const matching=pages.filter(x=>x.raw.request?.params?.cursor===cursor);
  if(!matching.length){complete=false;break}
  current=matching.find(x=>!visited.has(x.artifact.id));
  if(!current){complete=false;break}
  if(i===99)complete=false;
 }
 return {artifact:first.artifact,artifacts,tools,complete};
}
function factValue(name,data,refs,issue){
 const count=data.test_metadata?.discovered_tool_count;
 const discovery=discoveryTools(refs,data.report?.target?.endpoint);
 if(discovery && name==="tool_count" && discovery.tools.length!==count)
  issue("test_metadata.discovered_tool_count","tool_inventory_vs_raw_discovery_mismatch","Must count the real tools/list result, not a self-reported catalog size");

 if(name==="tool_count")return Number.isInteger(count)?{known:true,value:count}:{known:false};
 if(name==="has_tools"||name==="has_callable_tools")return Number.isInteger(count)?{known:true,value:count>0}:{known:false};
 const item=data.test_metadata?.applicability_facts?.[name];
 if(!record(item)||typeof item.value!=="boolean"&&!(name==="ingress_count"&&Number.isInteger(item.value)))return {known:false};
 if(!checkEvidence(refs,item.evidence_ref,"trace")&&!checkEvidence(refs,item.evidence_ref,"source_binding")){
  issue("test_metadata.applicability_facts."+name,"fact_primary_evidence_missing","An applicability fact must link a primary observation or pinned source record");
  return {known:false};
 }
 if(name==="ingress_count"&&item.value<0)return {known:false};
 if(["has_large_list_results","can_truncate_results"].includes(name)){
  const evidence=refs.get(item.evidence_ref);
  if(!isRawCapture(evidence,{method:"tools/call"})){
   issue("test_metadata.applicability_facts."+name,"list_behavior_not_observed",
    "List volume/truncation facts require a real tools/call list-output observation; tool count or tools/list cannot decide this");
   return {known:false};
  }
 }
 if(name==="ingress_count"){
  const evidence=refs.get(item.evidence_ref),proof=evidence&&parsed(evidence.content);
  if(evidence?.kind!=="source_binding"||!record(proof)||!Array.isArray(proof.ingresses)||
     proof.ingresses.length!==item.value){
   issue("test_metadata.applicability_facts.ingress_count","ingress_inventory_unverified",
    "Count separate native ingresses from a provider-authored transport inventory; tools/list of one endpoint is insufficient");
   return {known:false};
  }
 }
 if(["has_read_tools","has_writes"].includes(name) && discovery){
  if(item.evidence_ref!==discovery.artifact.id)
   issue("test_metadata.applicability_facts."+name,"fact_must_use_raw_discovery","Read/write applicability must cite original tools/list; tool annotations or prose alone are not proof");
  const flags=discovery.tools.map(t=>t.annotations?.readOnlyHint);
  if(flags.every(v=>typeof v==="boolean")){
   const expected=name==="has_read_tools"?flags.some(v=>v===true):flags.some(v=>v===false);
   if(item.value!==expected)issue("test_metadata.applicability_facts."+name,
     "fact_contradicts_raw_tool_annotations","Declared read/write facts contradict the actual tools/list annotations");
  }else issue("test_metadata.applicability_facts."+name,"read_write_annotations_incomplete",
   "Unannotated tools cannot be assumed safe or read-only; use UNKNOWN applicability when appropriate");
 }
 return {known:true,value:item.value,evidence_ref:item.evidence_ref};
}
function applicability(rule,data,refs,issue){
 if(!rule.applies_when.length)return {known:true,applies:true};
 let unknown=false;
 for(const c of rule.applies_when){
  const f=factValue(c.fact,data,refs,issue);
  if(!f.known){unknown=true;continue}
  const pass=operators[c.op]?.(f.value,c.value);
  if(pass===false)return {known:true,applies:false,fact:c.fact};
 }
 return unknown?{known:false,applies:false}:{known:true,applies:true};
}
// Bind decisive measurements to fields in the ACTUAL wire response, rather than
// accepting assessor-provided metric values paired with an unrelated trace.
// For semantic criteria this proves the asserted facts were observed, not that
// the assessor chose the right test; reviewers still adjudicate that relevance.
function measuredCriterion(rule,observation,samples,refs,discovery,issue,path){
 if(rule.id==="MCP-L1-V4"){
  if(!discovery||!discovery.complete){
   issue(path,"incomplete_native_discovery","Collect every tools/list page through nextCursor before scoring native inventory");
   return null;
  }
  if(observation.evidence_ref!==discovery.artifact.id||
     discovery.artifacts.some(a=>!samples.some(s=>s.trace_ref===a.id))){
   issue(path,"inventory_pages_not_bound","Inventory measurement and samples must cite all original tools/list pages");
   return null;
  }
  return {value:true};
 }
 const numerical=typeof rule.pass_if.value==="number";
 let valid=true;
 const measured=[];
 for(let i=0;i<samples.length;i++){
  const sample=samples[i],p=path+".samples["+i+"]";
  if(!record(sample)||sample.criterion_id!==rule.id||
     !nonblank(sample.case_label,8,240)||!nonblank(sample.expected_source,8,800)){
   issue(p,"unattributed_criterion_test","Name the criterion, actual test case and independent expected source for each sample");
   valid=false;continue;
  }
  const trace=refs.get(sample.trace_ref),raw=trace&&parsed(trace.content);
  if(!isRawCapture(trace)){valid=false;continue}
  if(numerical){
   if(rule.id==="MCP-L2-X4"&&(!/(?:^|[\/#])(?:output_tokens|token_count|tokens)$/.test(sample.numeric_pointer||"")||
      !nonblank(sample.tokenizer_id,4,200))){
    issue(p+".numeric_pointer","token_measurement_not_instrumented","A raw token-count field and identified tokenizer are required; arbitrary numeric fields do not measure token output");
    valid=false;continue;
   }
   const measurement=fromPointer(raw.response,sample.numeric_pointer);
   if(!measurement.valid||typeof measurement.value!=="number"||!Number.isFinite(measurement.value)||
      measurement.value<0){
    issue(p+".numeric_pointer","raw_numeric_measurement_missing","Numerical metrics must extract a finite nonnegative measurement from the raw response");
    valid=false;
   }else measured.push(measurement.value);
  }else{
   if(!Array.isArray(sample.assertions)||sample.assertions.length===0||sample.assertions.length>20){
    issue(p+".assertions","raw_assertion_missing","Boolean criteria need one or more raw response field assertions per test case");
    valid=false;continue;
   }
   let passed=true;
   for(const [n,a] of sample.assertions.entries()){
    const actual=fromPointer(raw.response,a?.pointer);
    if(!actual.valid||!["eq","gte","lte","contains","exists"].includes(a?.operator)||
       (a.operator!=="exists"&&(!["boolean","string","number"].includes(typeof a.expected)||a.expected===null))){
     issue(p+".assertions["+n+"]","raw_assertion_uncheckable","Use a real raw response pointer, supported comparison and explicit expected scalar");
     valid=false;continue;
    }
    const outcome=a.operator==="contains"?typeof actual.value==="string"&&
      typeof a.expected==="string"&&actual.value.includes(a.expected):
      a.operator==="exists"?actual.value!==undefined:
      operators[a.operator]?.(actual.value,a.expected)===true;
    passed=passed&&outcome;
   }
   measured.push(passed);
  }
 }
 if(!valid||measured.length!==samples.length||!measured.length)return null;
 return {value:numerical?Math.max(...measured):measured.every(Boolean)};
}
function checkToolRow(row,i,refs,issue,raw){
 const path="tool_coverage["+i+"]";
 if(!row?.status||!toolStatus.has(row.status))issue(path+".status","invalid_tool_status","Invalid coverage status");
 if(["PASS","FAIL"].includes(row?.status)){
  const trace=refs.get(row.trace_ref);
  if(!isRawCapture(trace,{method:"tools/call",toolName:row.name})){
   issue(path+".trace_ref","not_raw_mcp_tool_trace","Use the exact MCP JSON-RPC request AND response with observed_at, endpoint and transport; synthesized output is not a raw trace");
  }else if(parsed(trace.content)?.endpoint!==raw.endpoint&&
       parsed(trace.content)?.transport!=="stdio"){
   issue(path+".trace_ref","trace_endpoint_mismatch","The tool observation did not originate from the assigned endpoint");
  }else if(row.status==="PASS"&&
    (parsed(trace.content)?.response?.error||parsed(trace.content)?.response?.result?.isError===true)){
   issue(path+".status","failed_rpc_cannot_pass","A JSON-RPC error or tool isError=true cannot be counted as PASS");
  }
  if(row.status==="PASS"&&!checkIndependentOracle(refs.get(row.oracle_ref),refs))
   issue(path+".oracle_ref","not_independent_oracle","Provide independently calculated expected/actual values, source, reproducible method and a computed comparison");
 }
}
// Metric matches criterion, comparator and observed result. A reviewer must still verify
// that the declared measurement reflects original evidence rather than a derived narrative.
export function validateV5(data,{expectedEndpoint="",taskId="",captures=[]}={}){
 const errors=[],warnings=[];
 const issue=(path,code,message,severity="error")=>(severity==="warning"?warnings:errors).push({path,code,message});
 if(data?.evidence_protocol!==EVIDENCE_PROTOCOL)
  issue("evidence_protocol","evidence_v5_required","Use the V5 evidence package; call are_get_task to obtain the contract");
 if(data?.report?.schema!=="are.assessment.result.v3")
  issue("report.schema","assessment_v2_required","Use are.assessment.result.v3");
 const refs=indexEvidence(data?.evidence_artifacts);
 const metadata=data?.test_metadata||{},findings=data?.report?.findings||[];
  const endpoint=data?.report?.target?.endpoint||expectedEndpoint;
 const attested=[],selfReported=[];
 for(const a of data?.evidence_artifacts||[]){
  if(a.kind==="trace"){
   if(!isRawCapture(a)){
    issue("evidence_artifacts."+a.id,"synthetic_trace_rejected","Trace must contain unmodified protocol request/response, not a summarized or reconstructed result");
   }else{
    const c=parsed(a.content);
    if(expectedEndpoint&&c.endpoint!==expectedEndpoint&&
       !(c.transport==="stdio"&&c.endpoint.startsWith("stdio://")))
      issue("evidence_artifacts."+a.id,"observation_endpoint_mismatch",
       "Trace endpoint differs from screened remote endpoint; only separately declared STDIO ingress may vary");
    if(a.capture_id){
      const receipt=captures.find(x=>String(x.id)===String(a.capture_id));
      if(!receipt||receipt.sha256!==a.sha256||receipt.content!==a.content||
        receipt.method!==c.request.method||receipt.task_id!==taskId)
       issue("evidence_artifacts."+a.id,"unverified_capture_receipt","ARE capture ID must match a server-originated immutable request/response for this task");
      else attested.push(a.id);
    }else selfReported.push(a.id);
   }
  }
  if(a.kind==="oracle"&&!checkIndependentOracle(a,refs))
   issue("evidence_artifacts."+a.id,"oracle_not_reproducible","Oracle needs a reproducible method, independent source, expected/actual and machine-confirmed comparison");
 }
 const raw={endpoint},discovery=discoveryTools(refs,endpoint);
 if((metadata.discovered_tool_count||0)>0&&!discovery)
  issue("evidence_artifacts","native_tools_list_capture_missing","A claimed tool inventory needs an original tools/list JSON-RPC trace");
 if(discovery){
  if(discovery.tools.length!==metadata.discovered_tool_count)
   issue("test_metadata.discovered_tool_count","raw_discovery_count_mismatch","Tools discovered must equal the actual tools/list response size");
  const expectedNames=new Set(discovery.tools.map(t=>t.name)),seenNames=new Set((data.tool_coverage||[]).map(t=>t.name));
  if(expectedNames.size!==seenNames.size||[...expectedNames].some(x=>!seenNames.has(x)))
   issue("tool_coverage","raw_discovery_inventory_mismatch","Record exactly the native tools from tools/list, not manually chosen or renamed entries");
 }
 for(let i=0;i<(data.tool_coverage||[]).length;i++)checkToolRow(data.tool_coverage[i],i,refs,issue,raw);
 const verdicts={PASS:0,FAIL:0,NOT_APPLICABLE:0,NOT_TESTED:0,UNKNOWN:0,BLOCKED_AUTH:0,NOT_ASSESSED:0};
 const research_metrics=[];
 for(let i=0;i<findings.length;i++){
  const f=findings[i],rule=CRITERIA_BY_ID.get(f?.check_id),path="report.findings["+i+"]";
  if(!rule||!status.has(f.status))continue;
  verdicts[f.status]++;
  const app=applicability(rule,data,refs,issue);
  if(rule.evidence_basis?.verdict_policy==="MEASURE_ONLY"&&f.research_observation!==undefined){
   const observation=f.research_observation,samples=f.research_samples,researchPath=path+".research_observation";
   if(!record(observation)||observation.metric!==rule.pass_if.metric||
      !checkEvidence(refs,observation.evidence_ref,"trace")||
      !Array.isArray(samples)||samples.length<rule.minimum_samples){
    issue(researchPath,"calibration_measurement_incomplete",
     "Research-only measurements need their own exact metric, original trace and minimum raw samples");
   }else{
    const traceRefs=new Set();
    for(const [n,sample] of samples.entries()){
     if(!isRawCapture(refs.get(sample.trace_ref))||traceRefs.has(sample.trace_ref))
      issue(path+".research_samples["+n+"]","calibration_duplicate_or_missing_trace",
       "Each calibration measurement must use its own actual original tool call trace");
     traceRefs.add(sample.trace_ref);
    }
    const measured=measuredCriterion(rule,observation,samples,refs,null,issue,path+".research_samples");
    if(measured&&observation.value!==measured.value)
     issue(researchPath+".value","calibration_not_derived_from_raw",
       "Research metric must be recalculated from raw response fields");
    if(measured&&measured.value===observation.value)
     research_metrics.push({check_id:rule.id,metric:rule.pass_if.metric,value:measured.value,
      evidence_ref:observation.evidence_ref,scored:false});
   }
  }
  if(f.status==="NOT_APPLICABLE"){
   if(!rule.applies_when.length)issue(path+".status","required_criterion_na","Unconditional REQUIRED criterion cannot be N/A");
   else if(!app.known)issue(path+".status","na_applicability_unproven","Must prove the exact applies_when facts before N/A; missing evidence means UNKNOWN");
   else if(app.applies)issue(path+".status","na_when_applicable","Recorded facts show criterion applies; must test or mark NOT_TESTED/UNKNOWN");
  }
  if(["PASS","FAIL"].includes(f.status)){
   if(rule.evidence_basis?.verdict_policy==="MEASURE_ONLY")
    issue(path+".status","uncalibrated_threshold_not_scoreable",
      "A numerical pilot hypothesis cannot produce a product PASS/FAIL before calibrated real Agent outcome experiments");
   if(f.protocol_violation===true && rule.evidence_basis?.claim_class!=="MCP_CONFORMANCE")
    issue(path+".protocol_violation","are_quality_not_mcp_violation",
      "An ARE engineering outcome is not itself an MCP MUST violation; normative conformance needs an independently pinned clause");
   if(f.status==="FAIL"){
    const a=f.attribution;
    if(!record(a)||!["NATIVE_MCP","VERIFIED_VENDOR_SOURCE"].includes(a.surface)||
        !nonblank(a.failure_mode,8,240)||!nonblank(a.evidence_ref,2,240)||
        !isRawCapture(refs.get(a.evidence_ref))){
     issue(path+".attribution","failed_vendor_attribution_unproven",
      "Vendor FAIL requires an original native/source-backed trace plus a reproducible attributable failure mode; host-adapter-only observations cannot become vendor FAIL");
    }
   }
   if(!app.known)issue(path+".status","decisive_applicability_unproven","Cannot declare PASS/FAIL before applicable context is verified");
   if(app.known&&!app.applies)issue(path+".status","decisive_when_not_applicable","Finding is N/A under recorded target facts");
   const metric=rule.pass_if.metric,op=rule.pass_if.op,expected=rule.pass_if.value,observed=f.observation;
   if(!record(observed)||observed.metric!==metric||!(op in operators)||
      observed.value===undefined||!checkEvidence(refs,observed.evidence_ref,"trace")){
    issue(path+".observation","criterion_metric_missing_or_wrong","Provide observed metric "+metric+", raw trace evidence_ref, and the published pass rule");
   }else{
    const expectedPass=operators[op](observed.value,expected);
    if((f.status==="PASS")!==expectedPass)
     issue(path+".observation.value","verdict_contradicts_criterion","Observed "+metric+" contradicts "+op+" "+String(expected)+" and the declared verdict");
   }
   const samples=f.samples;
   const needed=f.status==="PASS"?rule.minimum_samples:1;
   if(!Array.isArray(samples)||samples.length<needed)
    issue(path+".samples","criterion_minimum_samples_missing","Need at least "+needed+" independent test samples, per ARE criterion procedure");
   else{
    const requiredScenarios=rule.required_scenarios||[];
    const declared=new Set(samples.map(sample=>sample?.scenario));
    if(f.status==="PASS"){
     const missing=requiredScenarios.filter(x=>!declared.has(x));
     if(missing.length)issue(path+".samples","required_failure_modes_untested",
       "A decisive PASS needs every predeclared recovery/failure scenario; missing: "+missing.join(", "));
    }
    if(requiredScenarios.length){
     for(const [n,s] of samples.entries()){
      if(!requiredScenarios.includes(s?.scenario))
       issue(path+".samples["+n+"].scenario","unregistered_failure_mode",
        "Each observed failure-mode sample must use a predeclared universal scenario tag");
     }
    }
    const unique=new Set();
    for(const [n,s] of samples.entries()){
     const ref=s?.trace_ref;
     if(!nonblank(ref)||!isRawCapture(refs.get(ref))){
      issue(path+".samples["+n+"]","criterion_sample_missing_raw_trace","Each sample must link to the actual raw MCP observation");
     }
     if(unique.has(ref))issue(path+".samples","criterion_duplicate_samples","Minimum sample count cannot be satisfied with repeated reference");
     unique.add(ref);
    }
    if(!samples.some(s=>s.trace_ref===f.evidence_ref)||
       !samples.some(s=>s.trace_ref===observed?.evidence_ref)){
     issue(path+".samples","decisive_trace_not_sampled","Finding and metric evidence must link to an actual scored sample, not an unrelated trace");
    }
    if(record(observed)){
     const measured=measuredCriterion(rule,observed,samples,refs,discovery,issue,path);
     if(measured&&observed.value!==measured.value)
      issue(path+".observation.value","measurement_not_derived_from_raw",
        "Observed metric must equal the value recalculated from raw sample response fields");
    }
   }
  }
  if(f.status==="NOT_TESTED"&&!nonblank(f.reason,8,500))
   issue(path+".reason","not_tested_reason_missing","State why a criterion was not tested");
 }
 // A single apparent no-op read is not proof of source code deployed on the remote host.
 const binding=data?.source_binding||{};
 if(binding.verified===true){
  const a=refs.get(binding.evidence_ref),proof=a&&parsed(a.content);
  // Agent-authored proof labels or signatures do not prove remote deployment, even
  // when internally consistent. A future trusted deployment-verifier service may
  // certify the binding; until then only reviewers can inspect supplied proof.
  issue("source_binding.verified","deployment_attestation_not_server_verified",
    "ARE cannot authenticate arbitrary claimed build signatures or a forwarding STDIO proxy. Set verified=false and describe actual vendor-documented association; human reviewer may inspect external release proofs");
 }else if(!nonblank(binding.reason,12,500)){
  issue("source_binding.reason","source_binding_uncertainty_missing","Record whether the endpoint is only vendor documented, a forwarder, or an independently attested build");
 }
 let rawTaskCount=0;
 for(const [i,t] of (data?.agent_tasks||[]).entries()){
  if(t?.status!=="PASS")continue;
  const a=refs.get(t.trace_ref),c=a&&parsed(a.content);
  if(!a||a.kind!=="agent_task"||!record(c)||!Array.isArray(c.steps)||c.steps.length<1||
     !c.steps.every(s=>isRawCapture(refs.get(s.trace_ref),{method:"tools/call"})))
   issue("agent_tasks["+i+"].trace_ref","agent_task_raw_steps_missing","Agent task trace must link one or more actual MCP call observations, not hypothetical outputs");
  else rawTaskCount++;
  if(!checkIndependentOracle(refs.get(t.oracle_ref),refs))
   issue("agent_tasks["+i+"].oracle_ref","agent_task_independent_oracle_missing","Agent result must be checked against independent reproducible expected truth");
 }
 if(!Number.isInteger(metadata.minutes_used)||metadata.minutes_used<0)
  issue("test_metadata.minutes_used","invalid_measured_duration","Record measured duration");
 const metrics={criteria:verdicts,raw_tool_traces:(data.tool_coverage||[]).filter(t=>isRawCapture(refs.get(t.trace_ref))).length,
  server_attested_traces:attested.length,self_reported_raw_traces:selfReported.length,
  research_metrics,
  raw_agent_tasks:rawTaskCount,known_facts:FACT_NAMES.filter(x=>factValue(x,data,refs,()=>{}).known).length,
  unknown_facts:FACT_NAMES.filter(x=>!factValue(x,data,refs,()=>{}).known)};
 // Ready for HUMAN REVIEW does not mean independently certified, contact-approved or
 // source-to-deployment attested. OAuth and STDIO clients may only have self-reported
 // raw traces, whose provenance requires manual confirmation.
 const readiness=errors.length===0 && verdicts.PASS+verdicts.FAIL>0 &&
   rawTaskCount>0?"READY_FOR_REVIEW":errors.length?"INVALID":"NEEDS_EVIDENCE";
 if(selfReported.length)issue("evidence_artifacts","self_reported_raw_not_attested",
  "Client-supplied raw frames are reproducible but not independently attested; reviewer must check raw transcripts","warning");
 if(binding.verified!==true)issue("source_binding","deployment_not_attested",
  "Assessment can be privately submitted but must not assert exact pinned source is live deployment","warning");
 return {valid:errors.length===0,errors,warnings,metrics,readiness,attested_capture_ids:attested,protocol:EVIDENCE_PROTOCOL};
}
export function v5EvidenceGuide(){
 const request={jsonrpc:"2.0",id:1,method:"tools/call",params:{name:"read_info",arguments:{}}};
 const response={jsonrpc:"2.0",id:1,result:{content:[{type:"text",text:JSON.stringify({count:2})}]}};
 const traceContent=JSON.stringify({protocol:RAW_OBSERVATION_PROTOCOL,observed_at:"2026-11-20T18:30:00Z",
   endpoint:"https://EXAMPLE.COM/mcp",transport:"http",request,response,
   wire_request:JSON.stringify(request),wire_response:JSON.stringify(response)});
 return {protocol:EVIDENCE_PROTOCOL,report_schema:"are.assessment.result.v3",
   statuses:[...status],tool_statuses:[...toolStatus],applicability_facts:FACT_NAMES,
   default_finding_status:"NOT_TESTED",
   task_scope:"Task Token is supplied only to the ARE MCP, never to the evaluated project.",
   facts:"test_metadata.applicability_facts: {fact:{value:boolean|integer,evidence_ref:attached_raw_trace_id}}. Unknown applicability MUST use UNKNOWN/NOT_TESTED, never automatic N/A.",
   evidence_basis:"Every criterion includes claim_class, source_ids, provenance scope and verdict_policy. MCP protocol MUST claims are separate from ARE quality. CALIBRATION_HYPOTHESIS items are MEASURE_ONLY and cannot produce PASS/FAIL. Equivalent mechanisms that satisfy the measured outcome are allowed.",
   failure_attribution:"For each FAIL supply attribution:{surface:'NATIVE_MCP'|'VERIFIED_VENDOR_SOURCE',failure_mode:'reproducible cause',evidence_ref:'original trace id'}; host adapter-only evidence cannot become a vendor FAIL.",
   research_measurement:"MEASURE_ONLY criteria may carry research_observation:{metric,value,evidence_ref} plus research_samples, with original traces and machine-recomputed values; they stay UNKNOWN/NOT_TESTED or NOT_APPLICABLE and cannot score PASS/FAIL.",
   required_scenarios:"When rule.required_scenarios is present, every PASS sample must declare one matching scenario tag and all required tags must be covered; partial failure-mode coverage must not be called PASS.",
   findings:"For PASS/FAIL, supply exact pass_if.metric and observation.value plus raw trace samples. MCP-L1-V4 is recomputed from complete, unique, schema-valid tools/list pages (including nextCursor). Other boolean metrics require samples [{trace_ref,criterion_id,case_label,expected_source,assertions:[{pointer,operator,expected}]}] where pointer extracts an actual response field and computed all-assertion truth equals observation.value. Numeric metrics use samples [{trace_ref,criterion_id,case_label,expected_source,numeric_pointer,tokenizer_id}] with observed.value equal to maximum raw extracted number; output-token count must point to an actual token_count/output_tokens/tokens field, never a generic total. For N/A supply reason + known false applies_when fact with trace. Each sample must be distinct; expected_source must be separately defensible in review.",
   trace:{id:"raw-t1",kind:"trace",sha256:"SHA256_OF_EXACT_UTF8_CONTENT",
     provenance:"Agent host captured native MCP frames; verification pending",
     content:traceContent},
   oracle:{id:"oracle-1",kind:"oracle",oracle_method:"independent_calculation",sha256:"sha256(actual UTF-8 content)",
     provenance:"Independent fixture/accounting math with cited source",
     content:JSON.stringify({method_description:"Recompute expected result from a separate trusted fixture",
       source:"https://EXAMPLE.COM/ratecard-or-file-version",trace_ref:"raw-t1",
       actual_pointer:"/result/content/0/text#/count",expected:2,actual:2,
       comparison:{operator:"eq",passed:true}})},
   task:{goal:"Safely retrieve and verify one real result",status:"PASS",authorized:true,agent:"Agent name and version",
     trace_ref:"agent-task-evidence",oracle_ref:"oracle-1",oracle_verified:true},
   agent_task_artifact:"agent_task artifact content JSON must contain steps:[{trace_ref:'raw-t1'}] pointing to raw tool call evidence",
   source_binding:"Set verified=false and record the provider's published endpoint/source association plus uncertainty. Do not claim verified=true from README, STDIO forwarding, or self-asserted signatures; only a separate trusted deployment-verifier can establish it.",
   accepted_oracle_methods:["external_source","known_fixture","state_readback","independent_calculation"],
   cannot_prove:"Raw field assertions can be recomputed, but ARE cannot automatically determine if a chosen case covers every semantic requirement or verify external expected truth. Agent-authored JSON plus SHA-256 is not an independent network trace. ARE-assisted capture can independently attest no-auth read-only observations. OAuth/STDIO and source build provenance require human adjudication.",
   server_captures:"For server-origin trace artifacts, send {id,kind:\"trace\",capture_id} instead of repeating content; the service resolves immutable content/hash/provenance within the assigned task. Client captures require full content and SHA-256. Single raw capture maximum 70 KB; keep entire submission below 1.8 MB.",
   review:"Valid=true means structurally reproducible. READY_FOR_REVIEW is private, not independent certification or authorization for outreach. An Owner must inspect and approve evidence.",
   safety:"Never embed bearer/OAuth token, cookie, credentials, personal data, authorization headers or secrets in artifacts; redact before attaching."};
}
