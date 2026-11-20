#!/usr/bin/env node
// Authorized synthetic ARE V2 MCP smoke. Never prints reusable tokens or publishes.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {homedir} from "node:os";
const root=join(homedir(),".config/are-private-intake");
const state=JSON.parse(readFileSync(join(root,"qa-v2-draw-20261120.json"),"utf8"));
const secret=state.task_token;
if(!/^aret_[A-Za-z0-9_-]{43}$/.test(secret))throw Error("invalid QA token");
const endpoint=process.env.ARE_MCP_ENDPOINT||"https://are.world2.co/mcp";
let seq=1;
function parse(text){
 try{return JSON.parse(text)}catch{}
 const lines=text.split(/\r?\n/).filter(x=>x.startsWith("data:"));
 if(!lines.length)throw Error("invalid MCP transport");
 return JSON.parse(lines.at(-1).slice(5).trim());
}
async function call(method,params={},name=""){
 const payload={jsonrpc:"2.0",id:seq++,method,params:{
  ...params,_meta:{"io.modelcontextprotocol/protocolVersion":"2026-07-28",
    "io.modelcontextprotocol/clientInfo":{name:"ARE-V2-pipeline-acceptance",version:"1.0"},
    "io.modelcontextprotocol/clientCapabilities":{}}}};
 const started=Date.now();
 const response=await fetch(endpoint,{method:"POST",redirect:"error",
 headers:{"Content-Type":"application/json","Accept":"application/json, text/event-stream",
 "MCP-Protocol-Version":"2026-07-28","Mcp-Method":method,...(name?{"Mcp-Name":name}:{})},
 body:JSON.stringify(payload),signal:AbortSignal.timeout(23000)});
 const body=parse(await response.text());
 assert.equal(response.status,200,JSON.stringify({status:response.status,error:body.error}).slice(0,400));
 assert.ok(body.result,!JSON.stringify(body.error));
 return {result:body.result,elapsed_ms:Date.now()-started};
}
async function tool(name,args){
 const {result}=await call("tools/call",{name,arguments:args},name);
 return {isError:result.isError===true,body:result.structuredContent||
  JSON.parse(result.content.find(x=>x.type==="text").text)};
}
const {result:discovery}=await call("server/discover");
assert.ok(discovery.supportedVersions.includes("2026-07-28"));
const {result:tools}=await call("tools/list");
for(const name of ["are_get_task","are_get_criteria","are_checkpoint","are_submit_assessment","are_get_submission"])
 assert.ok(tools.tools.some(t=>t.name===name),name);
console.log("REMOTE_MCP_FIVE_TOOLS_PRESENT",tools.tools.length);
const assignment=await tool("are_get_task",{task_token:secret});
assert.equal(assignment.isError,false,JSON.stringify(assignment.body));
assert.equal(assignment.body.task.id,state.task_id);
console.log("MCP_AUTHENTICATED_TASK_READ_PASS");
const set=new Set();
for(const offset of [0,8,16,24]){
 const part=await tool("are_get_criteria",{task_token:secret,offset});
 assert.equal(part.isError,false);
 for(const x of part.body.criteria)set.add(x.id);
}
assert.equal(set.size,32);
console.log("MCP_CRITERIA_32_PASS");
const coverage=[
 {name:"list_categories",status:"PASS",oracle_ref:"public-API-category-counts:531-entries-17-categories",trace_ref:"public-MCP-read-task-nov20"},
 {name:"search_tools",status:"NOT_TESTED",reason:"QA integration smoke only; no delegated full independent test"},
 {name:"get_tool",status:"NOT_TESTED",reason:"QA integration smoke only; no delegated full independent test"}];
const checkpoint=await tool("are_checkpoint",{task_token:secret,coverage,blockers:[],
 total_tools:3,phase:"REPORT",minutes_used:12});
assert.equal(checkpoint.isError,false,JSON.stringify(checkpoint.body));
assert.equal(checkpoint.body.coverage.total,3);
console.log("MCP_CHECKPOINT_PASS");
const receipt=await tool("are_get_submission",{task_token:secret,submission_id:state.run_id});
assert.equal(receipt.isError,false,JSON.stringify(receipt.body));
assert.equal(receipt.body.receipt.id,state.run_id);
console.log("MCP_PERSISTED_SUBMISSION_RECEIPT_PASS");
const bad=await tool("are_submit_assessment",{task_token:secret,evidence_package:{
 cohort_id:"ARE100-VALUE-20261115",repository_key:"cooyun/etuki-gate",report:{}}});
assert.equal(bad.isError,true,"cross-task or incomplete submission must be an MCP error");
console.log("MCP_PRIVATE_SCOPE_DENIAL_PASS");
console.log("ARE_V2_PUBLIC_MCP_REAL_E2E_PASS");
