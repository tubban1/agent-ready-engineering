// M1 consistency test: data/*.yaml must match the canonical Markdown, and every
// Chinese reading aid must track the current English version.
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { REPO_ROOT, loadChecks, loadDocuments, loadFramework, readRepoFile } from "../src/data.js";
import { CHECK_ID, englishVersion, rowsById, zhTracksVersion } from "../src/markdown.js";

const checks = loadChecks();
const framework = loadFramework();
const documents = loadDocuments();

test("checks.yaml: 39 unique checks with level and dimension matching the ID", () => {
  assert.equal(checks.length, 39);
  assert.equal(new Set(checks.map((c) => c.id)).size, 39);
  const dims = new Set(framework.dimensions.map((d) => d.code));
  const levels = new Set(framework.levels.map((l) => l.id));
  for (const c of checks) {
    assert.match(c.id, CHECK_ID);
    assert.equal(c.level, c.id.slice(0, 2), c.id);
    assert.equal(c.dimension, c.id[3], c.id);
    assert.ok(dims.has(c.dimension), `${c.id}: unknown dimension`);
    assert.ok(levels.has(c.level), `${c.id}: unknown level`);
  }
  const inspected = checks.filter((c) => c.inspection_recommended).map((c) => c.id).sort();
  assert.deepEqual(inspected, ["L3-A2", "L3-C1", "L3-C2", "L3-O2"]);
});

const tables: { file: string; lang: "en" | "zh"; textCol: number; field: "check" | "short"; evidenceCol?: number }[] = [
  { file: "adoption/ARE-A02-agent-ready-maturity-model.md", lang: "en", textCol: 1, field: "check", evidenceCol: 2 },
  { file: "adoption/ARE-A02-agent-ready-maturity-model.zh.md", lang: "zh", textCol: 1, field: "check", evidenceCol: 2 },
  { file: "adoption/templates/ARE-T07-maturity-assessment.md", lang: "en", textCol: 1, field: "short" },
  { file: "adoption/templates/ARE-T07-maturity-assessment.zh.md", lang: "zh", textCol: 1, field: "short" },
];

for (const t of tables) {
  test(`checks.yaml matches the table in ${t.file}`, () => {
    const rows = rowsById(readRepoFile(t.file), CHECK_ID);
    assert.deepEqual([...rows.keys()].sort(), checks.map((c) => c.id).sort());
    for (const c of checks) {
      const row = rows.get(c.id)!;
      assert.equal(row[t.textCol], c[t.field][t.lang], `${c.id} text`);
      if (t.evidenceCol !== undefined) assert.equal(row[t.evidenceCol], c.evidence[t.lang], `${c.id} evidence`);
    }
  });
}

test("documents.yaml: paths exist and match the README tables", () => {
  const readmeEn = rowsById(readRepoFile("README.md"), /^ARE-[A-Z]\d\d$/);
  const readmeZh = rowsById(readRepoFile("README.zh.md"), /^ARE-[A-Z]\d\d$/);
  assert.deepEqual(documents.map((d) => d.id).sort(), [...readmeEn.keys()].sort());
  for (const d of documents) {
    assert.ok(existsSync(join(REPO_ROOT, d.path)), `${d.id}: missing ${d.path}`);
    if (d.path_zh) assert.ok(existsSync(join(REPO_ROOT, d.path_zh)), `${d.id}: missing ${d.path_zh}`);
    assert.ok(readmeEn.get(d.id)![1]!.includes(d.path), `${d.id}: README path`);
    assert.equal(readmeEn.get(d.id)![2], d.summary.en, `${d.id}: summary en`);
    assert.equal(readmeZh.get(d.id)![2], d.summary.zh, `${d.id}: summary zh`);
  }
});

function markdownFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".") || name === "archive") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...markdownFiles(full));
    else if (name.endsWith(".md")) out.push(relative(REPO_ROOT, full));
  }
  return out;
}

test("every Chinese reading aid tracks the current English version", () => {
  // Ignore scratch notes and other untracked workbench material; repository
  // consistency checks must be reproducible across a clean CI checkout.
  let files: string[];
  try {
    files = execFileSync("git", ["ls-files", "-z", "--", "*.md"],
      { cwd: REPO_ROOT, encoding: "utf8" }).split("\0").filter(Boolean);
  } catch {
    files = markdownFiles(REPO_ROOT);
  }
  const zhFiles = files.filter((f) => !f.split("/").includes("archive") && f.endsWith(".zh.md"));
  assert.ok(zhFiles.length > 0);
  for (const zh of zhFiles) {
    const en = zh.replace(/\.zh\.md$/, ".md");
    assert.ok(existsSync(join(REPO_ROOT, en)), `${zh}: no English file`);
    const enVersion = englishVersion(readRepoFile(en));
    const tracked = zhTracksVersion(readRepoFile(zh));
    assert.ok(enVersion, `${en}: no version in header`);
    assert.equal(tracked, enVersion, `${zh} tracks EN ${tracked}, English is ${enVersion} (待更新)`);
  }
});
