# Maturity Assessment
> Document ID: ARE-T07
> Template v0.4 | One per scenario per assessment | Copy into the project directory before filling in
> The full definition of each check is in `../ARE-A02-agent-ready-maturity-model.md`; this form lists only IDs and short names.
> Language: English (canonical). Chinese reading aid: `ARE-T07-maturity-assessment.zh.md`.

## Basic information
| Item | Content |
| :--- | :--- |
| Scenario name | <same as the value card> |
| Value card | <path and version> |
| Assessment date | <YYYY-MM-DD> |
| Assessor / reviewer | <> |
| Version assessed | <core version, tool definition version or hash> |
| Previous assessment | <date and level; “none” for the first> |
| Passes by evidence type | <inspected n / documented n> |
| Currently exposed to agents | <none / read-only / write> |

## How to fill in
- Result is one of: ✅ pass / ❌ fail / ➖ not applicable.
- A pass needs an evidence location; not applicable needs a reason.
- Evidence type for a pass: `inspected` (examined or run directly by the assessor) or `documented` (artifact provided by the team). `self-reported` never passes. Inspection is recommended for L3-C1, L3-C2, L3-A2, L3-O2.
- Reaching level N = everything from L1 to LN is ✅ or ➖.

## L1 Value Defined
| ID | Short name | Result | Evidence type | Evidence location / reason for N/A |
| :--- | :--- | :--- | :--- | :--- |
| L1-V1 | Value card, decision Go / read-only first | | | |
| L1-V2 | Baselines sourced or planned for measurement | | | |
| L1-V3 | Minimum validation record | | | |
| L1-V4 | Capability matrix and first batch | | | |
| L1-A1 | First-batch operations have Owner / approver / responsible | | | |
| L1-C1 | Catch-all executors identified with split plan | | | |

## L2 Read-Ready
| ID | Short name | Result | Evidence type | Evidence location / reason for N/A |
| :--- | :--- | :--- | :--- | :--- |
| L2-C1 | Strongly typed schemas for reads | | | |
| L2-C2 | Structured errors | | | |
| L2-X1 | Field projection, server-side filtering, cursor pagination | | | |
| L2-X2 | Response limit and truncation flag | | | |
| L2-X3 | Progressive discovery | | | |
| L2-X4 | Measured response size of read-only tools | | | |
| L2-A1 | Separate agent identity, read-only delegated credentials | | | |
| L2-A2 | External content labeled with source and trust level | | | |
| L2-I1 | No business logic in ingress, correct read-only annotations | | | |
| L2-O1 | Audit records for read-only calls | | | |
| L2-O2 | Real-agent eval of the read-only part | | | |

## L3 Write-Safe
| ID | Short name | Result | Evidence type | Evidence location / reason for N/A |
| :--- | :--- | :--- | :--- | :--- |
| L3-C1 | Idempotency keys | | | |
| L3-C2 | Conditional writes and conflict response | | | |
| L3-C3 | validate / dry-run | | | |
| L3-C4 | All write operation contract acceptance records pass | | | |
| L3-S1 | Long-running task status, cancel, recovery after disconnect | | | |
| L3-S2 | Draft expiry, isolation, cleanup | | | |
| L3-S3 | Undo / compensation or marked irreversible | | | |
| L3-S4 | `needs_input` | | | |
| L3-A1 | Authorization matrix approved by governance | | | |
| L3-A2 | Final operations via claim or pre-authorization; self-reported confirmation rejected | | | |
| L3-A3 | Credentials kept out of model context and sandbox | | | |
| L3-A4 | Limits and kill switch | | | |
| L3-O1 | Audit records include authorization evidence | | | |
| L3-O2 | All fault-injection evals pass | | | |

## L4 Verified Operations
| ID | Short name | Result | Evidence type | Evidence location / reason for N/A |
| :--- | :--- | :--- | :--- | :--- |
| L4-O1 | End-to-end correlation ID | | | |
| L4-O2 | Evals as release gate | | | |
| L4-I1 | Tool definitions versioned and hashed / signed | | | |
| L4-I2 | Consistent results across ingress paths | | | |
| L4-R1 | Environment isolation, rollout, rollback | | | |
| L4-R2 | Value review written back to the value card | | | |
| L4-R3 | Low-value capabilities shrunk / retired or kept with reasons | | | |
| L4-R4 | Usage guide for agents | | | |

## Dimension summary
For each dimension, enter the highest level at which all its checks pass.

| Dimension | V Value | C Contract | S State and Recovery | A Authority and Trust | X Context Economy | I Ingress | O Observability and Evals | R Run and Review |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Level reached | | | | | | | | |

## Conclusion
- **Current level**: <L0 / L1 / L2 / L3 / L4>
- **Allowed action**: <do not expose / start re-engineering / expose read-only / expose writes / scale up>
- **Consistent with what is actually exposed today**: <e.g. writes are exposed but only L2 is reached → inconsistent, fix immediately>
- **Target level and date**: <>

## Gaps and next steps
| Failed check | Planned action | Responsible | Due date |
| :--- | :--- | :--- | :--- |
| <> | | | |
