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
test("capture refuses write-like names, missing user approval, local/private host or unsafe annotation",async()=>{
 let calls=0;const sql=async()=>{calls++;return {used_count:1}};
 const fetcher=async(url,init)=>mock(JSON.parse(init.body).method,JSON.parse(init.body),{unsafe:true});
 for(const [a,x] of [
  [assignment,{method:"tools/call",tool_name:"delete_everything",arguments:{},user_authorized:true}],
  [assignment,{method:"tools/call",tool_name:"read_inventory",arguments:{limit:1},user_authorized:false}],
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

test("screened tools/list capture forwards opaque nextCursor without a second target write",async()=>{
 let body=null,inserted=null;
 const fetcher=async(url,init)=>{
  body=JSON.parse(init.body);
  return new Response(JSON.stringify({jsonrpc:"2.0",id:body.id,result:{tools:[]}}),
   {status:200,headers:{"content-type":"application/json"}});
 };
 const sql=async(q,args)=>{
  if(q===CAPTURE_RESERVE_SQL)return {used_count:1};
  if(q===CAPTURE_INSERT_SQL){inserted=args;return {id:captureId}};
  throw Error("Unexpected query");
 };
 const res=await captureReadOnly({method:"tools/list",cursor:"opaque-2"},{assignment,
  tokenDigest,sql,fetcher,dnsCheck:async()=>{}});
 assert.equal(res.ok,true);
 assert.deepEqual(body.params,{cursor:"opaque-2"});
 assert.deepEqual(JSON.parse(inserted[5]).request.params,{cursor:"opaque-2"});
 await assert.rejects(captureReadOnly({method:"tools/call",cursor:"opaque-2",
  tool_name:"read_inventory",arguments:{},user_authorized:true},{assignment,
  tokenDigest,sql,fetcher,dnsCheck:async()=>{}}),/invalid_tools_list_cursor/);
});

test("catalogue greater than the historic 70 KB cap is captured once, checked by SHA, and returned as a compact task receipt",async()=>{
 const tools=Array.from({length:18},(_,i)=>({
  name:"readonly_tool_"+i,
  description:"Published native contract "+i+" ".repeat(6900),
  inputSchema:{type:"object",properties:{q:{type:"string"}}}
 }));
 const observed=[],responses=[];
 const fetcher=async(url,init)=>{
  const request=JSON.parse(init.body);
  observed.push({request,headers:init.headers});
  const data=JSON.stringify({jsonrpc:"2.0",id:request.id,result:{tools}});
  return new Response(data,{status:200,headers:{"content-type":"application/json"}});
 };
 const sql=async(q,args)=>{
  if(q===CAPTURE_RESERVE_SQL)return {task_id:taskId,used_count:1};
  if(q===CAPTURE_INSERT_SQL){responses.push(args);return {id:captureId};}
  throw Error("unexpected sql");
 };
 const result=await captureReadOnly({method:"tools/list"},{
  assignment:{...assignment,plan_snapshot:{...assignment.plan_snapshot,auth_mode:"UNKNOWN"}},
  tokenDigest,sql,fetcher,dnsCheck:async()=>{}
 });
 assert.equal(observed.length,1);
 assert.equal(observed[0].headers.Authorization,undefined);
 assert.equal(result.declared_auth_mode,"UNKNOWN");
 assert.equal(result.auth_observation,"ANONYMOUS_REQUEST_SUCCEEDED_NO_PROVIDER_CREDENTIALS");
 assert.equal(result.capture_format,"CAPTURE_ID_ONLY");
 assert.equal(result.artifact.content,undefined);
 assert.equal(result.artifact.capture_id,captureId);
 assert.equal(result.discovery.tool_count,18);
 assert.equal(result.discovery.tool_names.length,18);
 const saved=responses[0][5];
 assert.ok(Buffer.byteLength(saved)>122279,Buffer.byteLength(saved));
 assert.ok(Buffer.byteLength(saved)<1500000);
 assert.equal(result.artifact.sha256,responses[0][6]);
 assert.equal(result.capture_bytes,Buffer.byteLength(saved));
 assert.equal(result.artifact.sha256, (await import("node:crypto")).createHash("sha256").update(saved).digest("hex"));
 assert.match(CAPTURE_RESERVE_SQL,/are.test-plan.v3/);
 assert.doesNotMatch(CAPTURE_RESERVE_SQL,/auth_mode.*NONE/);
});

test("NONE, UNKNOWN and OAuth-screened projects can capture truly anonymous safe reads without authorizing any protected action",async()=>{
 for(const auth_mode of ["NONE","UNKNOWN","OAUTH","API_KEY"]){
  const observed=[];
  const fetcher=async(url,init)=>{
   observed.push({request:JSON.parse(init.body),headers:init.headers});
   return mock(observed.at(-1).request.method,observed.at(-1).request);
  };
  const sql=async q=>q===CAPTURE_RESERVE_SQL?{used_count:1}:q===CAPTURE_INSERT_SQL?{id:captureId}:null;
  const result=await captureReadOnly({method:"tools/call",tool_name:"read_inventory",
    arguments:{limit:2},user_authorized:true},{
    assignment:{...assignment,plan_snapshot:{...assignment.plan_snapshot,auth_mode}},
    tokenDigest,sql,fetcher,dnsCheck:async()=>{}
  });
  assert.equal(result.ok,true,auth_mode);
  assert.equal(result.declared_auth_mode,auth_mode);
  assert.equal(result.auth_observation,"ANONYMOUS_REQUEST_SUCCEEDED_NO_PROVIDER_CREDENTIALS");
  assert.deepEqual(observed.map(x=>x.request.method),["tools/list","tools/call"]);
  assert.ok(observed.every(x=>!x.headers.Authorization&&!x.headers["X-API-Key"]));
 }
});

test("401 protected tool never gets stored as successful anonymous capture or bypasses provider OAuth",async()=>{
 for(const auth_mode of ["UNKNOWN","OAUTH","API_KEY"]){
  let stored=false;
  const fetcher=async()=>new Response("Unauthorized",{status:401,headers:{"www-authenticate":"Bearer realm=test"}});
  const sql=async q=>{if(q===CAPTURE_RESERVE_SQL)return {used_count:1};stored=true;return {id:captureId}};
  await assert.rejects(captureReadOnly({method:"tools/list"},{
    assignment:{...assignment,plan_snapshot:{...assignment.plan_snapshot,auth_mode}},
    tokenDigest,sql,fetcher,dnsCheck:async()=>{}
  }),/target_requires_user_auth/);
  assert.equal(stored,false,auth_mode);
 }
});

test("oversized wire response remains explicitly bounded; it never persists a truncated or misleading capture",async()=>{
 let stored=false;
 const sql=async q=>{if(q===CAPTURE_RESERVE_SQL)return {used_count:1};stored=true;return {id:captureId}};
 const payload=JSON.stringify({jsonrpc:"2.0",id:1,result:{tools:[{
  name:"long_tool",description:"Z".repeat(550000),inputSchema:{type:"object"}
 }]}});
 const fetcher=async()=>new Response(payload,{status:200,
  headers:{"content-type":"application/json","content-length":String(Buffer.byteLength(payload))}});
 await assert.rejects(captureReadOnly({method:"tools/list"},{
  assignment,tokenDigest,sql,fetcher,dnsCheck:async()=>{}
 }),/target_response_too_large/);
 assert.equal(stored,false);
});
