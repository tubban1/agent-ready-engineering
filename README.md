# Agent-Ready Engineering | Agent-Native Interfaces and Trustworthy Execution
> Language: English (canonical). Chinese reading aid: `README.zh.md`. Terms follow `references/ARE-R03-glossary.md`.

Version: 0.18.0 (2026-11-13: MCP support for implementation engineers, governance and decision makers; machine-readable values for ARE-T02/T03/T04. 0.17.0 MCP milestone M4, four workflow prompts. 0.16.0 MCP milestone M3, read-only workspace checks; evidence location format in ARE-T00. 0.15.0 local read-only MCP knowledge server (milestone M2) in `mcp/`. 0.14.0 machine-readable values and the exposure field for local checks; framework data in `data/`; MCP milestone M1. 0.13.0 portfolio assessment for architects and consultants: ARE-T08 Scenario Screening, ARE-T09 Portfolio Report and Roadmap, evidence types, workspace layout. 0.12.0 all documents and templates now have English canonical versions; Chinese texts are `.zh.md` reading aids. 0.11.0 English versions of P01, A01, A02. 0.10.0 language policy and glossary ARE-R03. 0.9.0 project renamed from agent-native-knowledge to agent-ready-engineering. 0.8.0 document IDs added as filename prefixes. 0.7.0 document IDs and reading order. 0.6.0 maturity model and assessment form. 0.5.0 standard deliverable templates. 0.4.0 positioned as the execution-layer standard of enterprise AI transformation. 0.3.0 Value Gate made part of Agent-Ready Engineering; industry landscape added. 0.2.0 architecture document index and implementation checklist. 0.1.0 first research draft, 2026-11-11.)

This is a cross-project knowledge source, not the product specification of OWL LAB, World2, Bloomroom, Interior or any other project.

## Goals
Help any new agent project answer first:
1. Why do users need this service in real situations? Does it have recurring value?
2. How does the model discover capabilities, understand preconditions and choose tools?
3. Are the business interfaces agent-ready (data, state, authorization, recovery, evidence)?
4. Who is the real acting principal, who authorizes, and who bears the external effects?
5. How are execution results, failures and reproducibility verified independently?

## Document IDs
Each document's ID appears under its title and as its filename prefix (except the two `README.md` files). **IDs identify documents; they do not indicate reading order.** Once assigned, an ID never changes and is never reused. Cite as, for example, “see L3-A2 in ARE-A02”.
Prefixes: P = Principles, R = References, A = Adoption, T = Templates, M = Media.

Every document has an English canonical file `<name>.md` and a Chinese reading aid `<name>.zh.md` next to it, except ARE-R03 (bilingual by design) and ARE-M01 (Chinese only, record-only).

| ID | File | Content |
| :--- | :--- | :--- |
| ARE-P01 | `principles/ARE-P01-agent-ready-architecture.md` | Positioning and boundaries of Agent-Ready Engineering, the value premise, seven architecture dimensions |
| ARE-P02 | `principles/ARE-P02-agent-native-interface-design.md` | Agent-native interface design and principles 1–12 |
| ARE-R01 | `references/ARE-R01-tool-calling-mcp-code-mode.md` | Engineering distinctions between Tool Calling / MCP / Code Mode / A2A |
| ARE-R02 | `references/ARE-R02-agent-ready-industry-landscape.md` | Industry sources on Agent-Ready, source reliability and practices adopted |
| ARE-R03 | `references/ARE-R03-glossary.md` | English–Chinese glossary (English terms are canonical); the only bilingual file |
| ARE-A01 | `adoption/ARE-A01-agent-ready-implementation-checklist.md` | Implementation checklist: P0 Value Gate → P8 value review, with acceptance criteria |
| ARE-A02 | `adoption/ARE-A02-agent-ready-maturity-model.md` | Maturity model: L0–L4, assessed per scenario |
| ARE-A03 | `adoption/ARE-A03-project-reference.md` | Referencing this repository from new or existing projects with minimal intrusion |
| ARE-T00 | `adoption/templates/README.md` | Template overview and how the deliverables connect |
| ARE-T01 | `adoption/templates/ARE-T01-value-card.md` | Value Card (P0) |
| ARE-T02 | `adoption/templates/ARE-T02-capability-matrix.md` | Capability Matrix (P1) |
| ARE-T03 | `adoption/templates/ARE-T03-operation-contract.md` | Operation Contract (P2–P3) |
| ARE-T04 | `adoption/templates/ARE-T04-authorization-matrix.md` | Authorization Matrix (P4) |
| ARE-T05 | `adoption/templates/ARE-T05-eval-report.md` | Eval Report (P5 / P7) |
| ARE-T06 | `adoption/templates/ARE-T06-value-review.md` | Value Review (P8) |
| ARE-T07 | `adoption/templates/ARE-T07-maturity-assessment.md` | Maturity Assessment |
| ARE-T08 | `adoption/templates/ARE-T08-scenario-screening.md` | Scenario Screening (P0, many candidates) |
| ARE-T09 | `adoption/templates/ARE-T09-portfolio-report.md` | Portfolio Report and Roadmap (each assessment round) |
| ARE-M01 | `media/ARE-M01-claude-video-brief-20261111.md` | Video brief (superseded, record only, Chinese only; not on the reading path) |

