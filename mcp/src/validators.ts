// Validators for the implementation and governance deliverables: capability matrix (ARE-T02),
// operation contract (ARE-T03) and authorization matrix (ARE-T04). Rule-based; they report
// codes, line numbers and short quotes only.
import { dirname } from "node:path";
import { loadFramework } from "./data.js";
import { firstWord, tableCells, tableUnder } from "./markdown.js";
import type { Workspace } from "./workspace.js";

export interface Issue {
  code: string;
  line?: number;
  check?: string;
  message: string;
  hint: string;
}

const v = loadFramework().values;
const quote = (s: string) => (s.length > 60 ? s.slice(0, 57) + "…" : s);
const empty = (s: string | undefined) => !s || s === "—" || s === "-";

function token(issues: Issue[], line: number, field: string, value: string | undefined, allowed: string[], code: string) {
  if (!allowed.includes(value ?? ""))
    issues.push({ code, line, message: `${field} is ${quote(value || "empty")}.`, hint: `Use one of: ${allowed.join(", ")}.` });
}

/** Rows of the main matrix: “## Matrix” or “## 矩阵”. */
const matrixRows = (text: string) => tableUnder(text, /^## (Matrix|矩阵)\s*$/);

export function validateCapabilityMatrix(text: string): Issue[] {
  const issues: Issue[] = [];
  const rows = matrixRows(text);
  if (rows.length === 0)
    issues.push({ code: "missing_matrix", message: "No operations in the matrix.", hint: "List the operations of the shortlisted scenario." });
  for (const { line, cells: c } of rows) {
    const op = c[0] ?? "";
    token(issues, line, `${op}: type`, c[1], v.operation_type, "invalid_operation_type");
    token(issues, line, `${op}: side effects`, c[2], v.side_effects, "invalid_side_effects");
    token(issues, line, `${op}: undoable`, c[3], v.undoable, "invalid_undoable");
    token(issues, line, `${op}: risk level`, c[4], v.risk_level, "invalid_risk_level");
    token(issues, line, `${op}: decision`, c[13], v.capability_decision, "invalid_capability_decision");
    if (c[1] === "read" && c[2] !== "none")
      issues.push({ code: "read_with_side_effects", line, message: `${op} is a read but declares side effects.`, hint: "Split the read from the write (declarative side effects, ARE-P02 principle 9)." });
    if ((c[2] === "money" || c[3] === "irreversible") && c[4] === "low")
      issues.push({ code: "risk_too_low", line, message: `${op} involves money or is irreversible but is rated low risk.`, hint: "Rate it medium or high; it sets the authorization level." });
    if (c[13] === "first-batch") {
      if (empty(c[9]) || empty(c[11]))
        issues.push({ code: "missing_owner", line, message: `${op} is in the first batch without an Owner and a responsible person.`, hint: "Name both (check L1-A1)." });
      if ((c[1] === "commit" || c[4] === "high") && empty(c[10]))
        issues.push({ code: "missing_approver", line, message: `${op} commits or is high risk but has no approver.`, hint: "Name who approves it (check L1-A1)." });
    }
  }
  return issues;
}

function section(text: string, n: number): string | null {
  const m = text.match(new RegExp(`^## ${n}\\. .*$`, "m"));
  return m ? m[0] : null;
}

function basicField(text: string, names: RegExp): { line: number; value: string } | null {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const c = tableCells(lines[i]!);
    if (c && names.test(c[0] ?? "")) return { line: i + 1, value: c[1] ?? "" };
  }
  return null;
}

