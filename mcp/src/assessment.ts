// Rule-based assessment against the authoritative ARE-A02 check catalog.
// Never grant a maturity level from a partial, duplicated or malformed checklist.
import { loadChecks, loadFramework } from "./data.js";
import { tableCells } from "./markdown.js";

// Accept candidate IDs broadly so a typo such as L4-Z99 cannot disappear silently.
const CHECK_ROW = /^L\d+-[A-Z]\d+$/;

export type Result = "✅" | "❌" | "➖";
export const LEVELS = ["L0", "L1", "L2", "L3", "L4"] as const;
export type Level = (typeof LEVELS)[number];
export const INSPECTION_RECOMMENDED = new Set(["L3-C1", "L3-C2", "L3-A2", "L3-O2"]);

const CHECKS = loadChecks();
const CHECK_IDS = new Set(CHECKS.map((check) => check.id));
const DIMENSIONS = loadFramework().dimensions.map((dim) => dim.code);
const EXPOSURE_REQUIRES: Record<string, Level> = { none: "L0", "read-only": "L2", write: "L3" };

export interface CheckRow {
  id: string;
  result: string;
  evidenceType: string;
  location: string;
}

export interface ParsedAssessment {
  exposure: string | null;
  rows: CheckRow[];
  standardVersion?: string | null;
  riskProfile?: string | null;
  targetRevision?: string | null;
}
export interface AssessmentOptions {
  approvedNAs?: ReadonlySet<string>;
  excludedChecks?: ReadonlySet<string>;
}

export interface AssessmentFindings {
  level: Level;
  nextLevel: Level | null;
  blockingChecks: string[];
  failedChecks: string[];
  missingChecks: string[];
  duplicateChecks: string[];
  unknownChecks: string[];
  evidenceLocationMissing: string[];
  notApplicableWithoutReason: string[];
  passWithoutEvidenceType: string[];
  documentedOnInspectionRecommended: string[];
  invalidValues: string[];
  exposure: string | null;
  consistent: boolean | null;
  passes: { inspected: number; documented: number };
}

/** Keep duplicate rows intact: a Map would silently hide conflicting check claims. */
export function parseAssessment(markdown: string): ParsedAssessment {
  let exposure: string | null = null;
  let standardVersion: string | null = null;
  let riskProfile: string | null = null;
  let targetRevision: string | null = null;
  const rows: CheckRow[] = [];
  for (const line of markdown.split("\n")) {
    const cells = tableCells(line);
    if (!cells) continue;
    if (/^(Currently exposed to agents|目前对 Agent 开放的范围)$/.test(cells[0] ?? "")) {
      exposure = cells[1] ?? null;
    }
    if (/^(Standard version|评估标准版本)$/.test(cells[0] ?? "")) standardVersion = cells[1] ?? null;
    if (/^(Risk profile|风险画像文件)$/.test(cells[0] ?? "")) riskProfile = cells[1] ?? null;
    if (/^(Version assessed|被评估版本)$/.test(cells[0] ?? "")) targetRevision = cells[1] ?? null;
    if (CHECK_ROW.test(cells[0] ?? "")) rows.push({
      id: cells[0]!,
      result: cells[2] ?? "",
      evidenceType: cells[3] ?? "",
      location: cells[4] ?? "",
    });
  }
  return { exposure, rows, standardVersion, riskProfile, targetRevision };
}

/** Location existence is necessary, not proof that its contents establish the claim. */
function isValidPass(row: CheckRow, exists: (location: string) => boolean): boolean {
  return row.result === "✅" &&
    (row.evidenceType === "inspected" || row.evidenceType === "documented") &&
    row.location.trim() !== "" && exists(row.location);
}

function hasNAReason(reason: string): boolean {
  const s = reason.trim();
  return s.length > 0 && s !== "-" && s !== "—" && !/^<.*>$/.test(s);
}

export function isSatisfied(row: CheckRow, exists: (location: string) => boolean, approvedNAs?:ReadonlySet<string>, excludedChecks?:ReadonlySet<string>): boolean {
  if(excludedChecks?.has(row.id))return false;
  return isValidPass(row, exists) || (row.result === "➖" &&
    (approvedNAs ? approvedNAs.has(row.id) : hasNAReason(row.location)));
}

function groupedRows(rows: CheckRow[]): Map<string, CheckRow[]> {
  const byId = new Map<string, CheckRow[]>();
  for (const row of rows) byId.set(row.id, [...(byId.get(row.id) ?? []), row]);
  return byId;
}

