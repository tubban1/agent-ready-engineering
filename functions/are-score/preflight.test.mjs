import {test} from "node:test";
import assert from "node:assert/strict";
import {normalize,staticScore,assertFields} from "./index.mjs";

test("v2 identity is ONLY an HTTPS MCP Endpoint",()=>{
 const x=normalize("https://mcp.example.org/mcp");
 assert.deepEqual(x,{url:"https://mcp.example.org/mcp",identity:"url:https://mcp.example.org/mcp"});
 for(const url of [
 "https://github.com/Owner/Repo","https://github.com/owner/repo/mcp",
 "stdio://state-mcp","local://state-mcp","file:///tmp/server",
 "http://example.com/mcp","https://localhost/mcp","https://127.0.0.1/mcp",
 "https://10.0.0.1/mcp","https://foo.internal/mcp","https://example.org:8443/mcp",
 "https://u:pass@example.org/mcp","https://foo.example.org/mcp?secret=test",
 "https://foo.example.org/mcp#fragment","https://[::1]/mcp"]){
  assert.throws(()=>normalize(url),undefined,url);
 }
});

test("v2 refuses old schema, manifest/target aliases and unexpected fields",()=>{
 assert.doesNotThrow(()=>assertFields({endpoint:"https://service.example/mcp"},["endpoint"]));
 for(const payload of [
  {target:"https://service.example/mcp"},
  {endpoint:"https://service.example/mcp",manifest:{tools:[]}},
  {endpoint:"https://service.example/mcp",source_kind:"github"},
  {endpoint:"https://service.example/mcp",repo:"owner/repo"},
  {endpoint:"https://service.example/mcp",transport:"stdio"},
  {},
 ]){
  assert.throws(()=>assertFields(payload,["endpoint"]),/invalid_request_schema/);
 }
});

test("static rubric remains separate from 39-check maturity",()=>{
 const tools=[{name:"get_capabilities",description:"Read the service's public capabilities without side effects",
 inputSchema:{type:"object",properties:{}},annotations:{readOnlyHint:true,destructiveHint:false}}];
 const score=staticScore(tools);
 assert.equal(score.score,100);
 assert.equal(score.n,1);
 assert.ok(score.findings.some(x=>x.status==="unknown"));
});

test("declared annotation conflicts remain a source-review signal",()=>{
 const tools=[{name:"x",description:"",inputSchema:{type:"string"},
 annotations:{readOnlyHint:true,destructiveHint:true}}];
 const scored=staticScore(tools);
 assert.ok(scored.score<70);
 assert.ok(scored.findings.some(x=>x.code==="annotation_conflict"));
});

test("large manifests trigger measurement hypothesis, not claimed token saving",()=>{
 const tools=Array.from({length:110},(_,i)=>({
 name:"read_"+i,description:"Read public item safely. "+("extra ".repeat(90)),
 inputSchema:{type:"object",properties:{id:{type:"string"}}},
 annotations:{readOnlyHint:true,destructiveHint:false}}));
 const scored=staticScore(tools);
 assert.ok(scored.bytes>32768);
 assert.ok(scored.findings.some(x=>x.code==="context_hypothesis"&&x.status==="hypothesis"));
});

test("malformed or oversized tool lists fail, not become scores",()=>{
 assert.throws(()=>staticScore([]),/invalid_tool_manifest/);
 assert.throws(()=>staticScore(Array.from({length:251},()=>({}))),/invalid_tool_manifest/);
});
