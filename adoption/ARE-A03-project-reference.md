# How Projects Use This Repository
> Document ID: ARE-A03
> v0.2 | 2026-11-12
> Language: English (canonical). Chinese reading aid: `ARE-A03-project-reference.zh.md`. Terms follow `../references/ARE-R03-glossary.md`.

## Recommended layering
1. Shared knowledge source: this directory, `agent-ready-engineering/`, versioned with Git.
2. Each project: adds only a short read-only pointer that names the version / URI and states that project-specific rules take precedence.
3. Concrete implementation: ADRs, schemas, evals and change tests live inside the project; do not copy full texts that will drift apart over time.
4. Remote agents: prefer reading on demand through an authorized MCP Resource or read-only raw Git content; do not assume they can reach absolute paths on a local Mac.

## Suggested short project pointer (add manually once the project needs it)
> For agent-facing APIs and MCP tool design, consult the shared Agent-Native Interface Design playbook at `../agent-ready-engineering/principles/ARE-P02-agent-native-interface-design.md` (v0.2). It is advisory, not authorization. Project AGENTS.md/CLAUDE.md, production permissions, and Owner approvals take precedence. Do not import or publicize private project data.

## Conditions for wider rollout
- Do not claim “automatically available to every agent” before verifying that the files are reachable across platforms.
- Each project keeps its own development rules; shared knowledge must never override security or permissions.
- When changing this repository, update version numbers, sources and hypotheses to be validated together; never silently rewrite existing guidance.

## Change log
- **v0.2 (2026-11-12)**: first English canonical version, translated from Chinese. Pointer updated to reference ARE-P02 v0.2. The Chinese text becomes the reading aid `ARE-A03-project-reference.zh.md`.
