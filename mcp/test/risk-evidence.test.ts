import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {Workspace} from "../src/workspace.js";
import {loadChecks} from "../src/data.js";
import {getTemplate} from "../src/knowledge.js";
import {loadRiskProfile,reviewRiskProfile,requiredOperations} from "../src/risk-profile.js";
import {reviewNA,parseNA} from "../src/na-review.js";
import {assessScenario,validateDeliverable} from "../src/checks.js";

function fixture(){
 const dir=mkdtempSync(join(tmpdir(),"are-risk-"));mkdirSync(join(dir,"evidence"));
 writeFileSync(join(dir,"evidence","sources.md"),"All tools discovered from runtime; side effects inspected and verified.\n");
 writeFileSync(join(dir,"evidence","na.md"),"The public tools only read data, do not run background jobs and have no task IDs.\n");
 const profile={
  schema:"are.operation-risk.v1",target:"synthetic-readonly-mcp",source_revision:"f".repeat(40),
  standard_version:"ARE-A02@0.5",tool_catalog_count:1,operation_count:1,ingress_paths:["mcp"],
  reviewed_by:"Reviewer Human",reviewed_at:"2026-11-16",
  operations:[{id:"public_lookup",read:"public",write:"none",external_effect:false,privileged_execution:false,
   financial:false,long_running:false,draft_state:false,
   annotations:{readOnlyHint:true,destructiveHint:false},
   evidence:"evidence/sources.md",evidence_type:"inspected"}]
 };
 writeFileSync(join(dir,"ARE-T10-operation-risk-profile.json"),JSON.stringify(profile,null,2));
 const ws=new Workspace(dir);
 return {dir,ws,profile};
}
function na(scope="public_lookup",reason="This public read-only lookup never creates asynchronous jobs or persistent state"){
 return "N/A{scope="+scope+"; reason="+reason+"; evidence=evidence/na.md; reviewer=Reviewer Human; reviewed_at=2026-11-16}";
}
function t07(dir:string,modern:boolean, naReason:string){
 const rows=loadChecks().map(({id})=>"| "+id+" | check | "+(id==="L3-S1"?"➖":"❌")+" | documented | "+(id==="L3-S1"?naReason:"—")+" |").join("\n");
 const text=[
 "## Basic information","| Item | Content |","| :--- | :--- |",
 "| Scenario name | Synthetic read-only |","| Currently exposed to agents | none |","| Version assessed | "+"f".repeat(40)+" |",
 ...(modern?["| Standard version | ARE-A02@0.5 |","| Risk profile | ARE-T10-operation-risk-profile.json |"]:[]),
 "## L1–L4", "| ID | Short name | Result | Evidence type | Evidence location / reason for N/A |",
 "| :--- | :--- | :--- | :--- | :--- |", rows
 ].join("\n");
 const file=join(dir,"ARE-T07-maturity-assessment-2026-11-16.md");writeFileSync(file,text);return file;
}
test("risk inventory: right-sized public reader and source annotations",()=>{
 const f=fixture();
 try{
  const r=reviewRiskProfile(f.ws,"ARE-T10-operation-risk-profile.json");
  assert.equal(r.issue_count,0);
  assert.equal(r.verdict,"STRUCTURALLY_REVIEWABLE_NOT_CERTIFIED");
  assert.deepEqual(r.applicable_checks["L3-S1"],[]);
  assert.deepEqual(r.applicable_checks["L3-A2"],[]);
  const p=loadRiskProfile(f.ws,"ARE-T10-operation-risk-profile.json");
  assert.deepEqual(requiredOperations(p,"L3-A4"),[]);
 }finally{rmSync(f.dir,{force:true,recursive:true});}
});
test("privileged execution and sensitive reads trigger checks even with no money",()=>{
 const f=fixture();
 try{
  f.profile.operations[0]!.privileged_execution=true;
  f.profile.operations[0]!.read="sensitive";
  writeFileSync(join(f.dir,"ARE-T10-operation-risk-profile.json"),JSON.stringify(f.profile));
  const r=reviewRiskProfile(f.ws,"ARE-T10-operation-risk-profile.json");
  assert.ok(r.issues.some(x=>x.code==="annotation_risk_conflict"));
  assert.deepEqual(r.applicable_checks["L3-A2"],["public_lookup"]);
  assert.deepEqual(r.applicable_checks["L2-A1"],["public_lookup"]);
  assert.ok(reviewNA(f.ws,f.dir,"L3-A2",na(),"ARE-T10-operation-risk-profile.json").issues.some(x=>x.startsWith("na_check_applies")));
 }finally{rmSync(f.dir,{force:true,recursive:true});}
});
test("N/A rejects vague reasons, no profile, unknown tools and out-of-workspace evidence",()=>{
 const f=fixture();
 try{
  assert.equal(parseNA("not applicable"),null);
  assert.equal(reviewNA(f.ws,f.dir,"L3-S1","not applicable","ARE-T10-operation-risk-profile.json").ok,false);
  assert.equal(reviewNA(f.ws,f.dir,"L3-S1",na(),null).ok,false);
  assert.equal(reviewNA(f.ws,f.dir,"L3-S1",na("other_tool"),"ARE-T10-operation-risk-profile.json").ok,false);
  assert.equal(reviewNA(f.ws,f.dir,"L3-S1",na("all"),"ARE-T10-operation-risk-profile.json").ok,true);
  assert.equal(reviewNA(f.ws,f.dir,"L3-S1",na("public_lookup"),"ARE-T10-operation-risk-profile.json").ok,true);
  const evil=na().replace("evidence=evidence/na.md","evidence=../../private.md");
  assert.equal(reviewNA(f.ws,f.dir,"L3-S1",evil,"ARE-T10-operation-risk-profile.json").ok,false);
 }finally{rmSync(f.dir,{force:true,recursive:true});}
});
test("T07@0.5 no longer counts free-text N/A, and its computed level is provisional",()=>{
 const f=fixture();
 try{
  const file=t07(f.dir,true,"no daemon, thus not applicable");
  let r=assessScenario(f.ws,".");
  assert.equal(r.assessment_standard_version,"ARE-A02@0.5");
  assert.equal(r.level_status,"PROVISIONAL_EVIDENCE_REVIEW");
  assert.equal(r.verified_level,null);
  assert.ok(r.evidence_gate.blocker_count>0);
  assert.ok(r.not_applicable_without_reason.includes("L3-S1"));
  assert.ok(validateDeliverable(f.ws,file).issues.some(x=>x.code==="na_requires_structured_scope_reason_evidence_reviewer_date"));
  t07(f.dir,true,na());
  r=assessScenario(f.ws,".");
  assert.ok(!r.not_applicable_without_reason.includes("L3-S1"));
  assert.equal(r.evidence_gate.blocker_count,0);
  assert.equal(r.verified_level,null);
  const assessmentPath=join(f.dir,"ARE-T07-maturity-assessment-2026-11-16.md");
  const original=readFileSync(assessmentPath,"utf8");
  writeFileSync(assessmentPath,original.replace("f".repeat(40),"e".repeat(40)));
  const drift=assessScenario(f.ws,".");
  assert.ok(drift.evidence_gate.issues.some(x=>x.code==="risk_profile_revision_mismatch"));
  assert.equal(drift.consistent,null);
 }finally{rmSync(f.dir,{force:true,recursive:true});}
});
test("historical T07 is not silently converted to current standard or certified",()=>{
 const f=fixture();
 try{
  t07(f.dir,false,"Old N/A because no daemon");
  const r=assessScenario(f.ws,".");
  assert.equal(r.assessment_standard_version,"legacy_unpinned");
  assert.equal(r.level_status,"LEGACY_UNPINNED_PROVISIONAL");
  assert.equal(r.verified_level,null);
 }finally{rmSync(f.dir,{force:true,recursive:true});}
});
test("T10 template is discoverable through the existing MCP knowledge entry",()=>{
 const t=getTemplate("T10","en");
 assert.equal(t.id,"ARE-T10");
 assert.match(t.content,/Operation-level Risk Profile/);
 assert.match(t.workspace_path||"",/operation-risk-profile\.json/);
});
test("A02 links live evidence instead of claiming no empirical work; Benchmark UI hides total",()=>{
 const root=resolve(import.meta.dirname||".","../..");
 const eng=readFileSync(join(root,"adoption/ARE-A02-agent-ready-maturity-model.md"),"utf8");
 const zh=readFileSync(join(root,"adoption/ARE-A02-agent-ready-maturity-model.zh.md"),"utf8");
 assert.match(eng,/are\.world2\.co\/evaluations/);
 assert.match(zh,/are\.world2\.co\/benchmark/);
 assert.ok(!eng.includes("There is currently no data showing"));
 const ui=readFileSync(join(root,"public/benchmark/index.html"),"utf8");
 const app=readFileSync(join(root,"public/benchmark/app.js"),"utf8");
 assert.ok(!ui.includes('id="scoreNumber"'));
 assert.ok(!app.includes('Number(x.score)+"/100"'));
 assert.ok(!app.includes('"静态预检 / 100"'));
});
