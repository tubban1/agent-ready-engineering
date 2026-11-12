# Authorization Matrix — P4
> Document ID: ARE-T04
> Template v0.2 | One per project | Copy into the project directory before filling in | Hand to governance when complete
> Language: English (canonical). Chinese reading aid: `ARE-T04-authorization-matrix.zh.md`.

## Basic information
| Item | Content |
| :--- | :--- |
| Project / system | <> |
| Matrix version / date | <v1 / YYYY-MM-DD> |
| Related capability matrix | <path> |
| Approver (governance) | <> |

## Authorization levels
| Level | Meaning | Applies to |
| :--- | :--- | :--- |
| A Automatic | The agent may execute directly; an audit record is kept | Reads, validation, drafts |
| B Confirmation | Requires a trusted human channel: a per-action claim, or execution within a valid pre-authorization | Internal final writes, spending within limits |
| C Human only | The agent may only prepare a draft; a human must execute | Irreversible, high-value or legally binding external operations |

## Forms of confirmation
| Form | Description | Evidence |
| :--- | :--- | :--- |
| Claim (per-action confirmation) | A human confirms a specific draft on a web page, by QR scan or by signature | Claim record ID |
| Pre-authorization | A human signs a bounded authorization in advance (amount limit, counterparties, time window, number of uses); the agent acts only within those limits | Pre-authorization ID + record of each use |

> The server never accepts confirmation fields self-reported by the agent (such as `owner_confirmed: true`).

## Matrix
| Operation | Risk level | Authorization level | Form of confirmation | Confirmation channel | Amount / frequency limits | Credential scope and validity | Audit evidence fields | Revocation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| <example: search_orders> | low | A | — | — | <query quota> | <read-only, short-lived> | principal, agent, query conditions | revoke the agent credential |
| <example: confirm_order_change> | high | B | claim | <web confirmation link> | <per-action and daily limits> | <order changes only, short-lived> | principal, agent, draft ID, revision, claim ID | revoke the agent credential / void the draft |
| <> | | | | | | | | |

## Pre-authorization template (if used)
| Item | Content |
| :--- | :--- |
| Authorized by | <> |
| Allowed operations | <> |
| Limits | <amount limit / counterparties / time window / number of uses> |
| Validity | <> |
| Verification | <how the server verifies the signature or record> |
| Revocation | <> |

## Credentials and boundaries
- **Agent identity**: <how agent credentials are issued and kept distinct from human identities>
- **Do credentials enter the model context / Code Mode sandbox**: <must be “no”; state which proxy signs or forwards on their behalf>
- **Kill switch**: <how a given agent is disabled, and who is responsible>

## Untrusted content boundary
| Input source | Trust level | Handling |
| :--- | :--- | :--- |
| User-uploaded files | untrusted | returned as data with source labeled, never treated as instructions |
| Web pages / third-party responses | untrusted | same as above |
| Messages from other agents | untrusted | same as above |
| The system's own structured fields | trusted | — |

## Acceptance record
| Check | Result | Evidence location |
| :--- | :--- | :--- |
| In a simulated Prompt Injection, the impact stays within the draft layer or pre-authorization limits | | |
| Every final operation can be traced to human authorization evidence | | |
| After an agent or pre-authorization is revoked, subsequent requests are rejected immediately | | |
