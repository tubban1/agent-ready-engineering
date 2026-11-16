# ARE Self Evaluate — Copy-paste prompt for MCP maintainers
> v1.0 | 2026-11-16 | English canonical

**Status:** Developer self-assessment; not an ARE independent audit, MCP certification, or security approval. You are responsible for granting a safe scope. See the [Chinese version](SELF_EVALUATE_MCP.zh.md).

## Copy this prompt into your real Agent host

> I own or am authorized to assess the MCP at `<HTTPS_ENDPOINT>`, whose source is `<REPOSITORY_URL>@<COMMIT_SHA>`. My permitted test boundary is `<SANDBOX_OR_PUBLIC_READ_ONLY_SCOPE>`. A representative user goal and independent success oracle are `<USER_GOAL_AND_ORACLE>`.
>
> Use **Agent-Ready Engineering (ARE)** at `https://are.fde.fan/mcp` and its published 39 scenario checks. Perform a **developer self-evaluation** with evidence and no claim of ARE endorsement.
>
> 1. Pin the server protocol/version, source SHA, observed deployment version, test time, agent/model and authorization boundary; do not infer that an open repository is the deployed build.
> 2. Exhaust all pages of `tools/list` and applicable resources/prompts. Validate the contract of **every tool**: names, required fields, input schema, optional output schema, error semantics, descriptions, effect annotations and access controls. Distinguish **100% metadata coverage** from actual execution coverage.
> 3. Execute publicly documented, unambiguously low-risk read tools when allowed and budgeted. Never trust `readOnlyHint` alone. Writes, deletes, payments, email, account changes and fault injection require an isolated owner-controlled test tenant plus explicit authorization; otherwise mark NOT_TESTED with a reason.
> 4. Inspect server source and existing tests for handlers, authorization, retries, idempotency, state, errors, latency, logs and releases. Cite `repo@SHA:path:lines`. Label deployment-source matching VERIFIED or UNKNOWN.
> 5. Have an **actual model-based Agent** choose and invoke tools for at least one genuine multi-step user task. Store the trace and independently verify the final result using an observable oracle. An SDK test script or the Agent's own "done" statement is not a business oracle.
> 6. Record all **39 ARE checks** for a defined task scenario as PASS, FAIL, NOT_APPLICABLE (with scope justification), or NOT_VERIFIED. Strict L0–L4 evidence gates apply; if unmet, say MATURITY_NOT_ESTABLISHED. Report applicable official MCP version requirements separately from ARE design recommendations.
> 7. Produce a bounded developer report, per-tool matrix, protocol/Agent results, reproducible evidence and a privacy-reviewed evidence hash manifest. Declare the result **Self-assessed / Not independently verified by ARE**.
>
> Do **not** modify deployed code, issue promotional GitHub posts, email third parties, or request/use private account credentials without separate authorization. Finish by identifying verified strengths, the top three actionable fixes, measured coverage, and all remaining gaps.

For a retest after changes use [Maintainer Retest](MAINTAINER_RETEST_MCP.md); for a public outside review use [Independent Evaluation](INDEPENDENT_MCP_EVALUATION.md).
