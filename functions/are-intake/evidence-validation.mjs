// ARE assessment preflight: deterministic, read-only and free of database writes.
// Evidence here is assessor supplied, NOT externally attested by ARE.
import {createHash} from "node:crypto";
import {validateV5,EVIDENCE_PROTOCOL,MAX_TRACE_CONTENT_BYTES} from "./evaluation-contract-v51.mjs";
import {validateAuth} from "./authorization-service.mjs";
import {CRITERIA_BY_ID} from "./evaluation-contract-v51.mjs";
const HEX=/^[a-f0-9]{64}$/;
const CHECKS=new Set("MCP-L1-V4 MCP-L1-C1 MCP-L2-C1 MCP-L2-C2 MCP-L2-X1 MCP-L2-X2 MCP-L2-X3 MCP-L2-X4 MCP-L2-A1 MCP-L2-A2 MCP-L2-I1 MCP-L2-O1 MCP-L2-O2 MCP-L3-C1 MCP-L3-C2 MCP-L3-C3 MCP-L3-C4 MCP-L3-S1 MCP-L3-S2 MCP-L3-S3 MCP-L3-S4 MCP-L3-A2 MCP-L3-A3 MCP-L3-A4 MCP-L3-O1 MCP-L3-O2 MCP-L4-O1 MCP-L4-O2 MCP-L4-I1 MCP-L4-I2 MCP-L4-R1 MCP-L4-R4".split(" "));
const TERMINAL=new Set(["PASS","FAIL","NOT_APPLICABLE","BLOCKED_AUTH","UNKNOWN","NOT_TESTED","NOT_ASSESSED"]);
const text=(x,min=1,max=400)=>typeof x==="string"&&x.trim().length>=min&&x.length<=max;
const sha=x=>createHash("sha256").update(x).digest("hex");
function canonical(x){if(Array.isArray(x))return "["+x.map(canonical).join(",")+"]";if(x&&typeof x==="object")return "{"+Object.keys(x).sort().map(k=>JSON.stringify(k)+":"+canonical(x[k])).join(",")+"}";return JSON.stringify(x)}
function tally(rows){const t={PASS:0,FAIL:0,NOT_APPLICABLE:0,UNKNOWN:0,NOT_TESTED:0,BLOCKED_AUTH:0,NOT_ASSESSED:0};for(const r of rows||[])if(Object.hasOwn(t,r?.status))t[r.status]++;return t;}
function safeInline(s){return String(s||"").replace(/[\r\n|]/g," ").slice(0,160)}
export function renderStructuredReport(data,metrics){
 const repo=safeInline(data.repository_key),commit=safeInline(data.report?.target?.source_revision);
 const counts=metrics.criteria,tools=metrics.tools;
 const lines=[
 "# ARE private independent evaluation — "+repo,
 "",
 "**Source:** `"+commit+"`   **Endpoint:** `"+safeInline(data.report?.target?.endpoint||"not verified")+"`",
 "**Verification:** Independent human review still required. No maturity certification, no public-release authorization.",
 "",
 "## Canonical results (generated from the submitted structured record)",
 "",
 "| Criteria PASS | Criteria FAIL | N/A | UNKNOWN | NOT_TESTED |",
 "|---:|---:|---:|---:|---:|",
 `| ${counts.PASS} | ${counts.FAIL} | ${counts.NOT_APPLICABLE} | ${counts.UNKNOWN} | ${counts.NOT_TESTED} |`,
 "",
 `Tools: discovered ${metrics.discovered_tools}, executed PASS ${tools.PASS}, FAIL ${tools.FAIL}, blocked ${metrics.blocked}, untested ${tools.NOT_TESTED}.`,
 `Agent tasks: ${metrics.agent_tasks}, independently verified outcomes: ${metrics.verified_agent_tasks}.`,
 `Source-to-endpoint binding: ${data.source_binding?.verified===true?"assessor-supported (not externally attested)":"unverified"}.`,
 "",
 "## All 32 criteria",
 "",
 "| Criterion | Stored verdict | Evidence reference |",
 "|---|---|---|"
 ];
 for(const row of data.report?.findings||[])lines.push("| "+safeInline(row.check_id)+" | "+safeInline(row.status)+" | "+safeInline(row.evidence_ref||row.evidence_id||"—")+" |");
 lines.push("","**Completion:** "+(data.report?.test_completion?.status||metrics.completion?.status||"UNDETERMINED")+"; private submission is not proof of full testing.");
 lines.push("","## Tool inventory","","| Tool | Result | Oracle / Trace |","|---|---|---|");
 for(const row of data.tool_coverage||[])lines.push("| "+safeInline(row.name)+" | "+safeInline(row.status)+" | "+safeInline(row.oracle_ref||row.trace_ref||"—")+" |");
 lines.push("","**Evidence integrity:** attached references are checked for consistency; independent provenance and business truth require human inspection.");
 return lines.join("\n");
}
export function preflightAssessment(data,{assigneeId,organization,repositoryKey,expectedEndpoint="",authMode="UNKNOWN",taskId="",captures=[],authorization=null,baseValidate=null}={}){
 const errors=[],warnings=[];const issue=(path,code,message,severity="error")=>(severity==="error"?errors:warnings).push({path,code,message});
 if(!data||typeof data!=="object"||Array.isArray(data))return {valid:false,errors:[{path:"$",code:"invalid_package",message:"Expected a JSON object"}],warnings:[],metrics:null,report_preview:null};
 if(data.repository_key!==repositoryKey)issue("repository_key","wrong_project","Assessment must use the assigned repository");
 if(data.report?.assessor?.id!==assigneeId)issue("report.assessor.id","wrong_assignee","Use task-assigned assessor identity");
 if(data.report?.assessor?.organization!==organization)issue("report.assessor.organization","wrong_organization","Use task-assigned assessor organization");
 if(!text(data.report?.target?.source_revision,40,40))issue("report.target.source_revision","source_sha_missing","Pin actual 40-hex Git commit");
 if(!text(data.report?.target?.endpoint,8,400))issue("report.target.endpoint","endpoint_missing","Record observed MCP endpoint or STDIO source");
 if(expectedEndpoint&&data.report?.target?.endpoint!==expectedEndpoint)issue("report.target.endpoint","endpoint_changed","Endpoint differs from assigned snapshot; requires separate owner re-screening");
 if(!Array.isArray(data.report?.findings)||data.report.findings.length!==32)issue("report.findings","expected_32_criteria","Expected 32 versioned ARE checks");
 const seen=new Set(),findings=Array.isArray(data.report?.findings)?data.report.findings:[];
 for(let i=0;i<findings.length;i++){
  const f=findings[i],path="report.findings["+i+"]",id=f?.check_id;
  if(!CHECKS.has(id)||seen.has(id))issue(path+".check_id","unknown_or_duplicate_criterion","Must identify each of 32 criteria exactly once");seen.add(id);
  if(!TERMINAL.has(f?.status))issue(path+".status","invalid_criterion_status","Use approved ARE finding status");
  if(["PASS","FAIL"].includes(f?.status)&&!text(f.evidence_ref||f.evidence_id,1,240))
   issue(path+".evidence_ref","missing_evidence_reference","Decisive criterion must point to primary evidence artifact");
  if(["NOT_TESTED","UNKNOWN","NOT_APPLICABLE","BLOCKED_AUTH","NOT_ASSESSED"].includes(f?.status)&&!text(f.reason,8,500))
   issue(path+".reason","missing_reason","Explain absence, applicability or uncertainty; do not silently leave template defaults");
 }
 for(const id of CHECKS)if(!seen.has(id))issue("report.findings","missing_criterion","Missing "+id);
 const traces=Array.isArray(data.evidence_artifacts)?data.evidence_artifacts:[];
 if(!Array.isArray(data.evidence_artifacts)||traces.length===0||traces.length>256)issue("evidence_artifacts","evidence_artifacts_required","Attach indexed, content-addressed evidence (max 256 artifacts)");
 const refs=new Map();
 for(let i=0;i<traces.length;i++){
  const a=traces[i],path="evidence_artifacts["+i+"]";
  if(!text(a?.id,3,240)||refs.has(a.id))issue(path+".id","bad_artifact_id","Use unique stable reference IDs");
  if(!["trace","oracle","source_binding","agent_task","authorization","duration"].includes(a?.kind))issue(path+".kind","bad_artifact_kind","Specify evidence type");
  if(!text(a?.content,20,a?.kind==="trace"?MAX_TRACE_CONTENT_BYTES:12000)||
    a?.kind==="trace"&&Buffer.byteLength(a.content||"","utf8")>MAX_TRACE_CONTENT_BYTES)
   issue(path+".content","missing_primary_material","Attach original trace within the 1.5 MB byte limit, or use a server-issued capture_id-only reference; supporting evidence remains limited to 12 KB");
  if(!HEX.test(a?.sha256||"")||a.sha256!==sha(a?.content||""))issue(path+".sha256","content_hash_mismatch","Use SHA-256 of actual attached content");
  if(!text(a?.provenance,12,500))issue(path+".provenance","provenance_missing","Identify how observation/oracle was independently gathered");
  if(a?.kind==="oracle"&&!["external_source","known_fixture","state_readback","independent_calculation"].includes(a?.oracle_method))
   issue(path+".oracle_method","oracle_method_required","Independent oracle must identify method and data source");
  if(text(a?.id,3,240))refs.set(a.id,a);
 }
 const need=(ref,kind,path)=>{if(!text(ref,1,250)||!refs.has(ref))issue(path,"unresolved_artifact_ref","No attached primary evidence for "+String(ref||"(none)"));else if(kind&&refs.get(ref).kind!==kind)issue(path,"incorrect_artifact_type","Referenced artifact must be "+kind)};
 for(let i=0;i<findings.length;i++){const f=findings[i];if(["PASS","FAIL"].includes(f?.status))need(f.evidence_ref||f.evidence_id,null,"report.findings["+i+"].evidence_ref")}
 const inventory=Array.isArray(data.tool_coverage)?data.tool_coverage:[];
 const count=data.test_metadata?.discovered_tool_count;
 if(!Number.isInteger(count)||count<0||inventory.length!==count||count>3000)issue("tool_coverage","tool_count_mismatch","Must account for all actually discovered tools");
 const names=new Set();
 for(let i=0;i<inventory.length;i++){
  const t=inventory[i],path="tool_coverage["+i+"]";
  if(!text(t?.name,1,160)||names.has(t.name))issue(path+".name","duplicate_tool_name","Each discovered tool exactly once");names.add(t?.name);
  if(t?.status==="PASS"){need(t.trace_ref,"trace",path+".trace_ref");need(t.oracle_ref,"oracle",path+".oracle_ref")}
  if(t?.status==="FAIL")need(t.trace_ref,"trace",path+".trace_ref");
  if(t?.status?.startsWith("BLOCKED")){need(t.trace_ref,"trace",path+".trace_ref");if(!text(t.reason,8,500))issue(path+".reason","block_reason_missing","Explain blocking cause")}
  if(t?.status==="NOT_TESTED"&&!text(t.reason,8,500))issue(path+".reason","not_tested_reason_missing","Explain why tool was not attempted");
 }
 if(!Array.isArray(data.agent_tasks)||data.agent_tasks.length===0)issue("agent_tasks","agent_task_missing","Add at least one reproducible authorized Agent goal with an independent result check or explicit blocker");
 let verifiedTasks=0;
 for(let i=0;i<(data.agent_tasks||[]).length;i++){
  const t=data.agent_tasks[i],path="agent_tasks["+i+"]";
  if(!text(t?.goal,8,240))issue(path+".goal","goal_missing","Provide real end-to-end Agent goal");
  need(t?.trace_ref,"agent_task",path+".trace_ref");
  if(t?.status==="PASS"){need(t.oracle_ref,"oracle",path+".oracle_ref");if(t.oracle_verified!==true)issue(path+".oracle_verified","oracle_not_verified","Do not mark task successful without independent verification")}
  if(t?.authorized===true&&["PASS","FAIL"].includes(t?.status)&&t.oracle_verified===true)verifiedTasks++;
 }
 if(data.source_binding?.verified!==true){
   if(!text(data.source_binding?.reason,8,500))
    issue("source_binding.reason","source_binding_reason_required","Explain why endpoint-to-source link cannot yet be verified");
   else issue("source_binding.verified","source_binding_unverified","Private incomplete report permitted; independent publication forbidden until binding proof is reviewed","warning");
 }else need(data.source_binding?.evidence_ref,"source_binding","source_binding.evidence_ref");
 const auth=validateAuth(data,authMode,authorization,issue);
 // Duration is either measured and traceable to a separately supplied timer
 // artifact, or explicitly UNKNOWN. Wall clock since task creation is separate.
 const d=data.test_metadata?.duration;
 if(!d||!["MEASURED","UNMEASURED"].includes(d.kind)){
  issue("test_metadata.duration","duration_provenance_required",
   "Provide {kind:MEASURED,source,active_minutes,evidence_ref} or {kind:UNMEASURED,source:UNKNOWN,active_minutes:null}.");
 }else if(d.kind==="UNMEASURED"){
  if(d.source!=="UNKNOWN"||d.active_minutes!==null||data.test_metadata.minutes_used!==0)
   issue("test_metadata.duration","unknown_duration_must_not_be_guessed",
    "Uninstrumented duration must have minutes_used=0, source UNKNOWN and active_minutes=null, never a budget estimate.");
  else issue("test_metadata.duration","active_time_not_measured",
   "Active work time is unknown; elapsed wall-clock age is not active time.","warning");
 }else{
  if(!["AGENT_HOST_TIMER","USER_INTERFACE_TIMER","EXTERNAL_TIMER"].includes(d.source)||
     !Number.isInteger(d.active_minutes)||d.active_minutes<0||
     d.active_minutes>1440||data.test_metadata.minutes_used!==d.active_minutes)
   issue("test_metadata.duration","active_duration_mismatch",
    "Measured minutes must be a nonnegative integer equal to minutes_used, with a named instrument.");
  const a=refs.get(d.evidence_ref);
  if(a?.kind!=="duration")issue("test_metadata.duration.evidence_ref","duration_source_artifact_missing",
   "Include duration primary evidence, never a subjective estimate.");
  else{
   let raw;
   try{raw=JSON.parse(a.content)}catch{}
   if(!raw||raw.source!==d.source||raw.active_minutes!==d.active_minutes||
      !text(raw.instrument,8,240)||!text(raw.recorded_at,19,40)||
      Number.isNaN(Date.parse(raw.recorded_at)))
    issue("test_metadata.duration.evidence_ref","duration_instrument_unverifiable",
     "Duration artifact must record matching source/minutes, named timer and timestamp.");
  }
 }
 if(!text(data.test_metadata?.minutes_used?.toString(),1,10)||!Number.isInteger(data.test_metadata?.minutes_used))issue("test_metadata.minutes_used","elapsed_minutes_missing","Provide elapsed time and separate server observed duration");
 if(baseValidate){
  try{baseValidate(data,assigneeId)}catch(e){issue("$","base_schema_"+String(e?.code||"invalid"),"Base ARE payload schema must pass: "+String(e?.code||"invalid"))}
 }
 const blockedAtAuth=(authMode==="OAUTH"&&(data.test_blockers||[]).some(b=>b?.cause==="OAUTH")&&
   (data.agent_tasks||[]).some(t=>t?.status==="BLOCKED_AUTH"));
 if(findings.every(f=>["NOT_TESTED","UNKNOWN","NOT_ASSESSED"].includes(f?.status))&&!blockedAtAuth)
   issue("report.findings","no_criterion_assessed","Cannot finalize a default unevaluated template without an evidenced authorization blocker");
 const metrics={criteria:tally(findings),tools:tally(inventory),discovered_tools:count??0,
   blocked:inventory.filter(x=>x?.status?.startsWith("BLOCKED")).length,agent_tasks:(data.agent_tasks||[]).length,verified_agent_tasks:verifiedTasks,
   artifacts:traces.length};
 let report_preview=renderStructuredReport(data,metrics);
 const normalized_summary="ARE independent assessment: "+metrics.criteria.PASS+" criteria PASS, "+metrics.criteria.FAIL+
  " FAIL, "+metrics.criteria.NOT_APPLICABLE+" N/A, "+metrics.criteria.NOT_TESTED+" NOT_TESTED; "+
  metrics.tools.PASS+" tools PASS, "+metrics.tools.FAIL+" FAIL, "+metrics.blocked+" BLOCKED; "+verifiedTasks+" agent tasks independently verified.";
 if(text(data.summary,1,2000)&&(/\b100%\s*(?:PASS|通过)|all\s+32\s+pass|32\s*项.*全部通过/i).test(data.summary) &&
 metrics.criteria.PASS!==32)issue("summary","summary_overclaim","Narrative overstates stored criteria verdicts", "warning");
 if(Number.isFinite(data.test_metadata?.server_observed_minutes)&&
   data.test_metadata.minutes_used>data.test_metadata.server_observed_minutes+10)
   issue("test_metadata.minutes_used","elapsed_time_discrepancy","Reported elapsed time exceeds server observed task duration; investigate before approval","warning");
 const verified=validateV5(data,{expectedEndpoint,taskId,captures});
 errors.push(...verified.errors);warnings.push(...verified.warnings);
 metrics.semantic=verified.metrics;
 if(verified.metrics.research_metrics?.length){
  report_preview+="\n\n## Non-scored calibration observations\n\n"+
   "| Criterion | Measured metric | Value | Primary evidence |\n|---|---|---:|---|\n"+
   verified.metrics.research_metrics.map(r=>"| "+safeInline(r.check_id)+" | "+
    safeInline(r.metric)+" | "+String(r.value)+" | "+safeInline(r.evidence_ref)+" |").join("\n")+
   "\n\nThese measurements are research-only, not MCP protocol violations or product FAIL.";
 }
 const blockers=(data.tool_coverage||[]).filter(t=>!["PASS","FAIL"].includes(t.status));
 const unevaluated=(data.report?.findings||[]).filter(f=>!["PASS","FAIL","NOT_APPLICABLE"].includes(f.status)&&
   !(f.status==="NOT_TESTED"&&f.check_id&&
     CRITERIA_BY_ID.get(f.check_id)?.evidence_basis?.verdict_policy==="MEASURE_ONLY"));
 const completionReasons=[];
 if(blockers.length)completionReasons.push("TOOLS_INCOMPLETE");
 if(unevaluated.length)completionReasons.push("CRITERIA_INCOMPLETE");
 if(auth.required&&auth.state!=="CHALLENGE_RECORDED")completionReasons.push("AUTH_NOT_GRANTED");
 if(auth.required&&auth.state==="CHALLENGE_RECORDED"&&blockers.some(x=>x.status==="BLOCKED_AUTH"))
  completionReasons.push("PROVIDER_AUTH_OR_EXECUTION_NOT_COMPLETED");
 if(d?.kind!=="MEASURED")completionReasons.push("ACTIVE_TIME_UNMEASURED");
 const completion={status:completionReasons.length?"PARTIAL":"COMPLETE",
   reasons:[...new Set(completionReasons)],tools_executed:metrics.tools.PASS+metrics.tools.FAIL,
   total_tools:count||0,authorization:auth.state,
   active_minutes:d?.kind==="MEASURED"?d.active_minutes:null,
   time_source:d?.kind==="MEASURED"?d.source:"UNKNOWN",
   wall_clock_minutes:null};
 metrics.completion=completion;
 report_preview+="\\n\\n**Testing completion:** "+completion.status+
  " ("+(completion.reasons.join(", ")||"all scoreable applicable checks complete")+")."+
  " This is separate from private submission or human review.";
 const package_sha256=sha(canonical(data));
 return {valid:errors.length===0,errors,warnings,metrics,completion,readiness:verified.readiness,
   evidence_protocol:EVIDENCE_PROTOCOL,normalized_summary,report_preview,package_sha256,
  private:true,public_release_authorized:false,provenance:"ASSESSOR_DECLARED_REQUIRES_HUMAN_INSPECTION"};
}
