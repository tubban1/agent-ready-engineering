// are_next_steps (local mode): turn the checks that block a scenario's target level into
// concrete work, grouped by the implementation stage (P0–P8) that usually closes them.
import { readdirSync } from "node:fs";
import { assess, parseAssessment, satisfiedCheckIds } from "./assessment.js";
import { loadChecks, loadFramework } from "./data.js";
import { KnowledgeError, META } from "./knowledge.js";
import type { Workspace } from "./workspace.js";

const framework = loadFramework();
const checks = loadChecks();

export function nextSteps(ws: Workspace, scenarioPath: string, targetLevel?: string) {
  const dir = ws.resolve(scenarioPath, "dir");
  const present = new Set(
    readdirSync(dir)
      .map((n) => n.match(/^(ARE-T0\d)/)?.[1])
      .filter((x): x is string => Boolean(x)),
  );
  const files = ws.assessmentFiles(dir);
  const exists = (loc: string) => ws.evidenceStatus(dir, loc) === "ok";

  if (files.length === 0) {
    const steps = [];
    if (!present.has("ARE-T01"))
      steps.push({ stage: "P0", action: "Fill the value card first (prompt are_interview_guide, template T01). Nothing else is worth doing before the Value Gate decision." });
    steps.push({ stage: "—", action: "Fill a maturity assessment (prompt are_assess_scenario, template T07) so the level and gaps can be computed." });
    return { ...META, scenario: ws.scenarioName(dir), level: null, deliverables_present: [...present].sort(), steps };
  }

  const parsed = parseAssessment(ws.read(files.at(-1)!.path));
  const f = assess(parsed, exists);
  const target = (targetLevel ?? f.nextLevel ?? "L4").trim().toUpperCase();
  if (!["L1", "L2", "L3", "L4"].includes(target)) throw new KnowledgeError("unknown_level", "Use L1, L2, L3 or L4.");
  const passed = satisfiedCheckIds(parsed, exists);
  const open = checks.filter((c) => c.level <= target && !passed.has(c.id));

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
    level: f.level,
    target_level: target,
    consistent: f.consistent,
    urgent: f.consistent === false ? `Exposure “${f.exposure}” is beyond ${f.level}: reduce exposure or close these checks first.` : null,
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
    note: "Stages are listed in implementation order (ARE-A01). Close earlier stages first; re-run are_assess_scenario after each change.",
  };
}
