import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {Workspace} from "../src/workspace.js";
import {loadChecks} from "../src/data.js";
import {assessScenario,evidenceRequestForScenario} from "../src/checks.js";
import {nextSteps} from "../src/nextsteps.js";

const rev="f".repeat(40);
function fixture(opts:{version?:string|null;date?:string;wrongRevision?:boolean;legacy?:boolean}={}){
 const dir=mkdtempSync(join(tmpdir(),"are-next-"));
 const folder=join(dir,"scenarios","sample");
 mkdirSync(join(folder,"evidence"),{recursive:true});
 writeFileSync(join(folder,"evidence","junk.md"),"lorem ipsum\n");
 writeFileSync(join(folder,"evidence","source.md"),"query_public documented in live tool catalog, inspected for side effects and source revision.\n");
 const profile={schema:"are.operation-risk.v1",target:"synthetic-service",source_revision:rev,standard_version:"ARE-A02@0.5",
   tool_catalog_count:1,operation_count:1,ingress_paths:["mcp"],reviewed_by:"Review Human",reviewed_at:"2026-11-15",
   operations:[{id:"query_public",read:"public",write:"none",external_effect:false,privileged_execution:false,
     financial:false,long_running:false,draft_state:false,evidence:"evidence/source.md",evidence_type:"inspected"}]};
 writeFileSync(join(folder,"ARE-T10-operation-risk-profile.json"),JSON.stringify(profile));
 const version=opts.version===undefined ? "ARE-A02@0.5" : opts.version;
 const fileDate=opts.date||(opts.legacy?"2026-11-15":"2026-11-16");
 const rows=loadChecks().map(c=>"| "+c.id+" | test | ✅ | inspected | evidence/junk.md |");
 const lines=["| Item | Content |","| :--- | :--- |","| Currently exposed to agents | write |",
   "| Version assessed | "+(opts.wrongRevision?"e".repeat(40):rev)+" |",
   ...(version?["| Standard version | "+version+" |","| Risk profile | ARE-T10-operation-risk-profile.json |"]:[]),
   "| ID | Short name | Result | Evidence type | Evidence location / reason for N/A |",
   "| :--- | :--- | :--- | :--- | :--- |",...rows];
 writeFileSync(join(folder,"ARE-T07-maturity-assessment-"+fileDate+".md"),lines.join("\n"));
 return {ws:new Workspace(dir),scenario:"scenarios/sample",dispose:()=>rmSync(dir,{recursive:true,force:true})};
}
function assertAgreement(f:ReturnType<typeof fixture>){
 const assessment=assessScenario(f.ws,f.scenario);
 const next=nextSteps(f.ws,f.scenario,"L4");
 if (!("assessment" in next)) throw new Error("Expected a populated T07 fixture");
 const requested=evidenceRequestForScenario(f.ws,f.scenario,"L4");
 assert.equal(next.level,assessment.level,"are_next_steps must never independently assert another maturity level");
 assert.equal(next.provisional_level,assessment.provisional_level);
 assert.equal(next.consistent,assessment.consistent,"exposure consistency must agree");
 assert.equal(next.level_status,assessment.level_status);
 assert.equal(next.evidence_gate.blocker_count,assessment.evidence_gate.blocker_count);
 assert.equal(next.exposure_consistency_status,assessment.exposure_consistency_status);
 assert.equal(next.verified_level,null);
 const nextCheckIds=next.steps.flatMap(s=>s.checks.map(c=>c.id)).sort();
 assert.deepEqual(nextCheckIds,requested.checks.map(c=>c.id).sort(),
   "are_next_steps and are_evidence_request must request exactly the same unsatisfied checks");
 return {assessment,next,requested};
}
test("new 39/39 junk PASS cannot yield L4 and zero next steps",()=>{
 const f=fixture();
 try{
   const {assessment,next,requested}=assertAgreement(f);
   assert.notEqual(next.level,"L4");
   assert.equal(next.consistent,null);
   assert.ok(next.evidence_gate.blocker_count>=1);
   assert.ok(requested.checks.length>0);
   assert.ok(next.steps.length>0);
   assert.equal(assessment.level_status,"PROVISIONAL_EVIDENCE_REVIEW");
 }finally{f.dispose();}
});
test("risk-profile source mismatch makes both assessment and next steps unscorable",()=>{
 const f=fixture({wrongRevision:true});
 try{
   const {next,requested}=assertAgreement(f);
   assert.equal(next.level,null);
   assert.equal(next.consistent,null);
   assert.equal(next.level_status,"UNSCORABLE_EVIDENCE_BLOCKED");
   assert.equal(requested.already_satisfied,0);
   assert.equal(requested.checks.length,39);
 }finally{f.dispose();}
});
test("new assessment with missing version fails closed consistently",()=>{
 const f=fixture({version:null});
 try{
   const {next,requested}=assertAgreement(f);
   assert.equal(next.level,null);
   assert.equal(next.consistent,null);
   assert.equal(requested.checks.length,39);
   assert.ok(next.evidence_gate.issues.some(i=>i.code==="standard_version_required"));
 }finally{f.dispose();}
});
test("legacy L4 remains an archival label but never waives current work or validates exposure",()=>{
 const f=fixture({version:null,legacy:true});
 try{
   const {next,requested}=assertAgreement(f);
   assert.equal(next.level,"L4");
   assert.equal(next.level_status,"LEGACY_UNPINNED_PROVISIONAL");
   assert.equal(next.consistent,null);
   assert.equal(next.exposure_consistency_status,"LEGACY_NOT_REVALIDATED");
   assert.equal(next.urgent,null);
   assert.equal(requested.already_satisfied,0);
   assert.equal(requested.checks.length,39);
 }finally{f.dispose();}
});
