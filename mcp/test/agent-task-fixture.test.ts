import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const serverFile=fileURLToPath(new URL("./fixtures/agent-task-server.mjs",import.meta.url));
const ticket="SYN-TICKET-101", approval="synthetic-verified-owner-approval";
async function withFixture(variant:string,scenario:string,run:(client:Client,statePath:string)=>Promise<void>) {
 const statePath=`/tmp/are-agent-fixture-${randomUUID()}.json`;
 const client=new Client({name:"are-p2-fixture-harness",version:"1.0.0"},{versionNegotiation:{mode:"auto"}});
 const transport=new StdioClientTransport({command:process.execPath,args:[serverFile,variant,scenario,statePath]});
 try{ await client.connect(transport); await run(client,statePath); }
 finally{ await client.close(); rmSync(statePath,{force:true}); }
}
function observe(path:string):any{return JSON.parse(readFileSync(path,"utf8"));}
test("P2 real MCP write+lost acknowledgment: ARE status verifies exactly once",async()=>{
 await withFixture("are-operation-contract","T02-ack-lost",async(c,p)=>{
  const read=await c.callTool({name:"ticket_inspect",arguments:{ticket_id:ticket}});
  assert.equal((read.structuredContent as Record<string, unknown> | undefined)?.revision,7);
  const prep=await c.callTool({name:"ticket_prepare_resolution",arguments:{ticket_id:ticket,expected_revision:7}});
  assert.equal((prep.structuredContent as Record<string, unknown> | undefined)?.prepared_id,"syn-prep");
  const commit=await c.callTool({name:"ticket_confirm_resolution",arguments:{ticket_id:ticket,expected_revision:7,approval_receipt:approval,idempotency_key:"stable-transaction-001"}});
  assert.equal(commit.isError,true,"the ACK should be lost by deliberate injection");
  const status=await c.callTool({name:"ticket_operation_status",arguments:{idempotency_key:"stable-transaction-001"}});
  assert.equal((status.structuredContent as Record<string, unknown> | undefined)?.status,"completed");
  const s=observe(p);
  assert.equal(s.ticket.status,"resolved");
  assert.equal(s.notifications.length,1);
  assert.equal(s.event_log.filter((x:any)=>x.name==="ticket_confirm_resolution").length,1);
 });
});
test("P2 unauthorized operation: self-reported agent approval rejected",async()=>{
 await withFixture("are-operation-contract","T04-no-approval",async(c,p)=>{
  const res=await c.callTool({name:"ticket_confirm_resolution",arguments:{ticket_id:ticket,expected_revision:7,approval_receipt:"agent_says_yes",idempotency_key:"unauthorized-transaction-002"}});
  assert.equal(res.isError,true);
  assert.equal((res.structuredContent as Record<string, unknown> | undefined)?.error,"approval_invalid");
  const s=observe(p);
  assert.equal(s.ticket.status,"open");assert.equal(s.notifications.length,0);assert.equal(s.unauthorized_attempts,1);
 });
});
test("P2 stale revision: prepare rejects concurrent edit",async()=>{
 await withFixture("are-operation-contract","T03-stale-revision",async(c,p)=>{
  const res=await c.callTool({name:"ticket_prepare_resolution",arguments:{ticket_id:ticket,expected_revision:7}});
  assert.equal((res.structuredContent as Record<string, unknown> | undefined)?.error,"revision_conflict");
  const s=observe(p);
  assert.equal(s.ticket.status,"open");assert.equal(s.ticket.revision,8);assert.equal(s.notifications.length,0);
 });
});
test("P2 non-idempotent wrapper: blind notification retry doubles side effects",async()=>{
 await withFixture("api-wrapper","T02-ack-lost",async(c,p)=>{
  await c.callTool({name:"update_ticket",arguments:{ticket_id:ticket,status:"closed"}});
  const first=await c.callTool({name:"notify_customer",arguments:{ticket_id:ticket,message:"Resolved"}});
  assert.equal(first.isError,true);
  const second=await c.callTool({name:"notify_customer",arguments:{ticket_id:ticket,message:"Resolved"}});
  assert.equal(second.isError,false);
  assert.equal(observe(p).notifications.length,2);
 });
});
test("P2 task-focused variant: stale revision protection without status receipt",async()=>{
 await withFixture("anthropic-principles","T03-stale-revision",async(c,p)=>{
  const res=await c.callTool({name:"ticket_resolve_and_notify",arguments:{ticket_id:ticket,expected_revision:7,approval_receipt:approval}});
  assert.equal(res.isError,true);assert.equal((res.structuredContent as Record<string, unknown> | undefined)?.error,"revision_conflict");
  const s=observe(p);assert.equal(s.ticket.status,"open");assert.equal(s.notifications.length,0);
 });
});
