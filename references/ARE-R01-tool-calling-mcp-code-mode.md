# Tool Calling / MCP / Code Mode / A2A — Engineering Distinctions
> Document ID: ARE-R01
> v0.2 | 2026-11-12 | Status: reference note
> Language: English (canonical). Chinese reading aid: `ARE-R01-tool-calling-mcp-code-mode.zh.md`. Terms follow `ARE-R03-glossary.md`.

## Concept positioning and division of labor

Protocols, tools and systems at different layers solve the core problems of different stages:

| Concept | Problem it solves |
| :--- | :--- |
| **Agent-ready API** | How a business service itself is designed so autonomous software can use it reliably and safely |
| **MCP** | How different agent hosts discover and call these external capabilities and data resources in a standard way |
| **Tool Calling** | How a large language model expresses, internally, the intent and arguments to call a specific tool |
| **OWL LAB** | How agents execute tasks continuously, reliably and with authorization in a controlled environment |
| **World2** | How agents of different trust principals discover each other and exchange information and collaborate safely |
| **A2A** | How independent agents delegate tasks and exchange final results in a standard way |
| **Code Mode** | How an agent combines calls to complex APIs by generating constrained code, reducing round trips |

---

## Tool Calling
The model tells the host its intent to “call a tool + arguments”. The model itself does not execute third-party APIs. The host receives the model's output, decides whether to approve / execute, and returns the result to the model.
Typical: the model emits `cancel_order({order_id:"1234"})`; the application writes its own HTTP/API bridge and authorization logic.

## MCP
Standardizes the connection between hosts and external tool / resource services. An MCP client discovers definitions via `tools/list` and asks the MCP server to execute via `tools/call`; the server returns the result. The model still selects MCP tools through its internal Tool Calling. MCP **does not automatically provide** identity, correct authorization, proof of success or real business capability.
Typical: different model hosts use the same `https://orders.example.com/mcp` without each host writing its own order-tool adapter.
Note: the July 2026 MCP specification strengthened stateless requests, multi-round exchanges, caching and authorization, showing that the protocol itself is adapting to enterprise scenarios more complex than simple tool calls. Native model Tool Calling stays internal; MCP becomes a reusable external capability interface.

## Code Mode
The model first looks up the types / schemas of available APIs, then **the model / agent generates** constrained execution code (such as a JavaScript async arrow function) and passes it to `execute(code)`. The server provides an isolated runtime and a controlled API proxy, supplies helper runtime code, and strictly limits credentials and egress; by default the server does not have another model generate the business plan.
One Code Mode execution can combine several APIs, filter intermediate results, branch and loop. Write operations still require every sub-operation to be verified for identity / Owner authorization / idempotency / policy.
Cloudflare example: `search` searches the OpenAPI spec, `execute` runs model code and reaches the Cloudflare API via `cloudflare.request()`, `docs` retrieves help; there is also `whoami`. Its source also supports a fine-grained native tool surface with `?codemode=false`.
Important: Cloudflare appearing in a plugin package in an OpenAI code repository does not prove that general Code Mode has passed exactly the same public scan World2 encountered. Do not claim an exemption.

## A2A
An interoperability protocol for capability / task collaboration and message and result exchange between agents. It sits on a different layer from MCP's tool / resource connections; the two are complementary, not mutually exclusive. A2A itself explicitly treats MCP as complementary: MCP handles the vertical connection from host to capability tools, A2A handles horizontal collaboration between independent agents.

## Do not confuse
- Tool Calling ≠ MCP. MCP can become the standard ingress layer while Tool Calling continues inside the model / host.
- Few tools ≠ simple permissions. Every business sub-operation must be checked for risk and backend authorization.
- Code Mode ≠ arbitrary permissions, arbitrary network access or direct database access.
- Tool success / HTTP 200 ≠ business completion / external fulfillment.
- Number of APIs ≠ scenario value usable by agents.

## Change log
- **v0.2 (2026-11-12)**: first English canonical version, translated from the Chinese reference note of 2026-11-11. No change in content. The Chinese text becomes the reading aid `ARE-R01-tool-calling-mcp-code-mode.zh.md`.
