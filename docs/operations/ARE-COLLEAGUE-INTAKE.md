# ARE Colleague Private Assessment → Neon → Owner Outreach

**Status:** working internal pilot, 20 November 2026. This is not certification or permission to publish new third-party reviews.

## Preferred workflow: ARE Task Center (2026-11-20)

For new assignments use [ARE Task Center](https://are.world2.co/tasks/) instead of provisioning general colleague reviewer tokens or requiring the Python CLI. Each assignment issues a revocable, expiring, repository-scoped Token that the colleague may paste into their own Agent prompt; `are_get_task`, `are_get_criteria`, `are_submit_assessment`, and `are_get_submission` call this same private Neon intake directly through the existing ARE MCP endpoint. The original CLI and owner inbox below remain compatible. Details: [ARE-TASK-CENTER.md](ARE-TASK-CENTER.md).

## Goal

An independent coworker/Agent can select an existing public open-source World2/ARE catalog project, collect evidence, calculate all 32 product-side pilot findings, and **submit directly into private Neon tables**. The owner sees an authenticated outreach queue and drafts an email; no manual JSON import or per-PR approval. Owner approval in chat is still required for the **first public release** of a new independent third-party evaluation.

Endpoints:

- Public project directory (discovery only): https://are.world2.co/evaluations/#projects
- ARE read-only knowledge MCP: https://are.world2.co/mcp
- Private submission API: https://br-raspy-hat-b96bluqn-areintake.compute.c-7.eu-central-1.aws.neon.tech/v1/submit
- Private owner queue (authenticated browser): https://br-raspy-hat-b96bluqn-areintake.compute.c-7.eu-central-1.aws.neon.tech/v1/owner
- GitHub source: https://github.com/tubban1/agent-ready-engineering

No username/password or review API token is accepted via an ARE knowledge tool call; share tokens with colleagues using a secure private channel (not chat prompts, code, GitHub, or URLs). For this pilot the Mac owner-machine credential file is `~/.config/are-private-intake/credentials.v1.json`, mode 0600, outside the repo. Its reviewer token is scoped to `colleague-pilot`; the owner token is distinct. **Never give a colleague the owner token.** Future colleagues need individual tokens before access expands beyond the pilot.

## Colleague procedure

1. Pick a real candidate from the ARE/World2 public project directory. The current private admission gate accepts repository keys in `are_eval.benchmark_study_candidates` (100-project cohort `ARE100-VALUE-20261115`). Check its GitHub repository exists and is genuinely open source; a World2 registry association alone is *not* verified.
2. Pin the GitHub commit SHA, inspect license and source version. Discover the actual MCP Endpoint if publicly available; **do not invent a deployment URL**. Ask permission before unsafe, authenticated, third-party write, high-volume or destructive calls. Compare the observed live MCP tool names to the versioned GitHub source; record whether the binding is documented or established. Do not equate a README declaration with cryptographic deployment proof.
3. Connect the ARE knowledge endpoint in the colleague's real ChatGPT/Claude host for the methodology, or use the source checkout's independent evaluation guide. Collect native transport/protocol traces, source refs, authorization, real model-based Agent task, and independent outcome oracle if possible.
4. From a checkout of the ARE project run the assessor workflow (example only; pin the **actual** source SHA, not placeholder):

```sh
python3 scripts/are_evaluator_workflows.py init \
  --mode ARE_INDEPENDENT --track product \
  --target janijegoroff/agent-connectors-mcp \
  --version 'live:2025-11-25/server:0.1.0' \
  --source-revision cfac1539bdc273c5169e44528ac1b11ef4eb3823 \
  --endpoint https://agentconnectors.dev/mcp \
  --owner-organization janijegoroff \
  --assessor colleague-pilot --assessor-organization 'ARE Research' \
  --output /tmp/are-review-input.json
# Populate 55-pilot-protocol facts/observations with actual, independently gathered evidence.
python3 scripts/are_evaluator_workflows.py evaluate \
  --input /tmp/are-review-input.json --output /tmp/are-review-result.json
```

5. Add a sanitized task JSON list of actual Agent runs, e.g. `[{"goal":"...","agent":"...","trace_ref":"...","oracle_ref":"...","status":"PASS","authorized":true,"oracle_verified":true}]`. **Never fabricate an oracle or evidence**; if no task is authorized, use an empty list. Optional `--source-binding` must point to an inspected repository-to-service trace, never a mere guess.
6. Build a private submission package (not committed), then submit via the scoped credential in an environment variable:

```sh
python3 scripts/are_colleague_client.py pack \
  --result /tmp/are-review-result.json \
  --repository janijegoroff/agent-connectors-mcp \
  --tasks /tmp/are-agent-tasks.json \
  --summary 'Actual observed strengths, unknowns and scope' \
  --recommendation 'One specific evidenced improvement' \
  --output /tmp/are-package.json

# The following variable is provisioned securely by the ARE owner/administrator.
export ARE_INTAKE_TOKEN='(read from private credential manager)'
python3 scripts/are_colleague_client.py submit \
  --reviewer colleague-pilot --package /tmp/are-package.json
unset ARE_INTAKE_TOKEN
```

A successful response contains a UUID, private `stage`, and idempotency SHA256. A byte-equivalent evidence package submitted again resolves to its original row, not a second report. New evidence creates an append-only new run. Source SHA must genuinely exist at the specified GitHub repository. The source-only path with no HTTPS endpoint is valid but remains `NEEDS_EVIDENCE` until authorized runtime evidence exists.

## What is required for owner outreach

Private rows have **exactly 32** product criteria with one of PASS / FAIL / UNKNOWN / NOT_TESTED / NOT_APPLICABLE / BLOCKED_AUTH / ADVISORY_ONLY / NOT_ASSESSED. The server never invents an L0–L4 grade and never writes to the public portfolio table.

`READY_FOR_OUTREACH` currently means:

- 32 checks formally accounted for and tied to the same source SHA;
- at least one evidence-backed decisive finding, not a self-reported status;
- at least one safe authorized Agent task with an independently checked outcome;
- an assessor-declared source-to-service association and trace reference.

It **does not** attest reviewer identity beyond possession of the reviewer token, guarantee deployed binary identity, independently verify every maturity criterion, or confirm the maintainer email address. Source URLs, evidence limitations and unresolved checks stay visible in the owner's private details. If any element is missing, the result stays `NEEDS_EVIDENCE` and should go back to the colleague rather than becoming an unsupported public claim.

### Owner workflow

1. Open the private owner URL above and paste **only the owner token** from the local credential manager. The page holds it in memory only; no localStorage, cookie or query-string token.
2. Review the `READY_FOR_OUTREACH` card. Copy the neutral private technical email draft; independently verify the recipient's **public** contact email (README, official site, or consented business contact) before sending. The portal does **not** send email, infer addresses or publish results.
3. After actually sending via Gmail, click **已发送邮件** (append-only `CONTACTED` event); later `REPLY_RECEIVED`, `NEEDS_RETEST` or `ARCHIVED` actions can be entered with the CLI.
4. The owner can also use `ARE_INTAKE_OWNER_TOKEN` + `python3 scripts/are_colleague_client.py inbox` to query the same private queue.

## November 20 pilot (3 real MIT projects)

| Project | Version-pinned source | Live observations | Independent Agent task oracle | Private intake stage |
| --- | --- | --- | --- | --- |
| `janijegoroff/agent-connectors-mcp` | `cfac1539bdc273c5169e44528ac1b11ef4eb3823` | MCP `2025-11-25`, 3 tools, read-only category lookup | Independent HTTP JSON catalog recount: 531 entries across 17 categories; all category counts matched | `READY_FOR_OUTREACH` (2/32 supported, rest unknown or not tested) |
| `cooyun/etuki-gate` | `651a851cd741227784a4c1f5a898f44dda3d2d7f` | MCP `2024-11-05`, 9 tools/2 resources, live model catalog call; World2 older 4-tool snapshot differs | Vendor price/version outcomes not independently established | `NEEDS_EVIDENCE` (1/32 supported) |
| `trondbjoroy/norway-location-transport-mcp` | `f1b7c493f1f1e981c60e6957e254d17cfb429e57` | README describes 21 tools; no public deployment URL supplied | No authorized runtime tool call or external Oracle | `NEEDS_EVIDENCE` (0/32 decisive) |

All evidence packages are stored in private Neon `are_eval.private_evaluation_runs`, **not** `are_eval.assessments`. The private table has no PUBLIC grants; owner reviews and contact statuses are in a separate append-only `are_eval.private_outreach_events`. Only a first new public independent report needs explicit owner permission, and this pipeline contains **no publication action**.

## Operator verification

- `node --test functions/are-intake/index.test.mjs` checks authorization, forged criteria, idempotent canonical digest, version binding, source verification and owner contact-event restrictions.
- `python3 -m unittest discover -s scripts -p 'test_are_evaluator_workflows.py'` verifies evaluator modes and provenance.
- `node scripts/are_release_gate.mjs` must remain PASS; no public ARE case documents or websites change as part of this intake.
- HTTPS `GET /v1/health` returns service identity, no findings; unauthenticated `GET /v1/inbox` returns HTTP 401.
- Neon SELECT is the authoritative proof of actual storage. Don't infer insertion from GitHub merges or copied CLI output.
