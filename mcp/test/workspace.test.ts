// M3 tests: workspace checks through a real MCP client, against the fictional sample workspace.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync, readFileSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { createServer } from "../src/server.js";
import { Workspace } from "../src/workspace.js";
import { REPO_ROOT } from "../src/data.js";

const FIXTURE = join(REPO_ROOT, "mcp/test/fixtures/engagements/example-org");
const expected = JSON.parse(readFileSync(join(FIXTURE, "expected.json"), "utf8"));

async function connect(workspace?: Workspace) {
  const client = new Client({ name: "are-test", version: "0.0.0" });
  const [c, s] = InMemoryTransport.createLinkedPair();
  await createServer({ workspace }).connect(s);
  await client.connect(c);
  return client;
}

let client: Client;
let tmp: string;
before(async () => {
  client = await connect(new Workspace(FIXTURE));
  tmp = mkdtempSync(join(tmpdir(), "are-ws-"));
});
after(async () => {
  await client.close();
  rmSync(tmp, { recursive: true, force: true });
});

async function call(c: Client, name: string, args: Record<string, unknown>) {
  const res = await c.callTool({ name, arguments: args });
  const text = (res.content as { text: string }[])[0]!.text;
  return { isError: Boolean(res.isError), text, data: JSON.parse(text) };
}

test("workspace tools appear only in local mode", async () => {
  const names = (await client.listTools()).tools.map((t) => t.name);
  for (const t of ["are_validate_deliverable", "are_validate_local_mcp_audit", "are_review_operation_risk", "are_assess_scenario", "are_aggregate_portfolio", "are_next_steps"]) assert.ok(names.includes(t), t);
  assert.equal(names.length, 15);
  const knowledgeOnly = await connect();
  const k = (await knowledgeOnly.listTools()).tools.map((t) => t.name);
  assert.equal(k.length, 9);
  const r = await call(knowledgeOnly, "are_evidence_request", { target_level: "L2", scenario_path: "scenarios/x" });
  assert.equal(r.data.error.code, "local_mode_only");
  await knowledgeOnly.close();
});

for (const [scenario, want] of Object.entries<any>(expected.scenarios)) {
  test(`are_assess_scenario matches the expected answers for ${scenario}`, async () => {
    const { isError, data } = await call(client, "are_assess_scenario", { scenario_path: `scenarios/${scenario}` });
    assert.equal(isError, false);
    assert.equal(data.level, want.level);
    assert.equal(data.exposure, want.exposure);
    assert.equal(data.consistent, want.consistent);
    assert.deepEqual(data.blocking_checks, want.blocking_checks);
    assert.deepEqual(data.evidence_location_missing, want.evidence_location_missing);
    assert.deepEqual(data.not_applicable_without_reason, want.not_applicable_without_reason);
    assert.deepEqual(data.documented_on_inspection_recommended, want.documented_on_inspection_recommended);
    assert.deepEqual(data.passes, want.passes);
    assert.equal(data.value_card_decision, expected.value_card_decisions[scenario]);
    if (want.change_since_previous) {
      const { previous_standard_version, comparable, ...legacyChange } = data.change_since_previous;
      assert.deepEqual(legacyChange, want.change_since_previous);
      assert.equal(previous_standard_version, "legacy_unpinned");
      assert.equal(comparable, false);
    } else assert.equal(data.change_since_previous, null);
    assert.equal(data.verified_level, null);
    assert.equal(data.level_status, "LEGACY_UNPINNED_PROVISIONAL");
    assert.equal(data.assessment, `scenarios/${scenario}/ARE-T07-maturity-assessment-${expected.assessment_date}.md`);
  });
}

test("are_assess_scenario reports per-dimension levels and warns about high-risk exposure", async () => {
  const { data } = await call(client, "are_assess_scenario", { scenario_path: "scenarios/invoice-matching" });
  assert.equal(data.dimension_levels.A, "L1");
  assert.ok(data.warnings.some((w: string) => w.startsWith("High-risk inconsistency")));
});

test("are_aggregate_portfolio matches the expected portfolio answers and never averages", async () => {
  const { data } = await call(client, "are_aggregate_portfolio", {});
  assert.deepEqual(data.distribution, expected.portfolio.distribution);
  assert.deepEqual(data.high_risk_inconsistencies.map((x: { scenario: string }) => x.scenario), expected.portfolio.high_risk_inconsistencies);
  const sortValues = (o: Record<string, string[]>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, [...v].sort()]));
  assert.deepEqual(sortValues(data.recurring_weak_dimensions), sortValues(expected.portfolio.recurring_weak_dimensions));
  assert.deepEqual(data.screening, expected.screening);
  assert.deepEqual(data.not_assessed, []);
  assert.ok(!("average" in data) && !("score" in data));
  assert.deepEqual(data.evidence.documented_on_inspection_recommended, ["supplier-order-change:L3-C2"]);
});

