import { test } from "node:test";
import assert from "node:assert/strict";
import { probe } from "./probe.mjs";
import { handleMcpRequest } from "../src/http.ts";

test("P1 official MCP profile is independent from ARE maturity", async () => {
  const r=await probe("https://are.fde.fan/mcp",request=>handleMcpRequest(request));
  assert.equal(r.specVersion,"2026-07-28");
  assert.equal(r.fullConformanceCertified,false);
  assert.equal(r.engineeringMaturityAssessed,false);
  assert.equal(r.rules.length,11);
  for(const rule of ["MCP26-01","MCP26-02","MCP26-03","MCP26-04","MCP26-05","MCP26-06","MCP26-07","MCP26-08","MCP26-09"])
    assert.equal(r.rules.find(x=>x.id===rule)?.status,"PASS",JSON.stringify(r.rules.find(x=>x.id===rule)));
  assert.equal(r.rules.find(x=>x.id==="MCP26-11")?.status,"UNKNOWN");
  assert.equal(r.rules.find(x=>x.id==="MCP26-10")?.status,"NOT_APPLICABLE");
});
test("P1 probe refuses insecure http endpoints", async()=>{
  await assert.rejects(()=>probe("http://127.0.0.1/mcp"),/HTTPS/);
});