/** A check only passes if the authoritative catalog knows it and exactly one row states it. */
export function satisfiedCheckIds(parsed: ParsedAssessment, exists: (location: string) => boolean, options:AssessmentOptions = {}): Set<string> {
  const byId = groupedRows(parsed.rows);
  return new Set(CHECKS.filter((check) => {
    const group = byId.get(check.id) ?? [];
    return group.length === 1 && isSatisfied(group[0]!, exists, options.approvedNAs, options.excludedChecks);
  }).map((check) => check.id));
}

export function assess(parsed: ParsedAssessment, exists: (location: string) => boolean, options:AssessmentOptions = {}): AssessmentFindings {
  const { rows } = parsed;
  const byId = groupedRows(rows);
  const missingChecks = CHECKS.filter((check) => !byId.has(check.id)).map((check) => check.id);
  const duplicateChecks = [...byId.entries()].filter(([, group]) => group.length > 1).map(([id]) => id).sort();
  const unknownChecks = [...byId.keys()].filter((id) => !CHECK_IDS.has(id)).sort();
  const validCheckIds = satisfiedCheckIds(parsed, exists, options);
  // An unknown or duplicated check makes the assessment structurally untrustworthy.
  const structurallyValid = duplicateChecks.length === 0 && unknownChecks.length === 0;
  let level: Level = "L0";
  if (structurallyValid) for (const candidate of LEVELS.slice(1)) {
    const required = CHECKS.filter((check) => check.level <= candidate);
    if (required.every((check) => validCheckIds.has(check.id))) level = candidate;
    else break;
  }

  const nextLevel = level === "L4" ? null : LEVELS[LEVELS.indexOf(level) + 1]!;
  const invalidValues = [...new Set(rows.filter((r) =>
    !["✅", "❌", "➖"].includes(r.result) ||
    (r.result === "✅" && !["inspected", "documented"].includes(r.evidenceType)),
  ).map((r) => r.id))].sort();
  const exposure = parsed.exposure;
  const required = exposure ? EXPOSURE_REQUIRES[exposure] : undefined;
  const uniqueSatisfied = rows.filter((r) => validCheckIds.has(r.id));
  return {
    level,
    nextLevel,
    blockingChecks: nextLevel === null ? [] : CHECKS.filter((c) => c.level === nextLevel && !validCheckIds.has(c.id)).map((c) => c.id),
    failedChecks: rows.filter((r) => r.result === "❌").map((r) => r.id),
    missingChecks,
    duplicateChecks,
    unknownChecks,
    evidenceLocationMissing: rows.filter((r) => r.result === "✅" && r.location.trim() !== "" && !exists(r.location)).map((r) => r.id),
    notApplicableWithoutReason: rows.filter((r) => r.result === "➖" &&
      (options.approvedNAs ? !options.approvedNAs.has(r.id) : !hasNAReason(r.location))).map((r) => r.id),
    passWithoutEvidenceType: rows.filter((r) => r.result === "✅" && !["inspected", "documented"].includes(r.evidenceType)).map((r) => r.id),
    documentedOnInspectionRecommended: rows.filter((r) => INSPECTION_RECOMMENDED.has(r.id) && r.result === "✅" && r.evidenceType === "documented").map((r) => r.id),
    invalidValues,
    exposure,
    consistent: required === undefined ? null : structurallyValid && LEVELS.indexOf(level) >= LEVELS.indexOf(required),
    passes: {
      inspected: uniqueSatisfied.filter((r) => r.result === "✅" && r.evidenceType === "inspected").length,
      documented: uniqueSatisfied.filter((r) => r.result === "✅" && r.evidenceType === "documented").length,
    },
  };
}

/** Each dimension is independently measured against all its required catalog checks. */
export function dimensionLevels(rows: CheckRow[], exists: (location: string) => boolean, options:AssessmentOptions = {}): Record<string, Level> {
  const parsed: ParsedAssessment = { exposure: null, rows };
  const findings = assess(parsed, exists, options);
  const validCheckIds = findings.duplicateChecks.length || findings.unknownChecks.length ? new Set<string>() : satisfiedCheckIds(parsed, exists, options);
  const out: Record<string, Level> = {};
  for (const dim of DIMENSIONS) {
    let level: Level = "L0";
    for (const candidate of LEVELS.slice(1)) {
      const required = CHECKS.filter((c) => c.dimension === dim && c.level <= candidate);
      if (required.every((c) => validCheckIds.has(c.id))) level = candidate;
      else break;
    }
    out[dim] = level;
  }
  return out;
}
