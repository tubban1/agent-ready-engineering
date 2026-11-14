// Small, dependency-free helpers for the Markdown conventions used in this repository.

/** Split one Markdown table row into trimmed cells. Returns null for non-table lines. */
export function tableCells(line: string): string[] | null {
  const t = line.trim();
  if (!t.startsWith("|") || !t.endsWith("|")) return null;
  return t
    .slice(1, -1)
    .split("|")
    .map((c) => c.trim());
}

/** Rows whose first cell matches `idPattern`, keyed by that first cell. */
export function rowsById(markdown: string, idPattern: RegExp): Map<string, string[]> {
  const rows = new Map<string, string[]>();
  for (const line of markdown.split("\n")) {
    const cells = tableCells(line);
    if (cells && cells[0] !== undefined && idPattern.test(cells[0])) rows.set(cells[0], cells);
  }
  return rows;
}

export const CHECK_ID = /^L[1-4]-[A-Z]\d$/;

/** Version of an English canonical file, read from its header. */
export function englishVersion(markdown: string): string | null {
  const head = markdown.split("\n").slice(0, 8).join("\n");
  const m =
    head.match(/^> v(\d+\.\d+(?:\.\d+)?)/m) ??
    head.match(/Template v(\d+\.\d+(?:\.\d+)?)/) ??
    head.match(/^Version: (\d+\.\d+(?:\.\d+)?)/m);
  return m?.[1] ?? null;
}

/** English version a Chinese reading aid says it corresponds to. */
export function zhTracksVersion(markdown: string): string | null {
  const m = markdown.match(/对应英文版：`[^`]+` EN v?(\d+\.\d+(?:\.\d+)?)/);
  return m?.[1] ?? null;
}

/** Data rows of the first table after a heading matching `heading` (header and separator rows skipped). */
export function tableUnder(markdown: string, heading: RegExp): { line: number; cells: string[] }[] {
  const lines = markdown.split("\n");
  const start = lines.findIndex((l) => /^#{2,3} /.test(l) && heading.test(l));
  if (start < 0) return [];
  const out: { line: number; cells: string[] }[] = [];
  let seenTable = false;
  let header = true;
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i]!;
    if (/^#{2,3} /.test(l)) break;
    const cells = tableCells(l);
    if (!cells) {
      if (seenTable) break;
      continue;
    }
    seenTable = true;
    if (header) {
      header = false;
      continue;
    }
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    out.push({ line: i + 1, cells });
  }
  return out;
}

/** First word of a cell, lower-cased (e.g. "no (re-read first)" → "no"). */
export const firstWord = (cell: string | undefined) => (cell ?? "").trim().split(/[\s（(]/)[0]!.toLowerCase();
