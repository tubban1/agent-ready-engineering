# ARE Independent Third-Party MCP Evaluation — Public review prompt
> v1.0 | 2026-11-16 | English canonical

**Status:** Public community research, **not** ARE-issued certification or project-owner permission to write. See [Chinese](INDEPENDENT_MCP_EVALUATION.zh.md).

## Copy this prompt

> Evaluate the public HTTPS MCP endpoint `<PUBLIC_MCP_URL>` independently using ARE's latest public methodology `https://are.world2.co/mcp`. Optional public source: `<GITHUB_REPO>`. I have **no claim of owner authorization** for sensitive operations.
>
> 1. Respect published access policies and rate limits. Never bypass auth, captcha, membership, tenant boundaries or server scopes. No financial, messaging, destructive, device-control or personal-data tool calls.
> 2. Negotiate the server's **actual advertised** MCP protocol versions and exhaust all applicable list pagination. Inspect all tool definitions, descriptions, schemas and annotations; don't assume an annotation proves an operation is safe.
> 3. With a reasonable request budget, call only public, clearly read-only tools with innocuous arguments, and optionally a harmless validation negative. Record transport results and actual response semantics. Mark other tool execution NOT_TESTED, with scope reasons.
> 4. If source exists, pin the SHA and inspect handler code/testing; classify deployed source identity BOUND/UNBOUND rather than conflating code and live behavior.
> 5. If a genuine model-based Agent host is available, pre-register a non-state-changing user task and verify its result against independent **public** truth. Distinguish actual Agent/tool calls from direct SDK scripts. Otherwise report Agent assessment NOT_VERIFIED.
> 6. Complete the per-scenario 39-item ARE evidence table with PASS/FAIL/N/A/NOT_VERIFIED and explain limits. Do not issue an unsupported L0–L4 grade or claim official MCP certification.
> 7. Publish a privacy-safe technical review: reproducible positives, precise observed problems, optional improvement ideas, source links, time/version, and unknowns. Sensitive vulnerabilities follow private disclosure. **Do not automatically post issues, contact maintainers or submit claims of endorsement.**
>
> Label output **Community independent review / Not an ARE-issued certification**. The purpose is to improve reproducibility, not rank vendors based on partial access.

Use [Self Evaluate](SELF_EVALUATE_MCP.md) for owner-controlled testing and [Maintainer Retest](MAINTAINER_RETEST_MCP.md) after a fix.
