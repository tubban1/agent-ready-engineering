import {test} from "node:test";
import assert from "node:assert/strict";
import {callTaskApi} from "../src/task-intake.js";
import {Client,InMemoryTransport} from "@modelcontextprotocol/client";
import {createServer} from "../src/server.js";
const token="aret_"+("Q".repeat(43));

test("public MCP exposes five scoped task tools with truthful write annotations",async()=>{
 const client=new Client({name:"task-contract-test",version:"1.0"});
 const server=createServer();const [a,b]=InMemoryTransport.createLinkedPair();
 await server.connect(b);await client.connect(a);
 try{
 const {tools}=await client.listTools();
 const map=Object.fromEntries(tools.map(t=>[t.name,t]));
 assert.equal(map.are_get_task?.annotations?.readOnlyHint,true);
 assert.equal(map.are_validate_assessment?.annotations?.readOnlyHint,true);
 assert.equal(map.are_checkpoint?.annotations?.readOnlyHint,false);
 assert.equal(map.are_get_criteria?.annotations?.readOnlyHint,true);
 assert.equal(map.are_get_submission?.annotations?.readOnlyHint,true);
 assert.equal(map.are_submit_assessment?.annotations?.readOnlyHint,false);
 assert.equal(map.are_submit_assessment?.annotations?.destructiveHint,false);
 assert.equal(map.are_submit_assessment?.annotations?.idempotentHint,true);
 assert.ok(JSON.stringify(map.are_submit_assessment?.inputSchema).includes("task_token"));
 assert.ok(JSON.stringify(map.are_submit_assessment?.inputSchema).includes("evidence_package"));
 assert.equal(Boolean(tools.find(t=>t.name==="are_publish_assessment")),false);
 assert.equal(Boolean(tools.find(t=>t.name==="are_revoke_task")),false);
 }finally{await client.close();await server.close()}
});

test("invalid or oversized task submission is rejected before network access",async()=>{
 let calls=0;
 const f=(async()=>{calls++;return new Response("{}")}) as typeof fetch;
 const a=await callTaskApi("/v3/task/read","owner_secret",{},f);
 assert.equal(a.ok,false);
 assert.equal(a.data.error,"invalid_task_token");
 const b=await callTaskApi("/v3/task/submit",token,{junk:"x".repeat(360000)},f);
 assert.equal(b.ok,false);
 assert.equal(b.data.error,"payload_too_large");
 assert.equal(calls,0);
});

test("task token never appears in API path, request body, result or error",async()=>{
 let uri="",headers:Headers|undefined,body="";
 const f=(async (input:RequestInfo|URL,init?:RequestInit)=>{
  uri=String(input);headers=new Headers(init?.headers);body=String(init?.body||"");
  return new Response(JSON.stringify({ok:true,task:{id:"test",repository_key:"source/project"}}),
   {status:200,headers:{"content-type":"application/json"}});
 }) as typeof fetch;
 const x=await callTaskApi("/v3/task/read",token,{},f);
 assert.equal(x.ok,true);
 assert.match(uri,/areintake\.compute/);
 assert.ok(uri.endsWith("/v3/task/read"));
 assert.ok(!uri.includes(token));
 assert.equal(headers?.get("authorization"),"Bearer "+token);
 assert.equal(headers?.get("cache-control"),null);
 assert.ok(!body.includes(token));
 assert.ok(!JSON.stringify(x.data).includes(token));
});

test("API errors are structured and never echo unknown private upstream messages",async()=>{
 const f=(async()=>new Response(JSON.stringify({error:"task_revoked_expired_or_unknown"}),
 {status:403,headers:{"content-type":"application/json"}})) as typeof fetch;
 const x=await callTaskApi("/v3/task/submit",token,{},f);
 assert.equal(x.ok,false);assert.equal(x.data.http_status,403);
 assert.equal(x.data.error,"task_revoked_expired_or_unknown");
 const wrong=(async()=>new Response("not-json",{status:502})) as typeof fetch;
 const y=await callTaskApi("/v3/task/read",token,{},wrong);
 assert.equal(y.ok,false);assert.equal(y.data.error,"private_task_service_unavailable");
});
