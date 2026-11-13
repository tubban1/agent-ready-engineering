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
