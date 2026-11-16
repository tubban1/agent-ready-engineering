# ARE Maintainer Retest — Fix verification prompt

**Status:** Operator-managed pre/post regression testing, **not** ARE independent sign-off. See [Chinese](MAINTAINER_RETEST_MCP.zh.md).

## Copy this prompt

> I am the authorized maintainer of `<SERVICE>`. ARE's original report is `<PUBLIC_REPORT_OR_PRIVATE_ATTACHMENT>`. Baseline source/deployment is `<BEFORE_SHA_OR_VERSION>`; proposed fix is `<AFTER_SHA_OR_VERSION>`. Authorized isolated test boundary: `<SANDBOX_AND_ALLOWED_ACTIONS>`.
>
> Treat the report as a list of evidence-scoped observations. Separate a **reproducible defect** from a performance outlier, a non-mandatory engineering recommendation, deployment/source uncertainty and a NOT_VERIFIED check.
>
> For each reproducible finding, pin its original request, environment and independent expected outcome; reproduce safely on the baseline where possible; test the fixed candidate using equivalent inputs and the same oracle. Capture actual MCP response envelopes (`isError` as applicable), failure boundaries, source references and current server version. Run relevant successful operations, negative inputs, authorization checks and backward-compatibility regression. Test state-changing behavior only with separately authorized synthetic objects in an isolated tenant.
>
> Have a real Agent reproduce affected business tasks if the original assessment did, and verify the final external state independently. Do not use a model's declaration of success as evidence.
>
> Update the affected subset of ARE's 39 check states **only with new evidence**. Keep UNKNOWN/N/A reasons and the original immutable assessment intact. Label each remediation VERIFIED, NOT_REPRODUCED, STILL_FAILS, or NOT_TESTED.
>
> Deliver `before_after.md`, exact reproduction, regression results and a redacted evidence manifest. Do not silently weaken tests or alter production, share secrets, publish exploit details or send messages unless specifically authorized. Respond to ARE with the exact new version and safe evidence; ARE must run its own follow-up verification before public closure.

[Original methodology and distribution SOP](../standards/ARE-EVALUATION-PUBLICATION-SOP-v1.md).
