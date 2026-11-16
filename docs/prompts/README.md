# ARE prompts — English canonical, channel-specific evaluation and self/retest flows

**English is the canonical public language.** These are **three role-specific** evaluation prompts, plus four **channel-specific** communication prompts. Chinese is provided where useful for local audiences, not as a competing canonical specification. None confers official certification.

| Use case | English | 中文 |
|---|---|---|
| You maintain the MCP, want an owner-controlled self-assessment | [Self Evaluate](SELF_EVALUATE_MCP.md) | [开发者自评](SELF_EVALUATE_MCP.zh.md) |
| You received an ARE report, fixed something and want a comparable retest | [Maintainer Retest](MAINTAINER_RETEST_MCP.md) | [维护者复测](MAINTAINER_RETEST_MCP.zh.md) |
| You are an outside reader with only a public endpoint and possibly public source | [Independent Evaluation](INDEPENDENT_MCP_EVALUATION.md) | [第三方评估](INDEPENDENT_MCP_EVALUATION.zh.md) |

## Channel-specific prompts (English)

- **Future ARE website general prompt:** [Website General Evaluation](channels/WEBSITE_GENERAL_EVALUATION.md) — generic visitor intent with explicit public/owner scope; planned `are.world2.co/mcp`.
- **Verified maintainer email:** [Project-specific Maintainer Email Retest](channels/MAINTAINER_EMAIL_RETEST.md) — fill with the exact report/finding/evidence before sending.
- **Third-party GitHub Issue:** [Single-Issue Reproduction](channels/GITHUB_ISSUE_REPRODUCTION.md) — narrow, reproducible and not promotional.
- **X / HF / Reddit / ModelScope / video:** [Public Project Review](channels/PUBLIC_PROJECT_REVIEW.md) — **optional** read-only replay prompt bound to the tested project, with different formats per platform.

**Current ARE MCP:** `https://are.fde.fan/mcp`. **Planned World2-managed canonical MCP:** `https://are.world2.co/mcp`, **not live yet** as of 2026-11-16. Connect an Agent to the *actually working* endpoint, select your authorization scope and paste the relevant prompt with filled endpoint/source/goal placeholders. The public ARE MCP offers methodology; an Agent must still actually obtain lawful tool or source access and independently validate evidence.

Never use a public third-party prompt as authorization to write, pay, message, delete, bypass authentication or run high-volume tests. Reports must distinguish full contract inspection, lawful actual tool coverage, independent Agent business outcomes, and source-to-deployment identity.

The publication & feedback workflow is at [ARE SOP](../standards/ARE-EVALUATION-PUBLICATION-SOP-v1.md).
