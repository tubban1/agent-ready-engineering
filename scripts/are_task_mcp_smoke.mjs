#!/usr/bin/env node
// Native HTTP MCP smoke against the actual ARE public endpoint.
// Uses a temporary single-task Token stored only in the owner's mode-0600 file.
// No actual third-party tool calls; third-party assessment remains private.
import {readFileSync} from "node:fs";
import {homedir} from "node:os";
import {join} from "node:path";
import assert from "node:assert/strict";
const token=JSON.parse(readFileSync(join(homedir(),".config/are-private-intake/qa-task-center-20261120.json"),"utf8")).task_token;
const target=process.env.ARE_TASK_MCP_URL||"https://are.world2.co/mcp";
const metadata={
 "io.modelcontextprotocol/protocolVersion":"2026-07-28",
 "io.modelcontextprotocol/clientCapabilities":{},
 "io.modelcontextprotocol/clientInfo":{name:"ARE-task-e2e-probe",version:"1.0"}
};
let seq=1;
async function rpc(method,params={},name){
 const headers={"Content-Type":"application/json",Accept:"application/json, text/event-stream",
 "MCP-Protocol-Version":"2026-07-28","Mcp-Method":method,...(name?{"Mcp-Name":name}:{})};
 const response=await fetch(target,{method:"POST",headers,redirect:"error",
 body:JSON.stringify({jsonrpc:"2.0",id:seq++,method,params:{...params,_meta:metadata}}),
 signal:AbortSignal.timeout(22000)});
 const raw=await response.text();
 let json;
 try{json=JSON.parse(raw)}catch{
 const lines=raw.split(/\r?\n/).filter(x=>x.startsWith("data:"));
 json=JSON.parse(lines.at(-1).slice(5).trim());
 }
 assert.equal(response.status,200,JSON.stringify({http:response.status,error:json.error}));
 assert.ok(json.result,!JSON.stringify(json.error));
 return json.result;
}
async function tool(name,args){
 const result=await rpc("tools/call",{name,arguments:args},name);
 const data=result.structuredContent||JSON.parse(result.content.find(x=>x.type==="text").text);
 return {isError:result.isError===true,data};
}
const discovery=await rpc("server/discover");
assert.ok(discovery.supportedVersions.includes("2026-07-28"));
const tools=await rpc("tools/list");
for(const name of ["are_get_task","are_get_criteria","are_submit_assessment","are_get_submission"])
 assert.ok(tools.tools.some(x=>x.name===name),name);
console.log("MCP_TOOL_DISCOVERY_PASS",tools.tools.length);
const task=await tool("are_get_task",{task_token:token});
assert.equal(task.isError,false,JSON.stringify(task.data));
assert.equal(task.data.task.repository_key,"janijegoroff/agent-connectors-mcp");
console.log("MCP_TASK_READ_PASS");
const seen=new Set();
for(const offset of [0,8,16,24]){
 const x=await tool("are_get_criteria",{task_token:token,offset});
 assert.equal(x.isError,false);
 for(const rule of x.data.criteria)seen.add(rule.id);
}
assert.equal(seen.size,32);
console.log("MCP_CRITERIA_32_PASS");
const evidence=JSON.parse(readFileSync("/tmp/are-colleague-pilot-results-20261120/agent-connectors-mcp.package.json","utf8"));
const submit=await tool("are_submit_assessment",{task_token:token,evidence_package:evidence});
assert.equal(submit.isError,false,JSON.stringify(submit.data));
assert.equal(submit.data.private,true);
assert.equal(submit.data.public_release_authorized,false);
console.log("MCP_SUBMIT_PASS",submit.data.submission_id);
const receipt=await tool("are_get_submission",{task_token:token,submission_id:submit.data.submission_id});
assert.equal(receipt.isError,false,JSON.stringify(receipt.data));
assert.equal(receipt.data.receipt.id,submit.data.submission_id);
console.log("MCP_RECEIPT_PASS");
console.log("ARE_NATIVE_MCP_TASK_E2E_PASS");
