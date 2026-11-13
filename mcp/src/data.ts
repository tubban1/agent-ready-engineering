// Loads the framework data (data/*.yaml) and gives helpers for reading the Markdown documents.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

/** Repository root: the folder that contains `data/` and `mcp/`. */
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export type Lang = "en" | "zh";
export type Bilingual = { en: string; zh: string };

export interface Check {
  id: string;
  level: string;
  dimension: string;
  inspection_recommended: boolean;
  check: Bilingual;
  evidence: Bilingual;
  short: Bilingual;
}

export interface DocumentEntry {
  id: string;
  path: string;
  path_zh: string | null;
  title: { en: string; zh: string | null };
  summary: Bilingual;
  reading_order: number | null;
}

export interface Framework {
  stages: { id: string; name: Bilingual; template: string | null }[];
  levels: { id: string; name: Bilingual; allows: string }[];
  exposure_requires: Record<string, string>;
  dimensions: { code: string; name: Bilingual }[];
  authorization_levels: { id: string; name: Bilingual }[];
  values: {
    check_result: string[];
    evidence_type: string[];
    evidence_type_never_passes: string[];
    exposure: string[];
    value_card_decision: string[];
    screening_result: string[];
    date_format: string;
  };
}

export function readRepoFile(relPath: string): string {
  return readFileSync(resolve(REPO_ROOT, relPath), "utf8");
}

function loadYaml<T>(relPath: string): T {
  return parse(readRepoFile(relPath)) as T;
}

export const loadChecks = (): Check[] => loadYaml<{ checks: Check[] }>("data/checks.yaml").checks;
export const loadDocuments = (): DocumentEntry[] =>
  loadYaml<{ documents: DocumentEntry[] }>("data/documents.yaml").documents;
export const loadFramework = (): Framework => loadYaml<Framework>("data/framework.yaml");
