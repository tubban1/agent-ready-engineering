// M1 fixture test: the fictional sample workspace uses valid machine-readable values,
// and the shared assessment rules reproduce every expected answer.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT, loadChecks, loadFramework } from "../src/data.js";
import { assess, parseAssessment } from "../src/assessment.js";
import { tableCells } from "../src/markdown.js";

const WS = join(REPO_ROOT, "mcp/test/fixtures/engagements/example-org");
const expected = JSON.parse(readFileSync(join(WS, "expected.json"), "utf8"));
const framework = loadFramework();
const checkIds = loadChecks().map((c) => c.id).sort();

function latestAssessment(scenario: string): string {
  const dir = join(WS, "scenarios", scenario);
  const files = readdirSync(dir).filter((f) => /^ARE-T07-maturity-assessment-\d{4}-\d{2}-\d{2}\.md$/.test(f)).sort();
  assert.ok(files.length > 0, `${scenario}: no assessment`);
  return join(dir, files.at(-1)!);
}

for (const [scenario, want] of Object.entries<any>(expected.scenarios)) {
  test(`assessment rules reproduce the expected answers for ${scenario}`, () => {
    const dir = join(WS, "scenarios", scenario);
    const parsed = parseAssessment(readFileSync(latestAssessment(scenario), "utf8"));
    assert.deepEqual(parsed.rows.map((r) => r.id).sort(), checkIds, "all 39 checks present");
    assert.ok(framework.values.exposure.includes(parsed.exposure ?? ""), "valid exposure value");
    const got = assess(parsed, (loc) => existsSync(join(dir, loc)));
    assert.deepEqual(got.invalidValues, []);
    assert.equal(got.level, want.level);
    assert.equal(got.nextLevel, want.next_level);
    assert.equal(got.exposure, want.exposure);
    assert.equal(got.consistent, want.consistent);
    assert.deepEqual(got.blockingChecks, want.blocking_checks);
    assert.deepEqual(got.failedChecks, want.failed_checks);
    assert.deepEqual(got.evidenceLocationMissing, want.evidence_location_missing);
    assert.deepEqual(got.notApplicableWithoutReason, want.not_applicable_without_reason);
    assert.deepEqual(got.documentedOnInspectionRecommended, want.documented_on_inspection_recommended);
    assert.deepEqual(got.passes, want.passes);
  });
}

test("portfolio answers follow from the scenario results", () => {
  const results = Object.keys(expected.scenarios).map((s) => {
    const dir = join(WS, "scenarios", s);
    return { s, r: assess(parseAssessment(readFileSync(latestAssessment(s), "utf8")), (l) => existsSync(join(dir, l))) };
  });
  assert.deepEqual(
    results.filter((x) => x.r.consistent === false).map((x) => x.s),
    expected.portfolio.high_risk_inconsistencies,
  );
  const byDim = new Map<string, string[]>();
  for (const { s, r } of results)
    for (const d of new Set(r.blockingChecks.map((c) => c[3]!))) byDim.set(d, [...(byDim.get(d) ?? []), s]);
  const recurring = Object.fromEntries([...byDim].filter(([, v]) => v.length >= 2).sort());
  assert.deepEqual(recurring, expected.portfolio.recurring_weak_dimensions);
});

test("value card decisions and screening results use machine-readable values", () => {
  for (const [scenario, decision] of Object.entries<string>(expected.value_card_decisions)) {
    const card = readFileSync(join(WS, "scenarios", scenario, "ARE-T01-value-card.md"), "utf8");
    const m = card.match(/^- \*\*Decision\*\*: (\S+)$/m);
    assert.equal(m?.[1], decision, scenario);
    assert.ok(framework.values.value_card_decision.includes(decision));
    assert.ok(!/<[^>]*>/.test(card.replace(/^>.*$/gm, "")), `${scenario}: unfilled placeholder`);
  }
  const screening = readFileSync(join(WS, "portfolio/ARE-T08-scenario-screening.md"), "utf8");
  const byResult: Record<string, string[]> = {};
  for (const line of screening.split("\n")) {
    const cells = tableCells(line);
    if (cells && /^C\d+$/.test(cells[0] ?? "")) {
      const result = cells[9]!;
      assert.ok(framework.values.screening_result.includes(result), `${cells[0]}: ${result}`);
      (byResult[result] ??= []).push(cells[0]!);
    }
  }
  assert.deepEqual(byResult, expected.screening);
});
