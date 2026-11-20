import test from "node:test";
import assert from "node:assert/strict";
import {captureReadOnly,CAPTURE_RESERVE_SQL,CAPTURE_INSERT_SQL,CAPTURE_READ_SQL,validCaptureId} from "./capture-v5.mjs";
const endpoint="https://vendor.example.com/mcp",taskId="11111111-2222-4333-8444-555555555555";
const captureId="22222222-2222-4222-8222-222222222222";
const assignment={id:taskId,plan_snapshot:{runtime_endpoint:endpoint,auth_mode:"NONE",risk_level:"LOW"}};
const tokenDigest="a".repeat(64);
const mock=(method,input,{unsafe=false}={})=>{
 const tool={name:"read_inventory",annotations:{readOnlyHint:!unsafe,destructiveHint:unsafe,openWorldHint:false}};
 const data={jsonrpc:"2.0",id:input.id,result:method==="tools/list"?{tools:[tool]}:
  {content:[{type:"text",text:JSON.stringify({status:"READY",count:2})}],isError:false}};
 return new Response(JSON.stringify(data),{status:200,headers:{"content-type":"application/json"}});
};
test("ARE server capture obtains immutable authentic no-auth raw tools/list, stores private scoped ID",async()=>{
 const calls=[],fetcher=async(url,init)=>{calls.push({kind:"fetch",url,init});return mock("tools/list",JSON.parse(init.body))};
 const sql=async(q,args)=>{
  calls.push({kind:"sql",q,args});
  if(q===CAPTURE_RESERVE_SQL)return {task_id:taskId,used_count:1};
  if(q===CAPTURE_INSERT_SQL)return {id:captureId,task_id:taskId,content:args[5],sha256:args[6]};
  throw Error("Unexpected SQL")};
 const r=await captureReadOnly({method:"tools/list"},{assignment,tokenDigest,sql,fetcher,dnsCheck:async()=>{}});
 assert.equal(r.ok,true);
 assert.equal(r.capture_id,captureId);
 assert.equal(r.artifact.capture_id,captureId);
 const raw=JSON.parse(r.artifact.content);
 assert.equal(raw.protocol,"mcp.raw-observation.v1");
 assert.equal(raw.request.method,"tools/list");
 assert.equal(raw.response.result.tools[0].name,"read_inventory");
 assert.equal(raw.wire_request,JSON.stringify(raw.request));
 assert.ok(raw.wire_response.includes("read_inventory"));
 assert.equal(calls.filter(x=>x.kind==="fetch").length,1);
 assert.equal(calls.filter(x=>x.q===CAPTURE_INSERT_SQL).length,1);
 assert.equal(calls.find(x=>x.kind==="fetch").init.redirect,"error");
 assert.equal(calls.find(x=>x.kind==="fetch").init.headers.Authorization,undefined);
 assert.equal(validCaptureId(captureId),true);
 assert.match(CAPTURE_READ_SQL,/task_id|token_sha256/);
});
test("safe explicitly annotated read-only tool can be captured without touching unrelated tools",async()=>{
 const calls=[],fetcher=async(url,init)=>{
  calls.push(JSON.parse(init.body));
  const payload=calls.at(-1);return mock(payload.method,payload);
 };
 const sql=async q=>q===CAPTURE_RESERVE_SQL?{used_count:2}:q===CAPTURE_INSERT_SQL?{id:captureId}:null;
 const r=await captureReadOnly({method:"tools/call",tool_name:"read_inventory",arguments:{limit:2},user_authorized:true},
  {assignment,tokenDigest,sql,fetcher,dnsCheck:async()=>{}});
 assert.equal(r.artifact.kind,"trace");
 assert.equal(calls.length,2);
 assert.deepEqual(calls.map(x=>x.method),["tools/list","tools/call"]);
 assert.equal(JSON.parse(r.artifact.content).request.params.name,"read_inventory");
});
test("capture refuses write-like names, missing user approval, OAuth, local/private host or unsafe annotation",async()=>{
 let calls=0;const sql=async()=>{calls++;return {used_count:1}};
 const fetcher=async(url,init)=>mock(JSON.parse(init.body).method,JSON.parse(init.body),{unsafe:true});
 for(const [a,x] of [
  [assignment,{method:"tools/call",tool_name:"delete_everything",arguments:{},user_authorized:true}],
  [assignment,{method:"tools/call",tool_name:"read_inventory",arguments:{limit:1},user_authorized:false}],
  [{...assignment,plan_snapshot:{...assignment.plan_snapshot,auth_mode:"OAUTH"}},{method:"tools/list"}],
  [{...assignment,plan_snapshot:{...assignment.plan_snapshot,runtime_endpoint:"https://localhost/mcp"}},{method:"tools/list"}],
  [assignment,{method:"tools/call",tool_name:"read_inventory",arguments:{},user_authorized:true}]
 ]){
  await assert.rejects(captureReadOnly(x,{assignment:a,tokenDigest,sql,fetcher,dnsCheck:async()=>{}}));
 }
 assert.ok(calls<=1,"Unsafe requests must fail before quota/target operation");
});
test("signed certificate, passwords or OAuth tokens cannot be captured into Neon",async()=>{
 let inserted=false;
 const sql=async(q)=>{if(q===CAPTURE_RESERVE_SQL)return {task_id:taskId,used_count:1};if(q===CAPTURE_INSERT_SQL)inserted=true};
 const fetcher=async(url,init)=>new Response(JSON.stringify({jsonrpc:"2.0",id:1,
  result:{content:[{type:"text",text:"Bearer "+("A".repeat(25))}]}}),{status:200,headers:{"content-type":"application/json"}});
 await assert.rejects(captureReadOnly({method:"tools/list"},{assignment,tokenDigest,sql,fetcher,dnsCheck:async()=>{}}),/capture_contains_possible_credentials/);
 assert.equal(inserted,false);
});
test("no DB capacity means never reach target endpoint",async()=>{
 let called=0;const fetcher=async()=>{called++;return new Response("{}")};
 await assert.rejects(captureReadOnly({method:"tools/list"},
  {assignment,tokenDigest,sql:async()=>null,fetcher,dnsCheck:async()=>{}}),/capture_quota_or_task_expired/);
 assert.equal(called,0);
});
