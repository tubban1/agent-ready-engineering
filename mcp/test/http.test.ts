import { test } from "node:test";
import assert from "node:assert/strict";
import { handleMcpRequest } from "../src/http.js";

async function rpc(method: string, params: Record<string, unknown> = {}, id = 1) {
  const res = await handleMcpRequest(
    new Request("https://are.example/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    }),
  );
  assert.equal(res.status, 200);
  return (await res.json()) as { result: any };
}

test("HTTP endpoint initializes statelessly", async () => {
  const { result } = await rpc("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "test", version: "0" },
  });
  assert.equal(result.serverInfo.name, "are");
  assert.doesNotMatch(result.instructions, /Local mode/);
});

test("HTTP endpoint exposes opt-in scoring but no local workspace tools", async () => {
  const { result } = await rpc("tools/list");
  const names = result.tools.map((t: { name: string }) => t.name);
  assert.ok(names.includes("are_search"));
  assert.ok(names.includes("are_score_mcp"));
  assert.ok(names.includes("are_local_mcp_audit_guide"));
  for (const local of ["are_validate_deliverable", "are_assess_scenario", "are_aggregate_portfolio"]) {
    assert.ok(!names.includes(local), `${local} must not be exposed over HTTP`);
  }
});

test("HTTP endpoint answers a tool call", async () => {
  const { result } = await rpc("tools/call", { name: "are_get_check", arguments: { id: "L3-A2" } });
  assert.notEqual(result.isError, true);
  assert.match(result.content[0].text, /L3-A2/);
});
