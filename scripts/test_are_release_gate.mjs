import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'are-release-gate-'));
  for (const dir of ['public', 'docs/cases', 'data']) {
    cpSync(join(project, dir), join(root, dir), {recursive: true});
  }
  mkdirSync(join(root, 'scripts'), {recursive: true});
  cpSync(join(project, 'scripts/are_release_gate.mjs'), join(root, 'scripts/are_release_gate.mjs'));
  return root;
}
function run(root) {
  return spawnSync(process.execPath, [join(root, 'scripts/are_release_gate.mjs')], {encoding: 'utf-8'});
}
function withFixture(fn) {
  const root = fixture();
  try { fn(root); } finally { rmSync(root, {recursive: true, force: true}); }
}

test('clean pinned historical cases allow build', () => withFixture(root => {
  const result = run(root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /38 historical case files pinned/);
}));

test('new case page is blocked even if other evidence is intact', () => withFixture(root => {
  const dest = join(root, 'public/evidence/new-case/index.html');
  mkdirSync(dirname(dest), {recursive: true});
  writeFileSync(dest, '<h1>Unreviewed evaluation</h1>');
  const result = run(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /new-case\/index.html/);
}));

test('new case manifest fails closed', () => withFixture(root => {
  writeFileSync(join(root, 'docs/cases/data/unreviewed.json'), '{}');
  assert.notEqual(run(root).status, 0);
}));

test('existing public evidence cannot change silently', () => withFixture(root => {
  const path = join(root, 'public/evidence/remote-desktop-commander/checks.json');
  writeFileSync(path, readFileSync(path, 'utf8').replace('NOT_VERIFIED', 'PASS'));
  const result = run(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /checks.json/);
}));

test('deleting or changing the existing correction is rejected', () => withFixture(root => {
  const path = join(root, 'public/evidence/remote-desktop-commander/index.html');
  writeFileSync(path, readFileSync(path, 'utf8').replace('Correction — 18 November 2026', ''));
  assert.notEqual(run(root).status, 0);
}));

test('case content hidden under a new public route cannot bypass lock', () => withFixture(root => {
  const dest = join(root, 'public/alternative-review/index.html');
  mkdirSync(dirname(dest), {recursive: true});
  writeFileSync(dest, '<h1>Unauthorized vendor rating</h1>');
  assert.notEqual(run(root).status, 0);
}));

test('existing public front-end files cannot change ratings unnoticed', () => withFixture(root => {
  const path = join(root, 'public/evaluations/app.js');
  writeFileSync(path, readFileSync(path, 'utf8') + '\\n// unreviewed evaluation content');
  assert.notEqual(run(root).status, 0);
}));

test('historical lock cannot silently switch baseline commit', () => withFixture(root => {
  const path = join(root, 'data/are-publication-historical-lock.v1.json');
  const original = JSON.parse(readFileSync(path, 'utf8'));
  original.baseline_commit = 'fake';
  writeFileSync(path, JSON.stringify(original));
  assert.notEqual(run(root).status, 0);
}));
