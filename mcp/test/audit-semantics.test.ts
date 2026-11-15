import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {loadChecks} from "../src/data.js";
import {Workspace} from "../src/workspace.js";
import {validateLocalMcpAudit} from "../src/audit-gate.js";
import {applicabilityReview,lightweightEquivalent,riskyRecommendations,semanticReview,coverageReview,authorizationReview} from "../src/audit-semantics.js";

test("source-level evidence is not an automatic PASS for multi-part ARE requirements",()=>{
  const a=semanticReview({id:"L3-A4",state:"VERIFIED_PASS",evidence:"10-second timeout and remote kill switch src/interruptible-scan.js#L1"},"");
  assert.equal(a[0]?.code,"semantic_elements_missing");
  assert.match(a[0]?.message||"",/amount limit, frequency limit/);
  const b=semanticReview({id:"L3-O1",state:"VERIFIED_PASS",evidence:"actor, submissionId, changeRef src/activity.js#L2"},"actor, submissionId, changeRef");
  assert.equal(b[0]?.code,"semantic_elements_missing");
  const c=semanticReview({id:"L2-A1",state:"VERIFIED_PASS",evidence:"No external credentials are used src/auth.js#L1"},"");
  assert.ok(c.length);
  const d=semanticReview({id:"L4-O1",state:"VERIFIED_PASS",evidence:"callId in local activity log src/mcp.js#L2"},"");
  assert.ok(d.length);
  const complete=semanticReview({id:"L3-A4",state:"VERIFIED_PASS",
   evidence:"Amount limit CHF 50, frequency limit 3 per minute, kill switch src/policy.js#L3"},"");
  assert.equal(complete.length,0);
  assert.equal(semanticReview({id:"L3-A4",state:"UNKNOWN",evidence:"none"},"").length,0);
});

test("broad checks have a real route to reviewable evidence, not unconditional blockers",()=>{
 const incomplete=coverageReview({id:"L2-X4",state:"VERIFIED_PASS",evidence:"Measured three sampled tools. src/tests.js#L1"},"");
 assert.equal(incomplete[0]?.code,"coverage_not_proven");
 const complete=coverageReview({id:"L2-X4",state:"VERIFIED_PASS",
    evidence:"Measured bytes for all 7/7 read-only tools, test log PASS src/measurement.json#L1"},"");
 assert.equal(complete[0]?.code,"scope_denominator_needs_review");
 assert.equal(complete[0]?.severity,"review");
 const noAuth=authorizationReview({id:"L3-A2",state:"VERIFIED_PASS",evidence:"AGENTS.md says agents should not self-confirm"},"");
 assert.equal(noAuth[0]?.code,"authorization_semantics_unverified");
 const realAuth=authorizationReview({id:"L3-A2",state:"VERIFIED_PASS",
    evidence:"Server-side test asserts the agent self-confirm claim is rejected; preauthorization validation src/auth.test.js#L1"},"");
 assert.equal(realAuth[0]?.code,"authorization_rejection_needs_review");
 assert.equal(realAuth[0]?.severity,"review");
});

test("no daemon is not grounds to mark running scan recovery N/A",()=>{
 const r={id:"L3-S1",state:"NOT_APPLICABLE",evidence:"无常驻后台守护进程（no daemon）"};
 const found=applicabilityReview(r,"The server implements vibe_session_start with a Worker, cancel, timeout and recoverable scan.");
 assert.ok(found.some(x=>x.code==="na_long_task_contradiction"));
 const okay=applicabilityReview(r,"There is no long-running operation. Everything returns synchronously.");
 assert.equal(okay.length,0);
});

test("negated historical suggestions are not affirmative retirement or token-saving recommendations",()=>{
 const safe=[
 "第一轮误报：建议删除 vibe_skip_current，已证伪，必须保留",
 "不要彻底删除工具，不能简单地移除取消能力",
 "Rejected proposal: remove tool vibe_skip_current",
 "把 160KB 估算为 48,000 Token 是错误，未测得 Host 使用量"
 ].join("\n");
 assert.equal(riskyRecommendations(safe).length,0);
 const unsafe=riskyRecommendations("建议删除 vibe_skip_current，因为 session_start 有 skip 参数。\n建议所有工具统一标 readOnlyHint: true");
 assert.ok(unsafe.some(x=>x.code==="unsafe_tool_retirement"));
 assert.ok(unsafe.some(x=>x.code==="bulk_readonly_annotation"));
});

