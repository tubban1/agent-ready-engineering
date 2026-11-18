#!/usr/bin/env node
// Fail-closed prebuild guard for published ARE case bytes.
// No network or credentials. Both GitHub CI and Vercel build call this script.
// New public cases need a separately reviewed v2 release authorization before
// this guard can be extended; this script intentionally does not accept a flag.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOCK_FILE = join(ROOT, 'data/are-publication-historical-lock.v1.json');
const BASELINE_COMMIT = 'b3ca13e013bda7c5fcdf36765cf3fb1f30f880d6';

function walk(directory) {
  const output = [];
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, item.name);
    if (item.isSymbolicLink()) throw new Error('Symlink rejected in publication corpus: ' + full);
    if (item.isDirectory()) output.push(...walk(full));
    else if (item.isFile()) output.push(full);
    else throw new Error('Unexpected filesystem entry: ' + full);
  }
  return output;
}

function publicationPaths() {
  const evidence = walk(join(ROOT, 'public'));
  const caseDocs = readdirSync(join(ROOT, 'docs/cases'), { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
    .map(entry => join(ROOT, 'docs/cases', entry.name));
  const manifests = walk(join(ROOT, 'docs/cases/data'))
    .filter(path => path.endsWith('.json'));
  return [...evidence, ...caseDocs, ...manifests]
    .map(path => relative(ROOT, path).split(sep).join('/')).sort();
}

function sha(path) {
  return createHash('sha256').update(readFileSync(join(ROOT, path))).digest('hex');
}

export function validatePublicationCorpus() {
  const lock = JSON.parse(readFileSync(LOCK_FILE, 'utf8'));
  if (lock.schema !== 'are.publication.historical_lock.v1' ||
      lock.baseline_commit !== BASELINE_COMMIT ||
      !lock.files || typeof lock.files !== 'object' || Array.isArray(lock.files)) {
    throw new Error('Missing or unsupported publication baseline lock');
  }
  const existing = publicationPaths();
  const expected = Object.keys(lock.files).sort();
  const unexpected = existing.filter(path => !expected.includes(path));
  const missing = expected.filter(path => !existing.includes(path));
  const changed = expected.filter(path => existing.includes(path) &&
    (typeof lock.files[path] !== 'string' ||
     !/^[a-f0-9]{64}$/.test(lock.files[path]) ||
     sha(path) !== lock.files[path]));
  if (unexpected.length || missing.length || changed.length) {
    throw new Error('Publication gate BLOCKED: new/removed/modified case files. ' +
      JSON.stringify({ unexpected, missing, changed }) +
      '. New public evaluations require a separate trusted dual-track QA and publication authorization.');
  }
  const correction = readFileSync(join(ROOT, 'public/evidence/remote-desktop-commander/index.html'), 'utf8');
  if (!correction.includes('Correction — 18 November 2026') ||
      !correction.includes('not confirmed defects')) {
    throw new Error('Remote Desktop Commander public correction is missing');
  }
  console.log('ARE publication gate: PASS — ' + expected.length +
    ' historical case files pinned; no new/changed publicly released evidence.');
  return expected.length;
}

try {
  validatePublicationCorpus();
} catch (err) {
  console.error(String(err?.message || err));
  process.exitCode = 1;
}
