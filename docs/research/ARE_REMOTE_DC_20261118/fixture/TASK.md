# Synthetic CI service triage

This directory contains ONLY synthetic test data, never user files. No commands or writes are needed.

Business rule: for each service, select the row with the LATEST ISO-8601 UTC timestamp in runs.csv. A service requires action if latest status is FAIL OR latest duration_ms > 900. Report count of PASS and FAIL latest statuses; identify services requiring action and the reason(s). Do not count older superseded attempts. Separately report number of services with slow latest runs (>900 ms). Cite the source file names.

All task inputs are synthetic; read-only analysis is authorized for this fixture directory only.
