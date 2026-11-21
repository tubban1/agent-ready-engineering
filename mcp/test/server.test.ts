// M2 tests: the knowledge server answers through a real MCP client (in-memory transport).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { createServer } from "../src/server.js";
import { DEFAULT_MAX_CHARS } from "../src/knowledge.js";
import { loadFramework, readRepoFile } from "../src/data.js";

const client = new Client({ name: "are-test", version: "0.0.0" });

before(async () => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createServer().connect(serverSide);
  await client.connect(clientSide);
});
after(async () => {
  await client.close();
});

async function call(name: string, args: Record<string, unknown>) {
  const res = await client.callTool({ name, arguments: args });
  const text = (res.content as { type: string; text: string }[])[0]!.text;
  return { isError: Boolean(res.isError), data: JSON.parse(text) };
}

test("exposes framework tools, local self-audit guidance and explicit opt-in remote scoring", async () => {
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), [
    "are_capture_readonly",
    "are_checkpoint",
    "are_evidence_request",
    "are_get_authorization_status",
    "are_get_check",
    "are_get_criteria",
    "are_get_document",
    "are_get_evidence_contract",
    "are_get_submission",
    "are_get_task",
    "are_get_template",
    "are_list_checks",
    "are_list_documents",
    "are_local_mcp_audit_guide",
    "are_request_authorization",
    "are_score_mcp",
    "are_search",
    "are_submit_assessment",
    "are_validate_assessment"
  ]);
  for (const t of tools) {
    assert.equal(t.annotations?.readOnlyHint, !["are_capture_readonly","are_checkpoint","are_request_authorization","are_score_mcp","are_submit_assessment"].includes(t.name), t.name);
    assert.equal(t.annotations?.destructiveHint, false, t.name);
    if (t.name === "are_score_mcp") assert.equal(t.annotations?.openWorldHint, true);
    assert.ok((t.description ?? "").length > 40, `${t.name} has a description`);
  }
  const scoring = tools.find((t) => t.name === "are_score_mcp")!;
  const props = (scoring.inputSchema as { properties?: Record<string, unknown>; required?: string[] });
  assert.deepEqual(props.required, ["endpoint"]);
  assert.ok(props.properties?.endpoint, "only an endpoint may be scored");
  assert.equal(props.properties?.target_url, undefined, "old target_url input must not be accepted");
  assert.doesNotMatch(scoring.description ?? "", /GitHub repository URL or/);
  assert.match(client.getInstructions() ?? "", /advisory, not authorization/);
});

test("local stdio audit guide is read-only and never creates official assessment", async () => {
  const { isError, data } = await call("are_local_mcp_audit_guide", {service:"Vibe Monitor", lang:"zh"});
  assert.equal(isError,false);
  assert.equal(data.mode,"local_stdio_developer_audit");
  assert.equal(data.registry.eligible,false);
  assert.equal(data.registry.official_benchmark_run_id,null);
  assert.equal(data.reporting.official_score,null);
  assert.equal(data.reporting.expected_check_count,39);
  assert.equal(data.reporting.publish_status,"local_only");
  assert.equal(data.steps[0].id,"P0_VALUE");
  assert.ok(data.steps.some((s: {id:string}) => s.id==="LOCAL_RUNTIME"));
  assert.ok(data.steps.some((s: {id:string}) => s.id==="MATURITY"));
  assert.match(JSON.stringify(data), /explicit user permission/);
  assert.match(JSON.stringify(data.evidence_quality_gate), /evidence/);
  const invalid = await client.callTool({name:"are_local_mcp_audit_guide",arguments:{service:""}});
  assert.equal(Boolean(invalid.isError),true);
});

test("are_get_check returns the full check with version metadata", async () => {
  const { isError, data } = await call("are_get_check", { id: "l3-a2" });
  assert.equal(isError, false);
  assert.equal(data.id, "L3-A2");
  assert.equal(data.level, "L3");
  assert.equal(data.dimension_name, "Authority and Trust");
  assert.equal(data.inspection_recommended, true);
  assert.equal(data.framework_version, readRepoFile("README.md").match(/^Version: (\S+)/m)![1]);
});

