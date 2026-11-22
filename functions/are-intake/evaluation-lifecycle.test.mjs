import {test} from "node:test";
import assert from "node:assert/strict";
import {Script} from "node:vm";
import {mcpEvaluationLifecycle,cleanupEligibility,v52EvidenceGuide} from "./evaluation-contract-v52.mjs";
import {taskAgentAction,TASK_READ_SQL} from "./task-service.mjs";
import {pipelinePage} from "./pipeline-page.mjs";
import {TASK_CRITERIA} from "./criteria-compact.mjs";

const id="11111111-2222-4333-8444-555555555555";
const token="aret_"+"Q".repeat(43);
const assignment={
 id,cohort_id:"ARE100-VALUE-20261115",repository_key:"vendor/test-mcp",
 assignee_id:"test-user",assessor_organization:"ARE Independent",
 created_at:"2026-11-21T10:00:00Z",expires_at:"2026-11-25T10:00:00Z",
 plan_snapshot:{version:"are.test-plan.v3",runtime_endpoint:"https://vendor.example/mcp",
   auth_mode:"UNKNOWN",risk_level:"LOW",declared_tool_count:12}
};
const request=path=>new Request("https://example.invalid"+path,{
 method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:"{}"
});
const sql=async(q)=>{assert.equal(q,TASK_READ_SQL);return assignment};
const deps={criteria:TASK_CRITERIA,validateSubmission:()=>{},githubVerify:async()=>false};

test("the canonical lifecycle requires actual host setup, native OAuth smoke test, evidence, submission and bounded cleanup",()=>{
 const flow=mcpEvaluationLifecycle();
 assert.deepEqual(flow.phases,["READ_TASK","DISCOVER","SETUP","AUTH","SMOKE_TEST",
   "EVALUATE","VALIDATE","SUBMIT","CONFIRM_RECEIPT","CLEANUP"]);
 assert.match(flow.setup.remote,/host.*MCP manager/i);
 assert.match(flow.setup.stdio,/isolated.*workspace/i);
 assert.match(flow.setup.baseline,/PROTECTED_PREEXISTING/);
 assert.match(flow.setup.environment,/HOST_UNSUPPORTED|SETUP_FAILED/);
 assert.match(flow.authorization,/GRANTED.*does not mean/i);
 assert.match(flow.smoke_test,/initialize.*tools\/list.*tools\/call/i);
 assert.match(flow.cleanup.permission,/ONLY.*newly created/i);
 assert.match(flow.cleanup.eligibility,/test_completion\.status=COMPLETE/);
 assert.match(flow.cleanup.not_eligible,/PARTIAL.*do NOT remove/i);
 assert.match(flow.cleanup.actions,/shared\/global dependency/i);
 assert.match(flow.cleanup.actions,/NAS when mounted/i);
 assert.match(flow.cleanup.receipt,/CLEANUP_SKIPPED/);
 const guide=v52EvidenceGuide();
 assert.deepEqual(guide.evaluation_lifecycle,flow);
 assert.equal(guide.protocol,"are.evidence.v5.2");
});

test("cleanup gate refuses PARTIAL, lost receipts and unconfirmed submission; only COMPLETE confirmed Neon receipt qualifies",()=>{
 const base={submission_id:"22222222-2222-4222-8222-222222222222",task_token_closed:true};
 const eligible=cleanupEligibility({...base,test_completion:{status:"COMPLETE"}});
 assert.equal(eligible.permitted,true);
 assert.equal(eligible.reason,"NEON_SUBMISSION_CONFIRMED_COMPLETE");
 assert.equal(eligible.requires_setup_manifest,true);
 assert.equal(eligible.retain_evidence,true);
 for(const p of [
  {...base,test_completion:{status:"PARTIAL"}},
  {...base,test_completion:{status:"UNKNOWN"}},
  {...base,test_completion:null},
  {...base,task_token_closed:false,test_completion:{status:"COMPLETE"}},
  {submission_id:"not-real",task_token_closed:true,test_completion:{status:"COMPLETE"}},
  {task_token_closed:true,test_completion:{status:"COMPLETE"}}
 ]){
  const r=cleanupEligibility(p);
  assert.equal(r.permitted,false,JSON.stringify(p));
  assert.match(r.reason,/PARTIAL_OR_UNFINISHED_TEST|SUBMISSION_NOT_CONFIRMED/);
 }
});

test("actual task and contract API teach the same lifecycle without changing assigned token or data",async()=>{
 const task=await taskAgentAction("/v3/task/read",request("/v3/task/read"),sql,deps);
 assert.equal(task.status,200);
 assert.deepEqual(task.data.evaluation_lifecycle,mcpEvaluationLifecycle());
 assert.match(task.data.submission_guidance,/setup_manifest/i);
 assert.match(task.data.submission_guidance,/SUBMIT.*confirm Neon receipt.*CLEANUP/i);
 assert.ok(!JSON.stringify(task.data).includes(token));
 const contract=await taskAgentAction("/v3/task/contract",request("/v3/task/contract"),sql,deps);
 assert.equal(contract.status,200);
 assert.deepEqual(contract.data.contract.evaluation_lifecycle,task.data.evaluation_lifecycle);
 assert.equal(contract.data.private,true);
});

test("copied tester page prompt is valid JS and explicitly includes install/connection, smoke test and only post-COMPLETE teardown",()=>{
 const html=pipelinePage();
 assert.match(html,/setup_manifest/);
 assert.match(html,/STDIO MCP/);
 assert.match(html,/SMOKE TEST/);
 assert.match(html,/test_completion\.status:COMPLETE/);
 assert.match(html,/CLEANUP_SKIPPED/);
 assert.match(html,/不得.*新建 worktree/);
 assert.match(html,/不能删除原来已有的 MCP/);
 const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(js,"task page must have a real script");
 assert.doesNotThrow(()=>new Script(js));
});

test("V5.2 tester page must advertise only the active evidence protocol, never V5.1",async()=>{
 const {pipelinePage}=await import("./pipeline-page.mjs");
 const {EVIDENCE_PROTOCOL}=await import("./evaluation-contract-v52.mjs");
 const page=pipelinePage();
 assert.ok(page.includes(EVIDENCE_PROTOCOL));
 assert.ok(page.includes("V5.2 严格证据"));
 assert.ok(!page.includes("are.evidence.v5.1"));
 assert.ok(!page.includes("V5.1 证据"));
});
