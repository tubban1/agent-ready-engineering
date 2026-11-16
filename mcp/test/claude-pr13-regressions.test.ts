// Independent Claude PR #13 counterexamples, adapted for repository-local CI.
import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {Workspace} from "../src/workspace.js";
import {loadChecks} from "../src/data.js";
import {assessScenario,validateDeliverable,aggregatePortfolio,evidenceRequestForScenario} from "../src/checks.js";
const REV="f".repeat(40);
function ws(opts:{longRunning?:boolean}={}){
 const dir=mkdtempSync(join(tmpdir(),"are-ce-"));mkdirSync(join(dir,"evidence"));
 writeFileSync(join(dir,"evidence","junk.md"),"lorem ipsum\n");
 writeFileSync(join(dir,"evidence","sources.md"),"All tools discovered from runtime; side effects inspected.\n");
 writeFileSync(join(dir,"evidence","na.md"),"reason file\n");
 writeFileSync(join(dir,"ARE-T01-value-card.md"),"| Decision | Go |\n");
 const profile={schema:"are.operation-risk.v1",target:"svc",source_revision:REV,standard_version:"ARE-A02@0.5",
  tool_catalog_count:1,operation_count:1,ingress_paths:["mcp"],reviewed_by:"Reviewer Human",reviewed_at:"2026-11-16",
  operations:[{id:"run_job",read:"public",write:"none",external_effect:false,privileged_execution:false,financial:false,
   long_running:Boolean(opts.longRunning),draft_state:false,evidence:"evidence/sources.md",evidence_type:"inspected"}]};
 writeFileSync(join(dir,"ARE-T10-operation-risk-profile.json"),JSON.stringify(profile));
 return {dir,w:new Workspace(dir)};
}
function t07(dir:string,{version,rev=REV,cell}:{version?:string,rev?:string,cell:(id:string)=>[string,string,string]}){
 const rows=loadChecks().map(({id}:{id:string})=>{const [r,t,l]=cell(id);return `| ${id} | x | ${r} | ${t} | ${l} |`;});
 const text=["| Item | Content |","| :--- | :--- |","| Currently exposed to agents | write |",`| Version assessed | ${rev} |`,
  ...(version?[`| Standard version | ${version} |`,"| Risk profile | ARE-T10-operation-risk-profile.json |"]:[]),
  "| ID | Short name | Result | Evidence type | Evidence location / reason for N/A |","| :--- | :--- | :--- | :--- | :--- |",...rows].join("\n");
 writeFileSync(join(dir,"ARE-T07-maturity-assessment-2026-11-16.md"),text);
}
const allPassJunk=(id:string):[string,string,string]=>["✅","inspected","evidence/junk.md"];

