import { test } from "node:test";
import assert from "node:assert/strict";
import { runSuite, tasks, variants } from "./runner.mjs";
test("P2 synthetic fixtures cover independent business end states and negative controls",async()=>{
 const report=await runSuite();
 assert.equal(report.real_agent_model_evaluations,0);
 assert.equal(report.results.length,15);
 assert.deepEqual(report.variants,variants);
 assert.equal(tasks.length,5);
 for(const row of report.results) {
   assert.equal(row.side_effects_verified,true);
   assert.equal(row.model_id,null);
   assert.equal(row.measured_tokens,null);
   assert.ok(row.tool_call_count>=1);
 }
 const pass=(variant,task)=>report.results.find(x=>x.variant===variant&&x.task_id===task)?.verified;
 assert.equal(pass("api-wrapper","T02-ack-lost"),false);
 assert.equal(pass("anthropic-principles","T02-ack-lost"),false);
 assert.equal(pass("are-operation-contract","T02-ack-lost"),true);
 assert.equal(pass("api-wrapper","T03-stale-revision"),false);
 assert.equal(pass("anthropic-principles","T03-stale-revision"),true);
 assert.equal(pass("are-operation-contract","T04-no-approval"),true);
 assert.equal(pass("api-wrapper","T04-no-approval"),false);
 const are=report.results.find(x=>x.variant==="are-operation-contract"&&x.task_id==="T02-ack-lost");
 assert.equal(are?.oracle?.notifications,1);
 assert.ok(are.tool_trace.includes("ticket_operation_status"));
});
test("P2 fixture is deterministic except for reporting timestamp",async()=>{
 const [a,b]=await Promise.all([runSuite(),runSuite()]);
 assert.deepEqual(a.results,b.results);
 assert.deepEqual(a.summary,b.summary);
});
