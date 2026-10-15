# Code Review: HROne Employee Attendance & Analytics API

## 1. Review Summary

Compared the starter implementation (`main.py.backup`) with the current implementation (`app/main.py`). This review documents 23 defects or missing features identified in the starter implementation, how to reproduce or observe them, and the corresponding fixes in the current implementation.

## 2. Defects Identified and Fixes Applied

| # | Function / Area | Issue in Starter Implementation | How to Observe the Issue | Fix in Current Implementation |
|---:|---|---|---|---|
| 1 | `health()` | Always returned `{"status": "ok"}`, even when MongoDB was unavailable. | Stop MongoDB and call `GET /health`. | Pings MongoDB and returns HTTP 503 on a `PyMongoError`. |
| 2 | `create_employee()` | Duplicate checking used a separate read before insertion, allowing concurrent requests to pass the check. | Send concurrent create requests with the same employee code. | Creates a unique employee-code index and catches `DuplicateKeyError`, returning HTTP 409. |
| 3 | Employee model and validation | Employee data and shift times were loosely validated. | Submit a malformed employee code or invalid shift time. | `EmployeeCreate` validates the employee-code pattern, field lengths, and `HH:MM` shift-time format. Identical shift start and end values are rejected. |
| 4 | `list_employees()` | The pagination skip calculation was incorrect, potentially skipping the first page. | Request page 1 with a page size of 20. | Uses `(page - 1) * page_size` and sorts by employee code. |
| 5 | `list_employees()` | The total count included employees outside the selected department filter. | Request a department containing fewer employees than the company total. | Counts employees using the same department-filtered query. |
| 6 | Punch-in and timestamp helpers | Used local naive timestamps and the timestamp's local date instead of consistently applying the required IST attendance-date rule. | Submit an epoch timestamp near midnight UTC, when the UTC and IST calendar dates may differ. | Converts instants to UTC, derives attendance dates in IST, and assigns early-morning punches in overnight shifts to the prior shift date. |
| 7 | Punch-in endpoint | Did not verify that the employee existed before accessing shift fields. | Punch in using an unknown employee code. | Returns HTTP 404 when the employee is not found. |
| 8 | Punch-in endpoint | Checking for an existing record before insertion was unsafe under concurrent requests. | Send concurrent punch-in requests for the same employee and attendance date. | Enforces uniqueness on `(emp_code, date)` in MongoDB and returns HTTP 409 for duplicates. |
| 9 | `PunchInRequest` and punch-in | Did not enforce permitted punch-in statuses or validate the epoch-millisecond range. | Submit an unsupported status or invalid timestamp. | Accepts only `PRESENT`, `WFH`, and `ON_DUTY`, and bounds the optional epoch timestamp. |
| 10 | Late-minute calculation | Calculated lateness by replacing timestamp clock fields without complete IST and overnight-shift handling. | Test a punch near midnight or during an overnight shift. | `calculate_late_minutes()` uses IST and `shift_bounds()` and counts lateness only when it exceeds the 10-minute grace period. |
| 11 | Work-hour calculation | Used built-in `round()`, which does not guarantee the required decimal half-up rounding. | Test values at a rounding boundary. | `round_half_up()` uses `Decimal` with `ROUND_HALF_UP`. Work hours are calculated from elapsed seconds. |
| 12 | Overtime calculation | Counted any positive overtime and did not correctly handle overnight shift ends. | Test punches 29 and 30 minutes after shift end, including an overnight shift. | `calculate_overtime()` handles overnight shift bounds and reports overtime only when the whole-minute duration is at least 30. |
| 13 | `list_attendance()` | Loaded all matching documents into Python and paginated after loading, which is inefficient at scale. | Use a large attendance collection and request a small page. | Applies filtering, sorting, `skip`, and `limit` in MongoDB. Obtains the total with `count_documents()` using the same filters. |
| 14 | `list_attendance()` | Did not validate status values, date formats, or reversed date ranges. | Supply an invalid status/date or set `date_from` later than `date_to`. | Validates status and dates and returns HTTP 422 for invalid input. |
| 15 | Punch-out endpoint | The starter had no punch-out implementation. | Call `POST /attendance/punch-out`. | Adds employee and record checks, timestamp-order and 24-hour checks, work-hour/overtime/half-day calculations, and a conditional update to prevent two requests from punching out the same record. |
| 16 | Regularization endpoint | The starter had no attendance-correction implementation. | Call `PATCH /attendance/{emp_code}/{date}`. | Adds validation, recalculates derived fields, appends correction history, and checks that the record has not changed concurrently. |
| 17 | Employee monthly analytics | The starter had no monthly employee analytics endpoint. | Call `GET /analytics/employees/{emp_code}/monthly`. | Adds working-day and present-day calculations, leave and late counts, and attendance percentage. |
| 18 | Department summary | The starter had no department summary endpoint. | Call `GET /analytics/departments/summary`. | Adds headcount as of month end and department-level attendance, work-hour, leave, on-duty, and late aggregates. |
| 19 | Late leaderboard | The starter had no late-comer leaderboard endpoint. | Call `GET /analytics/leaderboard/late`. | Aggregates late minutes, ranks employees, preserves tied ranks, and filters out attendance rows whose employee record is missing. |
| 20 | Department trend | The starter had no daily department trend endpoint. | Call `GET /analytics/departments/{department}/trend`. | Adds date-series generation, missing-day filling, weekday attendance rates, headcount by date, and a seven-day moving average. |
| 21 | Explain endpoint | The starter had no query-plan inspection endpoint. | Call `GET /admin/explain/{endpoint}` with a supported endpoint. | Adds explain output with execution statistics and query-planner information. |
| 22 | Application startup and indexes | The starter did not create indexes for the main lookup and filtering patterns. | Inspect MongoDB indexes or explain relevant queries on a populated database. | Adds indexes for unique employee codes, department lookups, joined dates, unique employee/date attendance records, and common attendance filters and sorts. |
| 23 | Timestamp serialization | The starter did not provide a consistent epoch-millisecond representation for attendance timestamps. | Compare timestamp formats across API responses. | Serializes attendance timestamps and history timestamps as epoch milliseconds and truncates instants to whole seconds. |