test("CE1 modern T07: semantic blockers exclude ✅ checks from provisional grade",()=>{
 const {dir,w}=ws();
 try{ t07(dir,{version:"ARE-A02@0.5",cell:allPassJunk});
  const r=assessScenario(w,".");
  console.log("CE1",{level:r.level,provisional:r.provisional_level,blockers:r.evidence_gate.blocker_count,codes:[...new Set(r.evidence_gate.issues.map((i:any)=>i.code))]});
  assert.ok(r.evidence_gate.blocker_count>0);
  assert.notEqual(r.provisional_level,"L4","semantic blockers should cap the level");
  assert.ok(r.provisional_level==="L0"||r.provisional_level==="L1");
  const request=evidenceRequestForScenario(w,".","L4");
  assert.ok(request.checks.length>0,"evidence requests must agree with provisional scoring");
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test("CE2 new T07 without standard version is unscorable",()=>{
 const {dir,w}=ws({longRunning:true});
 try{ t07(dir,{cell:id=>id==="L3-S1"?["➖","","no daemon"]:["✅","inspected","evidence/junk.md"]});
  const r=assessScenario(w,".");
  console.log("CE2",{level:r.level,status:r.level_status,blockers:r.evidence_gate.blocker_count,consistent:r.consistent});
  assert.equal(r.level,null,"post-release unversioned T07 must be unscorable");
  assert.equal(r.provisional_level,null);
  assert.ok(r.evidence_gate.issues.some((i:any)=>i.code==="standard_version_required"));
  assert.equal(r.consistent,null);
  const portfolio=aggregatePortfolio(w);
  assert.ok(portfolio.unscorable.includes(w.scenarioName(w.root)));
  assert.equal(portfolio.distribution.L4,0);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test("CE3 unknown future version is unsupported, not legacy",()=>{
 const {dir,w}=ws();
 try{ t07(dir,{version:"ARE-A02@0.5.1",cell:id=>id==="L3-S1"?["➖","","no daemon"]:["✅","inspected","evidence/junk.md"]});
  const r=assessScenario(w,".");
  console.log("CE3",{level:r.level,status:r.level_status,blockers:r.evidence_gate.blocker_count});
  assert.equal(r.level_status,"UNSCORABLE_EVIDENCE_BLOCKED");
  assert.equal(r.level,null);
  assert.ok(r.evidence_gate.issues.some((i:any)=>i.code==="unsupported_standard_version"));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test("CE4 revision mismatch between T07 and profile invalidates maturity level",()=>{
 const {dir,w}=ws();
 try{ t07(dir,{version:"ARE-A02@0.5",rev:"e".repeat(40),cell:allPassJunk});
  const r=assessScenario(w,".");
  console.log("CE4",{level:r.level,mismatch:r.evidence_gate.issues.some((i:any)=>i.code==="risk_profile_revision_mismatch")});
  assert.equal(r.level,null,"version mismatch cannot have a numerical maturity level");
  assert.equal(r.provisional_level,null);
  assert.ok(r.evidence_gate.issues.some((i:any)=>i.code==="risk_profile_revision_mismatch"));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test("CE5 long_running op: structured N/A for L3-S1 is rejected (expected pass)",()=>{
 const {dir,w}=ws({longRunning:true});
 const NA="N/A{scope=all; reason=no daemon so nothing runs long here; evidence=evidence/na.md; reviewer=Reviewer Human; reviewed_at=2026-11-16}";
 try{ t07(dir,{version:"ARE-A02@0.5",cell:id=>id==="L3-S1"?["➖","",NA]:["✅","inspected","evidence/junk.md"]});
  const r=assessScenario(w,".");
  const codes=r.evidence_gate.issues.filter((i:any)=>i.check==="L3-S1").map((i:any)=>i.code);
  console.log("CE5",{level:r.level,codes});
  assert.ok(codes.some((c:string)=>c.startsWith("na_check_applies")));
  assert.ok(r.level!==null&&["L0","L1","L2"].includes(r.level));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test("CE6 N/A with filler reason, future date and unrelated evidence is rejected",()=>{
 const {dir,w}=ws();
 const NA="N/A{scope=all; reason=xxxxxxxxxxxxxxxxxxxx; evidence=evidence/junk.md; reviewer=Bo; reviewed_at=2099-01-01}";
 try{ t07(dir,{version:"ARE-A02@0.5",cell:id=>id==="L3-S1"?["➖","",NA]:["✅","inspected","evidence/sources.md"]});
  const r=assessScenario(w,".");
  const codes=r.evidence_gate.issues.filter((i:any)=>i.check==="L3-S1").map((i:any)=>i.code);
  console.log("CE6",{codes,naAccepted:!r.not_applicable_without_reason.includes("L3-S1")});
  assert.ok(codes.some((c:string)=>["na_review_after_assessment","na_evidence_does_not_identify_scoped_operation","na_reason_unsubstantiated_or_filler"].includes(c)));
  assert.ok(r.not_applicable_without_reason.includes("L3-S1"));
  assert.notEqual(r.level,"L4");
 }finally{rmSync(dir,{recursive:true,force:true});}
});
