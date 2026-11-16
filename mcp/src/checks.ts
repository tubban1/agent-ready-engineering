// Workspace checks (local mode only): validate filled deliverables, assess a scenario and
// aggregate a portfolio. Rule-based and deterministic. Results report codes, line numbers
// and short quotes only; text inside client files is never followed as an instruction.
import { basename, dirname, join } from "node:path";
import { assess, dimensionLevels, isSatisfied, parseAssessment, satisfiedCheckIds, type CheckRow } from "./assessment.js";
import { loadChecks, loadFramework } from "./data.js";
import { KnowledgeError, META } from "./knowledge.js";
import { tableCells } from "./markdown.js";

const CHECK_ROW = /^L\d+-[A-Z]\d+$/;
import type { Workspace } from "./workspace.js";
import { validateAuthorizationMatrix, validateCapabilityMatrix, validateOperationContract, type Issue } from "./validators.js";
import { semanticReview, coverageReview, authorizationReview } from "./audit-semantics.js";
import { reviewNA } from "./na-review.js";
import { loadRiskProfile, reviewRiskProfile } from "./risk-profile.js";

const framework = loadFramework();
const checks = loadChecks();
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export type { Issue };

const quote = (s: string) => (s.length > 80 ? s.slice(0, 77) + "…" : s);

/** Lines of real content: skips blockquote header lines and fenced code. */
function contentLines(text: string): { n: number; line: string }[] {
  const out: { n: number; line: string }[] = [];
  let inCode = false;
  text.split("\n").forEach((line, i) => {
    if (line.startsWith("```")) inCode = !inCode;
    else if (!inCode && !line.startsWith(">")) out.push({ n: i + 1, line });
  });
  return out;
}

function placeholderIssues(text: string): Issue[] {
  const issues: Issue[] = [];
  for (const { n, line } of contentLines(text)) {
    const m = line.match(/<[^<>\n]{0,80}>/);
    if (m)
      issues.push({
        code: "unfilled_placeholder",
        line: n,
        message: `Unfilled field ${quote(m[0])}`,
        hint: "Fill it in, write “not measured” where data is missing, or delete leftover example rows.",
      });
  }
  return issues;
}

function evidenceIssue(ws: Workspace, dir: string, location: string, line: number, check?: string): Issue | null {
  const status = ws.evidenceStatus(dir, location);
  if (status === "ok") return null;
  return status === "outside"
    ? { code: "evidence_location_outside_workspace", line, check, message: `Evidence location points outside the workspace: ${quote(location)}`, hint: "Copy the artifact into the scenario's evidence/ folder and reference it there." }
    : { code: "evidence_location_missing", line, check, message: `Evidence file not found: ${quote(location)}`, hint: "Use a path relative to the scenario folder, e.g. evidence/<file>; optionally add a section after a space." };
}

/** Combined evidence gate for ARE-T07. Never certifies a project or runs project code.
 * Historical T07 without a version remains a legacy snapshot, not a current grade.
 */