export function validateOperationContract(text: string): Issue[] {
  const issues: Issue[] = [];
  for (let n = 1; n <= 9; n++)
    if (!section(text, n))
      issues.push({ code: "missing_section", message: `Section ${n} is missing.`, hint: "Keep all nine sections of the template; write “not applicable” with a reason where needed." });
  const type = basicField(text, /^(Type|类型)$/);
  const risk = basicField(text, /^(Risk level|风险等级)$/);
  if (type) token(issues, type.line, "Type", type.value, v.operation_type, "invalid_operation_type");
  if (risk) token(issues, risk.line, "Risk level", risk.value, v.risk_level, "invalid_risk_level");
  const isWrite = type && (type.value === "draft" || type.value === "commit");
  const input = tableUnder(text, /^## 2\. /);
  const field = (name: string) => input.find((r) => (r.cells[0] ?? "").replace(/`/g, "") === name);
  if (isWrite) {
    const key = field("idempotency_key");
    if (!key || firstWord(key.cells[2]) !== "yes")
      issues.push({ code: "missing_idempotency_key", line: key?.line, message: "A write without a required idempotency_key.", hint: "Every write accepts idempotency_key (check L3-C1)." });
    if (!field("expected_revision"))
      issues.push({ code: "missing_expected_revision", message: "A write without expected_revision.", hint: "Mutable resources need conditional writes (check L3-C2); if none is changed, keep the row with “no” and say why." });
  }
  for (const r of input)
    if (!(r.cells[0] ?? "").startsWith("<")) token(issues, r.line, `Required (${r.cells[0]})`, firstWord(r.cells[2]), v.yes_no, "invalid_required");
  for (const r of tableUnder(text, /^## 5\. /))
    if (!(r.cells[0] ?? "").startsWith("<")) token(issues, r.line, `retryable (${r.cells[0]})`, firstWord(r.cells[2]), v.yes_no, "invalid_retryable");
  for (const r of tableUnder(text, /^## 9\. /)) token(issues, r.line, `Acceptance “${quote(r.cells[0] ?? "")}”`, r.cells[1], v.acceptance_result, "invalid_acceptance_result");
  return issues;
}

export function validateAuthorizationMatrix(ws: Workspace, file: string, text: string): Issue[] {
  const issues: Issue[] = [];
  const rows = matrixRows(text);
  if (rows.length === 0)
    issues.push({ code: "missing_matrix", message: "No operations in the authorization matrix.", hint: "Add one row per first-batch operation." });
  const byOp = new Map<string, { line: number; risk: string }>();
  for (const { line, cells: c } of rows) {
    const op = (c[0] ?? "").replace(/`/g, "");
    byOp.set(op, { line, risk: c[1] ?? "" });
    token(issues, line, `${op}: risk level`, c[1], v.risk_level, "invalid_risk_level");
    token(issues, line, `${op}: authorization level`, c[2], v.authorization_level, "invalid_authorization_level");
    token(issues, line, `${op}: form of confirmation`, c[3], v.confirmation_form, "invalid_confirmation_form");
    if (c[1] === "high" && c[2] === "A")
      issues.push({ code: "high_risk_automatic", line, message: `${op} is high risk but automatic (level A).`, hint: "Use B (claim or pre-authorization) or C (human only)." });
    if (c[2] === "B" && (!["claim", "pre-authorization"].includes(c[3] ?? "") || empty(c[4])))
      issues.push({ code: "confirmation_missing", line, message: `${op} needs confirmation but has no form or channel.`, hint: "Give claim or pre-authorization and the trusted human channel (check L3-A2)." });
    if (empty(c[7]))
      issues.push({ code: "missing_audit_fields", line, message: `${op} has no audit evidence fields.`, hint: "List principal, agent, revision and authorization evidence (check L3-O1)." });
    if (empty(c[8]))
      issues.push({ code: "missing_revocation", line, message: `${op} has no revocation method.`, hint: "Say how access is revoked (check L3-A4)." });
  }
  const t02 = ws.fileIn(dirname(file), "ARE-T02-capability-matrix.md");
  if (t02) {
    for (const { cells: c } of matrixRows(ws.read(t02))) {
      const op = (c[0] ?? "").replace(/`/g, "");
      if (c[13] !== "first-batch" || op.startsWith("<")) continue;
      const row = byOp.get(op);
      if (!row)
        issues.push({ code: "operation_not_authorized", message: `${op} is in the first batch of ARE-T02 but has no row here.`, hint: "Add it with its authorization level." });
      else if (row.risk !== c[4])
        issues.push({ code: "risk_mismatch", line: row.line, message: `${op}: risk ${row.risk} here, ${c[4]} in ARE-T02.`, hint: "Use the same risk level in both matrices." });
    }
  }
  return issues;
}
