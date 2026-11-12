# Agent-Ready Industry Landscape
> Document ID: ARE-R02
> v0.2 | Status: reference note | Sources retrieved 2026-11-12 | Most sources are vendor blogs and secondary write-ups; primary sources are marked separately
> Purpose: understand how the industry uses the term “Agent-Ready” and which practices have outside corroboration. Not a standard; grants no authorization.
> Language: English (canonical). Chinese reading aid: `ARE-R02-agent-ready-industry-landscape.zh.md`. Terms follow `ARE-R03-glossary.md`.

## Conclusions
- There is **no unified Agent-Ready standard** in the industry. The term has at least three uses: service / API design, code repository readiness, and security and authorization.
- In this repository, Agent-Ready means **services and interfaces** (the first use), while also adopting security practices from the third. The second only shares the name and is out of scope.
- Value judgment (Value Gate) rarely appears as part of Agent-Ready in public sources; including it is a deliberate choice of this repository. See `../principles/ARE-P01-agent-ready-architecture.md`.

## 1. Services / APIs (the same topic as this repository)
| Source | Type | Key points |
| :--- | :--- | :--- |
| Anthropic, “Writing effective tools for agents — with agents” (2025-09) | Primary source | Tools are a contract between deterministic systems and non-deterministic agents; eval-driven iteration; few, focused tools, namespacing, token-efficient responses, error messages that guide correction |
| Cloudflare Code Mode (blog and developer docs) | Primary source | Exposes tools as a TypeScript API; the model writes code that runs in an isolated sandbox; reportedly covers the whole Cloudflare API with a few tools |
| Agent Experience (AX) articles (coined by Netlify; Resend, WorkOS, Speakeasy, Pinecone, Apideck and others) | Vendor blogs | Stable response shapes, explicit types, documented limits, self-correcting errors, human confirmation for high-risk actions |
| Agent-ready API guides (freeCodeCamp, apilayer, Apidog and others) | Vendor / community blogs | Complete OpenAPI, consistent errors, explicit state, idempotency keys, authorization at the boundary; heavy overlap with “good API design” |
| arXiv 2607.12056 (framework for agent-ready websites) | Single paper | Studies websites, not APIs; three dimensions: interpretability, executability, decision reliability; a clear success-rate improvement in its proof of concept, which cannot be generalized to APIs directly |

## 2. Code repositories (same name, out of scope)
- AGENTS.md: an instruction file for coding agents in a repository, reportedly now stewarded by the Agentic AI Foundation under the Linux Foundation.
- Factory Agent Readiness, Larridin and others: grade repositories by dimension and level (tests, CI, documentation, observability and so on).
- What to borrow: the **maturity model** format; this repository's P0–P8 could later be organized into gradable levels.

## 3. Security and authorization (dimensions four and six of the architecture document)
| Source | Type | Key points |
| :--- | :--- | :--- |
| OWASP Top 10 for Agentic Applications (2026 edition, published 2025-12) | Primary source | ASI01–ASI10, including goal hijacking, tool misuse, identity and privilege abuse; the principle of least agency |
| OWASP MCP Security Cheat Sheet | Primary source | Tool annotations are hints, not constraints, and clients should treat them as untrusted; hash full tool definitions to detect changes; enforce authorization on the server; no token passthrough |
| Google AP2 (Agent Payments Protocol) | Protocol (this review relied on secondary sources; the primary source is the official AP2 specification) | A Cart Mandate is signed with the human present; an Intent Mandate signed in advance constrains price, timing and so on, and the agent acts within those limits; transactions indicate that an agent was involved |

## Practices adopted into this repository
| Practice | Source | Location |
| :--- | :--- | :--- |
| Pre-authorization (bounded advance authorization) as another form of claim | AP2 | Architecture document dimension four; checklist P4 |
| Eval-driven tool design, starting from the minimum validation | Anthropic | Architecture document dimension seven; checklist P0 / P5 |
| Versioning and hashing tool definitions so changes are visible | OWASP MCP Cheat Sheet | Architecture document dimension five; checklist P6 |
| Explicit scope: services and interfaces, not code repositories | Comparison with repository readiness sources | Opening of the architecture document; checklist scope |

## Judgments (working hypotheses, not validated)
- Agent-Ready Engineering is likely to become a **standard engineering stage** of enterprise AI transformation and be absorbed into existing API governance, platform engineering and security review; but transformation still starts from business value.
- The parts most likely to harden into standards first are authorization, confirmation and audit (under external pressure from security, compliance and payments); ingress protocols and context strategies change quickly and should not be fixed too early.

## Source links
- https://anthropic.com/engineering/writing-tools-for-agents
- https://blog.cloudflare.com/code-mode/
- https://developers.cloudflare.com/agents/api-reference/codemode
- https://cheatsheetseries.owasp.org/cheatsheets/MCP%5FSecurity%5FCheat%5FSheet.html
- https://www.speakeasy.com/blog/owasp-agentic-top-10-explained
- https://vellum.ai/blog/googles-ap2-a-new-protocol-for-ai-agent-payments
- https://www.descope.com/learn/post/ap2
- https://www.freecodecamp.org/news/how-to-design-apis-for-ai-agents/
- https://blog.apilayer.com/ai-agents-are-the-new-users-of-your-api-how-to-make-your-api-agent-ready/
- https://resend.com/blog/agent-experience
- https://speakeasy.com/blog/agent-experience-introduction
- https://www.pinecone.io/blog/designing-agent-friendly-apis/
- https://radar.apideck.com/blog/api-design-principles-agentic-era
- https://arxiv.org/pdf/2607.12056
- https://docs.factory.ai/web/agent-readiness/overview
- https://www.harness.io/blog/the-agent-native-repo-why-agents-md-is-the-new-standard

## Change log
- **v0.2 (2026-11-12)**: first English canonical version, translated from the Chinese reference note of 2026-11-12. No change in content. The Chinese text becomes the reading aid `ARE-R02-agent-ready-industry-landscape.zh.md`.
