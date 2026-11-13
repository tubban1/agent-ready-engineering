# Maturity Assessment
> Document ID: ARE-T07
> Fictional sample for tests. Example Manufacturing Co. does not exist.

## Basic information
| Item | Content |
| :--- | :--- |
| Scenario name | Supplier delivery-date changes |
| Value card | ARE-T01-value-card.md v1 |
| Assessment date | 2026-11-10 |
| Assessor / reviewer | Sample Assessor / Sample Reviewer |
| Version assessed | sample-core 1.0 |
| Previous assessment | none |
| Passes by evidence type | inspected 18 / documented 1 |
| Currently exposed to agents | read-only |

## L1 Value Defined
| ID | Short name | Result | Evidence type | Evidence location / reason for N/A |
| :--- | :--- | :--- | :--- | :--- |
| L1-V1 | Value card, decision Go / read-only first | ✅ | inspected | ARE-T01-value-card.md |
| L1-V2 | Baselines sourced or planned for measurement | ✅ | inspected | ARE-T01-value-card.md |
| L1-V3 | Minimum validation record | ✅ | inspected | ARE-T01-value-card.md |
| L1-V4 | Capability matrix and first batch | ✅ | inspected | ARE-T01-value-card.md |
| L1-A1 | First-batch operations have Owner / approver / responsible | ✅ | inspected | evidence/authorization-matrix-draft.md |
| L1-C1 | Catch-all executors identified with split plan | ✅ | inspected | evidence/operation-contract-review.md |

## L2 Read-Ready
| ID | Short name | Result | Evidence type | Evidence location / reason for N/A |
| :--- | :--- | :--- | :--- | :--- |
| L2-C1 | Strongly typed schemas for reads | ✅ | inspected | evidence/operation-contract-review.md |
| L2-C2 | Structured errors | ✅ | inspected | evidence/operation-contract-review.md |
| L2-X1 | Field projection, server-side filtering, cursor pagination | ✅ | inspected | evidence/api-review-notes.md |
| L2-X2 | Response limit and truncation flag | ✅ | inspected | evidence/api-review-notes.md |
| L2-X3 | Progressive discovery | ✅ | inspected | evidence/api-review-notes.md |
| L2-X4 | Measured response size of read-only tools | ✅ | inspected | evidence/api-review-notes.md |
| L2-A1 | Separate agent identity, read-only delegated credentials | ✅ | inspected | evidence/authorization-matrix-draft.md |
| L2-A2 | External content labeled with source and trust level | ✅ | inspected | evidence/authorization-matrix-draft.md |
| L2-I1 | No business logic in ingress, correct read-only annotations | ✅ | inspected | evidence/api-review-notes.md |
| L2-O1 | Audit records for read-only calls | ✅ | inspected | evidence/eval-report-2026-11-08.md |
| L2-O2 | Real-agent eval of the read-only part | ✅ | inspected | evidence/eval-report-2026-11-08.md |

## L3 Write-Safe
| ID | Short name | Result | Evidence type | Evidence location / reason for N/A |
| :--- | :--- | :--- | :--- | :--- |
| L3-C1 | Idempotency keys | ✅ | inspected | evidence/operation-contract-review.md |
| L3-C2 | Conditional writes and conflict response | ✅ | documented | evidence/operation-contract-review.md |
| L3-C3 | validate / dry-run | ❌ | |  |
| L3-C4 | All write operation contract acceptance records pass | ❌ | |  |
| L3-S1 | Long-running task status, cancel, recovery after disconnect | ➖ | | No long-running operations in this scenario: every operation completes within one request. |
| L3-S2 | Draft expiry, isolation, cleanup | ❌ | |  |
| L3-S3 | Undo / compensation or marked irreversible | ❌ | |  |
| L3-S4 | `needs_input` | ❌ | |  |
| L3-A1 | Authorization matrix approved by governance | ❌ | |  |
| L3-A2 | Final operations via claim or pre-authorization; self-reported confirmation rejected | ❌ | |  |
| L3-A3 | Credentials kept out of model context and sandbox | ❌ | |  |
| L3-A4 | Limits and kill switch | ❌ | |  |
| L3-O1 | Audit records include authorization evidence | ❌ | |  |
| L3-O2 | All fault-injection evals pass | ❌ | |  |

## L4 Verified Operations
| ID | Short name | Result | Evidence type | Evidence location / reason for N/A |
| :--- | :--- | :--- | :--- | :--- |
| L4-O1 | End-to-end correlation ID | ❌ | |  |
| L4-O2 | Evals as release gate | ❌ | |  |
| L4-I1 | Tool definitions versioned and hashed / signed | ❌ | |  |
| L4-I2 | Consistent results across ingress paths | ❌ | |  |
| L4-R1 | Environment isolation, rollout, rollback | ❌ | |  |
| L4-R2 | Value review written back to the value card | ❌ | |  |
| L4-R3 | Low-value capabilities shrunk / retired or kept with reasons | ❌ | |  |
| L4-R4 | Usage guide for agents | ❌ | |  |

## Conclusion
- **Current level**: L2
- **Allowed action**: expose read-only
- **Consistent with what is actually exposed today**: yes
- **Target level and date**: L3 / 2027-03-31
