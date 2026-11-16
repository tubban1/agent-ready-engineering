# An MCP can pass its protocol checks and still leave Agent engineering questions unanswered

We evaluated a public, read-only space-weather MCP, Solarstorm, through an evidence-first Agent-Ready Engineering (ARE) workflow. We did not ask the maintainer for privileged access; the test scope was deliberately small.

## What was actually tested

The MCP returned four public tools. We inspected the contract of every tool and successfully exercised all four in bounded read-only calls. An MCP-2026 bounded probe passed nine checks without a failure; one check was unknown and another not applicable. These results are not an official or exhaustive protocol certification.

We also ran **one real Claude Code Sonnet Agent task** that independently chose and called all four tools to answer a time-sensitive question about Kp, forecasts, GOES flare activity and aurora likelihood at 48.2 degrees latitude. NOAA SWPC provided a separate public reference. This is evidence of one completed task, not a statistical failure rate.

The public repository snapshot passed 55 offline and nine live NOAA tests. However, the snapshot declares version 1.0.3 while the live service advertised 1.0.0; we could not prove the repository snapshot was the deployed source.

## The data matters more than the headline

The 39 ARE engineering checks yielded **4 PASS, 2 FAIL against ARE guidance, 10 N/A and 23 NOT_VERIFIED**. Thus we did not assign a maturity level.

The two ARE design findings concerned typed output contracts and error signaling. In one test, a latitude out of range yielded an error message with isError=false; omission of the required latitude returned isError=true. That inconsistency may affect Agent recovery and is worth discussing with the maintainer. It is **not** an official MCP MUST violation or a security issue.

Of three NOAA cross-checks, two matched at capture. The third compared instantaneous GOES flux recorded at different times and differed, even though the 24-hour peak flare class agreed. We preserve this nonmatch in the dataset, not flatten it to a promotional claim.

## What is reusable?

- Public ARE case: https://github.com/tubban1/agent-ready-engineering/blob/main/docs/cases/solarstorm-2026-11-16.md
- Public read-only replay prompt: https://github.com/tubban1/agent-ready-engineering/blob/main/docs/cases/solarstorm-public-replay-2026-11-16.md
- ARE interactive evidence explorer: https://are.world2.co/evidence/solarstorm/
- Dataset: https://are.world2.co/datasets/solarstorm-20261116/
- ARE MCP: https://are.world2.co/mcp

The explorer is a **client-side evidence viewer**, not a live third-party MCP testing backend. For online quick preflight, the ARE Benchmark service remains a separate tool.

## Question to the community

For an open-source MCP whose public source revision cannot be linked to the running build, what minimum evidence would you require before claiming a production defect? And should a one-run, independent-oracle Agent task be a baseline for serious MCP evaluation, or merely one part of it?

ARE is a World2-managed first-party project and is not affiliated with Solarstorm. We contacted the public maintainer privately, welcome corrections, and will only publish a fix/retest comparison after verifying a real new deployment. We are interested in engineering feedback rather than stars, scores or unverified certification.
