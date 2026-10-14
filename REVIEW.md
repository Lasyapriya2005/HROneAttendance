Defects found and fixes made
Compared the starter file (main.py.backup) with the current implementation (main.py).

# Where (function / area) What was wrong in the starter How to notice it (input, test, or symptom) How it is fixed in the current implementation

1 health() Always returned {"status": "ok"}, even if MongoDB was unavailable. Stop MongoDB and call GET /health; the starter would still report success. Pings MongoDB and returns HTTP 503 on a PyMongoError.
2 create_employee() Duplicate checking was a separate read before insert, so concurrent requests could both pass the check. Send two create requests for the same emp_code concurrently. Creates a unique employee-code index and catches DuplicateKeyError as HTTP 409.
3 Employee model / validation The starter accepted loosely validated employee data and shift times. Try a malformed employee code or invalid shift time. EmployeeCreate validates the employee-code pattern, field lengths, and HH:MM shift-time format; it also rejects identical shift start/end values.
4 list_employees() Used skip = page _ page_size, so page 1 skipped the first page. Request page 1 with page size 20; the first 20 records could be skipped. Uses (page - 1) _ page_size; also sorts by employee code.
5 list_employees() total counted all employees rather than employees matching the department filter. Request a department with fewer employees than the company total. Counts using the same department-filtered query.
6 Punch-in / timestamp helpers Used local naive timestamps and the timestamp's local date instead of consistently applying the required IST attendance-date rule. Submit an epoch timestamp near midnight UTC; the UTC and IST calendar dates may differ. Converts instants to UTC, derives attendance dates in IST, and assigns early-morning punches in overnight shifts to the prior shift date.
7 Punch-in endpoint Did not check whether the employee existed before accessing their shift fields. Punch in using an unknown employee code. Returns HTTP 404 when the employee is not found.
8 Punch-in endpoint Checked for an existing record before insertion, which was not safe against simultaneous requests. Send concurrent punch-in requests for the same employee and attendance date. Enforces uniqueness on (emp_code, date) in MongoDB and returns HTTP 409 for duplicates.
9 PunchInRequest / punch-in Did not enforce the permitted punch-in statuses or validate the epoch-millisecond range. Submit an unsupported status or invalid timestamp. Validates status against PRESENT, WFH, and ON_DUTY, and bounds the optional epoch timestamp.
10 Late-minute calculation Calculated lateness by replacing the timestamp's clock fields, without complete IST/overnight shift-date handling. Test a punch near midnight or an overnight shift. calculate_late_minutes() uses IST and shift_bounds() and applies the strict rule: lateness is counted only when more than 10 minutes late.
11 Work-hour calculation Used built-in round(), which does not guarantee the required decimal half-up rounding. Test values at a rounding boundary. round_half_up() uses Decimal with ROUND_HALF_UP; work hours are calculated from elapsed seconds.
12 Overtime calculation Counted any positive overtime and did not correctly handle overnight shift ends. Test a punch-out 29 minutes after shift end, then one 30 minutes after shift end; also test an overnight shift. calculate_overtime() handles overnight shift bounds and reports overtime only when the whole-minute duration is at least 30.
13 list_attendance() Loaded all matching documents into Python and paginated after loading, which is inefficient at scale. Use a large attendance collection and request a small page. Applies filtering, sorting, skip, and limit in MongoDB; obtains total with count_documents() using the filters.
14 list_attendance() Did not validate status values, date formats, or a reversed date range. Supply an invalid status/date or date_from later than date_to. Validates status and dates and returns HTTP 422 for invalid input.
15 Punch-out endpoint The starter had no punch-out implementation. Call POST /attendance/punch-out. Adds employee/record checks, timestamp-order and 24-hour checks, work-hour/overtime/half-day calculations, and a conditional update to prevent two requests from punching out the same record.
16 Regularization endpoint The starter had no attendance-correction implementation. Call PATCH /attendance/{emp_code}/{date}. Adds validation, recomputes derived fields, appends correction history, and checks that the record has not changed concurrently.
17 Employee monthly analytics The starter had no monthly employee analytics endpoint. Call GET /analytics/employees/{emp_code}/monthly. Adds working-day and present-day calculations, leave and late counts, and attendance percentage.
18 Department summary The starter had no department summary endpoint. Call GET /analytics/departments/summary. Adds headcount as of the end of the month and department-level attendance, work-hour, leave, on-duty, and late aggregates.
19 Late leaderboard The starter had no late-comer leaderboard endpoint. Call GET /analytics/leaderboard/late. Aggregates late minutes, ranks employees, preserves tied ranks, and filters out attendance rows whose employee record is missing.
20 Department trend The starter had no daily department trend endpoint. Call GET /analytics/departments/{department}/trend. Adds date-series generation, missing-day filling, weekday attendance rates, headcount by date, and a seven-day moving average.
21 Explain endpoint The starter had no query-plan inspection endpoint. Call GET /admin/explain/{endpoint} with a supported endpoint. Adds explain output with execution statistics and query-planner information.
22 Application startup / indexes The starter did not create indexes for the main lookup and filtering patterns. Inspect MongoDB indexes or explain relevant queries on a populated database. Adds indexes for unique employee codes, department lookups, joined dates, unique employee/date attendance records, and common attendance filters/sorts.
23 Timestamp serialization The starter did not provide a consistent epoch-millisecond representation for attendance timestamps. Compare timestamp formats across API responses. Serializes attendance timestamps and history timestamps as epoch milliseconds and truncates instants to whole seconds.

Areas examined and considered correct in the current implementation

- Late grace boundary: targeted checks passed for 09:40:00 → 0, 09:40:01 → 10, and 10:15:59 → 45 for a 09:30 shift.
- Overtime threshold: targeted checks passed for 18:59:59 → 0, 19:00:00 → 30, and 19:30:59 → 60 for an 18:30 shift end.
- Presence statuses: the present-status set contains PRESENT, WFH, and ON_DUTY; ABSENT and LEAVE are not present statuses.
- Pagination bounds: attendance listing starts at page 1, limits page size to 100, and calculates total using the applied filters.
- Department summary working days: present-day totals use weekday records with present statuses, while late totals are aggregated separately so weekend late records are not excluded.
- Leaderboard ties: the ranking code gives equal late-minute totals the same rank and includes employees tied at the last requested rank.
- Trend date filling: the July 6–12, 2026 API check returned seven dates, including weekend dates; weekend attendance rates were null.
- Query plan: the tested attendance-list explain query used the uq_attendance_employee_date index for the employee/date filter.
- Whole-second timestamp helpers: targeted helper checks confirmed epoch-millisecond inputs are truncated to whole seconds and timestamps are converted consistently.
  Verification limits / follow-up
  This comparison establishes what changed in the code, not that every requirement has been exhaustively tested. In particular, the checks above do not prove all concurrency cases, all 100,000-record performance cases, all error paths, or every analytics combination. Before submitting, run the remaining endpoint/edge-case tests required by the assignment and review openapi.yaml, DATA_MODEL.md, and the problem statement against the final implementation.
  One edge case worth checking explicitly: monthly employee analytics calculates working days from max(month_start, joined_on), while its attendance-log match covers the full month. If the database can contain attendance records dated before an employee's joined_on, verify whether those records should be excluded from the monthly aggregates.
