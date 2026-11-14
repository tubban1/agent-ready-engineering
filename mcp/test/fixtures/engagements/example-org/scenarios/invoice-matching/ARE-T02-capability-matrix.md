# Capability Matrix — P1
> Document ID: ARE-T02
> Fictional sample for tests. Example Manufacturing Co. does not exist.

## Basic information
| Item | Content |
| :--- | :--- |
| Project / system | Accounts payable (sample) |
| Matrix version / date | v1 / 2026-11-06 |
| Related value card | ARE-T01-value-card.md v1 |
| First batch cap | 2 operations |

## Matrix
| Operation | Type | Side effects | Undoable | Risk level | Frequency of use | Value contribution | Re-engineering cost | Current problems | Owner | Approver | Responsible | Data dependencies | Decision |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| search_invoices | read | none | n/a | low | not measured | high | low | fixed pagination | Finance Operations Lead | — | AP team lead | ERP | first-batch |
| prepare_invoice_correction | commit | money | compensable | high | not measured | high | high | no idempotency | Finance Operations Lead | Finance Operations Lead | AP team lead | ERP | first-batch |
