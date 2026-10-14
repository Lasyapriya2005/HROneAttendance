# DECISIONS.md

## 1. Indexes

I created a unique index on employee code and attendance date to prevent duplicate daily attendance records. I also added indexes to support employee lookups, date filtering, and analytics queries. Indexes help MongoDB find relevant records more efficiently, but unnecessary indexes consume storage and can slow down writes. I would choose additional indexes based on actual query patterns and execution plans.

## 2. Punch-in race

Two simultaneous punch-in requests for the same employee and attendance date could both attempt to create a record. The unique employee/date index ensures that only one record can be inserted. The duplicate request is handled by the API and returns HTTP 409 Conflict. I verified this using ten simultaneous requests: one returned 201 and nine returned 409.

## 3. Ties

The leaderboard sorts employees by total late minutes in descending order and uses employee code as a secondary sort. Employees with equal late-minute totals receive the same rank. If employees tie at the final requested rank, all employees sharing that rank are included, so the response may contain more entries than the requested limit.

## 4. Headcount

The department summary counts employees whose joining date is on or before the end of the selected month. Employees are included even if they have no attendance records.

## 5. One improvement

For 100 times more data, I would benchmark realistic workloads, examine query plans and execution times, tune indexes based on measured results, and add automated performance tests.
