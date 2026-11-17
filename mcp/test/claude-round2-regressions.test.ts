// Round 2 independent Claude counterexamples: historical dates do not certify current deployments.
import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {Workspace} from "../src/workspace.js";
import {loadChecks} from "../src/data.js";
import {assessScenario,aggregatePortfolio,validateDeliverable,evidenceRequestForScenario} from "../src/checks.js";

const rev="f".repeat(40);
function make(){
  const dir=mkdtempSync(join(tmpdir(),"are-r2-fixed-"));
  return {dir,ws:new Workspace(dir),close:()=>rmSync(dir,{recursive:true,force:true})};
}
function create(dir:string,scenario:string,date:string,version:string|null=null){
  const folder=join(dir,"scenarios",scenario);
  mkdirSync(join(folder,"evidence"),{recursive:true});
  writeFileSync(join(folder,"evidence","junk.md"),"lorem ipsum\n");
  writeFileSync(join(folder,"evidence","sources.md"),"run_job operations source reviewed.\n");
  const risk={
    schema:"are.operation-risk.v1",target:scenario,source_revision:rev,standard_version:"ARE-A02@0.5",
    tool_catalog_count:1,operation_count:1,ingress_paths:["mcp"],
    reviewed_by:"Reviewer Human",reviewed_at:"2026-11-15",
    operations:[{id:"run_job",read:"public",write:"none",external_effect:false,privileged_execution:false,
      financial:false,long_running:true,draft_state:false,evidence:"evidence/sources.md",evidence_type:"inspected"}]
  };
  writeFileSync(join(folder,"ARE-T10-operation-risk-profile.json"),JSON.stringify(risk));
  const rows=loadChecks().map(({id})=>{
    const isNA=id==="L3-S1"&&version!=="ARE-A02@0.5";
    return "| "+id+" | x | "+(isNA?"➖":"✅")+" | inspected | "+(isNA?"no daemon":"evidence/junk.md")+" |";
  });
  const file=join(folder,"ARE-T07-maturity-assessment-"+date+".md");
  writeFileSync(file,[
    "| Item | Content |","| :--- | :--- |","| Currently exposed to agents | write |",
    "| Version assessed | "+rev+" |",
    ...(version?["| Standard version | "+version+" |","| Risk profile | ARE-T10-operation-risk-profile.json |"]:[]),
    "| ID | Short name | Result | Evidence type | Evidence location / reason for N/A |",
    "| :--- | :--- | :--- | :--- | :--- |",...rows
  ].join("\n"));
  return file;
}
for(const [name,version] of [["R1_backdated_unversioned",null],["R2_backdated_explicit_v04","ARE-A02@0.4"]] as const){
  test(name+" remains available only as a historical, non-current grade",()=>{
    const f=make();
    try{
      const file=create(f.dir,"old","2026-11-15",version);
      const r=assessScenario(f.ws,"scenarios/old");
      assert.equal(r.level,"L4","old grade retained in historical snapshot");
      assert.equal(r.level_status,"LEGACY_UNPINNED_PROVISIONAL");
      assert.equal(r.consistent,null,"legacy cannot attest current exposure");
      assert.equal(r.provisional_consistent,null);
      assert.equal(r.exposure_consistency_status,"LEGACY_NOT_REVALIDATED");
      assert.equal(r.allows,null,"legacy grade does not authorize current exposure");
      assert.equal(r.verified_level,null);
      const check=validateDeliverable(f.ws,f.ws.rel(file));
      assert.ok(check.notices.some(n=>n.code==="legacy_assessment_not_current"));
      const agg=aggregatePortfolio(f.ws);
      assert.equal(agg.distribution.L4,0,"legacy not counted as current");
      assert.equal(agg.legacy_distribution.L4,1);
      assert.equal(agg.high_risk_inconsistencies.length,0);
      const requested=evidenceRequestForScenario(f.ws,"scenarios/old","L4");
      assert.equal(requested.already_satisfied,0,"historic passes are not automatically accepted for current assessment");
    }finally{f.close();}
  });
}
for(const badDate of ["2026-00-01","2026-02-30","2026-13-12"]){
  test("R3 invalid calendar date "+badDate+" cannot qualify as historical",()=>{
    const f=make();
    try{
      const file=create(f.dir,"bad",badDate,null);
      const r=assessScenario(f.ws,"scenarios/bad");
      assert.equal(r.level,null);
      assert.equal(r.provisional_level,null);
      assert.equal(r.level_status,"UNSCORABLE_EVIDENCE_BLOCKED");
      assert.ok(r.evidence_gate.issues.some(x=>x.code==="invalid_assessment_date"));
      assert.equal(r.consistent,null);
      const val=validateDeliverable(f.ws,f.ws.rel(file));
      assert.ok(val.issues.some(x=>x.code==="invalid_assessment_date"));
      const agg=aggregatePortfolio(f.ws);
      assert.equal(agg.distribution.L4,0);
      assert.equal(agg.legacy_distribution.L4,0);
      assert.deepEqual(agg.unscorable,["bad"]);
    }finally{f.close();}
  });
}
test("R8 mixed portfolio keeps current and historic level distributions separate",()=>{
  const f=make();
  try{
    create(f.dir,"historical","2026-11-15",null);
    create(f.dir,"current","2026-11-16","ARE-A02@0.5");
    const agg=aggregatePortfolio(f.ws);
    assert.equal(agg.distribution.L4,0);
    assert.equal(agg.legacy_distribution.L4,1);
    assert.equal(Object.values(agg.distribution).reduce((a,b)=>a+b,0),1);
    assert.equal(Object.values(agg.legacy_distribution).reduce((a,b)=>a+b,0),1);
    assert.equal(agg.scenarios.find(s=>s.scenario==="historical")?.consistent,null);
    assert.equal(agg.scenarios.find(s=>s.scenario==="historical")?.comparison_valid,false);
  }finally{f.close();}
});