test("are_validate_deliverable finds the planted problems and passes clean files", async () => {
  const maint = await call(client, "are_validate_deliverable", { path: "scenarios/maintenance-scheduling/ARE-T07-maturity-assessment-2026-11-10.md" });
  assert.deepEqual(maint.data.issues.map((i: { code: string; check?: string }) => `${i.code}:${i.check}`), ["not_applicable_without_reason:L3-S1"]);
  const inv = await call(client, "are_validate_deliverable", { path: "scenarios/invoice-matching/ARE-T07-maturity-assessment-2026-11-10.md" });
  assert.deepEqual(inv.data.issues.map((i: { code: string; check?: string }) => `${i.code}:${i.check}`), ["evidence_location_missing:L2-X2"]);
  for (const path of [
    "scenarios/supplier-order-change/ARE-T07-maturity-assessment-2026-11-10.md",
    "scenarios/supplier-order-change/ARE-T01-value-card.md",
    "scenarios/maintenance-scheduling/ARE-T01-value-card.md",
    "portfolio/ARE-T08-scenario-screening.md",
  ]) {
    const r = await call(client, "are_validate_deliverable", { path });
    assert.equal(r.data.ok, true, `${path}: ${JSON.stringify(r.data.issues)}`);
  }
  const card = await call(client, "are_validate_deliverable", { path: "scenarios/invoice-matching/ARE-T01-value-card.md" });
  assert.equal(card.data.ok, true, JSON.stringify(card.data.issues));
});

test("are_validate_deliverable checks an unfilled template copy", async () => {
  const ws = join(tmp, "blank");
  mkdirSync(join(ws, "scenarios/s1"), { recursive: true });
  cpSync(join(REPO_ROOT, "adoption/templates/ARE-T01-value-card.md"), join(ws, "scenarios/s1/ARE-T01-value-card.md"));
  cpSync(join(REPO_ROOT, "adoption/templates/ARE-T07-maturity-assessment.md"), join(ws, "scenarios/s1/ARE-T07-maturity-assessment-2026-11-13.md"));
  const c = await connect(new Workspace(ws));
  const card = await call(c, "are_validate_deliverable", { path: "scenarios/s1/ARE-T01-value-card.md" });
  const codes = new Set(card.data.issues.map((i: { code: string }) => i.code));
  assert.ok(codes.has("unfilled_placeholder") && codes.has("invalid_decision"));
  const t07 = await call(c, "are_validate_deliverable", { path: "scenarios/s1/ARE-T07-maturity-assessment-2026-11-13.md" });
  assert.equal(t07.data.issues.filter((i: { code: string }) => i.code === "invalid_result").length, 39);
  const level = await call(c, "are_assess_scenario", { scenario_path: "scenarios/s1" });
  assert.equal(level.data.level, null, "Unfilled A02@0.5 template has no valid risk profile and must be unscorable");
  assert.equal(level.data.level_status, "UNSCORABLE_EVIDENCE_BLOCKED");
  await c.close();
});

test("paths, symbolic links and evidence locations cannot leave the workspace", async () => {
  for (const path of ["../../package.json", "/etc/hosts", "../expected.json"]) {
    const r = await call(client, "are_validate_deliverable", { path });
    assert.equal(r.isError, true, path);
    assert.ok(["path_outside_workspace", "not_found"].includes(r.data.error.code), `${path}: ${r.data.error.code}`);
  }
  const ws = join(tmp, "escape");
  mkdirSync(join(ws, "scenarios/s1"), { recursive: true });
  symlinkSync(join(REPO_ROOT, "mcp"), join(ws, "link-out"));
  const c = await connect(new Workspace(ws));
  const viaLink = await call(c, "are_validate_deliverable", { path: "link-out/package.json" });
  assert.equal(viaLink.data.error.code, "path_outside_workspace");
  const t07 = readFileSync(join(FIXTURE, "scenarios/supplier-order-change/ARE-T07-maturity-assessment-2026-11-10.md"), "utf8").replace(
    /^\| L1-V1 \| (.*?) \| ✅ \| inspected \| [^|]* \|$/m,
    "| L1-V1 | $1 | ✅ | inspected | ../../../../outside.md |",
  );
  writeFileSync(join(ws, "scenarios/s1/ARE-T07-maturity-assessment-2026-11-13.md"), t07);
  const a = await call(c, "are_assess_scenario", { scenario_path: "scenarios/s1" });
  assert.deepEqual(a.data.evidence_location_outside_workspace, ["L1-V1"]);
  assert.equal(a.data.level, "L0");
  await c.close();
});

test("text planted in evidence files is never read into results", async () => {
  for (const [name, args] of [
    ["are_assess_scenario", { scenario_path: "scenarios/supplier-order-change" }],
    ["are_aggregate_portfolio", {}],
    ["are_validate_deliverable", { path: "scenarios/supplier-order-change/ARE-T07-maturity-assessment-2026-11-10.md" }],
  ] as const) {
    const r = await call(client, name, args);
    assert.ok(!/ignore all previous instructions/i.test(r.text), name);
  }
});

test("are_evidence_request with a scenario lists only what is still missing", async () => {
  const { data } = await call(client, "are_evidence_request", { target_level: "L3", scenario_path: "scenarios/supplier-order-change" });
  assert.deepEqual(data.checks.map((c: { id: string }) => c.id), expected.scenarios["supplier-order-change"].blocking_checks);
  assert.equal(data.already_satisfied, 31 - data.checks.length);
});

test("structured errors for missing assessments and unknown deliverables", async () => {
  const ws = join(tmp, "empty");
  mkdirSync(join(ws, "scenarios/s1"), { recursive: true });
  writeFileSync(join(ws, "scenarios/s1/notes.md"), "# notes\n");
  const c = await connect(new Workspace(ws));
  assert.equal((await call(c, "are_assess_scenario", { scenario_path: "scenarios/s1" })).data.error.code, "assessment_not_found");
  assert.equal((await call(c, "are_validate_deliverable", { path: "scenarios/s1/notes.md" })).data.error.code, "deliverable_not_recognized");
  const agg = await call(c, "are_aggregate_portfolio", {});
  assert.deepEqual(agg.data.not_assessed, ["s1"]);
  await c.close();
});