function reviewT07(ws:Workspace,file:string,text:string){
  const parsed=parseAssessment(text),dir=dirname(file);
  const modern=parsed.standardVersion==="ARE-A02@0.5";
  const issues:Issue[]=[];
  const approvedNAs=new Set<string>();
  if(!modern){
    return {modern:false,issues,approvedNAs,verdict:"LEGACY_UNPINNED_PROVISIONAL"};
  }
  if(!parsed.targetRevision || /^\s*<|replace|unknown/i.test(parsed.targetRevision))
    issues.push({code:"assessed_revision_required",message:"Pin the target source/deployment revision in T07.",hint:"Use the same immutable source revision as in the risk profile."});
  if(!parsed.riskProfile || !parsed.riskProfile.endsWith(".json")){
    issues.push({code:"risk_profile_required",message:"ARE-A02@0.5 needs a complete operation-level risk profile.",hint:"Provide an ARE-T10-operation-risk-profile.json with inspected tool coverage."});
  }else try{
    const profile=join(dir,parsed.riskProfile);
    const facts=loadRiskProfile(ws,profile);
    if(parsed.targetRevision && parsed.targetRevision.trim()!==facts.source_revision)
      issues.push({code:"risk_profile_revision_mismatch",message:"T07 assessed revision differs from its operation risk profile.",hint:"Rebuild the profile against the pinned target revision."});
    const r=reviewRiskProfile(ws,profile,dir);
    for(const issue of r.issues)issues.push({code:issue.code,message:issue.message,hint:"Inspect the entire operation inventory before approving N/A."});
  }catch{
    issues.push({code:"invalid_risk_profile",message:"Risk profile missing, invalid, or outside authorized workspace.",hint:"Use a complete bounded local ARE-T10 JSON profile."});
  }
  for(const row of parsed.rows){
    if(row.result==="➖"){
      const r=reviewNA(ws,dir,row.id,row.location,parsed.riskProfile?join(dir,parsed.riskProfile):null);
      if(r.ok)approvedNAs.add(row.id);
      else for(const code of r.issues)issues.push({code,check:row.id,message:row.id+": "+code,hint:"Give scoped evidence, human reviewer, review date and a complete operation profile."});
    }
    if(row.result!=="✅")continue;
    if(ws.evidenceStatus(dir,row.location)!=="ok")continue; // already flagged by file evidence check
    const evidencePath=row.location.trim().split(/\s+/)[0]!.split("#")[0]!;
    let excerpt="";
    try{
      const resolved=ws.resolve(join(dir,evidencePath),"file");
      const data=ws.read(resolved);
      excerpt=Buffer.byteLength(data)<=1_000_000?data.slice(0,8000):"";
    }catch{/* already flagged */}
    for(const issue of [
      ...semanticReview({id:row.id,state:"VERIFIED_PASS",evidence:row.location},excerpt),
      ...coverageReview({id:row.id,state:"VERIFIED_PASS",evidence:row.location},excerpt),
      ...authorizationReview({id:row.id,state:"VERIFIED_PASS",evidence:row.location},excerpt)
    ])if(issue.severity==="blocker")issues.push({code:issue.code,check:row.id,message:issue.message,hint:issue.hint});
  }
  return {modern:true,issues,approvedNAs,verdict:issues.length?"REVIEW_REQUIRED":"STRUCTURALLY_REVIEWABLE_NOT_CERTIFIED"};
}

function validateAssessment(ws: Workspace, file: string, text: string): Issue[] {
  const issues: Issue[] = [];
  const dir = dirname(file);
  if (!/^ARE-T07-maturity-assessment-\d{4}-\d{2}-\d{2}\.md$/.test(basename(file)))
    issues.push({ code: "invalid_file_name", message: "Assessment file name lacks a YYYY-MM-DD date.", hint: "Name it ARE-T07-maturity-assessment-<YYYY-MM-DD>.md." });
  const parsed = parseAssessment(text);
  const review=reviewT07(ws,file,text);
  if(review.modern)issues.push(...review.issues);
  if (!parsed.exposure || !framework.values.exposure.includes(parsed.exposure))
    issues.push({ code: "invalid_exposure", message: `“Currently exposed to agents” is ${quote(parsed.exposure ?? "missing")}.`, hint: "Use none, read-only or write." });
  const lineOf = new Map<string, number>();
  text.split("\n").forEach((l, i) => {
    const c = tableCells(l);
    if (c && CHECK_ROW.test(c[0] ?? "")) lineOf.set(c[0]!, i + 1);
  });
  const present = new Set(parsed.rows.map((r) => r.id));
  const counts = new Map<string, number>();
  for (const row of parsed.rows) counts.set(row.id, (counts.get(row.id) ?? 0) + 1);
  for (const [id, count] of counts) {
    if (count > 1) issues.push({ code: "duplicate_check", check: id, message: `Check ${id} appears ${count} times.`, hint: "Keep exactly one row per check." });
    if (!checks.some((c) => c.id === id)) issues.push({ code: "unknown_check", check: id, message: `Unknown check ${id}.`, hint: "Use only IDs from the 39-check ARE-A02 catalog." });
  }
  for (const c of checks)
    if (!present.has(c.id))
      issues.push({ code: "missing_check", check: c.id, message: `Check ${c.id} is missing.`, hint: "Keep all 39 rows from the template." });
  for (const r of parsed.rows) {
    const line = lineOf.get(r.id);
    if (!framework.values.check_result.includes(r.result)) {
      issues.push({ code: "invalid_result", line, check: r.id, message: `Result ${quote(r.result || "empty")}.`, hint: "Use ✅, ❌ or ➖." });
      continue;
    }
    if (r.result === "✅") {
      if (r.evidenceType === "self-reported")
        issues.push({ code: "self_reported_pass", line, check: r.id, message: "A self-reported statement cannot pass a check.", hint: "Obtain an artifact (documented) or inspect directly (inspected), or mark ❌." });
      else if (!framework.values.evidence_type.includes(r.evidenceType))
        issues.push({ code: "invalid_evidence_type", line, check: r.id, message: `Evidence type ${quote(r.evidenceType || "empty")}.`, hint: "Use inspected or documented." });
      if (!r.location)
        issues.push({ code: "missing_evidence_location", line, check: r.id, message: "Pass without an evidence location.", hint: "Reference the evidence file." });
      else {
        const e = evidenceIssue(ws, dir, r.location, line ?? 0, r.id);
        if (e) issues.push(e);
      }
    }
    if (r.result === "➖" && (!r.location.trim() || ["-", "—"].includes(r.location.trim()) || /^<.*>$/.test(r.location.trim())))
      issues.push({ code: "not_applicable_without_reason", line, check: r.id, message: "Not applicable without a reason.", hint: "State why the check does not apply; it needs review." });
  }
  return issues;
}