Implementation: the MCP server is in `mcp/`; design, status and setup are in `mcp/DESIGN.md` (no ARE ID; it is an implementation component, not a framework document).
For coding Agents auditing their own local **stdio** MCP, use the read-only `are_local_mcp_audit_guide({service,lang})` to obtain a value-first five-stage assessment plan. The new local-only `are_validate_local_mcp_audit` or standalone `mcp/dist/src/audit-gate-cli.js` checks audit evidence integrity and common false positives without uploads; this gate is not a certification. The coding Agent—not the remote ARE server—inspects the authorized workspace and executes safe local tests. There is no `run_id`, official 0–100 Benchmark score, registration or source upload. [Chinese self-audit guide](mcp/LOCAL_STDIO_SELF_AUDIT.zh.md).

Public ARE knowledge endpoint (World2-managed canonical): `https://are.world2.co/mcp` (legacy compatible: `https://are.fde.fan/mcp`) (Streamable HTTP, no sign-in). Knowledge tools remain read-only. The separate opt-in `are_score_mcp({endpoint})` accepts **only a live, public HTTPS MCP Endpoint**, obtains its real `tools/list`, and saves a preliminary ARE Benchmark v2 score. There is **no GitHub-only, stdio, uploaded-manifest or offline-score registration**, nor a v1 API compatibility layer. A GitHub URL may still be provided later as source evidence. This is not L0–L4 certification and executes no third-party business tools. Workspace document checks via the separate local ARE stdio server do not register a Benchmark target and remain on the user's machine. See `functions/are-score/README.md`.

### Public evaluations, self-assessment and maintainer feedback (no code changes)

ARE now has a documented, evidence-scoped public case and reusable prompts. **This is a process/documentation publication, not a new automated testing feature or certification.**

