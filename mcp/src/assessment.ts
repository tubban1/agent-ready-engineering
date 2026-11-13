// Rule-based reading of a filled ARE-T07 maturity assessment (ARE-A02 rules).
// Pure functions: the caller supplies file contents and an `exists` check,
// so the same inputs always give the same result.
import { CHECK_ID, rowsById, tableCells } from "./markdown.js";

export type Result = "✅" | "❌" | "➖";
export const LEVELS = ["L0", "L1", "L2", "L3", "L4"] as const;
export type Level = (typeof LEVELS)[number];
export const INSPECTION_RECOMMENDED = new Set(["L3-C1", "L3-C2", "L3-A2", "L3-O2"]);
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
}

export interface AssessmentFindings {
  level: Level;
  nextLevel: Level | null;
  blockingChecks: string[];
  failedChecks: string[];
  evidenceLocationMissing: string[];
  notApplicableWithoutReason: string[];
  passWithoutEvidenceType: string[];
  documentedOnInspectionRecommended: string[];
  invalidValues: string[];
  exposure: string | null;
  consistent: boolean | null;
  passes: { inspected: number; documented: number };
}

export function parseAssessment(markdown: string): ParsedAssessment {
  let exposure: string | null = null;
  for (const line of markdown.split("\n")) {
    const cells = tableCells(line);
    if (cells && /^(Currently exposed to agents|目前对 Agent 开放的范围)$/.test(cells[0] ?? "")) {
      exposure = cells[1] ?? null;
    }
  }
  const rows = [...rowsById(markdown, CHECK_ID).values()].map((c) => ({
    id: c[0]!,
    result: c[2] ?? "",
    evidenceType: c[3] ?? "",
    location: c[4] ?? "",
  }));
  return { exposure, rows };
}

/** A pass counts only with a valid evidence type and an evidence location that exists. */
function isValidPass(row: CheckRow, exists: (location: string) => boolean): boolean {
  return (
    row.result === "✅" &&
    (row.evidenceType === "inspected" || row.evidenceType === "documented") &&
    row.location !== "" &&
    exists(row.location)
  );
}

function isSatisfied(row: CheckRow, exists: (location: string) => boolean): boolean {
  return isValidPass(row, exists) || (row.result === "➖" && row.location !== "");
}

export function assess(parsed: ParsedAssessment, exists: (location: string) => boolean): AssessmentFindings {
  const { rows } = parsed;
  let level: Level = "L0";
  for (const candidate of LEVELS.slice(1)) {
    const required = rows.filter((r) => r.id.slice(0, 2) <= candidate);
    if (required.length > 0 && required.every((r) => isSatisfied(r, exists))) level = candidate;
    else break;
  }
  const nextLevel = level === "L4" ? null : LEVELS[LEVELS.indexOf(level) + 1]!;
  const invalidValues = rows
    .filter(
      (r) =>
        !["✅", "❌", "➖"].includes(r.result) ||
        (r.result === "✅" && !["inspected", "documented"].includes(r.evidenceType)),
    )
    .map((r) => r.id);
  const exposure = parsed.exposure;
  const required = exposure ? EXPOSURE_REQUIRES[exposure] : undefined;
  return {
    level,
    nextLevel,
    blockingChecks: rows.filter((r) => r.id.slice(0, 2) === nextLevel && !isSatisfied(r, exists)).map((r) => r.id),
    failedChecks: rows.filter((r) => r.result === "❌").map((r) => r.id),
    evidenceLocationMissing: rows
      .filter((r) => r.result === "✅" && r.location !== "" && !exists(r.location))
      .map((r) => r.id),
    notApplicableWithoutReason: rows.filter((r) => r.result === "➖" && r.location === "").map((r) => r.id),
    passWithoutEvidenceType: rows
      .filter((r) => r.result === "✅" && !["inspected", "documented"].includes(r.evidenceType))
      .map((r) => r.id),
    documentedOnInspectionRecommended: rows
      .filter((r) => INSPECTION_RECOMMENDED.has(r.id) && r.result === "✅" && r.evidenceType === "documented")
      .map((r) => r.id),
    invalidValues,
    exposure,
    consistent: required === undefined ? null : LEVELS.indexOf(level) >= LEVELS.indexOf(required),
    passes: {
      inspected: rows.filter((r) => r.result === "✅" && r.evidenceType === "inspected").length,
      documented: rows.filter((r) => r.result === "✅" && r.evidenceType === "documented").length,
    },
  };
}
