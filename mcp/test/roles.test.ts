// Role tests: implementation (capability matrix, operation contract, next steps, single
// repository), governance (authorization matrix) and decision-maker prompts.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";
import { Workspace } from "../src/workspace.js";
import { REPO_ROOT } from "../src/data.js";

const FIXTURE = join(REPO_ROOT, "mcp/test/fixtures/engagements/example-org");
const SUPPLIER = "scenarios/supplier-order-change";

async function connect(root: string) {
  const client = new Client({ name: "are-test", version: "0.0.0" });
  const [c, s] = InMemoryTransport.createLinkedPair();
  await createServer({ workspace: new Workspace(root) }).connect(s);
  await client.connect(c);
  return client;
}
async function call(c: Client, name: string, args: Record<string, unknown>) {
  const res = await c.callTool({ name, arguments: args });
  return { isError: Boolean(res.isError), data: JSON.parse((res.content as { text: string }[])[0]!.text) };
}
const codes = (d: { issues: { code: string }[] }) => d.issues.map((i) => i.code).sort();

let client: Client;
let tmp: string;
before(async () => {
  client = await connect(FIXTURE);
  tmp = mkdtempSync(join(tmpdir(), "are-roles-"));
});
after(async () => {
  await client.close();
  rmSync(tmp, { recursive: true, force: true });
});

test("implementation and governance deliverables of a clean scenario validate", async () => {
  for (const f of ["ARE-T02-capability-matrix.md", "ARE-T03-operation-contract-confirm_order_change.md", "ARE-T04-authorization-matrix.md"]) {
    const { data } = await call(client, "are_validate_deliverable", { path: `${SUPPLIER}/${f}` });
    assert.equal(data.checked, "full", f);
    assert.equal(data.ok, true, `${f}: ${JSON.stringify(data.issues)}`);
  }
});

test("governance: planted authorization problems are found, including the cross-check with ARE-T02", async () => {
  const { data } = await call(client, "are_validate_deliverable", { path: "scenarios/invoice-matching/ARE-T04-authorization-matrix.md" });
  assert.deepEqual(codes(data), ["high_risk_automatic", "missing_revocation", "operation_not_authorized"]);
});

test("blank templates are rejected with field-level issues", async () => {
  const ws = join(tmp, "blank");
  mkdirSync(join(ws, "scenarios/s1"), { recursive: true });
  for (const t of ["ARE-T02-capability-matrix", "ARE-T03-operation-contract", "ARE-T04-authorization-matrix"])
    cpSync(join(REPO_ROOT, `adoption/templates/${t}.md`), join(ws, `scenarios/s1/${t}.md`));
  const c = await connect(ws);
  const t02 = await call(c, "are_validate_deliverable", { path: "scenarios/s1/ARE-T02-capability-matrix.md" });
  assert.ok(codes(t02.data).includes("unfilled_placeholder"));
  const t03 = await call(c, "are_validate_deliverable", { path: "scenarios/s1/ARE-T03-operation-contract.md" });
  assert.ok(codes(t03.data).includes("invalid_operation_type"));
  assert.ok(codes(t03.data).includes("invalid_acceptance_result"));
  const t04 = await call(c, "are_validate_deliverable", { path: "scenarios/s1/ARE-T04-authorization-matrix.md" });
  assert.ok(codes(t04.data).includes("unfilled_placeholder"));
  await c.close();
});

test("implementation: are_next_steps groups the blocking checks by stage", async () => {
  const { data } = await call(client, "are_next_steps", { scenario_path: SUPPLIER });
  assert.equal(data.level, "L2");
  assert.equal(data.target_level, "L3");
  assert.deepEqual(data.steps.map((s: { stage: string }) => s.stage), ["P2", "P3", "P4", "P7"]);
  const p4 = data.steps.find((s: { stage: string }) => s.stage === "P4");
  assert.equal(p4.template, "ARE-T04");
  assert.equal(p4.template_present, true);
  assert.deepEqual(p4.checks.map((c: { id: string }) => c.id), ["L3-A1", "L3-A2", "L3-A3", "L3-A4"]);
  const inv = await call(client, "are_next_steps", { scenario_path: "scenarios/invoice-matching" });
  assert.match(inv.data.urgent, /beyond L1/);
});

test("implementation: a scenario without an assessment starts at the Value Gate", async () => {
  const ws = join(tmp, "fresh");
  mkdirSync(join(ws, "scenarios/new"), { recursive: true });
  const c = await connect(ws);
  const { data } = await call(c, "are_next_steps", { scenario_path: "scenarios/new" });
  assert.equal(data.level, null);
  assert.equal(data.steps[0].stage, "P0");
  await c.close();
});

test("implementation: single-repository mode works on docs/agent-ready", async () => {
  const repo = join(tmp, "repo");
  cpSync(join(FIXTURE, SUPPLIER), join(repo, "docs/agent-ready"), { recursive: true });
  const c = await connect(join(repo, "docs/agent-ready"));
  const a = await call(c, "are_assess_scenario", { scenario_path: "." });
  assert.equal(a.data.level, "L2");
  const n = await call(c, "are_next_steps", { scenario_path: "." });
  assert.equal(n.data.target_level, "L3");
  const p = await call(c, "are_aggregate_portfolio", {});
  assert.equal(p.data.scenarios.length, 1);
  await c.close();
});

test("role prompts keep their role boundaries", async () => {
  const get = async (name: string, args: Record<string, string>) =>
    ((await client.getPrompt({ name, arguments: args })).messages[0]!.content as { text: string }).text;
  assert.match(await get("are_quick_triage", { service: "orders" }), /NOT an assessment and claims no level/);
  assert.match(await get("are_quick_triage", { service: "orders" }), /Do not change any code/);
  assert.match(await get("are_operation_contract", { scenario_path: SUPPLIER, operation: "x" }), /Make code changes only when the engineer asks/);
  assert.match(await get("are_authorization_review", { scenario_path: SUPPLIER }), /Never mark the matrix as approved/);
  assert.match(await get("are_decision_brief", {}), /decisions needed, each with two or three options/);
});

test("the P01 section the authorization review points to exists", async () => {
  const r = await call(client, "are_get_document", { id: "P01", section: "dimension-four-zero-trust-and-the-separation-of-authority-and-execution" });
  assert.equal(r.isError, false, JSON.stringify(r.data));
});