function validateValueCard(ws: Workspace, file: string, text: string): Issue[] {
  const issues: Issue[] = [];
  const lines = text.split("\n");
  const decisionLine = lines.findIndex((l) => /^- \*\*(Decision|决定)\*\*[:：]/.test(l));
  if (decisionLine < 0)
    issues.push({ code: "missing_decision", message: "No decision line in section 8.", hint: "Add “- **Decision**: go / read-only-first / not-now”." });
  else {
    const value = lines[decisionLine]!.replace(/^- \*\*(Decision|决定)\*\*[:：]\s*/, "").split(/\s/)[0] ?? "";
    if (!framework.values.value_card_decision.includes(value))
      issues.push({ code: "invalid_decision", line: decisionLine + 1, message: `Decision ${quote(value || "empty")}.`, hint: "Use go, read-only-first or not-now." });
  }
  let inBaseline = false;
  lines.forEach((l, i) => {
    if (/^## /.test(l)) inBaseline = /^## 4\./.test(l);
    const c = tableCells(l);
    if (!inBaseline || !c || c.length < 5 || /^:?-+/.test(c[0] ?? "") || /^(Metric|指标)$/.test(c[0] ?? "")) return;
    const baseline = (c[1] ?? "").toLowerCase();
    const source = c[2] ?? "";
    if (!/^(not measured|未测)/.test(baseline) && (source === "" || source === "—" || source === "-"))
      issues.push({ code: "baseline_without_source", line: i + 1, message: `Baseline ${quote(c[1] ?? "")} has no source.`, hint: "Name the data source or write “not measured”." });
  });
  const ev = lines.findIndex((l) => /^- \*\*(Evidence location|证据位置)\*\*[:：]/.test(l));
  if (ev >= 0) {
    const loc = lines[ev]!.replace(/^- \*\*(Evidence location|证据位置)\*\*[:：]\s*/, "");
    if (loc && !loc.startsWith("<")) {
      const e = evidenceIssue(ws, dirname(file), loc, ev + 1);
      if (e) issues.push(e);
    }
  }
  return issues;
}

function validateScreening(text: string): Issue[] {
  const issues: Issue[] = [];
  text.split("\n").forEach((l, i) => {
    const c = tableCells(l);
    if (!c || !/^C\d+$/.test(c[0] ?? "")) return;
    const result = c[9] ?? "";
    const target = c[11] ?? "";
    if (!framework.values.screening_result.includes(result))
      issues.push({ code: "invalid_screening_result", line: i + 1, message: `${c[0]}: result ${quote(result || "empty")}.`, hint: "Use shortlist, hand-back or defer." });
    if (result === "hand-back" && (!target || target === "—"))
      issues.push({ code: "hand_back_without_destination", line: i + 1, message: `${c[0]} is handed back without a destination.`, hint: "Name the team or workstream it goes to." });
    if (result === "defer" && !DATE.test(target))
      issues.push({ code: "defer_without_date", line: i + 1, message: `${c[0]} is deferred without a revisit date.`, hint: "Give a YYYY-MM-DD revisit date." });
  });
  return issues;
}

export function validateDeliverable(ws: Workspace, userPath: string) {
  const file = ws.resolve(userPath, "file");
  const m = basename(file).match(/^ARE-(T0\d)/);
  if (!m)
    throw new KnowledgeError("deliverable_not_recognized", "File names must start with an ARE template ID, e.g. ARE-T07-maturity-assessment-2026-11-10.md (see ARE-T00 workspace layout).");
  const type = `ARE-${m[1]}`;
  const text = ws.read(file);
  const issues = [
    ...placeholderIssues(text),
    ...(type === "ARE-T07" ? validateAssessment(ws, file, text) : []),
    ...(type === "ARE-T01" ? validateValueCard(ws, file, text) : []),
    ...(type === "ARE-T08" ? validateScreening(text) : []),
    ...(type === "ARE-T02" ? validateCapabilityMatrix(text) : []),
    ...(type === "ARE-T03" ? validateOperationContract(text) : []),
    ...(type === "ARE-T04" ? validateAuthorizationMatrix(ws, file, text) : []),
  ];
  return {
    ...META,
    path: ws.rel(file),
    deliverable: type,
    checked: ["ARE-T01", "ARE-T02", "ARE-T03", "ARE-T04", "ARE-T07", "ARE-T08"].includes(type) ? "full" : "placeholders only",
    ok: issues.length === 0,
    issue_count: issues.length,
    issues,
  };
}

function valueCardDecision(ws: Workspace, dir: string): string | null {
  const card = ws.fileIn(dir, "ARE-T01-value-card.md");
  if (!card) return null;
  const m = ws.read(card).match(/^- \*\*(?:Decision|决定)\*\*[:：]\s*(\S+)/m);
  return m?.[1] ?? null;
}

function rowsOf(ws: Workspace, file: string): ReturnType<typeof parseAssessment> {
  return parseAssessment(ws.read(file));
}

export function assessScenario(ws: Workspace, userPath: string) {
  const dir = ws.resolve(userPath, "dir");
  const files = ws.assessmentFiles(dir);
  if (files.length === 0)
    throw new KnowledgeError("assessment_not_found", "No ARE-T07-maturity-assessment-<YYYY-MM-DD>.md in this scenario folder. Fill ARE-T07 first (are_get_template T07).");
  const latest = files.at(-1)!;
  const previous = files.length > 1 ? files.at(-2)! : null;
  const exists = (loc: string) => ws.evidenceStatus(dir, loc) === "ok";
  const parsed = rowsOf(ws, latest.path);
  const review = reviewT07(ws,latest.path,ws.read(latest.path));
  const options=review.modern?{approvedNAs:review.approvedNAs}:{};
  const f = assess(parsed, exists, options);
  const outside = parsed.rows.filter((r) => r.result === "✅" && r.location && ws.evidenceStatus(dir, r.location) === "outside").map((r) => r.id);
  let change = null;
  if (previous) {
    const prev = rowsOf(ws, previous.path);
    const previousReview=reviewT07(ws,previous!.path,ws.read(previous!.path));
    const pf = assess(prev, exists,previousReview.modern?{approvedNAs:previousReview.approvedNAs}:{});
    const before = new Map(prev.rows.map((r) => [r.id, isSatisfied(r, exists,previousReview.modern?previousReview.approvedNAs:undefined)]));
    change = {
      previous_date: previous.date,
      previous_level: pf.level,
      previous_standard_version: prev.standardVersion || "legacy_unpinned",
      comparable: Boolean(prev.standardVersion&&prev.standardVersion===parsed.standardVersion),
      newly_satisfied: parsed.rows.filter((r) => isSatisfied(r, exists,options.approvedNAs) && before.get(r.id) === false).map((r) => r.id),
      no_longer_satisfied: parsed.rows.filter((r) => !isSatisfied(r, exists,options.approvedNAs) && before.get(r.id) === true).map((r) => r.id),
    };
  }
  const warnings: string[] = [];
  if(!review.modern)warnings.push("Legacy/unpinned assessment: this computed level is a historical provisional indication, not a new ARE-A02@0.5 review.");
  if(review.issues.length)warnings.push("ARE-T07 semantic and operation-risk review has "+review.issues.length+" blocking evidence issues; no verified maturity level is issued.");
  if (f.missingChecks.length || f.duplicateChecks.length || f.unknownChecks.length)
    warnings.push(`Assessment integrity: ${f.missingChecks.length} missing, ${f.duplicateChecks.length} duplicated and ${f.unknownChecks.length} unknown checks. Scoring is based only on authoritative checks.`);
  if (f.consistent === false)
    warnings.push(`High-risk inconsistency: “${f.exposure}” is exposed to agents but the level is ${f.level}. Reduce exposure or close the blocking checks first.`);
  if (f.evidenceLocationMissing.length) warnings.push(`Passes whose evidence file is missing do not count: ${f.evidenceLocationMissing.join(", ")}.`);
  if (outside.length) warnings.push(`Evidence outside the workspace does not count: ${outside.join(", ")}.`);
  if (f.notApplicableWithoutReason.length) warnings.push(`Not applicable without a reason does not count: ${f.notApplicableWithoutReason.join(", ")}.`);
  if (f.passWithoutEvidenceType.length) warnings.push(`Passes without a valid evidence type do not count: ${f.passWithoutEvidenceType.join(", ")}.`);
  if (f.documentedOnInspectionRecommended.length)
    warnings.push(`Inspection recommended but only documented: ${f.documentedOnInspectionRecommended.join(", ")}.`);
  const levelInfo = framework.levels.find((l) => l.id === f.level)!;
  return {
    ...META,
    scenario: ws.scenarioName(dir),
    assessment: ws.rel(latest.path),
    assessment_date: latest.date,
    value_card_decision: valueCardDecision(ws, dir),
    level: f.level, // legacy API compatibility; ALWAYS provisional, never an official certification
    provisional_level: f.level,
    verified_level: null,
    level_status: review.modern ? "PROVISIONAL_EVIDENCE_REVIEW" : "LEGACY_UNPINNED_PROVISIONAL",
    assessment_standard_version: parsed.standardVersion || "legacy_unpinned",
    risk_profile: parsed.riskProfile || null,
    evidence_gate: {verdict:review.verdict,blocker_count:review.issues.length,issues:review.issues.slice(0,100),maturity_certified:false},
    level_name: levelInfo.name.en,
    allows: levelInfo.allows,
    exposure: f.exposure,
    consistent: review.modern && review.issues.length ? null : f.consistent,
    provisional_consistent: f.consistent,
    exposure_consistency_status: review.modern && review.issues.length ? "UNVERIFIED_EVIDENCE_BLOCKERS" : "PROVISIONAL_ONLY",
    next_level: f.nextLevel,
    blocking_checks: f.blockingChecks,
    dimension_levels: dimensionLevels(parsed.rows, exists, options),
    failed_checks: f.failedChecks,
    missing_checks: f.missingChecks,
    duplicate_checks: f.duplicateChecks,
    unknown_checks: f.unknownChecks,
    invalid_values: f.invalidValues,
    evidence_location_missing: f.evidenceLocationMissing,
    evidence_location_outside_workspace: outside,
    not_applicable_without_reason: f.notApplicableWithoutReason,
    documented_on_inspection_recommended: f.documentedOnInspectionRecommended,
    passes: f.passes,
    change_since_previous: change,
    warnings,
    note: "Computed by the ARE-A02 rules from the files only. People decide what to expose and when.",
  };
}

export function aggregatePortfolio(ws: Workspace, userPath?: string) {
  const root = userPath ? ws.resolve(userPath, "dir") : ws.root;
  if (root !== ws.root)
    throw new KnowledgeError("invalid_workspace_path", "Aggregate the whole workspace: omit workspace_path or pass \".\".");
  const scenarios = ws.scenarioDirs().map((dir) => {
    if (ws.assessmentFiles(dir).length === 0)
      return { scenario: ws.scenarioName(dir), assessed: false as const, value_card_decision: valueCardDecision(ws, dir) };
    const a = assessScenario(ws, ws.rel(dir));
    return {
      scenario: a.scenario,
      assessed: true as const,
      assessment_date: a.assessment_date,
      value_card_decision: a.value_card_decision,
      level: a.level,
      level_status: a.level_status,
      verified_level: null,
      assessment_standard_version: a.assessment_standard_version,
      exposure: a.exposure,
      consistent: a.consistent,
      next_level: a.next_level,
      blocking_dimensions: [...new Set(a.blocking_checks.map((c) => c[3]!))].sort(),
      blocking_checks: a.blocking_checks,
      documented_on_inspection_recommended: a.documented_on_inspection_recommended,
      passes: a.passes,
      previous_level: a.change_since_previous?.comparable ? a.change_since_previous.previous_level : null,
      previous_standard_version: a.change_since_previous?.previous_standard_version ?? null,
      comparison_valid: a.change_since_previous?.comparable ?? false,
    };
  });
  const assessed = scenarios.filter((s): s is Extract<typeof s, { assessed: true }> => s.assessed);
  const byDim = new Map<string, string[]>();
  for (const s of assessed) for (const d of s.blocking_dimensions) byDim.set(d, [...(byDim.get(d) ?? []), s.scenario]);
  const screeningFile = ws.fileIn(`${ws.root}/portfolio`, "ARE-T08-scenario-screening.md");
  let screening: Record<string, string[]> | null = null;
  if (screeningFile) {
    screening = {};
    for (const l of ws.read(screeningFile).split("\n")) {
      const c = tableCells(l);
      if (c && /^C\d+$/.test(c[0] ?? "")) (screening[c[9] ?? "unknown"] ??= []).push(c[0]!);
    }
  }
  return {
    ...META,
    workspace: ".",
    scenarios,
    distribution: Object.fromEntries(framework.levels.map((l) => [l.id, assessed.filter((s) => s.level === l.id).length])),
    distribution_status:"PROVISIONAL_ONLY_NO_CERTIFIED_LEVELS",
    not_assessed: scenarios.filter((s) => !s.assessed).map((s) => s.scenario),
    high_risk_inconsistencies: assessed.filter((s) => s.consistent === false).map((s) => ({ scenario: s.scenario, exposure: s.exposure, level: s.level, blocking_checks: s.blocking_checks })),
    recurring_weak_dimensions: Object.fromEntries([...byDim].filter(([, v]) => v.length >= 2).sort()),
    evidence: {
      inspected: assessed.reduce((n, s) => n + s.passes.inspected, 0),
      documented: assessed.reduce((n, s) => n + s.passes.documented, 0),
      documented_on_inspection_recommended: assessed.flatMap((s) => s.documented_on_inspection_recommended.map((c) => `${s.scenario}:${c}`)),
    },
    screening,
    note: "No averaged enterprise score by design (ARE-A02). Use ARE-T09 to write the portfolio report.",
  };
}

export function evidenceRequestForScenario(ws: Workspace, userPath: string, targetLevel: string) {
  const dir = ws.resolve(userPath, "dir");
  const target = targetLevel.trim().toUpperCase();
  if (!["L1", "L2", "L3", "L4"].includes(target)) throw new KnowledgeError("unknown_level", "Use L1, L2, L3 or L4.");
  const files = ws.assessmentFiles(dir);
  const exists = (loc: string) => ws.evidenceStatus(dir, loc) === "ok";
  const done = new Set<string>();
  if (files.length){
    const latest=files.at(-1)!.path, parsed=rowsOf(ws,latest);
    const review=reviewT07(ws,latest,ws.read(latest));
    for (const id of satisfiedCheckIds(parsed, exists, review.modern?{approvedNAs:review.approvedNAs}:{}))done.add(id);
    if(review.modern)for(const issue of review.issues)if(issue.check)done.delete(issue.check);
  }
  return {
    ...META,
    scenario: ws.scenarioName(dir),
    based_on: files.length ? ws.rel(files.at(-1)!.path) : null,
    target_level: target,
    already_satisfied: checks.filter((c) => c.level <= target && done.has(c.id)).length,
    checks: checks
      .filter((c) => c.level <= target && !done.has(c.id))
      .map((c) => ({ id: c.id, check: c.check.en, evidence_to_request: c.evidence.en, inspection_recommended: c.inspection_recommended })),
  };
}
