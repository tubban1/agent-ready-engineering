import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assess, dimensionLevels, parseAssessment, satisfiedCheckIds } from "../src/assessment.js";
import { validateDeliverable, assessScenario, evidenceRequestForScenario } from "../src/checks.js";
import { loadChecks } from "../src/data.js";
import { Workspace } from "../src/workspace.js";

const checks = loadChecks();
const pass = (id: string) => ({ id, result: "✅", evidenceType: "inspected", location: "proof.md" });
const parsed = (rows: ReturnType<typeof pass>[], exposure = "write") => ({ rows, exposure });
const exists = (path: string) => path === "proof.md";

test("P0: single passing check can never generate an L4 or safe-write claim", () => {
  const f = assess(parsed([pass("L1-V1")]), exists);
  assert.equal(f.level, "L0");
  assert.equal(f.consistent, false);
  assert.equal(f.missingChecks.length, checks.length - 1);
  assert.ok(f.blockingChecks.includes("L1-V2"));
  assert.ok(!f.blockingChecks.includes("L1-V1"));
  assert.equal(f.passes.inspected, 1);
  assert.equal(dimensionLevels([pass("L1-V1")], exists).V, "L0");
});

test("P0: partial L1/L2 catalog can never grant L3/L4", () => {
  const rows = checks.filter((c) => c.level <= "L2").map((c) => pass(c.id));
  const f = assess(parsed(rows, "read-only"), exists);
  assert.equal(f.level, "L2");
  assert.equal(f.consistent, true);
  assert.ok(f.missingChecks.includes("L3-C1"));
  assert.ok(f.blockingChecks.includes("L3-C1"));
  assert.equal(assess(parsed(rows, "write"), exists).consistent, false);
});

test("P0: duplicate known checks fail closed, even when a later row says pass", () => {
  const rows = checks.map((c) => pass(c.id));
  rows.push(pass("L1-V1"));
  const f = assess(parsed(rows), exists);
  assert.equal(f.level, "L0");
  assert.deepEqual(f.duplicateChecks, ["L1-V1"]);
  assert.equal(f.consistent, false);
  assert.equal(f.passes.inspected, 38);
  assert.ok(!satisfiedCheckIds(parsed(rows), exists).has("L1-V1"));
});

test("P0: unrecognized check IDs fail closed instead of being ignored", () => {
  const a = parseAssessment("| L9-Z99 | invented | ✅ | inspected | proof.md |");
  assert.equal(a.rows[0]?.id, "L9-Z99");
  const f = assess(parsed([...checks.map((c) => pass(c.id)), ...a.rows]), exists);
  assert.equal(f.level, "L0");
  assert.deepEqual(f.unknownChecks, ["L9-Z99"]);
});

test("P0: missing evidence, invalid check result and N/A placeholders cannot pass", () => {
  const rows = checks.map((c) => pass(c.id));
  const missingEvidence = rows.map((r) => r.id === "L1-V1" ? { ...r, location: "missing.md" } : r);
  assert.equal(assess(parsed(missingEvidence), exists).level, "L0");
  const invalid = rows.map((r) => r.id === "L1-V1" ? { ...r, result: "YES" } : r);
  assert.deepEqual(assess(parsed(invalid), exists).invalidValues, ["L1-V1"]);
  assert.equal(assess(parsed(invalid), exists).level, "L0");
  const naPlaceholder = rows.map((r) => r.id === "L1-V1" ? { ...r, result: "➖", location: "<reason>" } : r);
  assert.equal(assess(parsed(naPlaceholder), exists).level, "L0");
  assert.deepEqual(assess(parsed(naPlaceholder), exists).notApplicableWithoutReason, ["L1-V1"]);
});

test("P0: complete and evidenced assessments remain eligible for L4", () => {
  const f = assess(parsed(checks.map((c) => pass(c.id))), exists);
  assert.equal(f.level, "L4");
  assert.equal(f.consistent, true);
  assert.equal(f.missingChecks.length, 0);
  assert.equal(f.passes.inspected, checks.length);
});

test("P0: validation, assessment, evidence request all see incomplete or duplicated rows", () => {
  const tmp = mkdtempSync(join(tmpdir(), "are-p0-integrity-"));
  try {
    const scenario = join(tmp, "scenarios", "p0-sample");
    mkdirSync(scenario, { recursive: true });
    writeFileSync(join(scenario, "proof.md"), "Synthetic proof file; not sufficient to prove a business contract.");
    const body = [
      "# Maturity Assessment",
      "| Currently exposed to agents | write |",
      "| L1-V1 | Value | ✅ | inspected | proof.md |",
      "| L1-V1 | Value | ✅ | inspected | proof.md |",
      "| L9-Z99 | Unknown | ✅ | inspected | proof.md |",
    ].join("\n");
    writeFileSync(join(scenario, "ARE-T07-maturity-assessment-2026-11-15.md"), body);
    const ws = new Workspace(tmp);
    const result = validateDeliverable(ws, "scenarios/p0-sample/ARE-T07-maturity-assessment-2026-11-15.md");
    assert.equal(result.ok, false);
    const codes = result.issues.map((i) => i.code);
    assert.ok(codes.includes("missing_check"));
    assert.ok(codes.includes("duplicate_check"));
    assert.ok(codes.includes("unknown_check"));
    const a = assessScenario(ws, "scenarios/p0-sample");
    assert.equal(a.level, "L0");
    assert.equal(a.consistent, null, "A legacy file cannot certify current exposure consistency");
    assert.equal(a.exposure_consistency_status, "LEGACY_NOT_REVALIDATED");
    assert.deepEqual(a.duplicate_checks, ["L1-V1"]);
    assert.deepEqual(a.unknown_checks, ["L9-Z99"]);
    assert.equal(a.missing_checks.length, 38);
    const req = evidenceRequestForScenario(ws, "scenarios/p0-sample", "L1");
    assert.equal(req.already_satisfied, 0);
    assert.equal(req.checks.length, checks.filter((c) => c.level === "L1").length);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