test("unknown IDs return a structured, non-retryable error", async () => {
  const { isError, data } = await call("are_get_check", { id: "L9-Z9" });
  assert.equal(isError, true);
  assert.equal(data.error.code, "unknown_id");
  assert.equal(data.error.retryable, false);
  assert.ok(data.error.hint.length > 0);
});

test("are_get_document pages long documents without losing text", async () => {
  const full = readRepoFile("principles/ARE-P01-agent-ready-architecture.md");
  assert.ok(full.length > DEFAULT_MAX_CHARS, "P01 is long enough to page");
  let text = "";
  let cursor = 0;
  for (let i = 0; i < 10; i++) {
    const { data } = await call("are_get_document", { id: "P01", cursor });
    text += data.content;
    if (!data.truncated) break;
    cursor = data.next;
  }
  assert.equal(text, full);
});

test("are_get_document returns a single section by slug", async () => {
  const { data } = await call("are_get_document", { id: "ARE-A02", section: "l3-write-safe" });
  assert.equal(data.section, "L3 Write-Safe");
  assert.match(data.content, /^## L3 Write-Safe/);
  assert.ok(!data.content.includes("## L4"));
  const bad = await call("are_get_document", { id: "ARE-A02", section: "no-such-section" });
  assert.equal(bad.data.error.code, "unknown_section");
});

test("Chinese requests return reading aids with version tracking", async () => {
  const { data } = await call("are_get_document", { id: "P01", lang: "zh" });
  assert.equal(data.lang, "zh");
  assert.equal(data.zh_outdated, false);
  assert.equal(data.version, data.canonical_version);
  const glossary = await call("are_get_document", { id: "R03", lang: "zh" });
  assert.equal(glossary.data.lang, "en");
  assert.match(glossary.data.note, /No Chinese reading aid/);
});

test("are_search returns references and snippets, not whole documents", async () => {
  const { data } = await call("are_search", { query: "idempotency key", limit: 3 });
  assert.ok(data.results.length > 0 && data.results.length <= 3);
  for (const r of data.results) {
    assert.match(r.id, /^ARE-/);
    assert.ok(r.snippet.length <= 250);
  }
  const ids = data.results.map((r: { id: string }) => r.id);
  assert.ok(ids.some((id: string) => ["ARE-A01", "ARE-P01", "ARE-T03", "ARE-R03"].includes(id)));
});

test("are_evidence_request lists every check up to the target level", async () => {
  const { data } = await call("are_evidence_request", { target_level: "L2" });
  assert.equal(data.checks.length, 17);
  assert.ok(data.checks.every((c: { id: string }) => c.id.startsWith("L1") || c.id.startsWith("L2")));
  const l3 = await call("are_evidence_request", { target_level: "L3" });
  assert.deepEqual(
    l3.data.checks.filter((c: { inspection_recommended: boolean }) => c.inspection_recommended).map((c: { id: string }) => c.id),
    ["L3-C1", "L3-C2", "L3-A2", "L3-O2"],
  );
});

test("are_get_template gives the workspace path from the layout in ARE-T00", async () => {
  const { data } = await call("are_get_template", { id: "T07" });
  assert.equal(data.workspace_path, "scenarios/<scenario-slug>/ARE-T07-maturity-assessment-<date>.md");
  const layout = readRepoFile("adoption/templates/README.md");
  for (const path of Object.values(loadFramework().workspace_paths)) {
    assert.ok(layout.includes(path.split("/").at(-1)!), `${path} is in the ARE-T00 layout`);
  }
});

test("resources list and read checks, documents and templates", async () => {
  const { resources } = await client.listResources();
  const uris = resources.map((r) => r.uri);
  assert.ok(uris.includes("are://check/L3-A2"));
  assert.ok(uris.includes("are://doc/ARE-P01/en"));
  assert.ok(uris.includes("are://template/ARE-T07/en"));
  const res = await client.readResource({ uri: "are://check/L3-A2" });
  const payload = JSON.parse((res.contents[0] as { text: string }).text);
  assert.equal(payload.id, "L3-A2");
});