- [Centralized Calendar Operations Scheduler](docs/standards/ARE-CALENDAR-OPS-SCHEDULER-v1.md) — one hourly watcher reads the private ARE follow-up calendar, checks Gmail per task, and journals execution; no per-project automations.
- [Evaluation → public report → distribution → retest SOP](docs/standards/ARE-EVALUATION-PUBLICATION-SOP-v1.md) — S0–S13, including safe GitHub/community publishing gates.
- [World2 / ARE platform architecture decision](docs/standards/ADR-001-world2-are-publishing.md) — World2 centrally **manages all first-party MCP services**; ARE canonical URL is **`https://are.world2.co/mcp`** (online and independently probed); [migration gates](docs/standards/ARE-WORLD2-ENDPOINT-MIGRATION-PLAN.md) preserve the current host until verified.
- [English-first, channel-specific prompts](docs/prompts/README.md) — [website general](docs/prompts/channels/WEBSITE_GENERAL_EVALUATION.md), [personalized maintainer email](docs/prompts/channels/MAINTAINER_EMAIL_RETEST.md), [GitHub Issue reproduction](docs/prompts/channels/GITHUB_ISSUE_REPRODUCTION.md), optional [public project-specific review](docs/prompts/channels/PUBLIC_PROJECT_REVIEW.md), plus core self/retest/third-party methodology (EN/中文).
- [Solarstorm MCP technical case](docs/cases/solarstorm-2026-11-16.md) — four public read-only tools, one real model task and independent NOAA comparisons, with no unsupported maturity grade.
- The [ARE Benchmark](https://are.fde.fan/benchmark/) already offers a copyable **preliminary** self-evaluation prompt. It is deliberately narrower than the deep developer self-evaluation prompt above. Neither path provides official MCP certification.

### MCP protocol compatibility vs ARE assessment (implementation v0.8, 2026-11-15)

The ARE MCP implementation uses the official TypeScript SDK v2 to support both **MCP 2026-07-28** (`server/discover`, per-request metadata, result types and list caching) and older **2025-era clients** over Streamable HTTP and stdio. **Verify deployed support with a live probe**: `node mcp/conformance/probe.mjs https://are.world2.co/mcp`. Source changes or local tests alone do not prove a live deployment.

- [Official protocol conformance profile](conformance/README.md): a version-pinned subset of protocol MUST/SHOULD checks. It is **not** an official MCP conformance certification.
- [ARE engineering readiness](conformance/are-engineering.rules.json): separate scenario-based L0–L4 checks from [ARE-A02](adoption/ARE-A02-agent-ready-maturity-model.md), based on business outcomes, recovery, authorization and evidence. A protocol PASS does not certify a business as L3/L4.
- [Synthetic tool-interface comparison](benchmark/agent-tool-design/README.md): reproducible controlled fixtures inspired by normal API wrapping, Anthropic tool-design recommendations and ARE operation contracts; includes explicit limitations on real LLM results.

When adding a document, take the next unused ID under the right prefix and update this table and the reading order.

## Reading order
**Main path (first reading)**
1. ARE-P01 Architecture: positioning, the value premise and the seven dimensions (why and what)
2. ARE-P02 Interface principles: what agent-facing interfaces look like
3. ARE-R01 Concept distinctions: Tool Calling, MCP, Code Mode, A2A
4. ARE-A01 Implementation checklist: how to work through P0–P8
5. ARE-A02 Maturity model: how to judge the level reached and how far to expose
6. ARE-T00 → T01–T09 Templates: what each stage delivers
7. ARE-R02 Industry landscape: which practices have outside corroboration

Look up ARE-R03 Glossary whenever a term is unclear.

**Shortcuts by role**
| Role | Reading path |
| :--- | :--- |
| Decision maker | ARE-P01 sections “Positioning and boundaries” and “Premise: value first” → ARE-A02 → ARE-T01 Value Card |
| Architect | ARE-P01 → ARE-P02 → ARE-R01 → ARE-R02 → ARE-R03 |
| Implementation team | ARE-A01 → ARE-T00 and T01–T07 → ARE-A02 and ARE-T07 Maturity Assessment |
| Governance / approver | ARE-P01 dimension four → ARE-A01 P4 → ARE-T04 → L3-A checks in ARE-A02 |
| Architect / consultant (portfolio assessment) | ARE-P01 → ARE-A02 → ARE-T00 workspace layout → ARE-T08 → ARE-T01 → ARE-T07 → ARE-T09 |
| Referencing this repository from a project | ARE-A03 |

## Language policy
- **English is canonical**; Chinese is a reading aid and not normative. When they disagree, English wins.
- **One ID, two files, side by side**: `ARE-P01-<slug>.md` (English) and `ARE-P01-<slug>.zh.md` (Chinese). No paragraph-by-paragraph bilingual text in one file (except the ARE-R03 glossary), so agents do not read everything twice and the two languages do not drift within a file.
- **Identifiers are never translated**: document IDs, check IDs, stage and level IDs, dimension codes, field names, tool names and code are identical in both languages.
- **Each Chinese file records the English version it corresponds to** in its header; when the English text is updated and the Chinese is not, the Chinese file is marked “needs update” (待更新).
- **ARE-R03 is the reference for terms**; register new terms there before using them.
- **The MCP entry returns English by default**; when Chinese is requested, it also returns the corresponding English version and whether the Chinese is outdated.
- **Migration status**: complete as of 2026-11-12. All documents and templates have English canonical versions, except ARE-M01 (record only).

## Rules of use
- This directory is “knowledge”. It does not automatically override a project's security policy, product goals or local AGENTS.md / CLAUDE.md.
- Every statement is labeled as verified fact / working hypothesis / design recommendation; model inference must never pose as measurement.
- In a conflict, the project's explicit Owner decisions, authorization boundaries, real production state and latest acceptance results prevail; this repository must never be cited to widen permissions.
- By default, never disclose internal vulnerabilities, private credentials, user data, unreleased code or unfixed defects.
- Versioned with Git. Establish a remote read-only URL before distributing across machines, across Owners or to closed hosts. This directory is currently a local source on a Mac and is **not automatically in effect everywhere**.
- Do not inject whole documents into every agent's system prompt; combine project pointers, on-demand retrieval and limited skill modules.

## Priorities
Real user value > verified security / authorization > execution evidence > minimal, explicit business operations > number of tools / protocol preferences / grand architecture narratives.
