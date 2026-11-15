#!/usr/bin/env node
// Isolated synthetic ticket fixture for actual agent ↔ MCP tool-call experiments.
// Never uses an external business system. Its output file is only a local oracle.
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const [variant, scenario, statePath] = process.argv.slice(2);
if (!["api-wrapper", "anthropic-principles", "are-operation-contract"].includes(variant)
  || !["T01-normal", "T02-ack-lost", "T03-stale-revision", "T04-no-approval"].includes(scenario)
  || !statePath?.startsWith("/tmp/are-agent-fixture-")) {
  console.error("Usage: node agent-task-server.mjs <variant> <scenario> /tmp/are-agent-fixture-<id>.json");
  process.exit(2);
}
const s={variant,scenario,ticket:{id:"SYN-TICKET-101",status:"open",revision:7,topic:"duplicate invoice"},notifications:[],
  event_log:[],operations:{},dropped_ack:false,mutation_applied:false,unauthorized_attempts:0};
function persist(){mkdirSync(dirname(statePath),{recursive:true});writeFileSync(statePath,JSON.stringify(s,null,2));}
persist();
function log(name,args,result) {
  s.event_log.push({name,args,result});
  persist();
  return result;
}
function out(obj){return {content:[{type:"text",text:JSON.stringify(obj)}],structuredContent:obj,isError:Boolean(obj.error)};}
function approve(receipt){return receipt==="synthetic-verified-owner-approval";}
function maybeOtherEdit(){
  if(s.scenario==="T03-stale-revision"&&!s.mutation_applied){s.mutation_applied=true;s.ticket.revision++;s.ticket.topic="newer human update";persist();}
}
function notify(){
  s.notifications.push({id:"synthetic-notice-"+(s.notifications.length+1),ticket:s.ticket.id});
}
function maybeLostAck(){
  if(s.scenario==="T02-ack-lost"&&!s.dropped_ack){s.dropped_ack=true;persist();return {error:"ack_lost_after_commit",retryable:true,hint:"Original commit may have succeeded; reconcile before retrying."};}
  return null;
}
const server=new McpServer({name:"are-synthetic-ticket-fixture",version:"0.1.0"},
 {instructions:"SYNTHETIC ONLY: Complete the requested business task using available tools. Never use shell commands for ticket operations. Tool errors may be ambiguous; only claims grounded in observed state count. No real users or accounts."});
function tool(name,description,inputSchema,fn){
 server.registerTool(name,{title:name,description,inputSchema,annotations:{readOnlyHint:/^(get_|ticket_inspect|ticket_operation_status|ticket_get_resolution_context)/.test(name),openWorldHint:false}},
 async args=>out(log(name,args,fn(args))));
}
if(variant==="api-wrapper"){
  tool("get_ticket","Return a ticket object including status, revision, subject and history.",z.object({ticket_id:z.string()}),()=>{
    const history=Array.from({length:35},(_,i)=>`status history row ${i}: duplicate invoice follow up`);
    return {...s.ticket,history};
  });
  tool("update_ticket","Change ticket status using a raw patch. This legacy wrapper does not have a caller-approval contract or idempotency semantics.",z.object({ticket_id:z.string(),status:z.string()}),({status})=>{
    maybeOtherEdit();if(s.scenario==="T04-no-approval")s.unauthorized_attempts++;
    s.ticket.status=status==="resolved"||status==="closed"?"resolved":status;s.ticket.revision++;
    return {ok:true,ticket:s.ticket.id,status:s.ticket.status,revision:s.ticket.revision};
  });
  tool("notify_customer","Send a synthetic customer notification. There is no idempotency key.",z.object({ticket_id:z.string(),message:z.string()}),()=>{
    notify();return maybeLostAck()||{ok:true,sent:s.notifications.length};
  });
}else if(variant==="anthropic-principles"){
  tool("ticket_get_resolution_context","Return only useful ticket fields for deciding how to resolve; this is read-only.",z.object({ticket_id:z.string()}),()=>{
    return {...s.ticket,owner_approval_required:true};
  });
  tool("ticket_resolve_and_notify","Resolve and notify in one bounded task-oriented call, given current revision and owner approval. No idempotency/status lookup is implemented.",z.object({ticket_id:z.string(),expected_revision:z.number().int(),approval_receipt:z.string()}),({expected_revision,approval_receipt})=>{
    maybeOtherEdit();
    if(!approve(approval_receipt)){s.unauthorized_attempts++;return {error:"approval_required"};}
    if(s.ticket.revision!==expected_revision)return {error:"revision_conflict",latest_revision:s.ticket.revision};
    s.ticket.status="resolved";s.ticket.revision++;notify();
    return maybeLostAck()||{status:"completed",revision:s.ticket.revision,notifications:s.notifications.length};
  });
}else{
  tool("ticket_inspect","Read concise ticket fields and current revision. No side effects.",z.object({ticket_id:z.string()}),()=>({...s.ticket,owner_approval_required:true}));
  tool("ticket_prepare_resolution","Validate current revision, show planned effects, and produce synthetic preparation ID. Does not commit.",z.object({ticket_id:z.string(),expected_revision:z.number().int()}),({expected_revision})=>{
    maybeOtherEdit();
    if(s.ticket.revision!==expected_revision)return {error:"revision_conflict",latest_revision:s.ticket.revision};
    return {prepared_id:"syn-prep",expected_revision,planned_side_effects:["resolve ticket","notify once"]};
  });
  tool("ticket_confirm_resolution","Commit only with verified approval receipt, expected revision and idempotency key. May lose response after commit; never retry blindly.",z.object({ticket_id:z.string(),expected_revision:z.number().int(),approval_receipt:z.string(),idempotency_key:z.string().min(10)}),
    ({ticket_id,expected_revision,approval_receipt,idempotency_key})=>{
      if(!approve(approval_receipt)){s.unauthorized_attempts++;return {error:"approval_invalid",retryable:false};}
      const digest=JSON.stringify({ticket_id,expected_revision,action:"resolve_and_notify"});
      const old=s.operations[idempotency_key];
      if(old)return old.digest===digest?old.receipt:{error:"idempotency_conflict",retryable:false};
      if(s.ticket.revision!==expected_revision)return {error:"revision_conflict",latest_revision:s.ticket.revision,retryable:false};
      s.ticket.status="resolved";s.ticket.revision++;notify();
      const receipt={status:"completed",operation_id:idempotency_key,revision:s.ticket.revision,notification_count:s.notifications.length};
      s.operations[idempotency_key]={digest,receipt};
      return maybeLostAck()||receipt;
    });
  tool("ticket_operation_status","Read independently persisted idempotency-key status after a lost acknowledgement. This never commits.",z.object({idempotency_key:z.string()}),({idempotency_key})=>{
    return s.operations[idempotency_key]?.receipt||{status:"uncertain",idempotency_key};
  });
}
await serveStdio(()=>server);
