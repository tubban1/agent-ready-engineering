import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {Workspace} from "../src/workspace.js";
import {validateLocalMcpAudit} from "../src/audit-gate.js";
import {loadChecks} from "../src/data.js";
function fixture(f: (root:string)=>void){
 const root=mkdtempSync(join(tmpdir(),"are-local-gate-"));
 try{mkdirSync(join(root,"src"));writeFileSync(join(root,"AGENTS.md"),"guidelines only\n");
  writeFileSync(join(root,"src/mcp.js"),"// tool\nserver.registerTool('a',{})\n");
  f(root);
 }finally{rmSync(root,{recursive:true,force:true})}
}
function report(pass:Record<string,string>={},na:string[]=[]){
 const base=loadChecks().map(({id})=>
  "| **"+id+"** | check | **"+(pass[id]?"VERIFIED_PASS":na.includes(id)?"NOT_APPLICABLE":"UNKNOWN")+"** | "+
  (pass[id]?"inspected":"—")+" | "+(pass[id]||na.includes(id)&&"Not in this scenario"||"None") + " |");
 return "# Local audit report\n\n"+base.join("\n")+"\n";
}
test("39 checks tracked; wrong Value Card, nonexistent tests and partial coverage are blocked",()=>{
 fixture(root=>{
  const body=report({"L1-V1":"AGENTS.md#L1","L2-X4":"src/mcp.js#L2","L3-O2":"test/missing.test.js#L8"});
  writeFileSync(join(root,"ARE_LOCAL_AUDIT_REPORT.md"),body);
  const r=validateLocalMcpAudit(new Workspace(root),"ARE_LOCAL_AUDIT_REPORT.md");
  assert.equal(r.claimed.checks,39);
  assert.equal(r.claimed.pass,3);
  assert.equal(r.maturity_certified,false);
  assert.equal(r.official_run_id,null);
  assert.equal(r.verdict,"REVIEW_REQUIRED");
  assert.ok(r.issues.some(x=>x.check==="L1-V1"&&x.code==="evidence_semantic_mismatch"));
  assert.ok(r.issues.some(x=>x.check==="L3-O2"&&x.code==="missing_file"));
  assert.ok(r.issues.some(x=>x.check==="L2-X4"&&x.code==="coverage_not_proven"));
 })
});
test("invalid line citations, symlink escape and review-dependent N/A are caught",()=>{
 fixture(root=>{
  const outside=mkdtempSync(join(tmpdir(),"are-outside-"));
  try{
   writeFileSync(join(outside,"remote.js"),"secret\n");
   symlinkSync(join(outside,"remote.js"),join(root,"src/outside.js"));
   const body=report({"L2-C1":"src/mcp.js#L900","L2-A2":"src/outside.js#L1"},["L3-S1"]);
   writeFileSync(join(root,"ARE_LOCAL_AUDIT_REPORT.md"),body);
   const r=validateLocalMcpAudit(new Workspace(root),"ARE_LOCAL_AUDIT_REPORT.md");
   assert.ok(r.issues.some(x=>x.code==="invalid_line_range"&&x.check==="L2-C1"));
   assert.ok(r.issues.some(x=>x.code==="outside_workspace"&&x.check==="L2-A2"));
   assert.ok(r.issues.some(x=>x.code==="na_needs_human_review"&&x.check==="L3-S1"));
  }finally{rmSync(outside,{recursive:true,force:true})}
 })
});
test("tool-removal advice must prove equivalence and completion is never certification",()=>{
 fixture(root=>{
  const body=report()+ "\n### Suggestions\n请彻底删除 vibe_skip_current，因为与 skip 模式重复。\n";
  writeFileSync(join(root,"ARE_LOCAL_AUDIT_REPORT.md"),body);
  const r=validateLocalMcpAudit(new Workspace(root),"ARE_LOCAL_AUDIT_REPORT.md");
  assert.equal(r.claimed.pass,0);
  assert.ok(r.issues.some(x=>x.code==="unsafe_tool_retirement"));
  assert.equal(r.maturity_certified,false);
  assert.equal(r.official_score,null);
 })
});