## 3. Targeted Verification Performed

The following targeted checks were performed. They provide evidence for specific behaviors but do not represent exhaustive testing of every endpoint or edge case.

| Area | Test or Check | Observed Result |
|---|---|---|
| Late grace boundary | For a 09:30 shift, tested 09:40:00, 09:40:01, and 10:15:59. | Results: 0, 10, and 45 late minutes, respectively. |
| Overtime threshold | For an 18:30 shift end, tested 18:59:59, 19:00:00, and 19:30:59. | Results: 0, 30, and 60 overtime minutes, respectively. |
| Presence statuses | Checked the set of statuses counted as present. | `PRESENT`, `WFH`, and `ON_DUTY` are present statuses; `ABSENT` and `LEAVE` are not. |
| Pagination | Checked page numbering, maximum page size, and filtered total count. | Listing starts at page 1, limits page size to 100, and calculates totals using the applied filters. |
| Department summary | Reviewed weekday present-day totals and late-minute aggregation. | Present-day totals use weekday records with present statuses. Late totals are aggregated separately, so weekend late records are not excluded. |
| Leaderboard ties | Checked ranking behavior when employees have equal late-minute totals. | Equal totals receive the same rank, and employees tied at the last requested rank are included. |
| Trend date filling | Checked the API for July 6–12, 2026. | Returned seven dates, including weekend dates. Weekend attendance rates were `null`. |
| Query plan | Checked the attendance-list explain query for an employee/date filter. | The tested query used the `uq_attendance_employee_date` index. |
| Timestamp helpers | Checked epoch-millisecond truncation and timezone conversion. | Targeted helper checks confirmed truncation to whole seconds and consistent timestamp conversion. |
| Concurrent punch-in | Sent 10 simultaneous punch-in requests for the same employee and attendance date. | One request returned HTTP 201 and nine returned HTTP 409. |
| Health endpoint | Called the health endpoint with MongoDB available. | Returned HTTP 200. |

## 4. Verification Limits and Follow-up

This comparison documents changes between the starter and current code. It does not establish that every requirement has been exhaustively tested.

The checks above do not prove all concurrency scenarios, all 100,000-record performance cases, all error paths, or every analytics combination.

Before final submission, review `openapi.yaml`, `DATA_MODEL.md`, and the problem statement against the final implementation. Run any remaining endpoint and edge-case tests required by the assignment.

### Edge Case to Verify

Monthly employee analytics calculates working days from `max(month_start, joined_on)`, while its attendance-log match covers the full month.

If the database can contain attendance records dated before an employee's `joined_on`, verify whether those records should be excluded from the monthly aggregates.
