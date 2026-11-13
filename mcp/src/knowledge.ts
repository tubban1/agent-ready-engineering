// Read-only knowledge layer of the ARE MCP server. Pure functions over the repository
// content; no client data is involved. Every result carries version metadata.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  REPO_ROOT,
  loadChecks,
  loadDocuments,
  loadFramework,
  readRepoFile,
  type Check,
  type DocumentEntry,
  type Lang,
} from "./data.js";
import { englishVersion, zhTracksVersion } from "./markdown.js";

export const DEFAULT_MAX_CHARS = 12_000;
export const SEARCH_LIMIT_MAX = 10;

/** Structured error returned to clients as { code, retryable, hint }. */
export class KnowledgeError extends Error {
  constructor(
    readonly code: string,
    readonly hint: string,
    readonly retryable = false,
  ) {
    super(`${code}: ${hint}`);
  }
}

const checks = loadChecks();
const documents = loadDocuments();
const framework = loadFramework();
const checkById = new Map(checks.map((c) => [c.id, c]));
const docById = new Map(documents.map((d) => [d.id, d]));

function gitCommit(): string | null {
  try {
    return execFileSync("git", ["-C", REPO_ROOT, "rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

export const META = {
  framework_version: englishVersion(readRepoFile("README.md")),
  commit: gitCommit(),
};

// ---------- helpers ----------

function normalizeDocId(id: string): string {
  const t = id.trim().toUpperCase();
  return t.startsWith("ARE-") ? t : `ARE-${t}`;
}

function requireDoc(id: string): DocumentEntry {
  const doc = docById.get(normalizeDocId(id));
  if (!doc) throw new KnowledgeError("unknown_id", `No document ${id}. Call are_list_documents for valid IDs.`);
  return doc;
}

interface Section {
  title: string;
  slug: string;
  start: number;
  end: number;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[`*_|]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

/** Sections start at `##` or `###` headings outside code blocks. */
function sections(markdown: string): Section[] {
  const lines = markdown.split("\n");
  const out: Section[] = [];
  let offset = 0;
  let inCode = false;
  for (const line of lines) {
    if (line.startsWith("```")) inCode = !inCode;
    const m = !inCode ? line.match(/^#{2,3} (.+)$/) : null;
    if (m) {
      if (out.length) out[out.length - 1]!.end = offset;
      out.push({ title: m[1]!.trim(), slug: slugify(m[1]!), start: offset, end: markdown.length });
    }
    offset += line.length + 1;
  }
  return out;
}

interface Resolved {
  path: string;
  lang: Lang;
  content: string;
  version: string | null;
  canonical_version: string | null;
  zh_outdated: boolean | null;
  note?: string;
}

function resolveDoc(doc: DocumentEntry, lang: Lang): Resolved {
  const enContent = readRepoFile(doc.path);
  const enVersion = englishVersion(enContent);
  if (lang === "zh" && doc.path_zh) {
    const content = readRepoFile(doc.path_zh);
    const tracked = zhTracksVersion(content);
    return {
      path: doc.path_zh,
      lang: "zh",
      content,
      version: tracked,
      canonical_version: enVersion,
      zh_outdated: tracked !== enVersion,
      note: "Chinese reading aid; the English version is canonical.",
    };
  }
  return {
    path: doc.path,
    lang: "en",
    content: enContent,
    version: enVersion,
    canonical_version: enVersion,
    zh_outdated: null,
    note: lang === "zh" ? "No Chinese reading aid for this document; returning English." : undefined,
  };
}

function page(text: string, cursor: number, maxChars: number) {
  if (!Number.isInteger(cursor) || cursor < 0 || cursor > text.length)
    throw new KnowledgeError("invalid_cursor", "Use the `next` value from the previous response.");
  const end = Math.min(text.length, cursor + maxChars);
  return { text: text.slice(cursor, end), truncated: end < text.length, next: end < text.length ? end : null };
}

// ---------- tools ----------

export function listDocuments(lang: Lang = "en") {
  return {
    ...META,
    documents: documents.map((d) => {
      const r = d.path_zh ? resolveDoc(d, "zh") : null;
      const en = englishVersion(readRepoFile(d.path));
      return {
        id: d.id,
        title: lang === "zh" && d.title.zh ? d.title.zh : d.title.en,
        summary: d.summary[lang],
        path: lang === "zh" && d.path_zh ? d.path_zh : d.path,
        version: en,
        reading_order: d.reading_order,
        zh_available: Boolean(d.path_zh),
        zh_outdated: r ? r.zh_outdated : null,
      };
    }),
    reading_order_note: "Main path: P01 → P02 → R01 → A01 → A02 → T00–T09 → R02. See README for role-based paths.",
  };
}

export function getDocument(id: string, lang: Lang = "en", section?: string, cursor = 0, maxChars = DEFAULT_MAX_CHARS) {
  const doc = requireDoc(id);
  const r = resolveDoc(doc, lang);
  const secs = sections(r.content);
  let body = r.content;
  let sectionTitle: string | null = null;
  if (section) {
    const want = section.trim().toLowerCase();
    const hit = secs.find((s) => s.slug === slugify(section) || s.title.toLowerCase() === want);
    if (!hit)
      throw new KnowledgeError("unknown_section", `No section "${section}" in ${doc.id}. Valid slugs are in \`sections\` of are_get_document without a section.`);
    body = r.content.slice(hit.start, hit.end);
    sectionTitle = hit.title;
  }
  const p = page(body, cursor, maxChars);
  return {
    ...META,
    id: doc.id,
    title: r.lang === "zh" && doc.title.zh ? doc.title.zh : doc.title.en,
    lang: r.lang,
    path: r.path,
    version: r.version,
    canonical_version: r.canonical_version,
    zh_outdated: r.zh_outdated,
    note: r.note,
    section: sectionTitle,
    sections: section ? undefined : secs.map((s) => ({ title: s.title, slug: s.slug })),
    content: p.text,
    truncated: p.truncated,
    next: p.next,
  };
}

export function search(query: string, lang: Lang = "en", limit = 5) {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1);
  if (terms.length === 0) throw new KnowledgeError("empty_query", "Give at least one search term of two or more characters.");
  const n = Math.min(Math.max(1, Math.trunc(limit)), SEARCH_LIMIT_MAX);
  const hits: { id: string; section: string; slug: string; score: number; snippet: string }[] = [];
  for (const doc of documents) {
    const r = resolveDoc(doc, lang);
    for (const s of sections(r.content)) {
      const text = r.content.slice(s.start, s.end);
      const lower = text.toLowerCase();
      let score = 0;
      for (const t of terms) score += lower.split(t).length - 1;
      if (score === 0) continue;
      const first = Math.min(...terms.map((t) => lower.indexOf(t)).filter((i) => i >= 0));
      const from = Math.max(0, first - 80);
      hits.push({
        id: doc.id,
        section: s.title,
        slug: s.slug,
        score,
        snippet: (from > 0 ? "…" : "") + text.slice(from, from + 240).replace(/\s+/g, " ").trim() + "…",
      });
    }
  }
  hits.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return { ...META, query, lang, results: hits.slice(0, n), total_matches: hits.length };
}

function describeCheck(c: Check, lang: Lang) {
  const level = framework.levels.find((l) => l.id === c.level)!;
  const dim = framework.dimensions.find((d) => d.code === c.dimension)!;
  return {
    id: c.id,
    level: c.level,
    level_name: level.name[lang],
    dimension: c.dimension,
    dimension_name: dim.name[lang],
    check: c.check[lang],
    evidence: c.evidence[lang],
    short: c.short[lang],
    inspection_recommended: c.inspection_recommended,
    source: "ARE-A02",
  };
}

export function getCheck(id: string, lang: Lang = "en") {
  const c = checkById.get(id.trim().toUpperCase());
  if (!c) throw new KnowledgeError("unknown_id", `No check ${id}. Check IDs look like L3-A2; call are_list_checks.`);
  return { ...META, ...describeCheck(c, lang) };
}

export function listChecks(level?: string, dimension?: string, lang: Lang = "en") {
  const lv = level?.trim().toUpperCase();
  const dm = dimension?.trim().toUpperCase();
  if (lv && !framework.levels.some((l) => l.id === lv)) throw new KnowledgeError("unknown_level", "Use L1, L2, L3 or L4.");
  if (dm && !framework.dimensions.some((d) => d.code === dm))
    throw new KnowledgeError("unknown_dimension", "Use one of V, C, S, A, X, I, O, R.");
  return {
    ...META,
    checks: checks
      .filter((c) => (!lv || c.level === lv) && (!dm || c.dimension === dm))
      .map((c) => ({ id: c.id, short: c.short[lang], inspection_recommended: c.inspection_recommended })),
  };
}

export function getTemplate(id: string, lang: Lang = "en", cursor = 0, maxChars = DEFAULT_MAX_CHARS) {
  const docId = normalizeDocId(id);
  if (!/^ARE-T\d\d$/.test(docId)) throw new KnowledgeError("unknown_id", "Templates are T00–T09.");
  const doc = getDocument(docId, lang, undefined, cursor, maxChars);
  return {
    ...doc,
    sections: undefined,
    workspace_path: framework.workspace_paths[docId] ?? null,
    instructions:
      docId === "ARE-T00"
        ? "Rules of use, machine-readable values and the workspace layout for all templates."
        : "Copy this template to `workspace_path` inside the engagement workspace, then fill it in. Use the machine-readable values from ARE-T00.",
  };
}

export function evidenceRequest(targetLevel: string, lang: Lang = "en") {
  const target = targetLevel.trim().toUpperCase();
  if (!["L1", "L2", "L3", "L4"].includes(target)) throw new KnowledgeError("unknown_level", "Use L1, L2, L3 or L4.");
  const needed = checks.filter((c) => c.level <= target);
  return {
    ...META,
    target_level: target,
    note: "Request one artifact per check. Self-reported statements never pass; inspection is recommended where marked.",
    checks: needed.map((c) => ({
      id: c.id,
      check: c.check[lang],
      evidence_to_request: c.evidence[lang],
      inspection_recommended: c.inspection_recommended,
    })),
  };
}

export const DOCUMENT_IDS = documents.map((d) => d.id);
export const CHECK_IDS = checks.map((c) => c.id);
export const TEMPLATE_IDS = documents.filter((d) => /^ARE-T\d\d$/.test(d.id)).map((d) => d.id);
export const repoFileExists = (rel: string) => existsSync(join(REPO_ROOT, rel));
