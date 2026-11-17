// are_next_steps (local mode): turn the checks that block a scenario's target level into
// concrete work, grouped by the implementation stage (P0–P8) that usually closes them.
import { readdirSync } from "node:fs";
import { assessScenario, evidenceRequestForScenario } from "./checks.js";
import { loadChecks, loadFramework } from "./data.js";
import { KnowledgeError, META } from "./knowledge.js";
import type { Workspace } from "./workspace.js";

const framework = loadFramework();
const checks = loadChecks();

export function nextSteps(ws: Workspace, scenarioPath: string, targetLevel?: string) {
  const dir = ws.resolve(scenarioPath, "dir");
  const present = new Set(
    readdirSync(dir)
      .map((n) => n.match(/^(ARE-T(?:0\d|10))/)?.[1])
      .filter((x): x is string => Boolean(x)),
  );
  const files = ws.assessmentFiles(dir);

  if (files.length === 0) {
    const steps = [];
    if (!present.has("ARE-T01"))
      steps.push({ stage: "P0", action: "Fill the value card first (prompt are_interview_guide, template T01). Nothing else is worth doing before the Value Gate decision." });
    steps.push({ stage: "—", action: "Fill a maturity assessment (prompt are_assess_scenario, template T07) so the level and gaps can be computed." });
    return { ...META, scenario: ws.scenarioName(dir), level: null, deliverables_present: [...present].sort(), steps };
  }

  // Use exactly the same version, risk-profile and semantic evidence gates as
  // are_assess_scenario and are_evidence_request. Never recalculate a grade from
  // raw T07 rows, which can incorrectly treat invalid evidence as a valid PASS.
  const assessment = assessScenario(ws, scenarioPath);
  const target = (targetLevel ?? assessment.next_level ?? "L4").trim().toUpperCase();
  if (!["L1", "L2", "L3", "L4"].includes(target)) throw new KnowledgeError("unknown_level", "Use L1, L2, L3 or L4.");
  const request = evidenceRequestForScenario(ws, scenarioPath, target);
  const remaining = new Set(request.checks.map((c) => c.id));
  const open = checks.filter((c) => c.level <= target && remaining.has(c.id));

  const byStage = new Map<string, typeof open>();
  for (const c of open) {
    const stage = framework.dimension_stage[c.dimension] ?? "P8";
    byStage.set(stage, [...(byStage.get(stage) ?? []), c]);
  }
  const stages = [...byStage.keys()].sort();
  return {
    ...META,
    scenario: ws.scenarioName(dir),
    assessment: ws.rel(files.at(-1)!.path),
    level: assessment.level,
    provisional_level: assessment.provisional_level,
    verified_level: null,
    level_status: assessment.level_status,
    assessment_standard_version: assessment.assessment_standard_version,
    evidence_gate: assessment.evidence_gate,
    target_level: target,
    consistent: assessment.consistent,
    exposure_consistency_status: assessment.exposure_consistency_status,
    urgent: assessment.consistent === false ? `Exposure “${assessment.exposure}” is beyond ${assessment.level}: reduce exposure or close these checks first.` : null,
    deliverables_present: [...present].sort(),
    steps: stages.map((stage) => {
      const s = framework.stages.find((x) => x.id === stage)!;
      const template = s.template;
      return {
        stage,
        stage_name: s.name.en,
        template,
        template_present: template ? present.has(template) : null,
        workspace_path: template ? framework.workspace_paths[template] ?? null : null,
        checks: byStage.get(stage)!.map((c) => ({
          id: c.id,
          check: c.check.en,
          evidence_to_produce: c.evidence.en,
          inspection_recommended: c.inspection_recommended,
        })),
      };
    }),
    note: "Uses the same maturity/evidence gate as are_assess_scenario; no current grade or PASS is inferred from invalid, legacy or unverified evidence. Stages follow ARE-A01 implementation order.",
  };
}
