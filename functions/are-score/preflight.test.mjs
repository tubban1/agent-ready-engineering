import {test} from "node:test";
import assert from "node:assert/strict";
import {normalize,staticScore} from "./index.mjs";

test("normalization accepts only GitHub roots or public HTTPS MCP endpoints",()=>{
 assert.equal(normalize("https://github.com/Owner/Repo").identity,"github:owner/repo");
 assert.equal(normalize("https://mcp.example.org/mcp").identity,"url:https://mcp.example.org/mcp");
 for(const url of ["http://example.com/mcp","https://localhost/mcp",
 "https://127.0.0.1/mcp","https://10.0.0.1/mcp","https://foo.internal/mcp",
 "https://example.org:8443/mcp","https://u:pass@example.org/mcp",
 "https://foo.example.org/mcp?secret=test","https://github.com/a/b/tree/main"]){
  assert.throws(()=>normalize(url),undefined,url);
 }
});

test("static score is explicitly separate from maturity checks",()=>{
 const tools=[{name:"get_capabilities",description:"Read the service's public capabilities without side effects",
 inputSchema:{type:"object",properties:{}},
 annotations:{readOnlyHint:true,destructiveHint:false}}];
 const score=staticScore(tools);
 assert.equal(score.score,100);
 assert.equal(score.n,1);
 assert.ok(score.findings.some(x=>x.status==="unknown"));
});

test("ambiguous tool hints never count as verification",()=>{
 const tools=[{name:"x",description:"",inputSchema:{type:"string"},
 annotations:{readOnlyHint:true,destructiveHint:true}}];
 const scored=staticScore(tools);
 assert.ok(scored.score<70);
 assert.ok(scored.findings.some(x=>x.code==="annotation_conflict"));
});

test("large manifests trigger a measurement hypothesis, not a token-cost claim",()=>{
 const tools=Array.from({length:110},(_,i)=>({
  name:"read_"+i,description:"Read a public item by ID safely, no write operations. "+("extra ".repeat(90)),
  inputSchema:{type:"object",properties:{id:{type:"string"}}},
  annotations:{readOnlyHint:true,destructiveHint:false}}));
 const scored=staticScore(tools);
 assert.ok(scored.bytes>32768);
 assert.ok(scored.findings.some(x=>x.code==="context_hypothesis"&&x.status==="hypothesis"));
});

test("no tool list is not enough evidence to make a score",()=>{
 assert.throws(()=>staticScore([]),/invalid_tool_manifest/);
 assert.throws(()=>staticScore(Array.from({length:251},()=>({}))),/invalid_tool_manifest/);
});
