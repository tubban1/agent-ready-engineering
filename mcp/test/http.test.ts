import { test } from "node:test";
import assert from "node:assert/strict";
import { handleMcpRequest } from "../src/http.js";

// The official v2 dual-era entry may return SSE for 2025 clients.
// A conforming test client must accept both JSON and event-stream.
async function responsePayload(res: Response): Promise<any> {
  const body = await res.text();
  if (res.headers.get("content-type")?.includes("text/event-stream")) {
    const lines = body.split(/\r?\n/).filter((line) => line.startsWith("data: "));
    assert.ok(lines.length > 0, "SSE result must include data frames");
    return JSON.parse(lines[lines.length - 1]!.slice(6));
  }
  return JSON.parse(body);
}
function modernMeta() {
  return {
    "io.modelcontextprotocol/protocolVersion": "2026-07-28",
    "io.modelcontextprotocol/clientCapabilities": {},
    "io.modelcontextprotocol/clientInfo": { name: "are-conformance-test", version: "1.0" },
  };
}
function request(method: string, params: Record<string, unknown> = {}, id = 1, modern = false, headers: Record<string,string> = {}) {
  const envelope = modern ? { ...params, _meta: modernMeta() } : params;
  const name = method === "tools/call" || method === "prompts/get" ? String(params.name) :
    method === "resources/read" ? String(params.uri) : null;
  return new Request("https://are.world2.co/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...(modern ? {
        "MCP-Protocol-Version": "2026-07-28",
        "Mcp-Method": method,
        ...(name ? {"Mcp-Name": name} : {}),
      } : {}),
      ...headers,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params: envelope }),
  });
}
async function rpc(method: string, params: Record<string, unknown> = {}, modern = false) {
  const res = await handleMcpRequest(request(method, params, 1, modern));
  assert.equal(res.status, 200, method + " response status");
  return (await responsePayload(res)) as { result: any, error?: any };
}

test("P0 legacy HTTP initializes on 2025-06-18 and 2025-11-25", async () => {
  for (const protocolVersion of ["2025-06-18", "2025-11-25"]) {
    const { result } = await rpc("initialize", {
      protocolVersion, capabilities: {}, clientInfo: { name: "test", version: "0" },
    });
    assert.equal(result.serverInfo.name, "are");
    assert.doesNotMatch(result.instructions, /Local mode/);
  }
});
test("P0 public HTTP exposes only public tools", async () => {
  const { result } = await rpc("tools/list");
  const names = result.tools.map((t: { name: string }) => t.name);
  for (const name of ["are_search", "are_score_mcp", "are_local_mcp_audit_guide"]) assert.ok(names.includes(name));
  for (const local of ["are_validate_deliverable", "are_validate_local_mcp_audit", "are_assess_scenario", "are_aggregate_portfolio"]) {
    assert.ok(!names.includes(local), `${local} must remain local-only`);
  }
});
test("P0 legacy tool call still works", async () => {
  const { result } = await rpc("tools/call", { name: "are_get_check", arguments: { id: "L3-A2" } });
  assert.notEqual(result.isError, true);
  assert.match(result.content[0].text, /L3-A2/);
});
test("P0 modern server/discover advertises 2026 protocol and identity", async () => {
  const { result } = await rpc("server/discover", {}, true);
  assert.equal(result.resultType, "complete");
  assert.ok(result.supportedVersions.includes("2026-07-28"));
  assert.equal(result._meta["io.modelcontextprotocol/serverInfo"].name, "are");
  assert.ok(result.capabilities.tools);
});
test("P0 modern tools/list has required result and caching fields, stable order", async () => {
  const a = (await rpc("tools/list", {}, true)).result;
  const b = (await rpc("tools/list", {}, true)).result;
  assert.equal(a.resultType, "complete");
  assert.equal(typeof a.ttlMs, "number");
  assert.ok(["public", "private"].includes(a.cacheScope));
  assert.deepEqual(a.tools.map((t: {name:string})=>t.name), b.tools.map((t: {name:string})=>t.name));
  assert.ok(a.tools.length >= 8);
});
test("P0 modern tool call returns structuredContent and resultType", async () => {
  const {result} = await rpc("tools/call", {name:"are_get_check",arguments:{id:"L3-A2"}}, true);
  assert.equal(result.resultType, "complete");
  assert.equal(result.structuredContent.id, "L3-A2");
});
test("P0 modern resource and prompt listings advertise cache hints", async () => {
  for (const method of ["resources/list","prompts/list","resources/templates/list"]) {
    const {result} = await rpc(method, {}, true);
    assert.equal(result.resultType, "complete");
    assert.equal(typeof result.ttlMs, "number");
    assert.ok(["public","private"].includes(result.cacheScope));
  }
});
test("P0 modern header mismatch is fail-closed", async () => {
  const res = await handleMcpRequest(request("tools/call", {name:"are_get_check",arguments:{id:"L3-A2"}}, 99, true, {"Mcp-Name":"wrong"}));
  assert.equal(res.status, 400);
  const data = await responsePayload(res);
  assert.equal(data.error.code, -32020);
});
test("canonical World2 browser Origin is accepted and retired host is rejected", async () => {
  const modern = true;
  const good = await handleMcpRequest(request("tools/list", {}, 1, modern, {"Origin":"https://are.world2.co"}));
  assert.equal(good.status, 200);
  const retired = await handleMcpRequest(request("tools/list", {}, 1, modern, {"Origin":"https://are.fde.fan"}));
  assert.equal(retired.status, 403);
});
test("P0 requests with untrusted Origin receive 403", async () => {
  const res = await handleMcpRequest(request("server/discover",{},1,true,{"Origin":"https://malicious.example"}));
  assert.equal(res.status, 403);
});