test("substantive minimal value card can live in README; generic AGENTS rules cannot satisfy it",()=>{
 const evidence="README.md#L1";
 const source=[
 "Value Card: Owner: developer; beneficiary: local user",
 "Decision: Go (read-only first), user task: identify drift",
 "Metric baseline: 3 measured calls, source: stdio log, measurement plan by Friday"
 ].join("\n");
 assert.equal(lightweightEquivalent({id:"L1-V1",state:"VERIFIED_PASS",evidence},source),true);
 assert.equal(lightweightEquivalent({id:"L1-V2",state:"VERIFIED_PASS",evidence},source),true);
 assert.equal(lightweightEquivalent({id:"L1-V1",state:"VERIFIED_PASS",evidence:"AGENTS.md#L1"},"general agent coding rules"),false);
});

function report(overrides:Record<string,{status:string,evidence:string}>) {
 const rows=loadChecks().map(({id})=>{
  const v=overrides[id]||{status:"UNKNOWN",evidence:"none"};
  return "| **"+id+"** | check | **"+v.status+"** | inspected | "+v.evidence+" |";
 });
 return "# Audit report\n\n"+rows.join("\n")+"\n";
}
test("modern .mdc rule references resolve without a phantom .md citation",()=>{
 const root=mkdtempSync(join(tmpdir(),"are-evidence-mdc-"));
 try{
  mkdirSync(join(root,".cursor","rules"),{recursive:true});
  writeFileSync(join(root,".cursor/rules/security.mdc"),"trust boundary\nreal evidence\n");
  const content=report({"L2-I1":{status:"VERIFIED_PASS",evidence:".cursor/rules/security.mdc#L2"}});
  writeFileSync(join(root,"ARE_LOCAL_AUDIT_REPORT.md"),content);
  const out=validateLocalMcpAudit(new Workspace(root),"ARE_LOCAL_AUDIT_REPORT.md");
  assert.equal(out.evidence.invalid_references,0);
  assert.equal(out.evidence.references_checked,1);
  assert.ok(!out.issues.some(x=>x.code==="missing_file"||x.code==="invalid_line_range"));
 }finally{rmSync(root,{recursive:true,force:true});}
});

test("complete local report still flags L3-A4/O1 misleading passes and contradictory N/A",()=>{
 const root=mkdtempSync(join(tmpdir(),"are-evidence-real-"));
 try{
  mkdirSync(join(root,"src"));
  writeFileSync(join(root,"src/activity.js"),"const actor=1;\nconst submissionId=2;\n");
  writeFileSync(join(root,"src/interruptible-scan.js"),"const scan_timeout=10000;\nconst killSwitch=true;\n");
  const content=report({
   "L3-A4":{status:"VERIFIED_PASS",evidence:"10 second scan timeout, remote kill switch src/interruptible-scan.js#L1-L2"},
   "L3-O1":{status:"VERIFIED_PASS",evidence:"actor, submissionId, changeRef src/activity.js#L1-L2"},
   "L3-S1":{status:"NOT_APPLICABLE",evidence:"无常驻后台守护进程"}
  })+"\nObserved running vibe_session_start using Worker with cancel and timeout during scan.\n"+
   "第一轮错误建议删除 vibe_skip_current，已证伪，必须保留。\n";
  writeFileSync(join(root,"ARE_LOCAL_AUDIT_REPORT.md"),content);
  const out=validateLocalMcpAudit(new Workspace(root),"ARE_LOCAL_AUDIT_REPORT.md");
  assert.equal(out.evidence.invalid_references,0);
  assert.ok(out.issues.some(x=>x.code==="semantic_elements_missing"&&x.check==="L3-A4"));
  assert.ok(out.issues.some(x=>x.code==="semantic_elements_missing"&&x.check==="L3-O1"));
  assert.ok(out.issues.some(x=>x.code==="na_long_task_contradiction"&&x.check==="L3-S1"));
  assert.ok(!out.issues.some(x=>x.code==="unsafe_tool_retirement"));
  assert.equal(out.verdict,"REVIEW_REQUIRED");
  assert.equal(out.maturity_certified,false);
 }finally{rmSync(root,{recursive:true,force:true});}
});
