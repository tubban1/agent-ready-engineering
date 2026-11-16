# Reddit native technical discussion — proposed community r/AI_Agents

**NOT POSTED.** Check the live subreddit rules, account history and promotional-post limits first.
This body deliberately contains no self-promotional links. If community rules require project sharing
only in the weekly showcase thread, use that instead or don't publish.

Title:
What counts as real proof that an MCP server works for an AI Agent, beyond tools/list?

Body:
I've been testing publicly accessible, read-only MCP servers and ran into a recurring evaluation problem: protocol discovery and tool schema validation are necessary, but they don't show whether a model can reliably complete a user task.

In one recent space-weather example, all four public tools could actually be called, and nine bounded modern-MCP protocol checks passed. We also let a real coding Agent choose its tools for one user question, then checked the results against NOAA rather than trusting the model's own success statement.

There were some nuances: one instantaneous upstream value differed because capture times were not identical. One domain-validation error came back as a normal MCP result flag instead of isError=true. Those observations may matter for Agent recoverability, but neither establishes a security issue or proves an official MCP MUST violation.

Of 39 broader engineering checks, 23 could not be verified externally because we didn't have maintainer-side source/deployment provenance or operational/governance evidence. We chose not to award a maturity grade.

I'd really like feedback on three practical questions:

1. What is the minimum *independent* task oracle you would require before saying a public MCP actually works for Agents?
2. How much repeat testing across models/clients is enough to distinguish a transient tail-latency event from a persistent defect?
3. How should a third-party evaluator label source-level issues if the public Git SHA cannot be tied to the running production deployment?

I'm affiliated with ARE / World2, which is studying this process; I'm not affiliated with the MCP operator. This post is intended to discuss test methodology, not to promote an assessment score.

No sales link in the post. Under r/AI_Agents' current published rules, project links belong in comments or a weekly showcase, and repetitive promotion is prohibited. Do not post this if the signed-in Reddit identity lacks an appropriate history or the latest rules disallow it.

Optional technical link for moderator-approved context, separately:
https://github.com/tubban1/agent-ready-engineering/blob/main/docs/cases/solarstorm-2026-11-16.md
